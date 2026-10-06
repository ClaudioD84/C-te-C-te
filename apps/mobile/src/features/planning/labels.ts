import { formatRelativeDate, type Activity, type IsoDate, type PlanningAlert } from '@cote-a-cote/shared';

export const ACTIVITY_LABELS: Record<Activity, string> = {
  faire: 'Faire',
  etudier: 'Étudier',
  reviser: 'Réviser',
  se_tester: 'Se tester',
};

export function alertText(alert: PlanningAlert, today: IsoDate): string {
  switch (alert.type) {
    case 'surcharge':
      return `Journée chargée (${formatRelativeDate(alert.date, today)}) : ${alert.overMinutes} min de plus que prévu`;
    case 'evaluations_rapprochees':
      return `${alert.count} évaluations le même jour (${formatRelativeDate(alert.date, today)}) : les révisions commencent plus tôt`;
    case 'week_end_conseille':
      return 'Le week-end permettrait d’alléger la semaine';
    case 'reporte':
      return `Semaine allégée : ${alert.count} leçon${alert.count > 1 ? 's' : ''} reportée${alert.count > 1 ? 's' : ''} au prochain planning`;
    case 'conge':
      return alert.count > 1
        ? `${alert.count} tâches tombent pendant un congé : prévoyez-les avant ou après`
        : 'Une tâche tombe pendant un congé : prévoyez-la avant ou après';
  }
}

/** Préfixe de la consigne vue par l'enfant ; la description est déjà une phrase à l'impératif. */
export const CHILD_ACTIVITY_PREFIX: Partial<Record<Activity, string>> = {
  reviser: 'Révision',
  se_tester: 'Teste-toi',
};

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
