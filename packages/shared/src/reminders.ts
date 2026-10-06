import { z } from 'zod';

import { addDays, parseIsoDate, toIsoDate, weekdayKey, type IsoDate } from './dates';
import { weekdaySchema, type Weekday } from './profile';
import { TASK_KIND_LABELS, type TaskKind } from './task';

/**
 * Rappels (notifications locales, programmées sur l'appareil) : mission du jour pour l'enfant,
 * évaluations du lendemain, planning de la semaine à préparer, photos à vérifier.
 * Réglages propres à chaque appareil (le téléphone du parent n'est pas forcément celui de l'enfant).
 */

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const reminderSettingsSchema = z.object({
  mission: z.object({ enabled: z.boolean(), time: timeSchema, childIds: z.array(z.string()) }),
  evaluations: z.object({ enabled: z.boolean(), time: timeSchema }),
  planning: z.object({ enabled: z.boolean(), weekday: weekdaySchema, time: timeSchema }),
  scans: z.object({ enabled: z.boolean() }),
  /** Heures calmes : aucun rappel entre `start` et `end` (la nuit, le repas…). */
  quiet: z.object({ start: timeSchema, end: timeSchema }),
});
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  mission: { enabled: false, time: '16:30', childIds: [] },
  evaluations: { enabled: false, time: '18:00' },
  planning: { enabled: false, weekday: 'dim', time: '17:30' },
  scans: { enabled: false },
  quiet: { start: '20:30', end: '07:30' },
};

export type EvaluationKind = TaskKind | 'ceb' | 'ce1d' | 'cess' | 'bilan';

export interface ReminderInput {
  now: Date;
  children: { id: string; alias: string }[];
  /** Missions planifiées des prochains jours (activités restant à faire). */
  sessions: { childId: string; date: IsoDate; minutes: number; remaining: number }[];
  evaluations: { childId: string; date: IsoDate; kind: EvaluationKind; subject: string }[];
  /** Enfants dont la semaine prochaine est déjà planifiée. */
  plannedNextWeek: string[];
  pendingScans: number;
}

export interface Reminder {
  id: string;
  at: Date;
  title: string;
  body: string;
}

/** iOS limite à 64 les notifications programmées par application. */
export const MAX_REMINDERS = 50;

const EXAM_LABELS: Record<'ceb' | 'ce1d' | 'cess' | 'bilan', string> = {
  ceb: 'CEB',
  ce1d: 'CE1D',
  cess: 'CESS',
  bilan: 'bilan',
};

function at(date: IsoDate, time: string): Date {
  const d = parseIsoDate(date);
  const [h, m] = time.split(':').map(Number) as [number, number];
  d.setHours(h, m, 0, 0);
  return d;
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
};

export function isQuiet(date: Date, quiet: ReminderSettings['quiet']): boolean {
  const t = date.getHours() * 60 + date.getMinutes();
  const start = minutesOf(quiet.start);
  const end = minutesOf(quiet.end);
  return start <= end ? t >= start && t < end : t >= start || t < end;
}

/** Repousse un rappel tombant pendant les heures calmes à leur fin. */
export function afterQuiet(date: Date, quiet: ReminderSettings['quiet']): Date {
  if (!isQuiet(date, quiet)) return date;
  const end = at(toIsoDate(date), quiet.end);
  return end > date ? end : at(addDays(toIsoDate(date), 1), quiet.end);
}

function evaluationLabel(kind: EvaluationKind, subject: string): string {
  if (kind in EXAM_LABELS) return EXAM_LABELS[kind as keyof typeof EXAM_LABELS];
  return `${subject} (${TASK_KIND_LABELS[kind as TaskKind].toLowerCase()})`;
}

function list(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`;
}

export function planReminders(input: ReminderInput, settings: ReminderSettings): Reminder[] {
  const { now } = input;
  const today = toIsoDate(now);
  const alias = new Map(input.children.map((c) => [c.id, c.alias]));
  const out: Reminder[] = [];

  if (settings.mission.enabled) {
    for (const s of input.sessions) {
      if (!settings.mission.childIds.includes(s.childId) || s.remaining === 0) continue;
      const date = at(s.date, settings.mission.time);
      // Une mission ne se reporte pas au lendemain : pendant les heures calmes, pas de rappel.
      if (date <= now || isQuiet(date, settings.quiet)) continue;
      out.push({
        id: `mission-${s.childId}-${s.date}`,
        at: date,
        title: 'Mission du jour',
        body: `${alias.get(s.childId) ?? 'Ta mission'}, ta mission t’attend (${s.minutes} min). Courage !`,
      });
    }
  }

  if (settings.evaluations.enabled) {
    const byChildAndDay = new Map<string, ReminderInput['evaluations']>();
    for (const e of input.evaluations) {
      if (e.kind === 'devoir' || e.kind === 'lecon') continue;
      const key = `${e.childId}|${e.date}`;
      byChildAndDay.set(key, [...(byChildAndDay.get(key) ?? []), e]);
    }
    for (const [key, items] of byChildAndDay) {
      const [childId, date] = key.split('|') as [string, IsoDate];
      const name = alias.get(childId) ?? 'Votre enfant';
      const labels = [...new Set(items.map((e) => evaluationLabel(e.kind, e.subject)))];
      const eve = afterQuiet(at(addDays(date, -1), settings.evaluations.time), settings.quiet);
      if (eve > now && toIsoDate(eve) <= addDays(date, -1)) {
        out.push({
          id: `eval-${childId}-${date}`,
          at: eve,
          title: 'Demain',
          // Interrogations et examens de classe : la révision express l'attend sur sa console.
          body: items.some((e) => e.kind === 'interro' || e.kind === 'examen')
            ? `${name} : ${list(labels)} demain. Une révision express de quelques minutes l’attend sur sa console.`
            : `${name} : ${list(labels)} demain.`,
        });
      }
      // Grandes épreuves : un rappel une semaine avant, pour lancer les révisions.
      const big = items.filter((e) => e.kind in EXAM_LABELS);
      const weekBefore = afterQuiet(at(addDays(date, -7), settings.evaluations.time), settings.quiet);
      if (big.length > 0 && weekBefore > now) {
        out.push({
          id: `eval7-${childId}-${date}`,
          at: weekBefore,
          title: 'Dans une semaine',
          body: `${name} : ${list([...new Set(big.map((e) => EXAM_LABELS[e.kind as keyof typeof EXAM_LABELS]))])} dans une semaine. Le dossier de révision est prêt dans Suivi.`,
        });
      }
    }
  }

  if (settings.planning.enabled) {
    const missing = input.children.filter((c) => !input.plannedNextWeek.includes(c.id)).map((c) => c.alias);
    if (missing.length > 0) {
      // Prochain jour choisi (aujourd'hui compris si l'heure n'est pas passée).
      for (let i = 0; i < 8; i++) {
        const day = addDays(today, i);
        if (weekdayKey(day) !== settings.planning.weekday) continue;
        const date = afterQuiet(at(day, settings.planning.time), settings.quiet);
        if (date <= now) continue;
        out.push({
          id: `planning-${day}`,
          at: date,
          title: 'Planning de la semaine',
          body: `La semaine prochaine n’est pas encore planifiée pour ${list(missing)}.`,
        });
        break;
      }
    }
  }

  if (settings.scans.enabled && input.pendingScans > 0) {
    const n = input.pendingScans;
    out.push({
      id: 'scans',
      at: afterQuiet(new Date(now.getTime() + 2 * 3600 * 1000), settings.quiet),
      title: 'Photos à vérifier',
      body: `${n} photo${n > 1 ? 's' : ''} du journal de classe attend${n > 1 ? 'ent' : ''} votre validation.`,
    });
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS);
}

export type { Weekday };
