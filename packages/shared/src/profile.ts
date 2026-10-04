import { z } from 'zod';

import { gradeSchema, isTrackAllowed, networkSchema, trackSchema } from './school';

/** Besoins éducatifs particuliers (cumulables). Ce sont des données de santé au sens du RGPD. */
export const NEEDS = ['tdah', 'dyslexie', 'dyscalculie'] as const;
export const needSchema = z.enum(NEEDS);
export type Need = z.infer<typeof needSchema>;

export const NEED_LABELS: Record<Need, string> = {
  tdah: 'TDAH',
  dyslexie: 'Dyslexie',
  dyscalculie: 'Dyscalculie',
};

export const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const;
export const weekdaySchema = z.enum(WEEKDAYS);
export type Weekday = z.infer<typeof weekdaySchema>;

export const childPreferencesSchema = z.object({
  /** Durée de travail choisie par le parent ; sinon elle est calculée selon le profil. */
  sessionMinutes: z.number().int().min(5).max(60).optional(),
  availableDays: z.array(weekdaySchema).min(1).default(['lun', 'mar', 'mer', 'jeu', 'ven']),
  prefersPaper: z.boolean().default(false),
});
export type ChildPreferences = z.infer<typeof childPreferencesSchema>;

export const childProfileSchema = z
  .object({
    /** Pseudonyme : le vrai nom de l'enfant n'est jamais stocké sur le serveur. */
    alias: z.string().trim().min(2, 'Au moins 2 caractères').max(30, '30 caractères maximum'),
    avatar: z.string().min(1).default('lion'),
    grade: gradeSchema,
    track: trackSchema.default('general'),
    network: networkSchema.optional(),
    options: z.array(z.string().trim().min(1)).default([]),
    needs: z.array(needSchema).default([]),
    preferences: childPreferencesSchema.default({
      availableDays: ['lun', 'mar', 'mer', 'jeu', 'ven'],
      prefersPaper: false,
    }),
  })
  .refine((p) => isTrackAllowed(p.grade, p.track), {
    message: "Ce type d'enseignement n'existe pas pour cette année",
    path: ['track'],
  })
  .refine((p) => new Set(p.needs).size === p.needs.length, {
    message: 'Besoin en double',
    path: ['needs'],
  });
export type ChildProfileInput = z.input<typeof childProfileSchema>;
export type ChildProfile = z.output<typeof childProfileSchema>;
