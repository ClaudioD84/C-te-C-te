import { describe, expect, it } from 'vitest';

import {
  afterQuiet,
  DEFAULT_REMINDER_SETTINGS,
  planReminders,
  type ReminderInput,
  type ReminderSettings,
} from './reminders';

// Lundi 5 octobre 2026, 10 h (heure locale).
const now = new Date(2026, 9, 5, 10, 0);
const settings: ReminderSettings = {
  mission: { enabled: true, time: '16:30', childIds: ['a'] },
  evaluations: { enabled: true, time: '18:00' },
  planning: { enabled: true, weekday: 'dim', time: '17:30' },
  scans: { enabled: true },
  quiet: { start: '20:30', end: '07:30' },
};
const input = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  now,
  children: [
    { id: 'a', alias: 'Lion' },
    { id: 'b', alias: 'Hibou' },
  ],
  sessions: [],
  evaluations: [],
  plannedNextWeek: ['a', 'b'],
  pendingScans: 0,
  ...over,
});
const local = (d: Date) =>
  `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('planReminders', () => {
  it('mission : enfants choisis, missions non terminées, pas dans le passé', () => {
    const r = planReminders(
      input({
        sessions: [
          { childId: 'a', date: '2026-10-05', minutes: 20, remaining: 2 },
          { childId: 'a', date: '2026-10-06', minutes: 15, remaining: 0 },
          { childId: 'b', date: '2026-10-05', minutes: 20, remaining: 1 },
        ],
      }),
      settings,
    );
    expect(r.map((x) => [x.id, local(x.at)])).toEqual([['mission-a-2026-10-05', '5/10 16:30']]);
    expect(r[0]!.body).toBe('Lion, ta mission t’attend (20 min). Courage !');
  });

  it('mission pendant les heures calmes : pas de rappel', () => {
    const r = planReminders(
      input({ sessions: [{ childId: 'a', date: '2026-10-06', minutes: 20, remaining: 1 }] }),
      { ...settings, mission: { ...settings.mission, time: '21:00' } },
    );
    expect(r).toEqual([]);
  });

  it('évaluations : la veille, regroupées ; grandes épreuves aussi une semaine avant', () => {
    const r = planReminders(
      input({
        evaluations: [
          { childId: 'a', date: '2026-10-08', kind: 'interro', subject: 'Éveil' },
          { childId: 'a', date: '2026-10-08', kind: 'examen', subject: 'Mathématiques' },
          { childId: 'a', date: '2026-10-07', kind: 'devoir', subject: 'Français' },
          { childId: 'b', date: '2026-10-20', kind: 'ceb', subject: 'CEB' },
        ],
      }),
      settings,
    );
    expect(r.map((x) => [x.id, local(x.at), x.body])).toEqual([
      ['eval-a-2026-10-08', '7/10 18:00', 'Lion : Éveil (interrogation) et Mathématiques (examen) demain.'],
      [
        'eval7-b-2026-10-20',
        '13/10 18:00',
        'Hibou : CEB dans une semaine. Le dossier de révision est prêt dans Suivi.',
      ],
      ['eval-b-2026-10-20', '19/10 18:00', 'Hibou : CEB demain.'],
    ]);
  });

  it('planning : le prochain dimanche, seulement si une semaine manque', () => {
    expect(planReminders(input(), settings)).toEqual([]);
    const r = planReminders(input({ plannedNextWeek: ['a'] }), settings);
    expect(r.map((x) => [local(x.at), x.body])).toEqual([
      ['11/10 17:30', 'La semaine prochaine n’est pas encore planifiée pour Hibou.'],
    ]);
  });

  it('photos à vérifier : dans deux heures, après les heures calmes', () => {
    const late = new Date(2026, 9, 5, 19, 45);
    const r = planReminders(input({ now: late, pendingScans: 2 }), settings);
    expect(r.map((x) => [local(x.at), x.body])).toEqual([
      ['6/10 7:30', '2 photos du journal de classe attendent votre validation.'],
    ]);
  });

  it('heures calmes de nuit et de jour', () => {
    expect(local(afterQuiet(new Date(2026, 9, 5, 23, 0), settings.quiet))).toBe('6/10 7:30');
    expect(local(afterQuiet(new Date(2026, 9, 5, 6, 0), settings.quiet))).toBe('5/10 7:30');
    expect(local(afterQuiet(new Date(2026, 9, 5, 12, 30), { start: '12:00', end: '13:30' }))).toBe(
      '5/10 13:30',
    );
  });

  it('rien par défaut (rappels désactivés tant que le parent ne les active pas)', () => {
    expect(planReminders(input({ pendingScans: 3, plannedNextWeek: [] }), DEFAULT_REMINDER_SETTINGS)).toEqual(
      [],
    );
  });
});
