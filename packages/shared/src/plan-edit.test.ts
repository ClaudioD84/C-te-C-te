import { describe, expect, it } from 'vitest';

import {
  addItem,
  moveItem,
  refreshLoadAlerts,
  relabelEvaluations,
  removeItem,
  setItemMinutes,
} from './plan-edit';
import { planWeek, type WeekPlan } from './planning';

const plan: WeekPlan = {
  days: [
    {
      date: '2026-10-19',
      items: [
        { taskId: 'maths', minutes: 20, activity: 'faire' },
        { taskId: 'interro', minutes: 25, activity: 'reviser' },
      ],
      totalMinutes: 45,
    },
    {
      date: '2026-10-20',
      items: [{ taskId: 'interro', minutes: 20, activity: 'se_tester' }],
      totalMinutes: 20,
    },
  ],
  alerts: [
    { type: 'surcharge', date: '2026-10-19', overMinutes: 5 },
    { type: 'week_end_conseille', dates: [] },
  ],
};

describe('retouches du planning par le parent', () => {
  it('déplacer une activité vers un jour libre, puis vers un jour où la tâche est déjà', () => {
    const moved = moveItem(plan, '2026-10-19', 'maths', '2026-10-22');
    expect(moved.days.map((d) => [d.date, d.totalMinutes])).toEqual([
      ['2026-10-19', 25],
      ['2026-10-20', 20],
      ['2026-10-22', 20],
    ]);
    const merged = moveItem(plan, '2026-10-19', 'interro', '2026-10-20');
    expect(merged.days.find((d) => d.date === '2026-10-20')!.items).toEqual([
      { taskId: 'interro', minutes: 45, activity: 'se_tester' },
    ]);
    expect(moveItem(plan, '2026-10-19', 'inconnue', '2026-10-20')).toBe(plan);
  });

  it('changer la durée par pas de 5 minutes, entre 5 et 120', () => {
    expect(setItemMinutes(plan, '2026-10-19', 'maths', 33).days[0]!.items[0]!.minutes).toBe(35);
    expect(setItemMinutes(plan, '2026-10-19', 'maths', 0).days[0]!.totalMinutes).toBe(30);
    expect(setItemMinutes(plan, '2026-10-19', 'maths', 500).days[0]!.items[0]!.minutes).toBe(120);
  });

  it('retirer une activité ; un jour vide disparaît', () => {
    const removed = removeItem(plan, '2026-10-20', 'interro');
    expect(removed.days.map((d) => d.date)).toEqual(['2026-10-19']);
  });

  it('ajouter une activité, avant les jours déjà prévus', () => {
    const added = addItem(plan, '2026-10-18', { taskId: 'lecture', minutes: 15, activity: 'etudier' });
    expect(added.days[0]).toEqual({
      date: '2026-10-18',
      items: [{ taskId: 'lecture', minutes: 15, activity: 'etudier' }],
      totalMinutes: 15,
    });
  });

  it('une évaluation finit toujours par « se tester »', () => {
    const swapped = relabelEvaluations(
      moveItem(plan, '2026-10-20', 'interro', '2026-10-18'),
      new Set(['interro']),
    );
    expect(swapped.days.flatMap((d) => d.items.filter((i) => i.taskId === 'interro'))).toEqual([
      { taskId: 'interro', minutes: 20, activity: 'reviser' },
      { taskId: 'interro', minutes: 25, activity: 'se_tester' },
    ]);
  });

  it('alertes de charge recalculées après retouche', () => {
    expect(refreshLoadAlerts(plan, 40).alerts).toEqual(plan.alerts);
    const lighter = refreshLoadAlerts(removeItem(plan, '2026-10-19', 'maths'), 40);
    expect(lighter.alerts).toEqual([]);
  });
});

describe('priorités et répartition', () => {
  // Lundi 5 octobre 2026, semaine libre.
  const base = {
    today: '2026-10-05',
    grade: 'P5' as const,
    availableDays: ['lun', 'mar', 'mer', 'jeu', 'ven'] as const,
    workMinutes: 20,
  };
  // Trois notions à retravailler pour lundi prochain (échéance par défaut d'une remédiation).
  const lessons = ['a', 'b', 'c'].map((id) => ({
    id,
    subject: 'Français',
    kind: 'lecon' as const,
    dueDate: '2026-10-12',
  }));

  it('près de l’échéance : tout s’entasse en fin de semaine', () => {
    const plan = planWeek({ ...base, tasks: lessons, strategy: 'echeance' });
    expect(plan.days.map((d) => d.date)).toEqual(['2026-10-09']);
  });

  it('régulièrement : les jours libres se remplissent dès aujourd’hui', () => {
    const plan = planWeek({ ...base, tasks: lessons, strategy: 'reguliere' });
    expect(plan.days.map((d) => [d.date, d.items.map((i) => i.taskId)])).toEqual([
      ['2026-10-05', ['a']],
      ['2026-10-06', ['b']],
      ['2026-10-07', ['c']],
    ]);
  });

  it('régulièrement : une interrogation se révise au plus près du test, en finissant par « se tester »', () => {
    const plan = planWeek({
      ...base,
      strategy: 'reguliere',
      tasks: [{ id: 'i', subject: 'Maths', kind: 'interro', dueDate: '2026-10-09' }],
    });
    expect(plan.days.map((d) => [d.date, d.items[0]!.activity])).toEqual([
      ['2026-10-07', 'reviser'],
      ['2026-10-08', 'se_tester'],
    ]);
  });

  it('une tâche prioritaire commence au plus tôt, une qui peut attendre se fait près de l’échéance', () => {
    const plan = planWeek({
      ...base,
      strategy: 'echeance',
      tasks: [
        { ...lessons[0]!, priority: 'haute' },
        { id: 'd', subject: 'Maths', kind: 'devoir', dueDate: '2026-10-09', priority: 'basse' },
      ],
    });
    expect(plan.days.map((d) => [d.date, d.items.map((i) => i.taskId)])).toEqual([
      ['2026-10-05', ['a']],
      ['2026-10-08', ['d']],
    ]);
  });

  it('semaine chargée : ce qui peut attendre est reporté, jamais une priorité', () => {
    const plan = planWeek({
      ...base,
      lightWeek: true,
      tasks: [
        { id: 'd', subject: 'Maths', kind: 'devoir', dueDate: '2026-10-09', priority: 'basse' },
        { ...lessons[0]!, priority: 'haute' },
      ],
    });
    expect(plan.days.flatMap((d) => d.items.map((i) => i.taskId))).toEqual(['a']);
    expect(plan.alerts).toContainEqual({ type: 'reporte', count: 1 });
  });
});
