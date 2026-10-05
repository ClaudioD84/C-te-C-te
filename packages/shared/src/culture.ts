import { z } from 'zod';

import { gradeSchema } from './school';

/**
 * Enrichissement culturel (F6) : suggestions issues d'une base de contenus vérifiés par l'équipe,
 * jamais inventées par l'IA (pas de lien ou de lieu imaginaire).
 */

export const CULTURE_KINDS = ['documentaire', 'musee', 'sortie', 'livre', 'jeu', 'site'] as const;
export type CultureKind = (typeof CULTURE_KINDS)[number];

export const CULTURE_KIND_LABELS: Record<CultureKind, string> = {
  documentaire: 'Documentaire',
  musee: 'Musée',
  sortie: 'Sortie',
  livre: 'Livre',
  jeu: 'Jeu éducatif',
  site: 'Site web',
};

export const culturalResourceSchema = z.object({
  code: z.string().min(1),
  kind: z.enum(CULTURE_KINDS),
  title: z.string().min(1),
  description: z.string().min(1).max(400),
  url: z.url().nullable(),
  /** Ville ou région pour un lieu, sinon null. */
  place: z.string().min(1).nullable(),
  subjects: z.array(z.string().min(1)).min(1),
  grades: z.array(gradeSchema).min(1),
  /** Date de la dernière vérification (lien actif, informations exactes). */
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CulturalResource = z.infer<typeof culturalResourceSchema>;

export const cultureFileSchema = z
  .array(culturalResourceSchema)
  .refine((items) => new Set(items.map((i) => i.code)).size === items.length, { message: 'Code en double' });
