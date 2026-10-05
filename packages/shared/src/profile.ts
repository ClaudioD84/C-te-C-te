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

/**
 * Centres d'intérêt de l'enfant : les exemples des fiches, quiz et exercices s'en inspirent.
 * Liste fermée (jamais de texte libre envoyé à l'IA), 3 au plus.
 */
export const INTERESTS = [
  'animaux',
  'dinosaures',
  'espace',
  'football',
  'sport',
  'musique',
  'dessin',
  'cuisine',
  'jeux_video',
  'nature',
  'chevaux',
  'vehicules',
  'histoires',
  'bricolage',
  'mer',
] as const;
export const interestSchema = z.enum(INTERESTS);
export type Interest = z.infer<typeof interestSchema>;
export const MAX_INTERESTS = 3;

export const INTEREST_LABELS: Record<Interest, string> = {
  animaux: '🐾 Animaux',
  dinosaures: '🦕 Dinosaures',
  espace: '🚀 Espace',
  football: '⚽ Football',
  sport: '🏅 Sport',
  musique: '🎵 Musique',
  dessin: '🎨 Dessin',
  cuisine: '🧁 Cuisine',
  jeux_video: '🎮 Jeux vidéo',
  nature: '🌳 Nature',
  chevaux: '🐴 Chevaux',
  vehicules: '🚗 Voitures et trains',
  histoires: '📚 Histoires et contes',
  bricolage: '🔧 Bricolage',
  mer: '🌊 Mer et océans',
};

/** Libellés envoyés à l'IA (sans pictogramme). */
export const INTEREST_PROMPT_LABELS: Record<Interest, string> = {
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

export const childPreferencesSchema = z.object({
  /** Durée de travail choisie par le parent ; sinon elle est calculée selon le profil. */
  sessionMinutes: z.number().int().min(5).max(60).optional(),
  availableDays: z.array(weekdaySchema).min(1).default(['lun', 'mar', 'mer', 'jeu', 'ven']),
  prefersPaper: z.boolean().default(false),
  interests: z.array(interestSchema).max(MAX_INTERESTS).optional(),
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

/**
 * Date de consentement à enregistrer après modification des besoins particuliers :
 * aucune si les besoins sont retirés (retrait du consentement), maintenant si un besoin est ajouté
 * (le parent vient de reconfirmer son accord), inchangée sinon.
 */
export function nextNeedsConsentAt(
  previous: readonly string[],
  next: readonly string[],
  previousConsentAt: string | null,
  now = new Date(),
): string | null {
  if (next.length === 0) return null;
  const added = next.some((need) => !previous.includes(need));
  return added || !previousConsentAt ? now.toISOString() : previousConsentAt;
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lun: 'Lundi',
  mar: 'Mardi',
  mer: 'Mercredi',
  jeu: 'Jeudi',
  ven: 'Vendredi',
  sam: 'Samedi',
  dim: 'Dimanche',
};

/** Avatars proposés à l'enfant (affichés dans sa console). Codes stables : ils sont enregistrés. */
export const AVATARS = {
  lion: { emoji: '🦁', label: 'Lion' },
  renard: { emoji: '🦊', label: 'Renard' },
  hibou: { emoji: '🦉', label: 'Hibou' },
  tortue: { emoji: '🐢', label: 'Tortue' },
  chat: { emoji: '🐱', label: 'Chat' },
  panda: { emoji: '🐼', label: 'Panda' },
  dauphin: { emoji: '🐬', label: 'Dauphin' },
  licorne: { emoji: '🦄', label: 'Licorne' },
} as const;
export type AvatarCode = keyof typeof AVATARS;
export const AVATAR_CODES = Object.keys(AVATARS) as AvatarCode[];

/** Avatar d'un profil ; un code inconnu (ancienne version) retombe sur le lion. */
export function avatarOf(code: string): (typeof AVATARS)[AvatarCode] {
  return AVATARS[code as AvatarCode] ?? AVATARS.lion;
}

/** Durées de séance proposées au parent (en minutes) ; sinon, durée recommandée selon le profil. */
export const SESSION_MINUTES_CHOICES = [10, 15, 20, 25, 30, 45] as const;
