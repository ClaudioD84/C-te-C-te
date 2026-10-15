import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';

import { childLines, recapEmail } from './recap.ts';

const week = {
  alias: 'Léo',
  effortDays: 4,
  minutes: 85,
  activities: 6,
  cards: 12,
  quizzes: 1,
  subjects: ['Éveil', 'Français'],
};

Deno.test('bilan : seulement ce qui a été fait', () => {
  assertEquals(childLines(week), [
    '4 jours de travail',
    '85 minutes au total',
    '6 activités terminées',
    '12 cartes revues',
    '1 quiz fait',
    'Matières travaillées : Éveil, Français',
  ]);
  assertEquals(
    childLines({ ...week, effortDays: 0, minutes: 0, activities: 0, cards: 0, quizzes: 0, subjects: [] }),
    [],
  );
});

Deno.test('e-mail : un bloc par enfant, encouragement, désinscription', () => {
  const { subject, text } = recapEmail([
    week,
    { ...week, alias: 'Koala', effortDays: 0, minutes: 0, activities: 0, cards: 0, quizzes: 0, subjects: [] },
  ]);
  assertEquals(subject, 'La semaine sur Côte à Côte');
  assertStringIncludes(text, 'Léo\n• 4 jours de travail');
  assertStringIncludes(text, 'Koala\n• Pas encore d’activité cette semaine.');
  assertStringIncludes(text, 'Pour ne plus recevoir ce bilan');
});
