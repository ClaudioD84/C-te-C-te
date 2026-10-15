import { formatShortDate, toIsoDate } from './dates';

/** Formules (cahier des charges, section 7). Les prix affichés viennent des stores quand ils sont connus. */
export type PaidPlan = 'solo' | 'famille';
export type BillingPeriod = 'mois' | 'annee';

export interface PlanOffer {
  plan: PaidPlan;
  period: BillingPeriod;
  title: string;
  /** Prix indicatif (TTC), remplacé par le prix du store dans l'application. */
  price: string;
  children: number;
}

export const PLAN_OFFERS: readonly PlanOffer[] = [
  { plan: 'solo', period: 'mois', title: 'Solo', price: '9,99 € par mois', children: 1 },
  { plan: 'famille', period: 'mois', title: 'Famille', price: '14,99 € par mois', children: 4 },
  {
    plan: 'solo',
    period: 'annee',
    title: 'Solo annuel',
    price: '79 € par an',
    children: 1,
  },
  {
    plan: 'famille',
    period: 'annee',
    title: 'Famille annuel',
    price: '119 € par an',
    children: 4,
  },
];

/** Nombre d'enfants par formule (aussi vérifié en base). */
export const CHILD_LIMITS: Record<'essai' | PaidPlan, number> = { essai: 4, solo: 1, famille: 4 };

export interface SubscriptionRow {
  plan: 'essai' | PaidPlan;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  current_period_end: string;
  will_renew: boolean;
  billing_issue: boolean;
  store: string | null;
}

export interface SubscriptionSummary {
  /** Accès aux fonctions d'IA (photos, fiches, dossiers de révision). */
  active: boolean;
  kind: 'essai' | 'abonne' | 'resilie' | 'paiement' | 'termine';
  daysLeft: number;
  title: string;
  detail: string;
  /** À signaler dans le cockpit (fin d'essai proche, paiement refusé, accès fermé). */
  urgent: boolean;
}

const PLAN_NAMES: Record<PaidPlan, string> = { solo: 'Solo', famille: 'Famille' };

export function summarizeSubscription(row: SubscriptionRow, now: Date): SubscriptionSummary {
  const end = new Date(row.current_period_end);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  const active = (row.status === 'trial' || row.status === 'active') && end > now;
  const until = formatShortDate(toIsoDate(end));

  if (!active) {
    return {
      active,
      kind: 'termine',
      daysLeft: 0,
      title: row.plan === 'essai' ? 'Essai terminé' : 'Abonnement terminé',
      detail: 'Abonnez-vous pour continuer à analyser les photos et préparer fiches et quiz.',
      urgent: true,
    };
  }
  if (row.plan === 'essai') {
    return {
      active,
      kind: 'essai',
      daysLeft,
      title: `Essai gratuit : ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`,
      detail: `Jusqu’au ${until} — aucun paiement n’est demandé pendant l’essai.`,
      urgent: daysLeft <= 3,
    };
  }
  const name = PLAN_NAMES[row.plan];
  if (row.billing_issue) {
    return {
      active,
      kind: 'paiement',
      daysLeft,
      title: `Formule ${name} : paiement refusé`,
      detail: 'Mettez à jour votre moyen de paiement dans les réglages de votre store pour garder l’accès.',
      urgent: true,
    };
  }
  if (!row.will_renew) {
    return {
      active,
      kind: 'resilie',
      daysLeft,
      title: `Formule ${name}`,
      detail: `Active jusqu’au ${until}, sans renouvellement`,
      urgent: daysLeft <= 3,
    };
  }
  return {
    active,
    kind: 'abonne',
    daysLeft,
    title: `Formule ${name}`,
    detail: `Prochain renouvellement : ${until}`,
    urgent: false,
  };
}
