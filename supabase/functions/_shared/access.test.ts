import { assertEquals } from 'jsr:@std/assert@1';

import { checkScanAccess, MONTHLY_SCAN_QUOTA, startOfMonthBrussels } from './access.ts';

const now = new Date('2026-10-08T10:00:00Z');
const future = '2026-10-20T00:00:00Z';

Deno.test('essai en cours : accès autorisé', () => {
  assertEquals(checkScanAccess({ plan: 'essai', status: 'trial', current_period_end: future }, 3, now), null);
});

Deno.test('essai terminé : accès refusé', () => {
  assertEquals(
    checkScanAccess({ plan: 'essai', status: 'trial', current_period_end: '2026-10-01T00:00:00Z' }, 0, now),
    'abonnement_expire',
  );
});

Deno.test('abonnement annulé ou absent : accès refusé', () => {
  assertEquals(
    checkScanAccess({ plan: 'solo', status: 'cancelled', current_period_end: future }, 0, now),
    'abonnement_expire',
  );
  assertEquals(checkScanAccess(null, 0, now), 'abonnement_expire');
});

Deno.test('quota mensuel atteint', () => {
  assertEquals(
    checkScanAccess(
      { plan: 'solo', status: 'active', current_period_end: future },
      MONTHLY_SCAN_QUOTA.solo,
      now,
    ),
    'quota_atteint',
  );
});

Deno.test('début du mois à Bruxelles', () => {
  assertEquals(startOfMonthBrussels(new Date('2026-10-31T23:30:00Z')), '2026-11-01T00:00:00+01:00');
  assertEquals(startOfMonthBrussels(now), '2026-10-01T00:00:00+01:00');
});
