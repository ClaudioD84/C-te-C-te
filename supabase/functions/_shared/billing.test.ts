import { assertEquals } from 'jsr:@std/assert@1';

import { decideFromEvent, stateFromSubscriber, type RevenueCatEvent } from './billing.ts';

const family = '2b5e8a5e-7c1a-4b51-9a40-1f7c2e0d9a11';
const now = new Date('2026-10-05T10:00:00Z');
const day = 24 * 3600 * 1000;
const event = (over: Partial<RevenueCatEvent>): RevenueCatEvent => ({
  id: 'evt-1',
  type: 'INITIAL_PURCHASE',
  app_user_id: family,
  entitlement_ids: ['solo'],
  product_id: 'cac_solo_mois',
  store: 'APP_STORE',
  environment: 'PRODUCTION',
  event_timestamp_ms: now.getTime(),
  expiration_at_ms: now.getTime() + 30 * day,
  ...over,
});
const options = { allowSandbox: false };

Deno.test('achat : formule active jusqu’à la date de fin, renouvelable', () => {
  const d = decideFromEvent(event({}), now, options);
  if (d.action !== 'apply') throw new Error(JSON.stringify(d));
  assertEquals(d.familyId, family);
  assertEquals(d.state.plan, 'solo');
  assertEquals(d.state.status, 'active');
  assertEquals(d.state.willRenew, true);
  assertEquals(d.state.store, 'app_store');
});

Deno.test('Famille l’emporte sur Solo', () => {
  const d = decideFromEvent(event({ entitlement_ids: ['solo', 'famille'] }), now, options);
  assertEquals(d.action === 'apply' && d.state.plan, 'famille');
});

Deno.test('résiliation : accès gardé jusqu’à la fin, sans renouvellement', () => {
  const d = decideFromEvent(event({ type: 'CANCELLATION' }), now, options);
  if (d.action !== 'apply') throw new Error();
  assertEquals([d.state.status, d.state.willRenew], ['active', false]);
});

Deno.test('remboursement (fin dans le passé) et expiration : accès fermé', () => {
  const refund = decideFromEvent(
    event({ type: 'CANCELLATION', expiration_at_ms: now.getTime() - 1000 }),
    now,
    options,
  );
  assertEquals(refund.action === 'apply' && refund.state.status, 'expired');
  const expired = decideFromEvent(event({ type: 'EXPIRATION' }), now, options);
  assertEquals(expired.action === 'apply' && expired.state.status, 'expired');
});

Deno.test('problème de paiement : délai de grâce, accès ouvert', () => {
  const d = decideFromEvent(event({ type: 'BILLING_ISSUE' }), now, options);
  if (d.action !== 'apply') throw new Error();
  assertEquals([d.state.status, d.state.billingIssue], ['active', true]);
});

Deno.test('ignorés : test, sandbox refusée, acheteur anonyme, type inconnu', () => {
  assertEquals(decideFromEvent(event({ type: 'TEST' }), now, options).action, 'ignore');
  assertEquals(decideFromEvent(event({ environment: 'SANDBOX' }), now, options).action, 'ignore');
  assertEquals(
    decideFromEvent(event({ environment: 'SANDBOX' }), now, { allowSandbox: true }).action,
    'apply',
  );
  assertEquals(
    decideFromEvent(
      event({ app_user_id: '$RCAnonymousID:abc', original_app_user_id: '$RCAnonymousID:abc' }),
      now,
      options,
    ).action,
    'ignore',
  );
  assertEquals(decideFromEvent(event({ type: 'SUBSCRIBER_ALIAS' }), now, options).action, 'ignore');
});

Deno.test('acheteur identifié après coup : la famille est trouvée dans les alias', () => {
  const d = decideFromEvent(
    event({ app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', family] }),
    now,
    options,
  );
  assertEquals(d.action === 'apply' && d.familyId, family);
});

Deno.test('formule annuelle : abonnement renouvelable comme les autres', () => {
  const d = decideFromEvent(
    event({
      product_id: 'cac_famille_annee',
      entitlement_ids: ['famille'],
      expiration_at_ms: now.getTime() + 365 * day,
    }),
    now,
    options,
  );
  if (d.action !== 'apply') throw new Error();
  assertEquals(
    [d.state.plan, d.state.willRenew, d.state.currentPeriodEnd.slice(0, 10)],
    ['famille', true, '2027-10-05'],
  );
});

Deno.test('achat sans date de fin : ignoré', () => {
  assertEquals(decideFromEvent(event({ expiration_at_ms: null }), now, options).action, 'ignore');
});

Deno.test('transfert : les familles concernées sont relues dans RevenueCat', () => {
  const d = decideFromEvent(
    event({ type: 'TRANSFER', transferred_from: [family], transferred_to: ['$RCAnonymousID:x'] }),
    now,
    options,
  );
  assertEquals(d.action === 'refresh' && d.familyIds, [family]);
});

Deno.test('état lu dans RevenueCat', () => {
  const state = stateFromSubscriber(
    {
      subscriber: {
        entitlements: {
          solo: { expires_date: '2026-09-01T00:00:00Z', product_identifier: 'cac_solo_mois' },
          famille: { expires_date: '2026-11-05T00:00:00Z', product_identifier: 'cac_famille_mois' },
        },
        subscriptions: {
          cac_famille_mois: {
            expires_date: '2026-11-05T00:00:00Z',
            store: 'play_store',
            unsubscribe_detected_at: '2026-10-01T00:00:00Z',
          },
        },
      },
    },
    now,
  );
  assertEquals(state, {
    plan: 'famille',
    status: 'active',
    currentPeriodEnd: '2026-11-05T00:00:00Z',
    willRenew: false,
    billingIssue: false,
    store: 'play_store',
    productId: 'cac_famille_mois',
  });
  assertEquals(stateFromSubscriber({ subscriber: { entitlements: {}, subscriptions: {} } }, now), null);
});
