import {
  addDays,
  isMockExam,
  planReminders,
  toIsoDate,
  weekdayKey,
  type EvaluationKind,
  type IsoDate,
  type ReminderInput,
} from '@cote-a-cote/shared';

import { supabase } from '@/lib/supabase';

import { cancelAllReminders, remindersSupported, replaceScheduledReminders } from './notifications';
import { anyReminderEnabled, loadReminderSettings } from './settings-store';

/** Jours couverts : les rappels sont reprogrammés à chaque ouverture de l'application. */
const DAYS_AHEAD = 14;

function nextMonday(today: IsoDate): IsoDate {
  const offset = { lun: 7, mar: 6, mer: 5, jeu: 4, ven: 3, sam: 2, dim: 1 }[weekdayKey(today)];
  return addDays(today, offset);
}

async function loadInput(now: Date): Promise<ReminderInput> {
  const today = toIsoDate(now);
  const until = addDays(today, DAYS_AHEAD);
  const monday = nextMonday(today);

  const [children, sessions, tasks, exams, nextWeek, scans] = await Promise.all([
    supabase.from('child_profile').select('id, alias'),
    supabase
      .from('study_session')
      .select('child_id, scheduled_on, duration_minutes, study_session_task(done_at)')
      .gte('scheduled_on', today)
      .lte('scheduled_on', until),
    supabase
      .from('task')
      .select('child_id, subject, kind, due_date, description')
      .eq('status', 'validated')
      .in('kind', ['interro', 'examen'])
      .gt('due_date', today)
      .lte('due_date', until),
    supabase
      .from('exam')
      .select('child_id, type, exam_date, subjects')
      .gt('exam_date', today)
      .lte('exam_date', until),
    supabase
      .from('study_session')
      .select('child_id')
      .gte('scheduled_on', monday)
      .lte('scheduled_on', addDays(monday, 6)),
    supabase.from('scan').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
  ]);
  for (const r of [children, sessions, tasks, exams, nextWeek, scans]) if (r.error) throw r.error;

  return {
    now,
    children: children.data!.map((c) => ({ id: c.id as string, alias: c.alias as string })),
    sessions: sessions.data!.map((s) => {
      const items = s.study_session_task as { done_at: string | null }[];
      return {
        childId: s.child_id as string,
        date: s.scheduled_on as IsoDate,
        minutes: s.duration_minutes as number,
        remaining: items.filter((i) => i.done_at === null).length,
      };
    }),
    evaluations: [
      // Un examen blanc n'est pas une évaluation : pas de rappel « examen demain » pour lui.
      ...tasks
        .data!.filter((t) => !isMockExam(String(t.description)))
        .map((t) => ({
          childId: t.child_id as string,
          date: t.due_date as IsoDate,
          kind: t.kind as EvaluationKind,
          subject: t.subject as string,
        })),
      ...exams.data!.map((e) => ({
        childId: e.child_id as string,
        date: e.exam_date as IsoDate,
        kind: e.type as EvaluationKind,
        subject: ((e.subjects as string[] | null) ?? []).join(', ') || (e.type as string),
      })),
    ],
    plannedNextWeek: [...new Set(nextWeek.data!.map((s) => s.child_id as string))],
    pendingScans: scans.count ?? 0,
  };
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Reprogramme les rappels de l'appareil à partir des données à jour.
 * Appels rapprochés regroupés ; un échec (hors connexion…) garde les rappels déjà programmés.
 */
export function syncReminders(): Promise<void> {
  if (!remindersSupported) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      const settings = await loadReminderSettings();
      if (!anyReminderEnabled(settings)) {
        await cancelAllReminders();
        return;
      }
      const now = new Date();
      await replaceScheduledReminders(planReminders(await loadInput(now), settings));
    } catch {
      // Réessayé à la prochaine ouverture de l'application.
    } finally {
      running = null;
      if (again) {
        again = false;
        void syncReminders();
      }
    }
  })();
  return running;
}
