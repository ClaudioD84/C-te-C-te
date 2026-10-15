import { z } from './deps.ts';
import { GRADE_LABELS } from './extraction.ts';

/** Thèmes de révision proposés par Claude pour une épreuve (F5). */

export const EXAM_TYPES = ['ceb', 'ce1d', 'cess', 'bilan'] as const;

const EXAM_DESCRIPTIONS: Record<(typeof EXAM_TYPES)[number], string> = {
  ceb: "le CEB (Certificat d'études de base, épreuve externe de fin de primaire)",
  ce1d: 'le CE1D (Certificat du premier degré, épreuve externe de fin du 1er degré)',
  cess: 'les épreuves externes du CESS (fin de secondaire)',
  bilan: 'un bilan ou des examens de fin de période organisés par l’école',
};

export const themesSchema = z.object({
  themes: z
    .array(z.object({ subject: z.string().min(1), title: z.string().min(1), description: z.string().min(1) }))
    .min(1)
    .max(60),
});
export type Themes = z.infer<typeof themesSchema>;

export const THEMES_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['themes'],
  properties: {
    themes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'title', 'description'],
        properties: {
          subject: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
} as const;

export const REVISION_SYSTEM_PROMPT = `Tu es un enseignant expérimenté de la Fédération Wallonie-Bruxelles (Belgique).
Tu prépares le plan de révision d'un élève pour une épreuve.

Règles :
1. Propose des thèmes de révision précis et concrets, conformes à ce qui est évalué en FWB à ce niveau
   (ex. « Les fractions : comparer et simplifier », pas « Mathématiques »).
2. Pour chaque thème : "subject" (exactement l'une des matières demandées), "title" (court),
   "description" (une phrase à l'impératif pour l'élève, ex. « Revois comment comparer deux fractions »).
3. Nombre de thèmes adapté au temps disponible : environ un thème par jour de révision prévu,
   réparti équitablement entre les matières, et au maximum 60.
4. Si des attendus du référentiel sont fournis, appuie-toi dessus en priorité.
5. N'invente pas de contenu d'épreuve officielle ; propose seulement des thèmes à revoir.`;

export function buildRevisionRequest(input: {
  grade: string;
  examType: (typeof EXAM_TYPES)[number];
  subjects: string[];
  revisionDays: number;
  curriculum: { subject: string; label: string }[];
}): string {
  const lines = [
    `Élève en ${GRADE_LABELS[input.grade] ?? input.grade}.`,
    `Épreuve : ${EXAM_DESCRIPTIONS[input.examType]}.`,
    `Matières : ${input.subjects.join(', ')}.`,
    `Jours de révision disponibles : ${input.revisionDays}.`,
  ];
  if (input.curriculum.length > 0) {
    lines.push(
      'Attendus du référentiel officiel :',
      ...input.curriculum.map((c) => `- [${c.subject}] ${c.label}`),
    );
  }
  lines.push('Propose les thèmes de révision.');
  return lines.join('\n');
}

/** Valide la réponse et écarte les thèmes d'une matière non demandée. */
export function parseThemes(text: string, subjects: string[]): Themes {
  const parsed = themesSchema.parse(JSON.parse(text));
  const allowed = new Set(subjects);
  const themes = parsed.themes.filter((t) => allowed.has(t.subject));
  if (themes.length === 0) throw new Error('Aucun thème pour les matières demandées');
  return { themes };
}
