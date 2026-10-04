/**
 * Droits d'usage de l'IA selon l'abonnement (F13).
 * Les quotas protègent la marge : ils sont volontairement larges pour un usage normal.
 */

export type Plan = 'essai' | 'solo' | 'famille';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  current_period_end: string;
}

/** Photos analysables par mois civil. */
export const MONTHLY_SCAN_QUOTA: Record<Plan, number> = {
  essai: 40,
  solo: 80,
  famille: 200,
};

export type AccessProblem = 'abonnement_expire' | 'quota_atteint';

export function checkScanAccess(
  subscription: Subscription | null,
  scansThisMonth: number,
  now: Date,
): AccessProblem | null {
  if (!subscription) return 'abonnement_expire';
  const active = subscription.status === 'trial' || subscription.status === 'active';
  if (!active || new Date(subscription.current_period_end) < now) return 'abonnement_expire';
  if (scansThisMonth >= MONTHLY_SCAN_QUOTA[subscription.plan]) return 'quota_atteint';
  return null;
}

export const ACCESS_MESSAGES: Record<AccessProblem, string> = {
  abonnement_expire:
    "Votre essai ou votre abonnement est terminé. Abonnez-vous pour continuer l'analyse des photos.",
  quota_atteint:
    'Vous avez atteint le nombre de photos analysables ce mois-ci. Le compteur repart à zéro le 1er du mois.',
};

/** Début du mois civil en cours, à Bruxelles, au format ISO. */
export function startOfMonthBrussels(now: Date): string {
  const [year, month] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .split('-');
  // Minuit à Bruxelles : UTC+1 ou UTC+2. Une marge d'une heure ou deux est sans importance pour un quota.
  return `${year}-${month}-01T00:00:00+01:00`;
}
