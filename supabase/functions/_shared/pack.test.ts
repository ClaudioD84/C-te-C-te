import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import {
  buildPackRequest,
  curriculumSubjects,
  interestLabels,
  parsePack,
  parsePackResponse,
} from './pack.ts';

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

Deno.test('exercices : réponses acceptées gardées, liste vide pour un paquet ancien', () => {
  const exercise = { instruction: 'Calcule.', prompt: '3 + 5', answer: '8, car 3 + 5 = 8.', hint: null };
  const withAccepted = parsePack(
    JSON.stringify({ ...valid, exercises: [{ ...exercise, accepted: ['8', 'huit'] }] }),
  );
  assertEquals(withAccepted.exercises[0]!.accepted, ['8', 'huit']);
  // Paquet enregistré avant ce champ (réutilisé ou relu par « réexpliquer ») : exercice à comparer soi-même.
  assertEquals(parsePack(JSON.stringify({ ...valid, exercises: [exercise] })).exercises[0]!.accepted, []);
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

Deno.test('remédiation : erreurs de la copie et exercices guidés puis en autonomie demandés', () => {
  const base = {
    grade: 'P5',
    track: 'general',
    needs: [],
    curriculum: [],
  };
  const task = {
    subject: 'Français',
    kind: 'lecon',
    description: "Retravailler : l'accord du participe passé",
    reference: null,
  };
  const text = buildPackRequest({
    ...base,
    task: {
      ...task,
      remediation: {
        errors: [
          { question: 'Accorde : les fleurs (cueilli)', childAnswer: 'cueilli', correction: 'cueillies' },
          { question: 'Accorde : elles sont (parti)', childAnswer: null, correction: null },
        ],
      },
    },
  });
  assertStringIncludes(text, 'REMÉDIATION');
  assertStringIncludes(text, 'GUIDÉS');
  assertStringIncludes(text, 'EN AUTONOMIE');
  assertStringIncludes(
    text,
    "1. Question : Accorde : les fleurs (cueilli) — Réponse de l'élève : cueilli — Correction : cueillies",
  );
  assertStringIncludes(text, "Réponse de l'élève : illisible — Correction : non écrite");
  // Une leçon ordinaire ne demande pas d'exercices guidés.
  const plain = buildPackRequest({ ...base, task: { ...task, remediation: null } });
  if (plain.includes('REMÉDIATION')) throw new Error('Remédiation demandée sans erreurs');
});

Deno.test('exercice guidé : étapes gardées, liste vide pour un paquet ancien', () => {
  const exercise = {
    instruction: 'Accorde.',
    prompt: 'Les fleurs (cueilli)',
    accepted: ['cueillies'],
    answer: 'cueillies',
    hint: null,
  };
  const guided = parsePack(
    JSON.stringify({
      ...valid,
      exercises: [{ ...exercise, steps: ['Trouve le sujet.', 'Accorde avec lui.'] }],
    }),
  );
  assertEquals(guided.exercises[0]!.steps, ['Trouve le sujet.', 'Accorde avec lui.']);
  assertEquals(parsePack(JSON.stringify({ ...valid, exercises: [exercise] })).exercises[0]!.steps, []);
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

Deno.test('centres d’intérêt : liste fermée, 3 au plus, glissés dans la demande', () => {
  assertEquals(interestLabels(['espace', 'inconnu', 'espace', 'football', 'mer', 'cuisine']), [
    "l'espace et les planètes",
    'le football',
    'la mer et les océans',
  ]);
  assertEquals(interestLabels('espace'), []);
  assertEquals(interestLabels(undefined), []);
  const request = buildPackRequest({
    grade: 'P4',
    track: 'general',
    needs: [],
    task: { subject: 'Mathématiques', kind: 'lecon', description: 'Les fractions', reference: null },
    curriculum: [],
    interests: ['les dinosaures'],
  });
  assertStringIncludes(request, "Centres d'intérêt de l'élève : les dinosaures.");
});

Deno.test(
  'empreinte de demande : stable aux espaces et majuscules, différente si la demande change',
  async () => {
    const { packRequestKey } = await import('./pack.ts');
    const a = await packRequestKey('Élève en 5e primaire.\nTâche : Étudier les tables de 7.');
    assertEquals(a, await packRequestKey('  élève en 5e primaire.   tâche : étudier les tables de 7. '));
    assertEquals(a.length, 64);
    const other = await packRequestKey('Élève en 5e primaire.\nTâche : Étudier les tables de 8.');
    assertEquals(a === other, false);
  },
);

Deno.test('niveau et filière : registre, types de questions et quantités adaptés', () => {
  const request = (grade: string, track: string, subject: string) =>
    buildPackRequest({
      grade,
      track,
      needs: [],
      task: { subject, kind: 'lecon', description: 'Étudier le vocabulaire de la maison', reference: null },
      curriculum: [],
    });

  // 3e secondaire, néerlandais : registre d'adolescent, plus de questions, travail dans la langue étudiée.
  const teen = request('S3', 'general', 'Néerlandais');
  assertStringIncludes(teen, '2e degré du secondaire');
  assertStringIncludes(teen, 'jamais enfantin');
  assertStringIncludes(teen, 'quiz 8 à 10 questions');
  assertStringIncludes(teen, 'DANS la langue étudiée');
  assertStringIncludes(teen, 'A2 vers B1');
  assertStringIncludes(teen, 'Enseignement général');

  const technique = request('S3', 'technique', 'Néerlandais');
  assertStringIncludes(technique, 'Enseignement technique');
  const professionnel = request('S5', 'professionnel', 'Mathématiques');
  assertStringIncludes(professionnel, 'sans infantiliser');
  assertStringIncludes(professionnel, '3e degré du secondaire');
  if (professionnel.includes('langue étudiée')) throw new Error('Consigne de langue hors cours de langue');

  // Début de primaire : phrases très courtes, peu de questions, pas de filière.
  const young = request('P2', 'general', 'Néerlandais');
  assertStringIncludes(young, '6 à 8 ans');
  assertStringIncludes(young, 'quiz 3 à 4 questions');
  if (young.includes('Enseignement général') || young.includes('langue étudiée'))
    throw new Error('Consigne du secondaire envoyée en primaire');
});
