import { z } from './deps.ts';
import { GRADE_LABELS } from './extraction.ts';

/**
 * Paquet d'étude (fiche, quiz, exercices, cartes) pour une tâche.
 * Le schéma doit rester aligné avec `studyPackSchema` de packages/shared.
 */

export const studyPackSchema = z.object({
  topicUnclear: z.boolean(),
  fiche: z
    .object({
      title: z.string().min(1),
      sections: z.array(z.object({ heading: z.string().min(1), points: z.array(z.string().min(1)).min(1) })),
      keyTerms: z.array(z.object({ term: z.string().min(1), definition: z.string().min(1) })),
    })
    .nullable(),
  quiz: z.array(
    z
      .object({
        question: z.string().min(1),
        choices: z.array(z.string().min(1)).min(2).max(4),
        answerIndex: z.number().int().min(0),
        explanation: z.string().min(1),
      })
      .refine((q) => q.answerIndex < q.choices.length),
  ),
  exercises: z.array(
    z.object({
      instruction: z.string().min(1),
      prompt: z.string().min(1),
      answer: z.string().min(1),
      hint: z.string().min(1).nullable(),
    }),
  ),
  flashcards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })),
});
export type StudyPack = z.infer<typeof studyPackSchema>;

const str = { type: 'string' } as const;
const nullableStr = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const;
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

export const PACK_JSON_SCHEMA = obj({
  topicUnclear: { type: 'boolean' },
  fiche: {
    anyOf: [
      obj({
        title: str,
        sections: { type: 'array', items: obj({ heading: str, points: { type: 'array', items: str } }) },
        keyTerms: { type: 'array', items: obj({ term: str, definition: str }) },
      }),
      { type: 'null' },
    ],
  },
  quiz: {
    type: 'array',
    items: obj({
      question: str,
      choices: { type: 'array', items: str },
      answerIndex: { type: 'integer' },
      explanation: str,
    }),
  },
  exercises: { type: 'array', items: obj({ instruction: str, prompt: str, answer: str, hint: nullableStr }) },
  flashcards: { type: 'array', items: obj({ front: str, back: str }) },
});

export const PACK_SYSTEM_PROMPT = `Tu es un enseignant expérimenté de la Fédération Wallonie-Bruxelles (Belgique).
Tu prépares un paquet d'étude pour aider un élève à travailler une tâche de son journal de classe, à la maison.

Le paquet contient :
- "fiche" : une fiche de synthèse (titre, 2 à 4 sections de points courts, mots-clés avec définition) ;
- "quiz" : des questions à choix multiples (2 à 4 choix, une seule bonne réponse, explication courte et bienveillante) ;
- "exercises" : des exercices d'entraînement avec la réponse attendue, seulement si la matière s'y prête
  (mathématiques, grammaire, conjugaison, orthographe, langues…) ; sinon une liste vide ;
- "flashcards" : des cartes question / réponse pour mémoriser (vocabulaire, définitions, dates, formules, règles).

Règles :
1. Exactitude avant tout : n'écris que des faits sûrs et conformes à ce qui s'enseigne en FWB à ce niveau.
   Utilise les usages belges (septante, nonante ; noms belges des matières et des épreuves).
2. Reste strictement sur le sujet de la tâche et au niveau de l'année indiquée.
3. Écris en français correct, en phrases courtes, en tutoyant l'élève.
4. Si la tâche ne permet pas de savoir quoi réviser (ex. « étudier p. 45 » sans sujet), mets "topicUnclear" à true,
   "fiche" à null et des listes vides.
5. Respecte les adaptations demandées pour cet élève.
6. Quantités : quiz 5 à 10 questions, cartes 6 à 15, exercices 4 à 8 (moins pour les petits niveaux).`;

const NEED_ADAPTATIONS: Record<string, string> = {
  tdah: 'TDAH : consignes très courtes, une seule idée par phrase, peu de questions par série, ton encourageant.',
  dyslexie:
    'Dyslexie : mots simples et fréquents, phrases courtes, pas de pièges orthographiques dans les choix du quiz.',
  dyscalculie:
    'Dyscalculie : étapes de calcul décomposées, petits nombres, appui sur des exemples concrets et visuels décrits en mots.',
};

export function buildPackRequest(input: {
  grade: string;
  track: string;
  needs: string[];
  task: { subject: string; kind: string; description: string; reference: string | null };
  curriculum: string[];
}): string {
  const lines = [
    `Élève en ${GRADE_LABELS[input.grade] ?? input.grade} (enseignement ${input.track}).`,
    `Matière : ${input.task.subject}.`,
    `Type de tâche : ${input.task.kind}.`,
    `Tâche : ${input.task.description}${input.task.reference ? ` (${input.task.reference})` : ''}.`,
  ];
  const adaptations = input.needs.map((n) => NEED_ADAPTATIONS[n]).filter(Boolean);
  if (adaptations.length > 0) lines.push('Adaptations :', ...adaptations.map((a) => `- ${a}`));
  if (input.curriculum.length > 0) {
    lines.push(
      'Attendus du référentiel officiel pour cette année et cette matière :',
      ...input.curriculum.map((c) => `- ${c}`),
    );
  }
  lines.push('Prépare le paquet d’étude.');
  return lines.join('\n');
}

export function parsePack(text: string): StudyPack {
  return studyPackSchema.parse(JSON.parse(text));
}

/**
 * Matières du référentiel correspondant à une matière notée au journal de classe
 * (« Éveil » → Sciences, « Néerlandais » → Langue moderne…).
 */
const SUBJECT_ALIASES: [RegExp, string[]][] = [
  [/fran[cç]ais|lecture|orthographe|grammaire|conjugaison|dict[ée]e|r[ée]daction|latin|grec/i, ['Français']],
  [/math|calcul|g[ée]om[ée]trie|alg[èe]bre/i, ['Mathématiques']],
  [/\bsciences?\b(?!\s+humaines)|biologie|chimie|(?<!ducation )physique|[ée]veil/i, ['Sciences']],
  [
    /histoire|g[ée]ographie|g[ée]o\b|fhg|formation historique|sciences humaines|[ée]veil/i,
    ['Formation historique et géographique'],
  ],
  [/philosophie|citoyennet[ée]|\bepc\b/i, ['Éducation à la philosophie et à la citoyenneté']],
  [/gym|[ée]ducation physique|psychomotricit[ée]/i, ['Éducation physique']],
  [/dessin|\barts?\b|musique|[ée]ducation (culturelle|artistique)/i, ['Éducation culturelle et artistique']],
  [/technologie|manuelle|\btechnique/i, ['Formation manuelle et technique']],
  [/n[ée]erlandais|anglais|allemand|langues? modernes?/i, ['Langue moderne']],
];

export function curriculumSubjects(taskSubject: string): string[] {
  const found = SUBJECT_ALIASES.filter(([pattern]) => pattern.test(taskSubject)).flatMap(
    ([, subjects]) => subjects,
  );
  return found.length > 0 ? [...new Set(found)] : [taskSubject];
}
