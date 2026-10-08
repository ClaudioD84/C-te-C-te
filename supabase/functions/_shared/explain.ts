import { z } from './deps.ts';
import { GRADE_LABELS } from './extraction.ts';

/** « Explique-le moi autrement » : une autre explication d'une partie de fiche, plus simple. */

export const EXPLAIN_SYSTEM_PROMPT = `Tu aides un élève de la Fédération Wallonie-Bruxelles (Belgique) qui n'a pas compris une partie de sa fiche de révision.
Réexplique cette partie AUTREMENT : plus simplement, avec d'autres mots, en partant de ce que l'élève connaît.
Règles :
1. "explanation" : 3 à 5 phrases courtes, à la deuxième personne (« tu »), adaptées à son âge. Pas de liste, pas de jargon non expliqué.
2. "example" : un exemple concret et original de la vie quotidienne (dans un de ses centres d'intérêt s'il y en a), en 1 à 3 phrases.
3. N'ajoute aucune information fausse ou hors du sujet de la partie ; ne recopie pas la fiche telle quelle.
4. Ton chaleureux et encourageant, sans infantiliser. Jamais de nom de personne réelle.`;

export const EXPLAIN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation', 'example'],
  properties: {
    explanation: { type: 'string' },
    example: { type: 'string' },
  },
} as const;

export const explanationSchema = z.object({
  explanation: z.string().trim().min(1).max(1500),
  example: z.string().trim().min(1).max(800),
});
export type Explanation = z.infer<typeof explanationSchema>;

export function parseExplanation(text: string): Explanation {
  return explanationSchema.parse(JSON.parse(text));
}

const NEED_HINTS: Record<string, string> = {
  tdah: 'Phrases très courtes, une idée à la fois.',
  dyslexie: 'Mots simples et fréquents, phrases courtes.',
  dyscalculie: 'Petits nombres, étapes décomposées, image concrète.',
};

export function buildExplainRequest(input: {
  grade: string;
  needs: string[];
  interests: string[];
  subject: string;
  ficheTitle: string;
  heading: string;
  points: string[];
}): string {
  const lines = [
    `Élève en ${GRADE_LABELS[input.grade] ?? input.grade}.`,
    `Matière : ${input.subject}. Fiche : « ${input.ficheTitle} ».`,
    `Partie à réexpliquer : « ${input.heading} »`,
    ...input.points.map((p) => `- ${p}`),
  ];
  const hints = input.needs.map((n) => NEED_HINTS[n]).filter(Boolean);
  if (hints.length > 0) lines.push(`Adaptations : ${hints.join(' ')}`);
  if (input.interests.length > 0) lines.push(`Centres d'intérêt de l'élève : ${input.interests.join(', ')}.`);
  lines.push('Réexplique cette partie autrement.');
  return lines.join('\n');
}
