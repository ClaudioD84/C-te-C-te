import { assertAlmostEquals, assertEquals } from 'jsr:@std/assert@1';

import { estimateCostUsd } from './pricing.ts';

Deno.test('coût d’une analyse avec cache', () => {
  const cost = estimateCostUsd('claude-opus-5-5', {
    input_tokens: 1_000,
    output_tokens: 500,
    cache_read_input_tokens: 2_000,
    cache_creation_input_tokens: 0,
  });
  // 1000 × 4 + 2000 × 0,2 + 500 × 20 = 14 400 → 0,0144 $
  assertAlmostEquals(cost, 0.0144);
});

Deno.test('modèle de secours (refus) : son propre tarif', () => {
  // 1000 × 5 + 1000 × 25 = 30 000 → 0,03 $
  assertAlmostEquals(estimateCostUsd('claude-opus-5', { input_tokens: 1_000, output_tokens: 1_000 }), 0.03);
  assertAlmostEquals(
    estimateCostUsd('claude-haiku-5-5', { input_tokens: 10_000, output_tokens: 2_000 }),
    0.002,
  );
});

Deno.test('modèle inconnu : compté au tarif le plus élevé, jamais à zéro', () => {
  assertEquals(estimateCostUsd('modele-inconnu', { input_tokens: 1_000, output_tokens: 1_000 }), 0.03);
});
