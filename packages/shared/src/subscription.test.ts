import { describe, expect, it } from 'vitest';

import { summarizeSubscription, type SubscriptionRow } from './subscription';

const now = new Date('2026-10-05T10:00:00Z');
const row = (over: Partial<SubscriptionRow>): SubscriptionRow => ({
  plan: 'essai',
  status: 'trial',
  current_period_end: '2026-10-15T10:00:00Z',
  will_renew: false,
  billing_issue: false,
  store: null,
  ...over,
});

describe('summarizeSubscription', () => {
  it('essai : jours restants, urgent les 3 derniers jours', () => {
    expect(summarizeSubscription(row({}), now)).toMatchObject({
      kind: 'essai',
      active: true,
      daysLeft: 10,
      urgent: false,
    });
    expect(summarizeSubscription(row({ current_period_end: '2026-10-07T09:00:00Z' }), now)).toMatchObject({
      daysLeft: 2,
      urgent: true,
      title: 'Essai gratuit : 2 jours restants',
    });
  });

  it('essai ou abonnement échu : accès fermé', () => {
    expect(summarizeSubscription(row({ current_period_end: '2026-10-01T00:00:00Z' }), now)).toMatchObject({
      active: false,
      kind: 'termine',
      title: 'Essai terminé',
    });
    expect(summarizeSubscription(row({ plan: 'solo', status: 'expired' }), now)).toMatchObject({
      active: false,
      title: 'Abonnement terminé',
    });
  });

  it('abonné, résilié, paiement refusé', () => {
    const paid = { plan: 'famille', status: 'active', current_period_end: '2026-11-05T10:00:00Z' } as const;
    expect(summarizeSubscription(row({ ...paid, will_renew: true }), now)).toMatchObject({
      kind: 'abonne',
      urgent: false,
    });
    expect(summarizeSubscription(row({ ...paid }), now)).toMatchObject({ kind: 'resilie', active: true });
    expect(summarizeSubscription(row({ ...paid, will_renew: true, billing_issue: true }), now)).toMatchObject(
      {
        kind: 'paiement',
        active: true,
        urgent: true,
      },
    );
  });
});
