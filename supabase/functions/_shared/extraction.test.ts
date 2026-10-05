import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import { buildContext, parseExtraction, todayInBrussels } from './extraction.ts';

const valid = {
  documentType: 'journal_de_classe',
  tasks: [
    {
      subject: 'Mathématiques',
      kind: 'interro',
      description: 'Étudier les tables de 7',
      dueDate: '2026-10-09',
      reference: null,
      confidence: 0.934,
    },
    {
      subject: 'Français',
      kind: 'devoir',
      description: 'Exercices',
      dueDate: '2026-02-30',
      reference: 'p. 12',
      confidence: 0.5,
    },
  ],
};

Deno.test('réponse valide : dates impossibles retirées, confiance arrondie', () => {
  const result = parseExtraction(JSON.stringify(valid));
  assertEquals(result.tasks[0].confidence, 0.93);
  assertEquals(result.tasks[0].dueDate, '2026-10-09');
  assertEquals(result.tasks[1].dueDate, null);
});

Deno.test('interrogation corrigée : notions à retravailler, 3 au plus, échéance par défaut à 7 jours', () => {
  const notion = (n: number, dueDate: string | null = null) => ({
    subject: 'Français',
    kind: 'lecon',
    description: `Retravailler : notion ${n}`,
    dueDate,
    reference: null,
    confidence: 0.8,
    remediation: true,
  });
  const result = parseExtraction(
    JSON.stringify({
      documentType: 'interrogation',
      tasks: [
        { ...valid.tasks[1], dueDate: null, remediation: false },
        notion(1),
        notion(2, '2026-10-12'),
        notion(3),
        notion(4),
      ],
    }),
    new Date('2026-10-08T10:00:00Z'),
  );
  assertEquals(
    result.tasks.map((t) => [t.description, t.dueDate]),
    [
      ['Exercices', null],
      ['Retravailler : notion 1', '2026-10-15'],
      ['Retravailler : notion 2', '2026-10-12'],
      ['Retravailler : notion 3', '2026-10-15'],
    ],
  );
});

Deno.test('réponse invalide : erreur', () => {
  assertThrows(() => parseExtraction('{"documentType":"journal_de_classe","tasks":[{"kind":"autre"}]}'));
  assertThrows(() => parseExtraction('pas du json'));
});

Deno.test('date du jour à Bruxelles, y compris tard le soir en UTC', () => {
  assertEquals(todayInBrussels(new Date('2026-10-08T22:30:00Z')).iso, '2026-10-09');
  assertStringIncludes(todayInBrussels(new Date('2026-10-08T10:00:00Z')).label, 'jeudi 8 octobre 2026');
});

Deno.test('contexte : niveau et date, sans données personnelles', () => {
  const context = buildContext('P4', 'journal_de_classe', new Date('2026-10-08T10:00:00Z'));
  assertStringIncludes(context, '4e primaire');
  assertStringIncludes(context, '2026-10-08');
  assertStringIncludes(context, 'journal de classe');
});
