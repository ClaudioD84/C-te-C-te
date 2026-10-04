/**
 * Masquage des données personnelles sur les photos (F3).
 * Le texte est reconnu sur l'appareil ; on masque les mots qui correspondent
 * aux noms saisis par le parent (prénom de l'enfant, école, enseignants…).
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RecognizedWord {
  text: string;
  frame: Box;
}

/** Minuscules, sans accents ni ponctuation : « Léa-Marie, » → « leamarie ». */
export function normalizeWord(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Mots à masquer à partir des noms saisis (« Léa Dupont » → « lea », « dupont »). */
export function nameTokens(names: readonly string[]): string[] {
  const tokens = names
    .flatMap((name) => name.split(/[\s'’-]+/))
    .map(normalizeWord)
    .filter((t) => t.length >= 2);
  return [...new Set(tokens)];
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}

/** Tolère une erreur de lecture sur les noms de 5 lettres ou plus. */
export function matchesToken(word: string, token: string): boolean {
  const normalized = normalizeWord(word);
  if (normalized.length < 2) return false;
  if (normalized === token) return true;
  return (
    token.length >= 5 &&
    Math.abs(normalized.length - token.length) <= 1 &&
    editDistance(normalized, token) <= 1
  );
}

/** Agrandit une zone pour couvrir aussi les jambages et les accents. */
export function padBox(box: Box, imageWidth: number, imageHeight: number, ratio = 0.25): Box {
  const pad = box.height * ratio;
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  return {
    left,
    top,
    width: Math.min(imageWidth, box.left + box.width + pad) - left,
    height: Math.min(imageHeight, box.top + box.height + pad) - top,
  };
}

/** Zones à masquer dans une image, en pixels de l'image. */
export function findSensitiveBoxes(
  words: readonly RecognizedWord[],
  names: readonly string[],
  imageWidth: number,
  imageHeight: number,
): Box[] {
  const tokens = nameTokens(names);
  if (tokens.length === 0) return [];
  return words
    .filter((word) => tokens.some((token) => matchesToken(word.text, token)))
    .map((word) => padBox(word.frame, imageWidth, imageHeight));
}

/** Indique si un point (en pixels de l'image) est dans une zone. */
export function boxContains(box: Box, x: number, y: number): boolean {
  return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
}

/** Rectangle normalisé à partir de deux coins, quel que soit le sens du tracé. */
export function boxFromCorners(x1: number, y1: number, x2: number, y2: number): Box {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}
