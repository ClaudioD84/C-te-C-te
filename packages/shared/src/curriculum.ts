import { z } from 'zod';

import { gradeSchema, TRACKS, trackSchema } from './school';

/**
 * Référentiels de la Fédération Wallonie-Bruxelles, structurés pour l'application (F2).
 * Liste à plat : chaque entrée désigne son parent par son code (domaine → compétence → attendu).
 */

export const CURRICULUM_KINDS = ['domaine', 'competence', 'attendu'] as const;

export const curriculumEntrySchema = z.object({
  /** Code stable et unique dans le fichier, ex. « FR-LIRE-3 ». */
  code: z.string().min(1),
  parentCode: z.string().min(1).nullable(),
  kind: z.enum(CURRICULUM_KINDS),
  subject: z.string().min(1),
  /** Années concernées ; vide pour un domaine qui couvre tout le document. */
  grades: z.array(gradeSchema),
  label: z.string().min(1),
});
export type CurriculumEntry = z.infer<typeof curriculumEntrySchema>;

export const curriculumFileSchema = z
  .object({
    source: z.object({
      title: z.string().min(1),
      url: z.url().nullable(),
      /** Version du document officiel (année de publication ou référence). */
      version: z.string().min(1),
    }),
    level: z.enum(['maternelle', 'primaire', 'secondaire']),
    /**
     * Types d'enseignement concernés. Absent : tous (tronc commun). Les compétences terminales du secondaire
     * distinguent la transition (général, technique de transition) et la qualification (technique, professionnel).
     */
    tracks: z.array(trackSchema).min(1).optional(),
    entries: z.array(curriculumEntrySchema).min(1),
  })
  .superRefine((file, ctx) => {
    const codes = new Set<string>();
    for (const [i, entry] of file.entries.entries()) {
      if (codes.has(entry.code)) {
        ctx.addIssue({
          code: 'custom',
          message: `Code en double : ${entry.code}`,
          path: ['entries', i, 'code'],
        });
      }
      codes.add(entry.code);
    }
    for (const [i, entry] of file.entries.entries()) {
      if (entry.parentCode !== null && !codes.has(entry.parentCode)) {
        ctx.addIssue({
          code: 'custom',
          message: `Parent introuvable : ${entry.parentCode}`,
          path: ['entries', i, 'parentCode'],
        });
      }
      if (entry.parentCode === null && entry.kind !== 'domaine') {
        ctx.addIssue({
          code: 'custom',
          message: 'Seul un domaine peut être sans parent',
          path: ['entries', i],
        });
      }
    }
  });
export type CurriculumFile = z.infer<typeof curriculumFileSchema>;

/** Types d'enseignement d'un fichier de référentiel (tous par défaut). */
export function curriculumTracks(file: Pick<CurriculumFile, 'tracks'>): readonly string[] {
  return file.tracks ?? TRACKS;
}

/** Ordonne les entrées pour que chaque parent précède ses enfants (import en une passe). */
export function sortParentsFirst(entries: readonly CurriculumEntry[]): CurriculumEntry[] {
  const byCode = new Map(entries.map((e) => [e.code, e]));
  const depth = (entry: CurriculumEntry, seen = new Set<string>()): number => {
    if (entry.parentCode === null || seen.has(entry.code)) return 0;
    seen.add(entry.code);
    const parent = byCode.get(entry.parentCode);
    return parent ? 1 + depth(parent, seen) : 0;
  };
  return [...entries].sort((a, b) => depth(a) - depth(b));
}

/** Matières des référentiels importés, dans l'ordre d'affichage. */
export const CURRICULUM_SUBJECTS = [
  'Français',
  'Mathématiques',
  'Sciences',
  'Formation historique et géographique',
  'Langue moderne',
  'Éducation à la philosophie et à la citoyenneté',
  'Éducation culturelle et artistique',
  'Éducation physique',
  'Formation manuelle et technique',
] as const;
