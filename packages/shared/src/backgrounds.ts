import type { Interest } from './profile';
import { gradeYear, schoolLevel, type Grade } from './school';

/**
 * Fonds d'écran de la console enfant : choisis par l'enfant (jamais selon un genre), mis en avant selon
 * son âge et ses centres d'intérêt. Une scène illustrée (background-scenes.ts) derrière des cartes opaques :
 * la lecture n'est jamais gênée. Les couleurs respectent les contrastes de la palette (contrast.test.ts).
 */
export type AgeGroup = 'petit' | 'moyen' | 'grand';

export interface BackgroundTheme {
  label: string;
  ages: readonly AgeGroup[];
  interests: readonly Interest[];
  /** Débloqué par l'effort : stade de l'avatar à atteindre. */
  unlockLevel?: number;
}

export const BACKGROUNDS = {
  uni: {
    label: 'Fond uni',
    ages: ['petit', 'moyen', 'grand'],
    interests: [],
  },
  etoiles: {
    label: 'Ciel étoilé',
    ages: ['petit', 'moyen'],
    interests: ['espace'],
  },
  galaxie: {
    label: 'Galaxie',
    ages: ['moyen', 'grand'],
    interests: ['espace'],
  },
  ocean: {
    label: 'Océan',
    ages: ['petit', 'moyen'],
    interests: ['mer', 'animaux'],
  },
  grand_bleu: {
    label: 'Grand bleu',
    ages: ['moyen', 'grand'],
    interests: ['mer'],
  },
  foret: {
    label: 'Forêt',
    ages: ['petit', 'moyen'],
    interests: ['nature', 'animaux'],
  },
  dinos: {
    label: 'Dinosaures',
    ages: ['petit', 'moyen'],
    interests: ['dinosaures'],
  },
  foot: {
    label: 'Terrain de foot',
    ages: ['moyen', 'grand'],
    interests: ['football', 'sport'],
  },
  musique: {
    label: 'Musique',
    ages: ['petit', 'moyen', 'grand'],
    interests: ['musique'],
  },
  atelier: {
    label: 'Atelier',
    ages: ['petit', 'moyen'],
    interests: ['dessin', 'bricolage'],
  },
  patisserie: {
    label: 'Pâtisserie',
    ages: ['petit', 'moyen'],
    interests: ['cuisine'],
  },
  pixels: {
    label: 'Pixels',
    ages: ['moyen', 'grand'],
    interests: ['jeux_video'],
  },
  prairie: {
    label: 'Prairie',
    ages: ['petit', 'moyen'],
    interests: ['chevaux', 'nature'],
  },
  voyage: {
    label: 'En voyage',
    ages: ['petit', 'moyen'],
    interests: ['vehicules'],
  },
  bibliotheque: {
    label: 'Bibliothèque',
    ages: ['petit', 'moyen', 'grand'],
    interests: ['histoires'],
  },
  minimal: {
    label: 'Minimal',
    ages: ['grand'],
    interests: [],
  },
  arc_en_ciel: {
    label: 'Arc-en-ciel',
    ages: ['petit', 'moyen', 'grand'],
    interests: [],
    unlockLevel: 3,
  },
  aurore: {
    label: 'Aurore boréale',
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

/**
 * Fond tant que l'enfant n'a rien choisi : le premier proposé pour son âge et ses centres d'intérêt
 * (déjà débloqué) ; fond uni avec le TDAH, pour ne rien ajouter à l'écran.
 */
export function defaultBackground(
  grade: Grade,
  interests: readonly Interest[],
  needs: readonly string[],
): BackgroundCode {
  if (needs.includes('tdah')) return 'uni';
  return (
    backgroundsFor(grade, interests).find((code) => code !== 'uni' && isBackgroundUnlocked(code, 0)) ?? 'uni'
  );
}
