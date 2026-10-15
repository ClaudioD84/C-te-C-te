import { structuredCall, type StructuredResult } from '../_shared/claude.ts';
import { GRADE_LABELS } from '../_shared/extraction.ts';

/** Modèle du juge : le plus exigeant par défaut, réglable comme les autres. */
export const JUDGE_MODEL = Deno.env.get('JUGE_MODEL') ?? 'claude-opus-5-5';

const JUDGE_SYSTEM = `Tu es inspecteur pédagogique de la Fédération Wallonie-Bruxelles. Tu évalues une fiche d'étude
préparée automatiquement pour un élève, à partir d'une tâche de son journal de classe.

Note chaque critère de 1 à 5 (5 = irréprochable, 3 = utilisable avec réserves, 1 = à refaire) :
- "exactitude" : aucune erreur de fond (faits, règles, calculs, orthographe des réponses attendues) ;
- "niveau" : vocabulaire, longueur et difficulté adaptés à l'année de l'élève ;
- "couverture" : le contenu correspond à la tâche demandée, sans hors-sujet ;
- "adaptations" : consignes d'adaptation respectées (null s'il n'y en a pas) ;
- "clarte" : consignes et questions compréhensibles par l'élève seul.
"erreurs" : chaque erreur de fond, citée brièvement (liste vide s'il n'y en a pas). Sois exigeant et précis.`;

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['exactitude', 'niveau', 'couverture', 'adaptations', 'clarte', 'erreurs', 'commentaire'],
  properties: {
    exactitude: { type: 'integer' },
    niveau: { type: 'integer' },
    couverture: { type: 'integer' },
    adaptations: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    clarte: { type: 'integer' },
    erreurs: { type: 'array', items: { type: 'string' } },
    commentaire: { type: 'string' },
  },
} as const;

export interface Verdict {
  exactitude: number;
  niveau: number;
  couverture: number;
  adaptations: number | null;
  clarte: number;
  erreurs: string[];
  commentaire: string;
}

export async function judgePack(input: {
  grade: string;
  needs: string[];
  task: { subject: string; kind: string; description: string };
  pack: unknown;
}): Promise<{ verdict: Verdict; result: StructuredResult }> {
  const result = await structuredCall({
    model: JUDGE_MODEL,
    effort: 'medium',
    system: JUDGE_SYSTEM,
    schema: JUDGE_SCHEMA,
    maxTokens: 8000,
    content: [
      {
        type: 'text',
        text: [
          `Élève en ${GRADE_LABELS[input.grade] ?? input.grade}.`,
          `Besoins particuliers : ${input.needs.length > 0 ? input.needs.join(', ') : 'aucun'}.`,
          `Tâche : ${input.task.subject} (${input.task.kind}) — ${input.task.description}.`,
          'Fiche à évaluer (JSON) :',
          JSON.stringify(input.pack),
        ].join('\n'),
      },
    ],
  });
  return { verdict: JSON.parse(result.text) as Verdict, result };
}
