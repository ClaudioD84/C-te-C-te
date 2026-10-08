import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';

import { deletionDate, retentionDecision, warningEmail } from './retention.ts';

const now = new Date('2026-10-05T03:00:00Z');
const d = (iso: string) => new Date(iso);

Deno.test('compte actif depuis moins de 24 mois : conservé', () => {
  assertEquals(
    retentionDecision({ lastActiveAt: d('2024-10-06T00:00:00Z'), warnedAt: null, paidUntil: null }, now),
    'keep',
  );
});

Deno.test('inactif depuis 24 mois : avertissement', () => {
  assertEquals(
    retentionDecision({ lastActiveAt: d('2024-10-04T00:00:00Z'), warnedAt: null, paidUntil: null }, now),
    'warn',
  );
});

Deno.test('averti il y a moins de 30 jours : on attend', () => {
  assertEquals(
    retentionDecision(
      { lastActiveAt: d('2024-08-01T00:00:00Z'), warnedAt: d('2026-09-10T03:00:00Z'), paidUntil: null },
      now,
    ),
    'keep',
  );
});

Deno.test('averti il y a 30 jours sans reconnexion : suppression', () => {
  assertEquals(
    retentionDecision(
      { lastActiveAt: d('2024-08-01T00:00:00Z'), warnedAt: d('2026-09-05T03:00:00Z'), paidUntil: null },
      now,
    ),
    'delete',
  );
});

Deno.test('abonnement payé en cours : jamais supprimé', () => {
  assertEquals(
    retentionDecision(
      {
        lastActiveAt: d('2024-01-01T00:00:00Z'),
        warnedAt: d('2026-08-01T00:00:00Z'),
        paidUntil: d('2026-11-01T00:00:00Z'),
      },
      now,
    ),
    'keep',
  );
});

Deno.test("l'e-mail annonce la date de suppression", () => {
  const email = warningEmail(deletionDate(d('2026-10-05T03:00:00Z')));
  assertStringIncludes(email.text, '4 novembre 2026');
});
