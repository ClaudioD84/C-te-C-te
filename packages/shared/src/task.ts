import { z } from 'zod';

export const TASK_KINDS = ['devoir', 'lecon', 'interro', 'examen'] as const;
export const taskKindSchema = z.enum(TASK_KINDS);
export type TaskKind = z.infer<typeof taskKindSchema>;

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  devoir: 'Devoir',
  lecon: 'Leçon à étudier',
  interro: 'Interrogation',
  examen: 'Examen',
};

export const DOCUMENT_TYPES = ['journal_de_classe', 'notes_de_cours', 'interrogation'] as const;
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentType = z.infer<typeof documentTypeSchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format AAAA-MM-JJ');

/** Une tâche telle que l'IA l'extrait d'une photo, avant validation par le parent (F3). */
export const extractedTaskSchema = z.object({
  subject: z.string().min(1),
  kind: taskKindSchema,
  description: z.string().min(1),
  dueDate: isoDateSchema.nullable(),
  /** Pages, exercices ou chapitres mentionnés. */
  reference: z.string().nullable(),
  /** Confiance de l'IA dans sa lecture, de 0 à 1 : sous 0,6 la tâche est mise en évidence. */
  confidence: z.number().min(0).max(1),
});
export type ExtractedTask = z.infer<typeof extractedTaskSchema>;

export const scanExtractionSchema = z.object({
  documentType: documentTypeSchema,
  tasks: z.array(extractedTaskSchema),
});
export type ScanExtraction = z.infer<typeof scanExtractionSchema>;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
