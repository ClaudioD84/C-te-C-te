/**
 * Limitation de la conservation (RGPD) : durées décidées par l'éditeur.
 * - compte inactif depuis 24 mois : avertissement par e-mail, puis suppression 30 jours plus tard
 *   si le parent ne s'est pas reconnecté ;
 * - journal de l'effort (learning_event) : effacé après 2 ans.
 */
export const INACTIVITY_MONTHS = 24;
export const WARNING_NOTICE_DAYS = 30;
export const EFFORT_RETENTION_YEARS = 2;

export type RetentionDecision = 'keep' | 'warn' | 'delete';

export interface FamilyActivity {
  lastActiveAt: Date;
  warnedAt: Date | null;
  /** Abonnement payé en cours : le compte n'est jamais supprimé tant qu'il court. */
  paidUntil: Date | null;
}

export function inactivityLimit(now: Date): Date {
  const limit = new Date(now);
  limit.setUTCMonth(limit.getUTCMonth() - INACTIVITY_MONTHS);
  return limit;
}

export function deletionDate(warnedAt: Date): Date {
  return new Date(warnedAt.getTime() + WARNING_NOTICE_DAYS * 86_400_000);
}

export function retentionDecision(family: FamilyActivity, now: Date): RetentionDecision {
  if (family.paidUntil && family.paidUntil > now) return 'keep';
  if (family.lastActiveAt > inactivityLimit(now)) return 'keep';
  // Toute reconnexion efface l'avertissement (voir touch_family_activity) ; par prudence on revérifie.
  if (!family.warnedAt || family.lastActiveAt > family.warnedAt) return 'warn';
  return deletionDate(family.warnedAt) <= now ? 'delete' : 'keep';
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-BE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Brussels',
});

export function warningEmail(deleteOn: Date): { subject: string; text: string } {
  const date = DATE_FORMAT.format(deleteOn);
  return {
    subject: 'Votre compte Côte à Côte va être supprimé',
    text: [
      'Bonjour,',
      '',
      `Vous n'avez pas utilisé Côte à Côte depuis ${INACTIVITY_MONTHS} mois. Pour protéger les données de votre ` +
        `famille, votre compte et toutes ses données (profils, tâches, plannings, fiches) seront supprimés le ${date}.`,
      '',
      "Pour garder votre compte, il suffit d'ouvrir l'application et de vous connecter avant cette date.",
      '',
      "Si vous ne souhaitez plus utiliser Côte à Côte, vous n'avez rien à faire.",
      '',
      "L'équipe Côte à Côte",
    ].join('\n'),
  };
}
