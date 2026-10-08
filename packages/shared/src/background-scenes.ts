/**
 * Scènes des fonds d'écran : un dégradé de ciel, des formes douces (collines, vagues, astres, arc-en-ciel…)
 * et quelques éléments placés comme dans un dessin. Tout est immobile. Les couleurs restent claires en mode
 * clair et sombres en mode sombre, pour que le texte posé sur le fond reste lisible (contrast.test.ts).
 *
 * Positions en pourcentage de l'écran (centre de l'élément) ; taille des formes en pourcentage de la
 * largeur ; taille des éléments en points pour un écran de 400 points de large (mise à l'échelle).
 */
export interface Duo {
  light: string;
  dark: string;
}

export interface SceneShape {
  kind: 'circle' | 'ring' | 'square';
  x: number;
  y: number;
  size: number;
  color: Duo;
  opacity: number;
  /** Épaisseur du contour (anneaux), en points. */
  stroke?: number;
  rotate?: number;
}

export interface SceneDecor {
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotate?: number;
}

export interface Scene {
  /** Dégradé vertical, du haut vers le bas. */
  gradient: { light: readonly [string, string]; dark: readonly [string, string] };
  shapes: readonly SceneShape[];
  decor: readonly SceneDecor[];
}

const c = (light: string, dark: string): Duo => ({ light, dark });

/**
 * Emplacements des éléments : une bande en haut (au-dessus du titre), les bords gauche et droit (visibles à
 * côté du contenu sur tablette), et deux grands éléments en bas.
 */
const TOP_SLOTS = [
  { x: 12, y: 2.6, size: 24, rotate: -10 },
  { x: 40, y: 2.2, size: 18 },
  { x: 66, y: 2.8, size: 22, rotate: 10 },
  { x: 90, y: 2.4, size: 20, rotate: -6 },
];
const SIDE_SLOTS = [
  { x: 3, y: 22, size: 30, rotate: -8 },
  { x: 97, y: 30, size: 34, rotate: 8 },
  { x: 3, y: 46, size: 26, rotate: 12 },
  { x: 97, y: 56, size: 30, rotate: -10 },
  { x: 3, y: 70, size: 32, rotate: 6 },
  { x: 97, y: 78, size: 28, rotate: -4 },
];
const HERO_SLOTS = [
  { x: 5, y: 95, size: 52, rotate: -4 },
  { x: 95, y: 94, size: 58, rotate: 4 },
];

function layout(
  top: readonly string[],
  sides: readonly string[],
  heroes: readonly [string, string],
): SceneDecor[] {
  return [
    ...top.map((emoji, i) => ({ emoji, ...TOP_SLOTS[i]! })),
    ...sides.map((emoji, i) => ({ emoji, ...SIDE_SLOTS[i]! })),
    ...heroes.map((emoji, i) => ({ emoji, ...HERO_SLOTS[i]! })),
  ];
}

/** Collines (grands disques posés en bas de l'écran). */
const hills = (light: [string, string], dark: [string, string]): SceneShape[] => [
  { kind: 'circle', x: 15, y: 112, size: 120, color: c(light[0], dark[0]), opacity: 0.7 },
  { kind: 'circle', x: 90, y: 118, size: 140, color: c(light[1], dark[1]), opacity: 0.7 },
];

export const SCENES = {
  etoiles: {
    gradient: { light: ['#E6EBFA', '#F7F3FB'], dark: ['#0D1230', '#1C1740'] },
    shapes: [
      { kind: 'circle', x: 86, y: 7, size: 26, color: c('#FFF3C4', '#3B3A5C'), opacity: 0.8 },
      { kind: 'circle', x: 80, y: 5, size: 22, color: c('#E6EBFA', '#0D1230'), opacity: 1 },
      { kind: 'circle', x: 20, y: 115, size: 160, color: c('#DCE3F7', '#151A3A'), opacity: 0.8 },
    ],
    decor: layout(['✨', '⭐', '✨', '⭐'], ['⭐', '✨', '🌟', '⭐', '✨', '💫'], ['🌙', '🔭']),
  },
  galaxie: {
    gradient: { light: ['#EAE6FA', '#F9EFF6'], dark: ['#110D2A', '#28113B'] },
    shapes: [
      { kind: 'circle', x: 92, y: 10, size: 44, color: c('#E0D6F7', '#2C1D55'), opacity: 0.8 },
      {
        kind: 'ring',
        x: 92,
        y: 10,
        size: 64,
        color: c('#DCD2F5', '#3A2A66'),
        opacity: 0.7,
        stroke: 3,
        rotate: -20,
      },
      { kind: 'circle', x: 0, y: 100, size: 90, color: c('#F1DDF0', '#2E1240'), opacity: 0.7 },
      { kind: 'circle', x: 70, y: 70, size: 6, color: c('#D9CCF4', '#4A3580'), opacity: 0.8 },
    ],
    decor: layout(['✨', '⭐', '✨', '💫'], ['🪐', '✨', '☄️', '⭐', '🛸', '✨'], ['🌍', '🚀']),
  },
  ocean: {
    gradient: { light: ['#DDF0F7', '#F1F9F6'], dark: ['#0A1B2A', '#0D2931'] },
    shapes: [
      { kind: 'circle', x: 10, y: 108, size: 90, color: c('#C9E7F0', '#0E3140'), opacity: 0.7 },
      { kind: 'circle', x: 55, y: 112, size: 90, color: c('#D2ECF2', '#0F2E3B'), opacity: 0.7 },
      { kind: 'circle', x: 98, y: 106, size: 80, color: c('#C9E7F0', '#0E3140'), opacity: 0.7 },
      { kind: 'circle', x: 88, y: 8, size: 18, color: c('#FFF0C9', '#2A3A44'), opacity: 0.8 },
    ],
    decor: layout(['🫧', '🐚', '🫧', '🐦'], ['🐠', '🫧', '🐟', '🐡', '🫧', '🦑'], ['🐙', '🦀']),
  },
  grand_bleu: {
    gradient: { light: ['#D9E9F6', '#EDF4FB'], dark: ['#061524', '#0B2236'] },
    shapes: [
      { kind: 'circle', x: 50, y: -10, size: 120, color: c('#E8F2FA', '#0E2840'), opacity: 0.7 },
      { kind: 'circle', x: 85, y: 75, size: 50, color: c('#CFE2F2', '#0C2A44'), opacity: 0.6 },
    ],
    decor: layout(['🫧', '🫧', '🐦', '🫧'], ['🐬', '🫧', '🐢', '🦐', '🫧', '🐟'], ['🐳', '🐋']),
  },
  foret: {
    gradient: { light: ['#E4F1EC', '#F4F7EC'], dark: ['#0C1912', '#13241A'] },
    shapes: hills(['#D3E8CC', '#C9E2C3'], ['#16301F', '#1A3624']),
    decor: layout(['🐦', '🍃', '🐦', '🍂'], ['🦉', '🍂', '🐿️', '🍃', '🦊', '🍄'], ['🌲', '🌳']),
  },
  dinos: {
    gradient: { light: ['#F2F0DA', '#FAF5E8'], dark: ['#17180E', '#25200F'] },
    shapes: [
      { kind: 'circle', x: 85, y: 9, size: 24, color: c('#FCE6B5', '#3A2D12'), opacity: 0.8 },
      ...hills(['#E3E6C3', '#DCE2BD'], ['#26301A', '#2B341C']),
    ],
    decor: layout(['🌿', '🦴', '🌿', '🥚'], ['🦕', '🌿', '🥚', '🦴', '🌴', '🪨'], ['🌋', '🦖']),
  },
  foot: {
    gradient: { light: ['#E1F2E5', '#F3F9F1'], dark: ['#0D1D13', '#12291A'] },
    shapes: [
      { kind: 'ring', x: 50, y: 100, size: 70, color: c('#C8E3CE', '#1C3A26'), opacity: 0.8, stroke: 4 },
      { kind: 'square', x: 50, y: 82, size: 160, color: c('#D7ECDB', '#15301E'), opacity: 0.5 },
    ],
    decor: layout(['⚽', '🏆', '⭐', '⚽'], ['👟', '⚽', '🧤', '⚽', '🎽', '🏅'], ['🥅', '🥅']),
  },
  musique: {
    gradient: { light: ['#F4E7F3', '#FBF3EC'], dark: ['#1B0F22', '#281631'] },
    shapes: [
      { kind: 'circle', x: 95, y: 92, size: 55, color: c('#EAD8EA', '#2E1B38'), opacity: 0.8 },
      { kind: 'ring', x: 95, y: 92, size: 30, color: c('#E6D2E6', '#3E2A4A'), opacity: 0.8, stroke: 3 },
      { kind: 'circle', x: 0, y: 10, size: 40, color: c('#F7E3E8', '#2A1426'), opacity: 0.7 },
    ],
    decor: layout(['🎵', '🎶', '🎵', '🎶'], ['🎸', '🎵', '🎺', '🎶', '🎻', '🎵'], ['🎹', '🥁']),
  },
  atelier: {
    gradient: { light: ['#FBEDE5', '#FBF6ED'], dark: ['#21140F', '#2A1B14'] },
    shapes: [
      { kind: 'circle', x: 8, y: 6, size: 30, color: c('#F9D9CF', '#3A1E18'), opacity: 0.8 },
      { kind: 'circle', x: 95, y: 30, size: 22, color: c('#FBEBC4', '#3A2E14'), opacity: 0.8 },
      { kind: 'circle', x: 5, y: 70, size: 26, color: c('#D6E6F5', '#16263A'), opacity: 0.8 },
      { kind: 'circle', x: 90, y: 96, size: 34, color: c('#DDEED8', '#1A2E1A'), opacity: 0.8 },
    ],
    decor: layout(['✏️', '🖍️', '✂️', '📏'], ['🖌️', '🖍️', '✏️', '🧵', '🖍️', '📐'], ['🎨', '🖼️']),
  },
  patisserie: {
    gradient: { light: ['#FCE8EE', '#FBF4EA'], dark: ['#23121A', '#2A1A16'] },
    shapes: [
      { kind: 'circle', x: 92, y: 6, size: 30, color: c('#F9D6E0', '#3A1A26'), opacity: 0.8 },
      { kind: 'circle', x: 4, y: 96, size: 40, color: c('#F6E4CF', '#33251A'), opacity: 0.8 },
    ],
    decor: layout(['🍓', '🍒', '🍬', '🍓'], ['🍪', '🍩', '🍓', '🍫', '🍭', '🍪'], ['🧁', '🍰']),
  },
  pixels: {
    gradient: { light: ['#E8EAFA', '#F1EDF8'], dark: ['#10122A', '#1A1236'] },
    shapes: [
      { kind: 'square', x: 6, y: 6, size: 8, color: c('#D4D8F4', '#262A55'), opacity: 0.9 },
      { kind: 'square', x: 14, y: 6, size: 8, color: c('#DCD2F2', '#30245A'), opacity: 0.9 },
      { kind: 'square', x: 6, y: 11, size: 8, color: c('#CFE3F2', '#1E3050'), opacity: 0.9 },
      { kind: 'square', x: 94, y: 70, size: 8, color: c('#D4D8F4', '#262A55'), opacity: 0.9 },
      { kind: 'square', x: 86, y: 75, size: 8, color: c('#DCD2F2', '#30245A'), opacity: 0.9 },
      { kind: 'square', x: 94, y: 80, size: 8, color: c('#CFE3F2', '#1E3050'), opacity: 0.9 },
    ],
    decor: layout(['⭐', '💎', '⭐', '🪙'], ['👾', '🕹️', '💎', '👾', '🪙', '🗝️'], ['🎮', '🏰']),
  },
  prairie: {
    gradient: { light: ['#E0F0F8', '#F5F7E5'], dark: ['#0E1924', '#161F0F'] },
    shapes: [
      { kind: 'circle', x: 88, y: 8, size: 24, color: c('#FDEAB8', '#3A3214'), opacity: 0.85 },
      ...hills(['#D9EBC6', '#CFE5BD'], ['#1E2E14', '#233318']),
    ],
    decor: layout(['☁️', '🐦', '☁️', '🦋'], ['🦋', '🌼', '🐝', '🌷', '🐞', '🌼'], ['🌻', '🐴']),
  },
  voyage: {
    gradient: { light: ['#E1EDF8', '#F6F1E6'], dark: ['#0F1925', '#1E1913'] },
    shapes: [
      { kind: 'circle', x: 20, y: 9, size: 18, color: c('#FFFFFF', '#22303E'), opacity: 0.8 },
      { kind: 'circle', x: 28, y: 8, size: 22, color: c('#FFFFFF', '#22303E'), opacity: 0.8 },
      { kind: 'circle', x: 36, y: 10, size: 16, color: c('#FFFFFF', '#22303E'), opacity: 0.8 },
      ...hills(['#E8E2CF', '#E2DCC6'], ['#2A2418', '#2E271A']),
    ],
    decor: layout(['✈️', '☁️', '🎈', '☁️'], ['🗺️', '🧳', '🎈', '📷', '🧭', '🏝️'], ['🚂', '🚗']),
  },
  bibliotheque: {
    gradient: { light: ['#F4EDE1', '#FBF7EE'], dark: ['#1B150E', '#251C12'] },
    shapes: [
      { kind: 'circle', x: 90, y: 10, size: 50, color: c('#FBEBC8', '#3A2C16'), opacity: 0.6 },
      { kind: 'square', x: 50, y: 104, size: 140, color: c('#EFE3CF', '#2A2014'), opacity: 0.7 },
    ],
    decor: layout(['✨', '🔖', '✨', '🕯️'], ['📖', '🔖', '📜', '✒️', '📕', '✨'], ['📚', '🦉']),
  },
  minimal: {
    gradient: { light: ['#F1F1F0', '#F8F7F4'], dark: ['#15171A', '#1C1F23'] },
    shapes: [
      { kind: 'circle', x: 100, y: 0, size: 70, color: c('#E8E7E3', '#202328'), opacity: 0.9 },
      { kind: 'circle', x: 0, y: 100, size: 90, color: c('#ECEBE7', '#1E2125'), opacity: 0.9 },
    ],
    decor: [],
  },
  arc_en_ciel: {
    gradient: { light: ['#E7EEFB', '#FBF0F5'], dark: ['#131533', '#2A142F'] },
    shapes: [
      { kind: 'ring', x: 0, y: 100, size: 150, color: c('#F7C9C9', '#4A2030'), opacity: 0.8, stroke: 10 },
      { kind: 'ring', x: 0, y: 100, size: 140, color: c('#F9DDBF', '#4A3220'), opacity: 0.8, stroke: 10 },
      { kind: 'ring', x: 0, y: 100, size: 130, color: c('#F7EDBC', '#4A4420'), opacity: 0.8, stroke: 10 },
      { kind: 'ring', x: 0, y: 100, size: 120, color: c('#D2EDC9', '#22402A'), opacity: 0.8, stroke: 10 },
      { kind: 'ring', x: 0, y: 100, size: 110, color: c('#CBE0F5', '#1E3050'), opacity: 0.8, stroke: 10 },
      { kind: 'ring', x: 0, y: 100, size: 100, color: c('#DDD0F2', '#33245A'), opacity: 0.8, stroke: 10 },
    ],
    decor: layout(['☁️', '✨', '☁️', '✨'], ['☁️', '✨', '🌟', '☁️', '✨', '🦋'], ['☁️', '🦄']),
  },
  aurore: {
    gradient: { light: ['#E2F2EE', '#ECE9F8'], dark: ['#06191B', '#1A1236'] },
    shapes: [
      { kind: 'circle', x: 20, y: 0, size: 110, color: c('#CDEEE2', '#0F3A30'), opacity: 0.7 },
      { kind: 'circle', x: 85, y: 12, size: 90, color: c('#DDD5F4', '#2A1F55'), opacity: 0.7 },
      { kind: 'circle', x: 50, y: 112, size: 160, color: c('#E6ECF0', '#101C26'), opacity: 0.9 },
    ],
    decor: layout(['✨', '⭐', '✨', '⭐'], ['✨', '🦌', '⭐', '🦊', '✨', '🦉'], ['🏔️', '🌲']),
  },
} satisfies Record<string, Scene>;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Couleur intermédiaire entre deux couleurs (t de 0 à 1), pour dessiner le dégradé par bandes. */
export function mixColors(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(ar, br), mix(ag, bg), mix(ab, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
