import { ageGroup, type AgeGroup } from './backgrounds';
import { BELGIAN_ANIMALS } from './collection';
import type { Interest } from './profile';
import type { Grade } from './school';

/**
 * Coin détente : de petits jeux calmes, après la mission ou pendant une pause. Pas de chrono, pas de score,
 * pas de partie perdue ; la durée par jour est limitée par le parent. Les jeux ne rapportent aucun point
 * d'effort (réservés au travail). Tout est généré sur l'appareil, hors connexion, sans IA.
 */
export const RELAX_GAMES = {
  memory: { label: 'Memory', emoji: '🧠', ages: ['petit', 'moyen', 'grand'] },
  coloriage: { label: 'Coloriage', emoji: '🎨', ages: ['petit', 'moyen', 'grand'] },
  taquin: { label: 'Taquin', emoji: '🧩', ages: ['petit', 'moyen', 'grand'] },
  mots_meles: { label: 'Mots mêlés', emoji: '🔤', ages: ['moyen', 'grand'] },
  sudoku: { label: 'Sudoku', emoji: '🔢', ages: ['petit', 'moyen', 'grand'] },
  bulles: { label: 'Bulles à éclater', emoji: '🫧', ages: ['petit', 'moyen', 'grand'] },
} as const satisfies Record<string, { label: string; emoji: string; ages: readonly AgeGroup[] }>;

export type RelaxGame = keyof typeof RELAX_GAMES;

/** Minutes de détente par jour : réglage du parent (0 : coin détente fermé). */
export const RELAX_MINUTE_CHOICES = [0, 5, 10, 15, 20] as const;
export const DEFAULT_RELAX_MINUTES = 10;

export function relaxMinutesLimit(preferences: { relaxMinutes?: number }): number {
  return preferences.relaxMinutes ?? DEFAULT_RELAX_MINUTES;
}

export function relaxGamesFor(grade: Grade): RelaxGame[] {
  const age = ageGroup(grade);
  return (Object.keys(RELAX_GAMES) as RelaxGame[]).filter((game) =>
    (RELAX_GAMES[game].ages as readonly AgeGroup[]).includes(age),
  );
}

// ---------------------------------------------------------------------------
// Hasard reproductible (une partie se rejoue à l'identique avec la même graine)
// ---------------------------------------------------------------------------

export type Rng = () => number;

export function seededRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Jeu proposé du jour (profil TDAH : un seul jeu à la fois). */
export function relaxGameOfTheDay(grade: Grade, seed: string): RelaxGame {
  const games = relaxGamesFor(grade);
  return games[Math.floor(seededRng(seed)() * games.length)]!;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

const MEMORY_SYMBOLS: Partial<Record<Interest, readonly string[]>> = {
  animaux: ['🐶', '🐱', '🐰', '🐼', '🐨', '🐯'],
  dinosaures: ['🦕', '🦖', '🥚', '🌋', '🦴', '🌿'],
  espace: ['🚀', '🪐', '🌙', '⭐', '☄️', '👽'],
  football: ['⚽', '🥅', '🏆', '👟', '🧤', '🏟️'],
  sport: ['🏀', '🎾', '🚴', '🏊', '⛷️', '🏓'],
  musique: ['🎸', '🥁', '🎹', '🎺', '🎻', '🎵'],
  dessin: ['🎨', '🖍️', '✏️', '🖌️', '🌈', '📐'],
  cuisine: ['🍓', '🍰', '🥐', '🍕', '🧁', '🍎'],
  jeux_video: ['🎮', '👾', '🕹️', '🏰', '💎', '🗝️'],
  nature: ['🌻', '🍄', '🌳', '🍁', '🌷', '🐝'],
  chevaux: ['🐴', '🏇', '🥕', '🎠', '🦄', '🌾'],
  vehicules: ['🚂', '🚗', '🚲', '✈️', '🚒', '🚜'],
  histoires: ['🐉', '🧚', '👑', '🏰', '🧙', '📖'],
  bricolage: ['🔨', '🪚', '🔧', '📏', '🪛', '🧰'],
  mer: ['🐠', '🐙', '🐳', '🦀', '🐚', '⚓'],
};

export const MEMORY_PAIRS: Record<AgeGroup, number> = { petit: 6, moyen: 8, grand: 10 };

export interface MemoryCard {
  id: number;
  symbol: string;
}

/** Cartes du memory : symboles de ses centres d'intérêt d'abord, complétés par les animaux de l'album. */
export function memoryDeck(grade: Grade, interests: readonly Interest[], rng: Rng): MemoryCard[] {
  const pool = [...interests.flatMap((i) => MEMORY_SYMBOLS[i] ?? []), ...BELGIAN_ANIMALS.map((a) => a.emoji)];
  const symbols = shuffled([...new Set(pool)].slice(0, Math.max(12, interests.length * 6)), rng).slice(
    0,
    MEMORY_PAIRS[ageGroup(grade)],
  );
  return shuffled(
    symbols.flatMap((symbol) => [symbol, symbol]),
    rng,
  ).map((symbol, id) => ({ id, symbol }));
}

// ---------------------------------------------------------------------------
// Taquin (0 : case vide)
// ---------------------------------------------------------------------------

export const TAQUIN_SETUP: Record<AgeGroup, { size: number; moves: number }> = {
  petit: { size: 3, moves: 16 },
  moyen: { size: 3, moves: 60 },
  grand: { size: 4, moves: 120 },
};

export function solvedTaquin(size: number): number[] {
  return Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
}

function neighbours(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  return [
    r > 0 ? index - size : -1,
    r < size - 1 ? index + size : -1,
    c > 0 ? index - 1 : -1,
    c < size - 1 ? index + 1 : -1,
  ].filter((i) => i >= 0);
}

/** Mélange par des coups réels depuis la position rangée : le taquin a toujours une solution. */
export function shuffledTaquin(size: number, moves: number, rng: Rng): number[] {
  let board = solvedTaquin(size);
  let previous = -1;
  for (let m = 0; m < moves; m++) {
    const blank = board.indexOf(0);
    const options = neighbours(blank, size).filter((i) => i !== previous);
    const pick = options[Math.floor(rng() * options.length)]!;
    previous = blank;
    board = moveTile(board, size, pick) ?? board;
  }
  return isTaquinSolved(board) ? shuffledTaquin(size, moves + 1, rng) : board;
}

/** Glisse la pièce touchée dans la case vide voisine ; null si elle n'est pas à côté. */
export function moveTile(board: readonly number[], size: number, index: number): number[] | null {
  const blank = board.indexOf(0);
  if (!neighbours(blank, size).includes(index)) return null;
  const next = [...board];
  next[blank] = board[index]!;
  next[index] = 0;
  return next;
}

export function isTaquinSolved(board: readonly number[]): boolean {
  return board.every((tile, i) => tile === (i + 1) % board.length);
}

// ---------------------------------------------------------------------------
// Mots mêlés
// ---------------------------------------------------------------------------

export const DEFAULT_WORD_SEARCH_WORDS = [
  'CHAT',
  'LUNE',
  'POMME',
  'ARBRE',
  'VELO',
  'ECOLE',
  'NUAGE',
  'LIVRE',
];

export interface PlacedWord {
  word: string;
  cells: [number, number][];
}

export interface WordSearch {
  size: number;
  grid: string[][];
  words: PlacedWord[];
}

/** Mot en capitales sans accents (les grilles n'ont que les 26 lettres). */
export function gridWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/Œ/g, 'OE')
    .replace(/Æ/g, 'AE')
    .replace(/[^A-Z]/g, '');
}

/**
 * Grille de mots mêlés avec les mots de la semaine (dictée) quand il y en a, sinon des mots courants.
 * De gauche à droite et de haut en bas ; en diagonale aussi pour les grands.
 */
export function buildWordSearch(grade: Grade, words: readonly string[], rng: Rng): WordSearch {
  const age = ageGroup(grade);
  const size = age === 'grand' ? 10 : 8;
  const directions: [number, number][] =
    age === 'grand'
      ? [
          [0, 1],
          [1, 0],
          [1, 1],
        ]
      : [
          [0, 1],
          [1, 0],
        ];
  const own = [...new Set(words.map(gridWord))].filter((w) => w.length >= 3 && w.length <= size);
  const candidates = shuffled(own.length >= 3 ? own : [...own, ...DEFAULT_WORD_SEARCH_WORDS], rng);
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const placed: PlacedWord[] = [];

  for (const word of candidates) {
    if (placed.length >= 6) break;
    if (placed.some((p) => p.word === word)) continue;
    for (let attempt = 0; attempt < 80; attempt++) {
      const [dr, dc] = directions[Math.floor(rng() * directions.length)]!;
      const r0 = Math.floor(rng() * (size - dr * (word.length - 1)));
      const c0 = Math.floor(rng() * (size - dc * (word.length - 1)));
      const cells: [number, number][] = [...word].map((_, i) => [r0 + dr * i, c0 + dc * i]);
      if (cells.every(([r, c], i) => grid[r]![c] === null || grid[r]![c] === word[i])) {
        cells.forEach(([r, c], i) => (grid[r]![c] = word[i]!));
        placed.push({ word, cells });
        break;
      }
    }
  }

  const letters = 'ABCDEFGHIJLMNOPRSTUVE';
  return {
    size,
    grid: grid.map((row) => row.map((cell) => cell ?? letters[Math.floor(rng() * letters.length)]!)),
    words: placed,
  };
}

/** Mot trouvé quand l'enfant touche sa première puis sa dernière lettre (dans un sens ou l'autre). */
export function wordBetween(
  search: WordSearch,
  a: readonly [number, number],
  b: readonly [number, number],
): PlacedWord | null {
  const same = (x: readonly [number, number], y: readonly [number, number]) => x[0] === y[0] && x[1] === y[1];
  return (
    search.words.find((w) => {
      const first = w.cells[0]!;
      const last = w.cells.at(-1)!;
      return (same(first, a) && same(last, b)) || (same(first, b) && same(last, a));
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// Sudoku (0 : case vide)
// ---------------------------------------------------------------------------

export interface SudokuSetup {
  size: number;
  boxRows: number;
  boxCols: number;
  clues: number;
}

export const SUDOKU_SETUP: Record<AgeGroup, SudokuSetup> = {
  petit: { size: 4, boxRows: 2, boxCols: 2, clues: 10 },
  moyen: { size: 4, boxRows: 2, boxCols: 2, clues: 7 },
  grand: { size: 6, boxRows: 2, boxCols: 3, clues: 16 },
};

/** Formes à la place des chiffres pour les petits. */
export const SUDOKU_SHAPES = ['🔴', '🟦', '🟡', '🟩'];

/** Grille à compléter : toute grille qui respecte les règles est acceptée (pas de solution imposée). */
export function buildSudoku({ size, boxRows, boxCols, clues }: SudokuSetup, rng: Rng): number[][] {
  const digits = shuffled(
    Array.from({ length: size }, (_, i) => i + 1),
    rng,
  );
  const bands = shuffled(
    Array.from({ length: size / boxRows }, (_, i) => i),
    rng,
  );
  const stacks = shuffled(
    Array.from({ length: size / boxCols }, (_, i) => i),
    rng,
  );
  const rows = bands.flatMap((b) =>
    shuffled(
      Array.from({ length: boxRows }, (_, i) => b * boxRows + i),
      rng,
    ),
  );
  const cols = stacks.flatMap((s) =>
    shuffled(
      Array.from({ length: boxCols }, (_, i) => s * boxCols + i),
      rng,
    ),
  );
  const pattern = (r: number, c: number) => (boxCols * (r % boxRows) + Math.floor(r / boxRows) + c) % size;
  const solution = rows.map((r) => cols.map((c) => digits[pattern(r, c)]!));
  const keep = new Set(
    shuffled(
      Array.from({ length: size * size }, (_, i) => i),
      rng,
    ).slice(0, clues),
  );
  return solution.map((row, r) => row.map((v, c) => (keep.has(r * size + c) ? v : 0)));
}

/** Grille complète et conforme : chaque chiffre une fois par ligne, colonne et bloc. */
export function isSudokuSolved(grid: readonly (readonly number[])[], setup: SudokuSetup): boolean {
  const { size, boxRows, boxCols } = setup;
  const groups: number[][] = [];
  for (let i = 0; i < size; i++) {
    groups.push([...grid[i]!]);
    groups.push(grid.map((row) => row[i]!));
    const br = Math.floor(i / (size / boxCols)) * boxRows;
    const bc = (i % (size / boxCols)) * boxCols;
    const box: number[] = [];
    for (let r = br; r < br + boxRows; r++) for (let c = bc; c < bc + boxCols; c++) box.push(grid[r]![c]!);
    groups.push(box);
  }
  return groups.every((g) => g.every((v) => v > 0) && new Set(g).size === size);
}

// ---------------------------------------------------------------------------
// Coloriage : mandalas découpés en zones (anneaux × secteurs symétriques)
// ---------------------------------------------------------------------------

export interface ColoringDesign {
  size: number;
  /** Zone de chaque case. */
  zones: number[][];
  zoneCount: number;
}

export const COLORING_PALETTE = [
  '#E4572E',
  '#F3A712',
  '#FFD23F',
  '#76B041',
  '#2E86AB',
  '#7B5EA7',
  '#F28AB2',
  '#8D6E63',
  '#FFFFFF',
];

export function mandala(grade: Grade, variant: number): ColoringDesign {
  const age = ageGroup(grade);
  const size = age === 'petit' ? 8 : 12;
  const rings = age === 'petit' ? 3 : 4 + (variant % 2);
  const sectors = age === 'petit' ? 2 : 3 + (variant % 3);
  const center = (size - 1) / 2;
  const maxDist = Math.hypot(center, center);
  const zones = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const ring = Math.min(rings - 1, Math.floor((Math.hypot(r - center, c - center) / maxDist) * rings));
      if (ring === 0) return 0;
      // Angle replié sur un huitième : le dessin est symétrique comme un vrai mandala.
      let angle = Math.atan2(Math.abs(r - center), Math.abs(c - center));
      if (angle > Math.PI / 4) angle = Math.PI / 2 - angle;
      const sector = Math.min(sectors - 1, Math.floor((angle / (Math.PI / 4)) * sectors));
      return 1 + (ring - 1) * sectors + ((sector + variant) % sectors);
    }),
  );
  return { size, zones, zoneCount: 1 + (rings - 1) * sectors };
}
