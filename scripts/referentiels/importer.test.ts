import { assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import type { CurriculumFile } from '../../packages/shared/src/curriculum.ts';
import { toSql } from './importer.ts';

// Données fictives de test.
const file: CurriculumFile = {
  source: { title: "Référentiel d'essai", url: null, version: 'test' },
  level: 'primaire',
  entries: [
    { code: 'T-1', parentCode: 'T', kind: 'competence', subject: 'Test', grades: ['P3'], label: "Lire l'heure" },
    { code: 'T', parentCode: null, kind: 'domaine', subject: 'Test', grades: [], label: 'Domaine' },
  ],
};

Deno.test('génère des insertions idempotentes, parents en premier, apostrophes échappées', () => {
  const output = toSql([file]);
  assertStringIncludes(output, "Lire l''heure");
  assertStringIncludes(output, 'on conflict (version, code) do update');
  const parentPosition = output.indexOf("values ('T', null");
  const childPosition = output.indexOf("values ('T-1',");
  if (parentPosition < 0 || childPosition < parentPosition) throw new Error('Le parent doit précéder l’enfant');
});

Deno.test('refuse un code en double entre fichiers', () => {
  assertThrows(() => toSql([file, file]));
});
