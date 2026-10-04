import { z } from './deps.ts';

/**
 * Extraction des tâches à partir d'une photo (F3).
 * Le schéma ci-dessous doit rester aligné avec `scanExtractionSchema` de packages/shared.
 */

export const DOCUMENT_TYPES = ['journal_de_classe', 'notes_de_cours', 'interrogation'] as const;
export const TASK_KINDS = ['devoir', 'lecon', 'interro', 'examen'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const extractionSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  tasks: z.array(
    z.object({
      subject: z.string().trim().min(1),
      kind: z.enum(TASK_KINDS),
      description: z.string().trim().min(1),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      reference: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});
export type Extraction = z.infer<typeof extractionSchema>;

/** Schéma JSON imposé à la réponse du modèle (sorties structurées : sans contraintes min/max). */
export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['documentType', 'tasks'],
  properties: {
    documentType: { type: 'string', enum: [...DOCUMENT_TYPES] },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'kind', 'description', 'dueDate', 'reference', 'confidence'],
        properties: {
          subject: { type: 'string' },
          kind: { type: 'string', enum: [...TASK_KINDS] },
          description: { type: 'string' },
          dueDate: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
          reference: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

/** Consigne fixe (placée en tête de requête pour profiter du cache). */
export const SYSTEM_PROMPT = `Tu aides des parents d'élèves de la Fédération Wallonie-Bruxelles (Belgique) à organiser les devoirs.
Tu reçois la photo d'un document scolaire : une page de journal de classe, des notes de cours ou une interrogation corrigée.
Ta tâche : relever chaque travail que l'élève doit faire, et rien d'autre.

Types de tâches :
- "devoir" : travail à faire et à rendre (exercices, rédaction, recherche, matériel à apporter…).
- "lecon" : matière à étudier, à revoir ou à mémoriser (leçon, vocabulaire, tables, poésie…).
- "interro" : interrogation, contrôle, test, dictée préparée.
- "examen" : examen, bilan de fin de période, épreuve externe (CEB, CE1D, CESS).

Règles :
1. Ne recopie que ce qui est écrit. N'invente jamais une tâche, une page ou une date.
2. Écriture difficile à lire : donne ta meilleure lecture et baisse "confidence" (de 0 à 1). Mets 0.9 ou plus seulement si la lecture est certaine.
3. "subject" : nom usuel et complet de la matière en français (ex. « Math » → « Mathématiques », « Néerl » → « Néerlandais », « EDM » → « Éveil »). Si la matière n'est pas indiquée, déduis-la du contenu ; à défaut, écris « Autre ».
4. "description" : courte et claire pour un enfant, à l'impératif (ex. « Étudier les tables de 7 »).
5. "reference" : pages, numéros d'exercices ou chapitres (ex. « p. 45, ex. 3 à 6 »), sinon null.
6. "dueDate" (AAAA-MM-JJ) :
   - utilise d'abord une date explicite (« pour le 12/10 », « pour jeudi ») ; les dates belges s'écrivent jour/mois ;
   - sinon, la date de la case ou de la ligne du journal où la tâche est écrite ;
   - résous les jours de la semaine et les dates sans année par rapport à la date du document si elle est visible, sinon par rapport à la date d'aujourd'hui fournie, en choisissant la prochaine occurrence ;
   - mets null si aucune date n'est déductible.
7. Notes de cours : ne relève que les consignes de travail explicites ; la matière du cours elle-même n'est pas une tâche.
8. Interrogation corrigée : ne relève que les travaux demandés (correction à faire, matière à revoir) ; « faire signer » n'est pas une tâche.
9. Les rectangles noirs cachent des informations personnelles : ignore-les. Ne recopie jamais le nom d'une personne.
10. "documentType" : le type réel du document photographié.
11. Si aucune tâche n'est lisible, renvoie une liste vide.`;

const GRADE_LABELS: Record<string, string> = {
  M1: '1re maternelle',
  M2: '2e maternelle',
  M3: '3e maternelle',
  P1: '1re primaire',
  P2: '2e primaire',
  P3: '3e primaire',
  P4: '4e primaire',
  P5: '5e primaire',
  P6: '6e primaire',
  S1: '1re secondaire',
  S2: '2e secondaire',
  S3: '3e secondaire',
  S4: '4e secondaire',
  S5: '5e secondaire',
  S6: '6e secondaire',
  S7: '7e secondaire',
};

/** Date du jour à Bruxelles : { iso: "2026-10-08", label: "jeudi 8 octobre 2026" }. */
export function todayInBrussels(now: Date): { iso: string; label: string } {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const label = new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  return { iso, label };
}

/** Contexte variable de la requête (après la partie mise en cache). */
export function buildContext(grade: string, documentType: DocumentType | null, now: Date): string {
  const today = todayInBrussels(now);
  const lines = [`Élève en ${GRADE_LABELS[grade] ?? grade}.`, `Aujourd'hui : ${today.label} (${today.iso}).`];
  if (documentType) lines.push(`Selon le parent, il s'agit de : ${documentType.replaceAll('_', ' ')}.`);
  lines.push('Relève les tâches de ce document.');
  return lines.join('\n');
}

/** Valide la réponse du modèle et écarte les tâches vides ou les dates impossibles. */
export function parseExtraction(text: string): Extraction {
  const parsed = extractionSchema.parse(JSON.parse(text));
  return {
    ...parsed,
    tasks: parsed.tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate && isRealDate(task.dueDate) ? task.dueDate : null,
      confidence: Math.round(task.confidence * 100) / 100,
    })),
  };
}

function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
