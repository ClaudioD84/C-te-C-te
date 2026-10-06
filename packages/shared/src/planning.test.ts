import { describe, expect, it } from 'vitest';

import { estimateTaskMinutes, planWeek, type PlanningInput } from './planning';

// Lundi 5 octobre 2026.
const MONDAY = '2026-10-05';
const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven'] as const;

const base: Omit<PlanningInput, 'tasks'> = {
  today: MONDAY,
  grade: 'P5',
  availableDays: WEEKDAYS,
  workMinutes: 20,
};

describe('planWeek', () => {
  it('place un devoir la veille de son échéance', () => {
    const plan = planWeek({
      ...base,
      tasks: [{ id: 'd', subject: 'Français', kind: 'devoir', dueDate: '2026-10-07' }],
    });
    expect(plan.days).toEqual([
      { date: '2026-10-06', items: [{ taskId: 'd', minutes: 20, activity: 'faire' }], totalMinutes: 20 },
    ]);
    expect(plan.alerts).toEqual([]);
  });

  it('étale une interrogation sur plusieurs jours et termine par un test', () => {
    const plan = planWeek({
      ...base,
      tasks: [{ id: 'i', subject: 'Maths', kind: 'interro', dueDate: '2026-10-09' }],
    });
    expect(plan.days.map((d) => d.date)).toEqual(['2026-10-07', '2026-10-08']);
    expect(plan.days.at(-1)!.items[0]!.activity).toBe('se_tester');
    expect(plan.days[0]!.items[0]!.activity).toBe('reviser');
    const total = plan.days.reduce((s, d) => s + d.totalMinutes, 0);
    expect(total).toBe(estimateTaskMinutes('interro', 'P5'));
  });

  it("place une tâche pour aujourd'hui sur aujourd'hui", () => {
    const plan = planWeek({
      ...base,
      tasks: [{ id: 'l', subject: 'Éveil', kind: 'lecon', dueDate: MONDAY }],
    });
    expect(plan.days[0]!.date).toBe(MONDAY);
  });

  it('ignore les tâches dépassées et le travail déjà fait', () => {
    const plan = planWeek({
      ...base,
      tasks: [
        { id: 'old', subject: 'Maths', kind: 'devoir', dueDate: '2026-10-02' },
        { id: 'done', subject: 'Maths', kind: 'devoir', dueDate: '2026-10-07', doneMinutes: 20 },
      ],
    });
    expect(plan.days).toEqual([]);
  });

  it("n'utilise pas le week-end s'il n'est pas disponible", () => {
    const plan = planWeek({
      ...base,
      today: '2026-10-09', // vendredi
      tasks: [{ id: 'i', subject: 'Maths', kind: 'interro', dueDate: '2026-10-13' }],
    });
    for (const day of plan.days) expect(['2026-10-10', '2026-10-11']).not.toContain(day.date);
  });

  it('lisse la charge vers les jours plus légers', () => {
    const plan = planWeek({
      ...base,
      dailyCapacityMinutes: 40,
      tasks: [
        { id: 'a', subject: 'Maths', kind: 'devoir', dueDate: '2026-10-08' },
        { id: 'b', subject: 'Français', kind: 'devoir', dueDate: '2026-10-08' },
        { id: 'c', subject: 'Éveil', kind: 'devoir', dueDate: '2026-10-08' },
      ],
    });
    for (const day of plan.days) expect(day.totalMinutes).toBeLessThanOrEqual(40);
    expect(plan.days.reduce((s, d) => s + d.totalMinutes, 0)).toBe(60);
  });

  it('signale les évaluations le même jour et la surcharge, et propose le week-end', () => {
    const plan = planWeek({
      ...base,
      today: '2026-10-08', // jeudi
      dailyCapacityMinutes: 30,
      tasks: [
        { id: 'a', subject: 'Maths', kind: 'interro', dueDate: '2026-10-12' },
        { id: 'b', subject: 'Néerlandais', kind: 'interro', dueDate: '2026-10-12' },
        { id: 'c', subject: 'Histoire', kind: 'interro', dueDate: '2026-10-12' },
      ],
    });
    const types = plan.alerts.map((a) => a.type);
    expect(types).toContain('evaluations_rapprochees');
    expect(types).toContain('surcharge');
    expect(plan.alerts).toContainEqual({ type: 'week_end_conseille', dates: ['2026-10-10', '2026-10-11'] });
  });

  it('utilise le week-end quand le parent l’accepte', () => {
    const tasks = ['a', 'b', 'c'].map((id) => ({
      id,
      subject: id,
      kind: 'interro' as const,
      dueDate: '2026-10-12',
    }));
    const plan = planWeek({
      ...base,
      today: '2026-10-08',
      dailyCapacityMinutes: 30,
      tasks,
      extraDates: ['2026-10-10', '2026-10-11'],
    });
    expect(plan.days.map((d) => d.date)).toContain('2026-10-10');
    const before = planWeek({ ...base, today: '2026-10-08', dailyCapacityMinutes: 30, tasks });
    const over = (p: typeof plan) => p.alerts.filter((a) => a.type === 'surcharge').length;
    expect(over(plan)).toBeLessThan(over(before));
  });

  it('adapte le temps estimé au niveau', () => {
    expect(estimateTaskMinutes('interro', 'P1')).toBeLessThan(estimateTaskMinutes('interro', 'S5'));
  });
});

describe('examen blanc (F5)', () => {
  it('une seule séance « se tester » le jour prévu, sans alerte d’évaluations rapprochées', () => {
    const plan = planWeek({
      tasks: [
        { id: 'blanc-fr', subject: 'Français', kind: 'examen', dueDate: '2026-06-12', mockExam: true },
        { id: 'blanc-ma', subject: 'Mathématiques', kind: 'examen', dueDate: '2026-06-12', mockExam: true },
      ],
      today: '2026-06-08',
      grade: 'P6',
      availableDays: ['lun', 'mar', 'mer', 'jeu', 'ven'],
      workMinutes: 20,
    });
    expect(plan.days.map((d) => d.date)).toEqual(['2026-06-12']);
    expect(plan.days[0]!.items).toEqual([
      { taskId: 'blanc-fr', minutes: 40, activity: 'se_tester' },
      { taskId: 'blanc-ma', minutes: 40, activity: 'se_tester' },
    ]);
    expect(plan.alerts.some((a) => a.type === 'evaluations_rapprochees')).toBe(false);
  });

  it('congés : aucun travail ces jours-là, la préparation est avancée', () => {
    const plan = planWeek({
      ...base,
      tasks: [{ id: 'i', subject: 'Éveil', kind: 'interro', dueDate: '2026-10-09' }],
      blockedDates: ['2026-10-07', '2026-10-08'],
    });
    const dates = plan.days.map((d) => d.date);
    expect(dates).not.toContain('2026-10-07');
    expect(dates).not.toContain('2026-10-08');
    expect(plan.days.reduce((sum, d) => sum + d.totalMinutes, 0)).toBe(45);
  });

  it('congés : une tâche dont toute la préparation tombe en congé est signalée', () => {
    const plan = planWeek({
      ...base,
      tasks: [{ id: 'd', subject: 'Français', kind: 'devoir', dueDate: '2026-10-07' }],
      blockedDates: ['2026-10-05', '2026-10-06'],
    });
    expect(plan.days).toEqual([]);
    expect(plan.alerts).toEqual([{ type: 'conge', count: 1 }]);
  });

  it('congés : priment sur un jour ajouté exceptionnellement', () => {
    const plan = planWeek({
      ...base,
      tasks: [{ id: 'd', subject: 'Français', kind: 'devoir', dueDate: '2026-10-12' }],
      extraDates: ['2026-10-10'],
      blockedDates: ['2026-10-10', '2026-10-11'],
    });
    expect(plan.days.map((d) => d.date)).toEqual([]);
    expect(plan.alerts).toEqual([{ type: 'conge', count: 1 }]);
  });

  it('semaine chargée : l’essentiel seulement, leçons lointaines reportées, charge réduite', () => {
    const tasks = [
      { id: 'd', subject: 'Français', kind: 'devoir' as const, dueDate: '2026-10-07' },
      { id: 'l-proche', subject: 'Éveil', kind: 'lecon' as const, dueDate: '2026-10-08' },
      { id: 'l-loin', subject: 'Éveil', kind: 'lecon' as const, dueDate: '2026-10-10' },
    ];
    const normal = planWeek({ ...base, tasks });
    const light = planWeek({ ...base, tasks, lightWeek: true });
    const planned = (plan: typeof light) => new Set(plan.days.flatMap((d) => d.items.map((i) => i.taskId)));
    expect(planned(normal).has('l-loin')).toBe(true);
    expect(planned(light)).toEqual(new Set(['d', 'l-proche']));
    expect(light.alerts).toContainEqual({ type: 'reporte', count: 1 });
  });
});
