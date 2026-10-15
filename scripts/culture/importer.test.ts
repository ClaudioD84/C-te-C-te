import { assertStringIncludes } from 'jsr:@std/assert@1';

import { toSql } from './importer.ts';

// Contenu fictif de test.
Deno.test('génère une insertion idempotente avec apostrophes échappées', () => {
  const output = toSql([
    {
      code: 'test-1',
      kind: 'musee',
      title: "Musée d'essai",
      description: 'Fictif.',
      url: null,
      place: 'Namur',
      subjects: ['Éveil'],
      grades: ['P5'],
      verifiedOn: '2026-10-05',
    },
  ]);
  assertStringIncludes(output, "Musée d''essai");
  assertStringIncludes(output, 'on conflict (code) do update');
});
