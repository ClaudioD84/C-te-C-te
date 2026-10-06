import type { Interest } from './profile';
import { gradeYear, schoolLevel, type Grade } from './school';

/**
 * Fonds d'écran de la console enfant : choisis par l'enfant (jamais selon un genre), mis en avant selon
 * son âge et ses centres d'intérêt. Motifs discrets derrière des cartes opaques : la lecture n'est jamais
 * gênée. Les teintes respectent les contrastes de la palette (test dans contrast.test.ts).
 */
export type AgeGroup = 'petit' | 'moyen' | 'grand';

export interface BackgroundTheme {
  label: string;
  /** Motif répété (vide : fond uni teinté). */
  motifs: readonly string[];
  tint: { light: string; dark: string };
  ages: readonly AgeGroup[];
  interests: readonly Interest[];
  /** Débloqué par l'effort : stade de l'avatar à atteindre. */
  unlockLevel?: number;
}

export const BACKGROUNDS = {
  uni: {
    label: 'Fond uni',
    motifs: [],
    tint: { light: '#FBF8F3', dark: '#14181E' },
    ages: ['petit', 'moyen', 'grand'],
    interests: [],
  },
  etoiles: {
    label: 'Ciel étoilé',
    motifs: ['⭐', '✨', '🌙'],
    tint: { light: '#F4F5FB', dark: '#12162A' },
    ages: ['petit', 'moyen'],
    interests: ['espace'],
  },
  galaxie: {
    label: 'Galaxie',
    motifs: ['🪐', '🚀', '✨'],
    tint: { light: '#F3F2FA', dark: '#151229' },
    ages: ['moyen', 'grand'],
    interests: ['espace'],
  },
  ocean: {
    label: 'Océan',
    motifs: ['🐠', '🐚', '🌊'],
    tint: { light: '#F1F7FA', dark: '#0F1A22' },
    ages: ['petit', 'moyen'],
    interests: ['mer', 'animaux'],
  },
  grand_bleu: {
    label: 'Grand bleu',
    motifs: ['🐋', '🫧'],
    tint: { light: '#EFF5F9', dark: '#0C1720' },
    ages: ['moyen', 'grand'],
    interests: ['mer'],
  },
  foret: {
    label: 'Forêt',
    motifs: ['🌲', '🍄', '🦔'],
    tint: { light: '#F2F7F1', dark: '#111A14' },
    ages: ['petit', 'moyen'],
    interests: ['nature', 'animaux'],
  },
  dinos: {
    label: 'Dinosaures',
    motifs: ['🦕', '🦖', '🌋'],
    tint: { light: '#F6F7EF', dark: '#171A10' },
    ages: ['petit', 'moyen'],
    interests: ['dinosaures'],
  },
  foot: {
    label: 'Terrain de foot',
    motifs: ['⚽', '🥅'],
    tint: { light: '#F1F7F2', dark: '#0F1B13' },
    ages: ['moyen', 'grand'],
    interests: ['football', 'sport'],
  },
  musique: {
    label: 'Musique',
    motifs: ['🎵', '🎸', '🎹'],
    tint: { light: '#F8F3F8', dark: '#1B1220' },
    ages: ['petit', 'moyen', 'grand'],
    interests: ['musique'],
  },
  atelier: {
    label: 'Atelier',
    motifs: ['🎨', '✏️', '🖍️'],
    tint: { light: '#FAF4F1', dark: '#1D1513' },
    ages: ['petit', 'moyen'],
    interests: ['dessin', 'bricolage'],
  },
  patisserie: {
    label: 'Pâtisserie',
    motifs: ['🧁', '🍓', '🍪'],
    tint: { light: '#FBF3F4', dark: '#1F1416' },
    ages: ['petit', 'moyen'],
    interests: ['cuisine'],
  },
  pixels: {
    label: 'Pixels',
    motifs: ['👾', '🎮'],
    tint: { light: '#F2F3F8', dark: '#12141F' },
    ages: ['moyen', 'grand'],
    interests: ['jeux_video'],
  },
  prairie: {
    label: 'Prairie',
    motifs: ['🐴', '🌼'],
    tint: { light: '#F6F8EF', dark: '#151A10' },
    ages: ['petit', 'moyen'],
    interests: ['chevaux', 'nature'],
  },
  voyage: {
    label: 'En voyage',
    motifs: ['🚂', '🚗', '✈️'],
    tint: { light: '#F4F6F8', dark: '#13181D' },
    ages: ['petit', 'moyen'],
    interests: ['vehicules'],
  },
  bibliotheque: {
    label: 'Bibliothèque',
    motifs: ['📚', '✨'],
    tint: { light: '#F8F5EF', dark: '#1A1712' },
    ages: ['petit', 'moyen', 'grand'],
    interests: ['histoires'],
  },
  minimal: {
    label: 'Minimal',
    motifs: ['◦'],
    tint: { light: '#F5F5F4', dark: '#16181B' },
    ages: ['grand'],
    interests: [],
  },
  arc_en_ciel: {
    label: 'Arc-en-ciel',
    motifs: ['🌈', '☁️'],
    tint: { light: '#F5F6FB', dark: '#14162A' },
    ages: ['petit', 'moyen', 'grand'],
    interests: [],
    unlockLevel: 3,
  },
  aurore: {
    label: 'Aurore boréale',
    motifs: ['🌌', '✨'],
    tint: { light: '#F1F6F5', dark: '#0E1A1A' },
    ages: ['petit', 'moyen', 'grand'],
    interests: [],
    unlockLevel: 5,
  },
} as const satisfies Record<string, BackgroundTheme>;

export type BackgroundCode = keyof typeof BACKGROUNDS;
export const BACKGROUND_CODES = Object.keys(BACKGROUNDS) as BackgroundCode[];

export function isBackground(code: unknown): code is BackgroundCode {
  return typeof code === 'string' && code in BACKGROUNDS;
}

export function ageGroup(grade: Grade): AgeGroup {
  const level = schoolLevel(grade);
  if (level === 'secondaire') return 'grand';
  if (level === 'maternelle' || gradeYear(grade) <= 2) return 'petit';
  return 'moyen';
}

/**
 * Fonds proposés à l'enfant : ceux de son âge, ses centres d'intérêt d'abord, le fond uni toujours en tête.
 * Les fonds à débloquer restent visibles (cadenas) pour donner envie.
 */
export function backgroundsFor(grade: Grade, interests: readonly Interest[]): BackgroundCode[] {
  const age = ageGroup(grade);
  const score = (code: BackgroundCode) => {
    const theme: BackgroundTheme = BACKGROUNDS[code];
    if (code === 'uni') return -2;
    if (theme.unlockLevel) return 2;
    return theme.interests.some((i) => interests.includes(i)) ? -1 : 0;
  };
  return BACKGROUND_CODES.filter((code) => (BACKGROUNDS[code] as BackgroundTheme).ages.includes(age)).sort(
    (a, b) => score(a) - score(b),
  );
}

export function isBackgroundUnlocked(code: BackgroundCode, avatarLevel: number): boolean {
  const level = (BACKGROUNDS[code] as BackgroundTheme).unlockLevel;
  return level === undefined || avatarLevel >= level;
}
