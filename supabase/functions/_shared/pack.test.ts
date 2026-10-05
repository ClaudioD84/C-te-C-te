import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import { buildPackRequest, curriculumSubjects, parsePack } from './pack.ts';

const valid = {
  topicUnclear: false,
  fiche: {
    title: 'Les fleuves de Belgique',
    sections: [{ heading: 'La Meuse', points: ['Traverse Liège'] }],
    keyTerms: [],
  },
  quiz: [
    {
      question: 'Quel fleuve traverse Liège ?',
      choices: ['La Meuse', "L'Escaut"],
      answerIndex: 0,
      explanation: 'Liège est sur la Meuse.',
    },
  ],
  exercises: [],
  flashcards: [{ front: 'Fleuve de Liège', back: 'La Meuse' }],
};

Deno.test('paquet valide accepté', () => {
  assertEquals(parsePack(JSON.stringify(valid)).quiz.length, 1);
});

Deno.test('bonne réponse hors des choix refusée', () => {
  assertThrows(() => parsePack(JSON.stringify({ ...valid, quiz: [{ ...valid.quiz[0], answerIndex: 3 }] })));
});

Deno.test('requête : niveau, tâche, adaptations et référentiel, sans données personnelles', () => {
  const text = buildPackRequest({
    grade: 'P5',
    track: 'general',
    needs: ['dyslexie'],
    task: {
      subject: 'Éveil',
      kind: 'interro',
      description: 'Revoir les fleuves de Belgique',
      reference: 'p. 12',
    },
    curriculum: ['Situer les principaux cours d’eau'],
  });
  assertStringIncludes(text, '5e primaire');
  assertStringIncludes(text, 'Revoir les fleuves de Belgique (p. 12)');
  assertStringIncludes(text, 'pas de pièges orthographiques');
  // Minimisation : le trouble n'est pas nommé.
  if (/dyslexie|tdah|dyscalculie/i.test(text)) throw new Error('Donnée de santé envoyée à l’IA');
  assertStringIncludes(text, 'Situer les principaux cours');
});

Deno.test('correspondance des matières avec le référentiel', () => {
  assertEquals(curriculumSubjects('Éveil'), ['Sciences', 'Formation historique et géographique']);
  assertEquals(curriculumSubjects('Histoire'), ['Formation historique et géographique']);
  assertEquals(curriculumSubjects('Éducation physique'), ['Éducation physique']);
  assertEquals(curriculumSubjects('Sciences humaines'), ['Formation historique et géographique']);
  assertEquals(curriculumSubjects('Néerlandais'), ['Langue moderne']);
  assertEquals(curriculumSubjects('Mathématiques'), ['Mathématiques']);
  assertEquals(curriculumSubjects('Conjugaison'), ['Français']);
  assertEquals(curriculumSubjects('Religion'), ['Religion']);
  assertEquals(curriculumSubjects('Sciences économiques'), ['Formation historique et géographique']);
  assertEquals(curriculumSubjects('Sciences générales'), ['Sciences']);
  assertEquals(curriculumSubjects('Informatique'), ['Formation manuelle et technique']);
  assertEquals(curriculumSubjects('Latin'), ['Français']);
});
