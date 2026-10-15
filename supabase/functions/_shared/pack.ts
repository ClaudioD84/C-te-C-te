import { z } from './deps.ts';
import { GRADE_LABELS, type RemediationError } from './extraction.ts';
import { sha256Hex } from './pairing.ts';

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
      // Vide pour les paquets enregistrés avant ce champ.
      tips: z.array(z.string().min(1)).default([]),
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
      // Vide pour les paquets enregistrés avant ce champ (fiches réutilisées, « réexpliquer »).
      accepted: z.array(z.string().min(1)).default([]),
      // Exercice guidé : étapes de méthode montrées une à une ; vide pour un exercice en autonomie.
      steps: z.array(z.string().min(1)).default([]),
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
  curriculumMatch: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
  fiche: {
    anyOf: [
      obj({
        title: str,
        sections: { type: 'array', items: obj({ heading: str, points: { type: 'array', items: str } }) },
        keyTerms: { type: 'array', items: obj({ term: str, definition: str }) },
        tips: { type: 'array', items: str },
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
  exercises: {
    type: 'array',
    items: obj({
      instruction: str,
      prompt: str,
      accepted: { type: 'array', items: str },
      steps: { type: 'array', items: str },
      answer: str,
      hint: nullableStr,
    }),
  },
  flashcards: { type: 'array', items: obj({ front: str, back: str }) },
});

export const PACK_SYSTEM_PROMPT = `Tu es un enseignant expérimenté de la Fédération Wallonie-Bruxelles (Belgique).
Tu prépares un paquet d'étude pour aider un élève à travailler une tâche de son journal de classe, à la maison.

L'élève travaille en trois étapes : il revoit la fiche, il répond à toutes les questions sans correction, puis
l'application vérifie chaque réponse contre la réponse attendue.

Le paquet contient :
- "fiche" : une fiche de synthèse (titre, 2 à 4 sections de points courts, mots-clés avec définition) et "tips",
  « les clés pour réussir » : 3 à 5 conseils concrets pour réussir les exercices de cette leçon (la méthode pas à
  pas, les pièges fréquents, une astuce pour retenir), à l'impératif, une phrase chacun ;
- "quiz" : des questions à choix multiples (2 à 4 choix, une seule bonne réponse, explication courte) ;
- "exercises" : des exercices d'entraînement que l'élève fait dans l'application, dans toutes les matières (en
  histoire ou en sciences aussi : une date, un lieu, un mot, un nombre à retrouver). Pour chacun :
  "instruction" (la consigne), "prompt" (l'énoncé : une seule question), "accepted" (les réponses courtes que
  l'élève tape et que l'application vérifie), "steps" (liste vide, sauf pour un exercice guidé demandé : les
  étapes de la méthode), "answer" (la correction : la réponse et comment la trouver, en une ou deux phrases),
  "hint" (un indice qui aide sans donner la réponse, ou null) ;
- "flashcards" : des cartes question / réponse pour mémoriser (vocabulaire, définitions, dates, formules, règles).

Règles :
1. Exactitude avant tout : n'écris que des faits sûrs et conformes à ce qui s'enseigne en FWB à ce niveau.
   Utilise les usages belges (septante, nonante ; noms belges des matières et des épreuves).
2. Reste strictement sur le sujet de la tâche et au niveau de l'année indiquée.
3. Écris en français correct, en tutoyant l'élève, au registre de son âge (voir « Niveau »).
4. Si la tâche ne permet pas de savoir quoi réviser (ex. « étudier p. 45 » sans sujet), mets "topicUnclear" à true,
   "fiche" à null et des listes vides.
5. Respecte les adaptations demandées pour cet élève.
6. Quantités et difficulté : celles du « Niveau » indiqué ; une consigne particulière (examen blanc, remédiation)
   prime.
7. "curriculumMatch" : le numéro de l'attendu du référentiel qui correspond le mieux à la tâche, ou null si
   aucun ne correspond clairement (ou si aucun attendu n'est fourni).
8. Langue étrangère (néerlandais, anglais, allemand…) : pour le vocabulaire, au recto de la carte le mot ou
   l'expression en français, au verso seulement sa traduction dans la langue étudiée (avec l'article : de/het,
   der/die/das…), sans autre texte : l'application la lit à voix haute.
9. L'élève répond lui-même avant de voir la correction. Exercices : une question à réponse courte et unique
   (un nombre, un mot ou un groupe de 3 mots au plus ; en langue moderne au secondaire, une courte phrase de 8 mots
   au plus est permise). "accepted" donne toutes les formes correctes de cette
   réponse, sans phrase autour (par ex. ["8", "huit"], ["ils mangent"], ["12 cm"] si l'unité est demandée,
   ["3/4"] pour une fraction sous la forme attendue). Une production libre (phrase, paragraphe, dessin) n'est
   permise que si la tâche l'exige, deux au plus : "accepted" est alors une liste vide et "answer" donne un
   exemple de bonne réponse.
10. "explanation" (quiz) et "answer" (exercices) s'affichent que l'élève ait juste ou non, après le verdict :
   explique pourquoi la bonne réponse est juste, sans féliciter ni juger (jamais « Bravo », « Exact »,
   « Bien joué » ni « Dommage »).
11. Cartes : au verso, une réponse courte dès que possible (un mot, un nom, une date, un nombre, une formule :
   3 mots au plus), que l'élève tape et que l'application vérifie ; sinon une phrase courte.`;

/**
 * Besoins particuliers traduits en consignes de rédaction. Minimisation (RGPD) : le trouble lui-même
 * (donnée de santé) n'est jamais nommé dans la demande envoyée à l'IA, seules les adaptations le sont.
 */
const NEED_ADAPTATIONS: Record<string, string> = {
  tdah: 'Consignes très courtes, une seule idée par phrase, peu de questions par série, ton encourageant.',
  dyslexie:
    'Mots simples et fréquents, phrases courtes, pas de pièges orthographiques dans les choix du quiz.',
  dyscalculie:
    'Étapes de calcul décomposées, petits nombres, appui sur des exemples concrets et visuels décrits en mots.',
};

/**
 * Registre, types de questions et quantités selon l'année (degrés de la FWB) : un élève de 3e secondaire ne reçoit
 * pas une fiche pensée pour un enfant de primaire.
 */
const NO_CHILDISHNESS =
  'jamais enfantin : pas d’histoires pour enfants, de personnages mignons, d’exclamations ni d’emojis, ' +
  'pas de « petit », « super » ni « bravo »';

export function levelGuidance(grade: string): string[] {
  const year = Number(grade.slice(1));
  if (grade.startsWith('P') && year <= 2)
    return [
      'Niveau : élève de 6 à 8 ans. Phrases très courtes, mots simples, exemples concrets du quotidien.',
      'Quantités : quiz 3 à 4 questions, exercices 3 à 5, cartes 4 à 8.',
    ];
  if (grade.startsWith('P') && year <= 4)
    return [
      "Niveau : élève de 8 à 10 ans. Phrases courtes, exemples concrets ; questions de compréhension et d'application.",
      'Quantités : quiz 4 à 5 questions, exercices 4 à 6, cartes 6 à 10.',
    ];
  if (grade.startsWith('P'))
    return [
      'Niveau : fin de primaire (10 à 12 ans, CEB en 6e). Ton direct ; questions de raisonnement et ' +
        "d'application en plus de la mémorisation.",
      'Quantités : quiz 5 à 6 questions, exercices 5 à 8, cartes 8 à 12.',
    ];
  if (grade.startsWith('S') && year <= 2)
    return [
      `Niveau : 1er degré du secondaire (12 à 14 ans, CE1D en 2e). Ton direct et sobre, ${NO_CHILDISHNESS}. ` +
        "Vocabulaire disciplinaire exact ; questions d'application et de raisonnement ; distracteurs plausibles.",
      'Quantités : quiz 6 à 8 questions, exercices 6 à 8 de difficulté croissante, cartes 8 à 15.',
    ];
  if (grade.startsWith('S') && year <= 4)
    return [
      `Niveau : 2e degré du secondaire (14 à 16 ans). Registre d'adolescent, sobre et précis, ${NO_CHILDISHNESS}. ` +
        "Questions qui demandent d'appliquer, d'analyser, de justifier ou de transférer, pas seulement de " +
        'restituer ; distracteurs plausibles, tirés des erreurs fréquentes.',
      'Quantités : quiz 8 à 10 questions, exercices 8 à 10 de difficulté croissante (dont 2 ou 3 exigeants), ' +
        'cartes 10 à 20.',
    ];
  if (grade.startsWith('S'))
    return [
      `Niveau : 3e degré du secondaire (16 à 18 ans, CESS en fin de 6e). Registre de jeune adulte, précis et ` +
        `nuancé, ${NO_CHILDISHNESS}. Questions d'analyse, de synthèse et de transfert ; vocabulaire attendu au CESS.`,
      'Quantités : quiz 8 à 12 questions, exercices 8 à 12 de difficulté croissante, cartes 12 à 25.',
    ];
  return [];
}

/** Filière du secondaire (et enseignement spécialisé à tout niveau). */
const TRACK_GUIDANCE: Record<string, string> = {
  general: 'Enseignement général (transition) : rigueur et abstraction, préparation aux études supérieures.',
  technique:
    'Enseignement technique : la théorie s’appuie sur des situations concrètes et des applications pratiques ; ' +
    'en qualification, des contextes liés au métier.',
  professionnel:
    'Enseignement professionnel : contextes concrets de la vie courante et du métier, consignes claires et ' +
    'directes, phrases simples, sans infantiliser.',
  specialise:
    'Enseignement spécialisé : objectifs adaptés, consignes très claires et progressives, sans infantiliser.',
};

const MODERN_LANGUAGE = /n[ée]erlandais|anglais|allemand|espagnol|italien|langues? modernes?/i;

/** Langue moderne au secondaire : on travaille dans la langue étudiée, au niveau visé par le degré. */
function languageGuidance(grade: string, subject: string): string[] {
  if (!grade.startsWith('S') || !MODERN_LANGUAGE.test(subject)) return [];
  const year = Number(grade.slice(1));
  const target = year <= 2 ? 'A1 vers A2' : year <= 4 ? 'A2 vers B1' : 'B1 vers B2';
  return [
    'Langue moderne : consignes en français, mais exercices et quiz surtout DANS la langue étudiée : phrases à ' +
      'compléter, traduction dans les deux sens, conjugaison (verbes irréguliers, temps du passé), ordre des mots, ' +
      `compréhension de phrases ou d'un court texte. Niveau visé (cadre européen, indicatif) : ${target}.`,
    'Cartes : pas seulement des mots isolés. La moitié au moins sont des expressions, des formes de verbes ' +
      '(infinitif, passé, participe) ou de courtes phrases à traduire, au recto en français et au verso dans la ' +
      'langue étudiée.',
  ];
}

/** Mots d'une liste photographiée envoyés au plus (la liste elle-même en compte 60 au plus). */
export const MAX_LIST_WORDS = 60;
/** Exemples de l'enseignant envoyés au plus. */
export const MAX_TEACHER_EXAMPLES = 8;

/**
 * Liste de vocabulaire photographiée : ses cartes de mots existent déjà (et gardent la progression de l'élève) ;
 * l'IA la complète d'une fiche, d'un quiz, d'exercices et de cartes de phrases qui réemploient ces mots.
 */
function vocabularyInstructions(cards: { front: string; back: string }[]): string[] {
  return [
    `Liste de vocabulaire du cours, photographiée par le parent (${cards.length} mots, recto → verso) :`,
    ...cards.slice(0, MAX_LIST_WORDS).map((c) => `- ${c.front} → ${c.back}`),
    'Les cartes de ces mots existent déjà : "flashcards" ne contient que de NOUVELLES cartes (6 à 12) qui ' +
      'réemploient ces mots dans des expressions ou de courtes phrases. Le quiz et les exercices portent sur ces ' +
      'mots, au niveau de l’élève ; la fiche les regroupe par thème avec les points utiles (article, pluriel, ' +
      'formes de verbes, faux amis).',
  ];
}

/** Centres d'intérêt (même liste que INTEREST_PROMPT_LABELS de packages/shared/src/profile.ts). */
const INTEREST_LABELS: Record<string, string> = {
  animaux: 'les animaux',
  dinosaures: 'les dinosaures',
  espace: "l'espace et les planètes",
  football: 'le football',
  sport: 'le sport',
  musique: 'la musique',
  dessin: 'le dessin',
  cuisine: 'la cuisine et la pâtisserie',
  jeux_video: 'les jeux vidéo',
  nature: 'la nature',
  chevaux: 'les chevaux',
  vehicules: 'les voitures et les trains',
  histoires: 'les histoires et les contes',
  bricolage: 'le bricolage',
  mer: 'la mer et les océans',
};

/** Libellés des centres d'intérêt connus (3 au plus) ; toute autre valeur est ignorée. */
export function interestLabels(interests: unknown): string[] {
  if (!Array.isArray(interests)) return [];
  return [...new Set(interests)]
    .filter((i): i is string => typeof i === 'string' && i in INTEREST_LABELS)
    .slice(0, 3)
    .map((i) => INTEREST_LABELS[i]);
}

/** Même valeur que MOCK_EXAM_PREFIX (packages/shared/src/revision.ts) : tâche d'examen blanc d'un dossier de révision. */
const MOCK_EXAM_PREFIX = 'Examen blanc ';

const MOCK_EXAM_INSTRUCTIONS = [
  'Cette tâche est un EXAMEN BLANC : une épreuve d’entraînement sur l’ensemble des thèmes listés.',
  '- "fiche" : un court rappel des points essentiels de chaque thème (une section par thème, 2 à 3 points).',
  '- "quiz" : 12 à 15 questions mêlant tous les thèmes, de difficulté progressive.',
  '- "exercises" : 6 à 10 exercices progressifs couvrant les thèmes, avec la réponse attendue.',
  '- "flashcards" : 8 à 15 cartes sur les notions à retenir absolument.',
  'Dans l’esprit de l’épreuve visée, sans prétendre reproduire une épreuve officielle.',
];

/**
 * Remédiation après une interrogation corrigée : comprendre ses erreurs, revoir la règle, s'exercer avec de
 * l'aide puis seul. Le ton reste bienveillant : une erreur est une étape normale de l'apprentissage.
 */
const REMEDIATION_INSTRUCTIONS = [
  'Cette tâche est une REMÉDIATION : l’élève retravaille une notion ratée à une interrogation corrigée.',
  '- "fiche" : le rappel de la règle visée, puis une section « Tes erreurs à l’interro » qui explique chaque ' +
    'erreur avec bienveillance (ce qu’il fallait faire et pourquoi), sans répéter la note ; "tips" : les clés ' +
    'pour ne plus refaire ces erreurs.',
  '- "exercises" : d’abord 3 ou 4 exercices GUIDÉS du même type que les erreurs : "steps" donne 2 à 4 étapes ' +
    'de méthode dans l’ordre (courtes consignes à l’impératif, sans donner la réponse finale) ; puis 4 à 6 ' +
    'exercices EN AUTONOMIE, sans étapes ("steps" vide), de difficulté croissante. Jamais les questions exactes ' +
    'de l’interrogation : des exercices semblables.',
  '- "quiz" : 3 ou 4 questions au plus ; "flashcards" : 3 à 6 cartes sur la règle.',
];

export function buildPackRequest(input: {
  grade: string;
  track: string;
  needs: string[];
  task: {
    subject: string;
    kind: string;
    description: string;
    reference: string | null;
    /** Erreurs relevées sur une interrogation corrigée (fiche de remédiation), sinon null. */
    remediation?: { errors: RemediationError[] } | null;
  };
  curriculum: string[];
  /** Centres d'intérêt de l'élève, déjà filtrés par interestLabels. */
  interests?: string[];
  /** Cartes d'une liste de vocabulaire photographiée pour cette tâche. */
  vocabulary?: { front: string; back: string }[];
  /** Questions ou consignes relevées sur les documents de l'enseignant pour ce cours (interrogations, notes). */
  teacherExamples?: string[];
}): string {
  const lines = [
    `Élève en ${GRADE_LABELS[input.grade] ?? input.grade} (enseignement ${input.track}).`,
    `Matière : ${input.task.subject}.`,
    `Type de tâche : ${input.task.kind}.`,
    `Tâche : ${input.task.description}${input.task.reference ? ` (${input.task.reference})` : ''}.`,
  ];
  lines.push(...levelGuidance(input.grade), ...languageGuidance(input.grade, input.task.subject));
  if (input.grade.startsWith('S') || input.track === 'specialise') {
    const track = TRACK_GUIDANCE[input.track];
    if (track) lines.push(track);
  }
  const adaptations = input.needs.map((n) => NEED_ADAPTATIONS[n]).filter(Boolean);
  if (adaptations.length > 0) lines.push('Adaptations :', ...adaptations.map((a) => `- ${a}`));
  if (input.interests && input.interests.length > 0) {
    lines.push(
      `Centres d'intérêt de l'élève : ${input.interests.join(', ')}. Quand c'est naturel, situe les exemples, ` +
        "les énoncés d'exercices et les questions du quiz dans ces univers, sans changer la matière ni le niveau, " +
        'et sans en mettre partout.',
    );
  }
  if (input.curriculum.length > 0) {
    lines.push(
      'Attendus du référentiel officiel pour cette année et cette matière (numérotés) :',
      ...input.curriculum.map((c, i) => `${i + 1}. ${c}`),
    );
  }
  const examples = [...new Set(input.teacherExamples ?? [])].slice(0, MAX_TEACHER_EXAMPLES);
  if (examples.length > 0) {
    lines.push(
      'Questions posées par l’enseignant dans ce cours (interrogations ou notes récentes). Reprends leur niveau ' +
        'et leurs types d’exercices, sans les recopier :',
      ...examples.map((e) => `- ${e}`),
    );
  }
  if (input.vocabulary && input.vocabulary.length > 0)
    lines.push(...vocabularyInstructions(input.vocabulary));
  if (input.task.description.startsWith(MOCK_EXAM_PREFIX)) lines.push(...MOCK_EXAM_INSTRUCTIONS);
  const errors = input.task.remediation?.errors ?? [];
  if (errors.length > 0) {
    lines.push(
      ...REMEDIATION_INSTRUCTIONS,
      'Erreurs relevées sur la copie corrigée :',
      ...errors.map(
        (e, i) =>
          `${i + 1}. Question : ${e.question} — Réponse de l'élève : ${e.childAnswer ?? 'illisible'} — ` +
          `Correction : ${e.correction ?? 'non écrite (trouve-la toi-même)'}`,
      ),
    );
  }
  lines.push('Prépare le paquet d’étude.');
  return lines.join('\n');
}

/**
 * Empreinte d'une demande de fiche : consigne système et texte complet de la demande (année, section,
 * adaptations, centres d'intérêt, attendus, tâche), espaces et majuscules mis à part. Deux demandes de même
 * empreinte reçoivent la même fiche : une famille ne reçoit jamais rien qu'elle n'ait déjà écrit elle-même.
 */
export function packRequestKey(requestText: string): Promise<string> {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
  return sha256Hex(`${normalize(PACK_SYSTEM_PROMPT)}\n---\n${normalize(requestText)}`);
}

const packResponseSchema = z
  .object({ curriculumMatch: z.number().int().nullable().optional() })
  .passthrough();

/**
 * Réponse de l'IA : le paquet d'étude, et l'attendu du référentiel auquel rattacher la tâche (F2).
 * `curriculumIndex` est l'indice (à partir de 0) dans la liste envoyée, ou null si le numéro est absent ou hors liste.
 */
export function parsePackResponse(
  text: string,
  curriculumCount: number,
): { content: StudyPack; curriculumIndex: number | null } {
  const raw = JSON.parse(text);
  const { curriculumMatch } = packResponseSchema.parse(raw);
  const content = studyPackSchema.parse(raw);
  const index = curriculumMatch == null ? null : curriculumMatch - 1;
  return { content, curriculumIndex: index !== null && index >= 0 && index < curriculumCount ? index : null };
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
  [
    /\bsciences?\b(?!\s+(humaines|[ée]conomiques|sociales))|biologie|chimie|(?<!ducation )physique|[ée]veil/i,
    ['Sciences'],
  ],
  [
    /histoire|g[ée]ographie|g[ée]o\b|fhg|formation historique|sciences humaines|[ée]veil|[ée]conomi|sciences sociales/i,
    ['Formation historique et géographique'],
  ],
  [/philosophie|citoyennet[ée]|\bepc\b/i, ['Éducation à la philosophie et à la citoyenneté']],
  [/gym|[ée]ducation physique|psychomotricit[ée]/i, ['Éducation physique']],
  [
    /dessin|\barts?\b|musique|[ée]ducation (culturelle|artistique)|cirque/i,
    ['Éducation culturelle et artistique'],
  ],
  [/technologie|manuelle|\btechnique|informatique/i, ['Formation manuelle et technique']],
  [/n[ée]erlandais|anglais|allemand|langues? modernes?/i, ['Langue moderne']],
];

export function curriculumSubjects(taskSubject: string): string[] {
  const found = SUBJECT_ALIASES.filter(([pattern]) => pattern.test(taskSubject)).flatMap(
    ([, subjects]) => subjects,
  );
  return found.length > 0 ? [...new Set(found)] : [taskSubject];
}
