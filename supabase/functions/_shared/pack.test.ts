import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import { buildPackRequest, curriculumSubjects, parsePack, parsePackResponse } from './pack.ts';

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

Deno.test('rattachement au programme : numéro de l’attendu converti en indice', () => {
  const answer = (curriculumMatch: number | null) => JSON.stringify({ ...valid, curriculumMatch });
  assertEquals(parsePackResponse(answer(2), 3).curriculumIndex, 1);
  assertEquals(parsePackResponse(answer(null), 3).curriculumIndex, null);
  // Numéro hors de la liste envoyée (ou liste vide) : pas de rattachement.
  assertEquals(parsePackResponse(answer(4), 3).curriculumIndex, null);
  assertEquals(parsePackResponse(answer(0), 3).curriculumIndex, null);
  assertEquals(parsePackResponse(answer(1), 0).curriculumIndex, null);
  // Le numéro ne fait pas partie du contenu enregistré.
  assertEquals('curriculumMatch' in parsePackResponse(answer(2), 3).content, false);
});

Deno.test('les attendus sont numérotés dans la demande', () => {
  const text = buildPackRequest({
    grade: 'P5',
    track: 'general',
    needs: [],
    task: { subject: 'Éveil', kind: 'lecon', description: 'Les fleuves', reference: null },
    curriculum: ['Situer les principaux cours d’eau', 'Lire une carte'],
  });
  assertStringIncludes(text, '1. Situer les principaux cours d’eau');
  assertStringIncludes(text, '2. Lire une carte');
});

Deno.test('examen blanc : consignes dédiées seulement pour ces tâches', () => {
  const request = (description: string) =>
    buildPackRequest({
      grade: 'P6',
      track: 'general',
      needs: [],
      task: { subject: 'Mathématiques', kind: 'examen', description, reference: null },
      curriculum: [],
    });
  assertStringIncludes(request('Examen blanc de Mathématiques : Les fractions, Les aires'), 'EXAMEN BLANC');
  assertEquals(request('Révision générale de Mathématiques').includes('EXAMEN BLANC'), false);
});
