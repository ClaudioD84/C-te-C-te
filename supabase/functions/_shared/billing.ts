/**
 * Abonnements (F13) : traduction des données RevenueCat en état d'abonnement d'une famille.
 * Fonctions pures, testées sans réseau.
 *
 * - L'acheteur RevenueCat (« app_user_id ») est l'identifiant de la famille.
 * - Droits (« entitlements ») : `solo` et `famille` ; Famille l'emporte si les deux sont actifs.
 */

export type PaidPlan = 'solo' | 'famille';
export type Store = 'app_store' | 'play_store' | 'promotional' | 'simulation';

export interface SubscriptionState {
  plan: PaidPlan;
  status: 'active' | 'expired';
  currentPeriodEnd: string;
  willRenew: boolean;
  billingIssue: boolean;
  store: Store | null;
  productId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFamilyId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function planFromEntitlements(ids: readonly string[] | null | undefined): PaidPlan | null {
  if (!ids) return null;
  if (ids.includes('famille')) return 'famille';
  if (ids.includes('solo')) return 'solo';
  return null;
}

export function storeFrom(value: unknown): Store | null {
  switch (String(value ?? '').toUpperCase()) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
    case 'APP_STORE_SANDBOX':
      return 'app_store';
    case 'PLAY_STORE':
      return 'play_store';
    case 'PROMOTIONAL':
      return 'promotional';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Événements du webhook
// ---------------------------------------------------------------------------

export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  store?: string | null;
  environment?: string;
  event_timestamp_ms?: number;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
}

export type EventDecision =
  | { action: 'ignore'; reason: string }
  | { action: 'apply'; familyId: string; state: SubscriptionState; eventAt: string }
  /** Transfert d'achats entre comptes : l'état exact se lit dans RevenueCat. */
  | { action: 'refresh'; familyIds: string[]; eventAt: string };

const GRANTING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

/** Famille concernée : l'acheteur, ou l'un de ses alias s'il a été identifié après l'achat. */
function familyOf(event: RevenueCatEvent): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return candidates.find(isFamilyId) ?? null;
}

export function decideFromEvent(
  event: RevenueCatEvent,
  now: Date,
  options: { allowSandbox: boolean },
): EventDecision {
  if (event.type === 'TEST') return { action: 'ignore', reason: 'événement de test' };
  if (event.environment === 'SANDBOX' && !options.allowSandbox)
    return { action: 'ignore', reason: 'achat de test (sandbox)' };

  const eventAt = new Date(event.event_timestamp_ms ?? now.getTime()).toISOString();

  if (event.type === 'TRANSFER') {
    const familyIds = [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter(isFamilyId);
    return familyIds.length > 0
      ? { action: 'refresh', familyIds, eventAt }
      : { action: 'ignore', reason: 'transfert sans famille connue' };
  }

  const familyId = familyOf(event);
  if (!familyId)
    return { action: 'ignore', reason: 'acheteur inconnu (identifiant non relié à une famille)' };

  const plan = planFromEntitlements(event.entitlement_ids);
  if (!plan) return { action: 'ignore', reason: 'aucun droit Solo ou Famille' };

  const expiration = event.expiration_at_ms != null ? new Date(event.expiration_at_ms).toISOString() : null;
  if (!expiration) return { action: 'ignore', reason: 'date de fin inconnue' };

  const base = {
    plan,
    currentPeriodEnd: expiration,
    store: storeFrom(event.store),
    productId: event.product_id ?? null,
  };
  const activeUntilEnd = new Date(expiration) > now ? 'active' : 'expired';

  switch (event.type) {
    case 'CANCELLATION':
      // Résiliation (ou remboursement) : accès jusqu'à la date de fin, sans renouvellement.
      return {
        action: 'apply',
        familyId,
        eventAt,
        state: { ...base, status: activeUntilEnd, willRenew: false, billingIssue: false },
      };
    case 'BILLING_ISSUE':
      return {
        action: 'apply',
        familyId,
        eventAt,
        state: { ...base, status: activeUntilEnd, willRenew: true, billingIssue: true },
      };
    case 'EXPIRATION':
      return {
        action: 'apply',
        familyId,
        eventAt,
        state: { ...base, status: 'expired', willRenew: false, billingIssue: false },
      };
    default:
      if (!GRANTING.has(event.type)) return { action: 'ignore', reason: `type non traité : ${event.type}` };
      return {
        action: 'apply',
        familyId,
        eventAt,
        state: {
          ...base,
          status: activeUntilEnd,
          willRenew: event.type !== 'NON_RENEWING_PURCHASE' && event.type !== 'TEMPORARY_ENTITLEMENT_GRANT',
          billingIssue: false,
        },
      };
  }
}

// ---------------------------------------------------------------------------
// État lu dans RevenueCat (API REST v1, GET /subscribers/{id}) : source de vérité
// ---------------------------------------------------------------------------

interface RcEntitlement {
  expires_date: string | null;
  purchase_date?: string;
  product_identifier: string;
}

interface RcSubscription {
  expires_date: string | null;
  store?: string;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
}

export interface RcSubscriber {
  subscriber: {
    entitlements: Record<string, RcEntitlement>;
    subscriptions: Record<string, RcSubscription>;
  };
}

/** État d'après RevenueCat ; null si la famille n'a jamais eu de droit Solo ou Famille. */
export function stateFromSubscriber(body: RcSubscriber, now: Date): SubscriptionState | null {
  const entries = (['famille', 'solo'] as const)
    .map((plan) => ({ plan, entitlement: body.subscriber.entitlements[plan] }))
    .filter((e): e is { plan: PaidPlan; entitlement: RcEntitlement } => Boolean(e.entitlement));
  if (entries.length === 0) return null;

  // Sans date de fin : droit accordé à vie (ex. promotion accordée depuis RevenueCat).
  const endOf = (e: RcEntitlement) => e.expires_date ?? '9999-12-31T23:59:59.000Z';
  const isActive = (e: RcEntitlement) => new Date(endOf(e)) > now;

  // Droit actif le plus élevé ; sinon le plus récemment expiré.
  const chosen =
    entries.find((e) => isActive(e.entitlement)) ??
    [...entries].sort((a, b) => endOf(b.entitlement).localeCompare(endOf(a.entitlement)))[0]!;
  const end = endOf(chosen.entitlement);
  const subscription = body.subscriber.subscriptions[chosen.entitlement.product_identifier];

  return {
    plan: chosen.plan,
    status: new Date(end) > now ? 'active' : 'expired',
    currentPeriodEnd: end,
    willRenew: Boolean(
      subscription && !subscription.unsubscribe_detected_at && chosen.entitlement.expires_date,
    ),
    billingIssue: Boolean(subscription?.billing_issues_detected_at),
    store: storeFrom(subscription?.store),
    productId: chosen.entitlement.product_identifier,
  };
}

/** Colonnes de la table `subscription`. */
export function toRow(state: SubscriptionState, eventAt: string) {
  return {
    plan: state.plan,
    status: state.status,
    current_period_end: state.currentPeriodEnd,
    will_renew: state.willRenew,
    billing_issue: state.billingIssue,
    store: state.store,
    product_id: state.productId,
    last_event_at: eventAt,
    updated_at: new Date().toISOString(),
  };
}
