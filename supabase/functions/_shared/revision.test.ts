import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import { buildRevisionRequest, parseThemes } from './revision.ts';

Deno.test('requête : épreuve, matières, jours et attendus', () => {
  const text = buildRevisionRequest({
    grade: 'P6',
    examType: 'ceb',
    subjects: ['Français', 'Mathématiques'],
    revisionDays: 20,
    curriculum: [{ subject: 'Mathématiques', label: 'Comparer des fractions' }],
  });
  assertStringIncludes(text, '6e primaire');
  assertStringIncludes(text, 'CEB');
  assertStringIncludes(text, 'Jours de révision disponibles : 20');
  assertStringIncludes(text, '[Mathématiques] Comparer des fractions');
});

Deno.test('thèmes : matières non demandées écartées', () => {
  const text = JSON.stringify({
    themes: [
      { subject: 'Français', title: 'Accords', description: "Revois l'accord du participe passé." },
      { subject: 'Latin', title: 'Déclinaisons', description: 'Revois rosa.' },
    ],
  });
  assertEquals(parseThemes(text, ['Français']).themes.length, 1);
  assertThrows(() => parseThemes(text, ['Histoire']));
});
