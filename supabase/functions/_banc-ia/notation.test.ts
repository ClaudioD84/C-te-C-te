import { assertAlmostEquals, assertEquals } from 'jsr:@std/assert@1';

import { checkPack, percent, scorePhoto, spread, type PhotoCase } from './notation.ts';

const page: PhotoCase = {
  id: 'exemple',
  grade: 'P5',
  documentType: 'journal_de_classe',
  today: '2026-10-12',
  tasks: [
    { subject: 'Mathématiques', kind: 'devoir', keywords: ['exercices'], dueDate: '2026-10-13' },
    { subject: 'Éveil', kind: 'interro', keywords: ['fleuves'], dueDate: '2026-10-16' },
  ],
  spellingWords: ['le château', 'une forêt'],
};

Deno.test('réponses parfaites (oracle) : 100 % partout', () => {
  const score = scorePhoto(page, {
    tasks: [
      {
        subject: 'mathematiques',
        kind: 'devoir',
        description: 'Faire les EXERCICES p. 12',
        dueDate: '2026-10-13',
      },
      { subject: 'Eveil', kind: 'interro', description: 'Les fleuves de Belgique', dueDate: '2026-10-16' },
    ],
    spellingWords: ['le château', 'Une forêt'],
  });
  assertEquals([score.recall, score.precision, score.dateAccuracy, score.spellingRecall], [1, 1, 1, 1]);
});

Deno.test('réponse vide (nul) : rien de retrouvé', () => {
  const score = scorePhoto(page, { tasks: [] });
  assertEquals([score.recall, score.found, score.dateAccuracy, score.spellingRecall], [0, 0, null, 0]);
  // Rien d'inventé : la précision d'une liste vide vaut 1, d'où l'importance de lire le rappel.
  assertEquals(score.precision, 1);
});

Deno.test('erreurs typiques : devoir inventé, mauvais type, mauvaise date', () => {
  const score = scorePhoto(page, {
    tasks: [
      { subject: 'Mathématiques', kind: 'devoir', description: 'Exercices', dueDate: '2026-10-14' },
      { subject: 'Éveil', kind: 'lecon', description: 'Les fleuves', dueDate: '2026-10-16' },
      { subject: 'Français', kind: 'devoir', description: 'Lire un livre', dueDate: null },
    ],
  });
  assertEquals([score.found, score.matched, score.datesRight], [1, 1, 0]);
  assertAlmostEquals(score.recall, 0.5);
  assertAlmostEquals(score.precision, 1 / 3);
});

Deno.test('passages répétés : moyenne et écart', () => {
  assertEquals(percent(spread([1, 0.5, null])), '75 % (50–100)');
  assertEquals(percent(spread([null])), '—');
});

Deno.test('fiche : vide ou trop maigre signalée', () => {
  const empty = { topicUnclear: false, fiche: null, quiz: [], exercises: [], flashcards: [] };
  assertEquals(checkPack(empty).ok, false);
  const full = {
    topicUnclear: false,
    fiche: { sections: [{}] },
    quiz: [1, 2, 3],
    exercises: [],
    flashcards: [1, 2, 3],
  };
  assertEquals(checkPack(full), { ok: true, problems: [] });
});
