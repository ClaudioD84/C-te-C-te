import type { IsoDate } from './dates';
import type { PlannedDay, PlannedItem, PlanningAlert, WeekPlan } from './planning';

/**
 * Retouches du parent sur une proposition de planning (ou sur le planning publié) avant publication : déplacer
 * une activité vers un autre jour, changer sa durée, la retirer ou en ajouter une.
 */

/** Durée d'une activité retouchée : par pas de 5 minutes. */
export const MIN_ITEM_MINUTES = 5;
export const MAX_ITEM_MINUTES = 120;

const clampMinutes = (minutes: number) =>
  Math.min(MAX_ITEM_MINUTES, Math.max(MIN_ITEM_MINUTES, Math.round(minutes / 5) * 5));

/** Jours triés, sans jour vide, totaux recalculés. */
function normalize(days: PlannedDay[]): PlannedDay[] {
  return days
    .filter((day) => day.items.length > 0)
    .map((day) => ({ ...day, totalMinutes: day.items.reduce((sum, item) => sum + item.minutes, 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function withDays(plan: WeekPlan, days: PlannedDay[]): WeekPlan {
  return { ...plan, days: normalize(days) };
}

/** Ajoute une activité un jour donné ; une activité de la même tâche ce jour-là est allongée d'autant. */
export function addItem(plan: WeekPlan, date: IsoDate, item: PlannedItem): WeekPlan {
  const minutes = clampMinutes(item.minutes);
  const day = plan.days.find((d) => d.date === date);
  if (!day) return withDays(plan, [...plan.days, { date, items: [{ ...item, minutes }], totalMinutes: 0 }]);
  const existing = day.items.find((i) => i.taskId === item.taskId);
  const items = existing
    ? day.items.map((i) => (i === existing ? { ...i, minutes: clampMinutes(i.minutes + minutes) } : i))
    : [...day.items, { ...item, minutes }];
  return withDays(
    plan,
    plan.days.map((d) => (d === day ? { ...d, items } : d)),
  );
}

export function removeItem(plan: WeekPlan, date: IsoDate, taskId: string): WeekPlan {
  return withDays(
    plan,
    plan.days.map((d) => (d.date === date ? { ...d, items: d.items.filter((i) => i.taskId !== taskId) } : d)),
  );
}

export function setItemMinutes(plan: WeekPlan, date: IsoDate, taskId: string, minutes: number): WeekPlan {
  return withDays(
    plan,
    plan.days.map((d) =>
      d.date === date
        ? {
            ...d,
            items: d.items.map((i) => (i.taskId === taskId ? { ...i, minutes: clampMinutes(minutes) } : i)),
          }
        : d,
    ),
  );
}

/** Déplace une activité vers un autre jour (fusionnée avec la même tâche si elle y est déjà). */
export function moveItem(plan: WeekPlan, from: IsoDate, taskId: string, to: IsoDate): WeekPlan {
  if (from === to) return plan;
  const item = plan.days.find((d) => d.date === from)?.items.find((i) => i.taskId === taskId);
  if (!item) return plan;
  return addItem(removeItem(plan, from, taskId), to, item);
}

/**
 * Révision d'une évaluation déplacée : la dernière séance avant le test est « se tester », les précédentes
 * « réviser ».
 */
export function relabelEvaluations(plan: WeekPlan, evaluationIds: ReadonlySet<string>): WeekPlan {
  const lastDay = new Map<string, IsoDate>();
  for (const day of plan.days)
    for (const item of day.items) if (evaluationIds.has(item.taskId)) lastDay.set(item.taskId, day.date);
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      items: day.items.map((item) =>
        evaluationIds.has(item.taskId)
          ? { ...item, activity: lastDay.get(item.taskId) === day.date ? 'se_tester' : 'reviser' }
          : item,
      ),
    })),
  };
}

/**
 * Alertes de charge après retouche : journées au-delà du temps prévu ; la suggestion du week-end n'est gardée que
 * s'il reste une journée chargée. Les autres alertes ne dépendent pas des retouches.
 */
export function refreshLoadAlerts(plan: WeekPlan, capacityMinutes: number): WeekPlan {
  const overloaded: PlanningAlert[] = plan.days
    .filter((day) => day.totalMinutes > capacityMinutes)
    .map((day) => ({ type: 'surcharge', date: day.date, overMinutes: day.totalMinutes - capacityMinutes }));
  const others = plan.alerts.filter(
    (alert) => alert.type !== 'surcharge' && (alert.type !== 'week_end_conseille' || overloaded.length > 0),
  );
  return { ...plan, alerts: [...overloaded, ...others] };
}
