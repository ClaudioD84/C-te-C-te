/**
 * Entraînement aux tables de multiplication (et d'addition pour les plus jeunes) : 10 questions, sans
 * chronomètre. Les erreurs reviennent en fin de série ; un support visuel (rangées de points) est proposé
 * pour la dyscalculie. Tirage stable pour une même graine.
 */
export type TableOperation = 'multiplication' | 'addition';

export interface TableQuestionItem {
  a: number;
  b: number;
  operation: TableOperation;
  answer: number;
}

export const TABLE_SERIES_LENGTH = 10;

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return h / 4294967296;
  };
}

/** Série de questions pour les tables choisies (ex. [2, 5]), sans deux fois la même d'affilée. */
export function tableSeries(
  tables: readonly number[],
  operation: TableOperation,
  seed: string,
  length = TABLE_SERIES_LENGTH,
): TableQuestionItem[] {
  const random = rng(seed);
  const chosen = tables.length > 0 ? tables : [2];
  const series: TableQuestionItem[] = [];
  while (series.length < length) {
    const a = chosen[Math.floor(random() * chosen.length)]!;
    const b = 1 + Math.floor(random() * 10);
    const previous = series.at(-1);
    if (previous && previous.a === a && previous.b === b) continue;
    series.push({ a, b, operation, answer: operation === 'multiplication' ? a * b : a + b });
  }
  return series;
}

export function questionText(q: TableQuestionItem): string {
  return `${q.a} ${q.operation === 'multiplication' ? '×' : '+'} ${q.b}`;
}

/** Lecture à voix haute : « 3 fois 4 » ou « 3 plus 4 ». */
export function questionSpeech(q: TableQuestionItem): string {
  return `${q.a} ${q.operation === 'multiplication' ? 'fois' : 'plus'} ${q.b}`;
}

/** Tables proposées selon l'année : additions en P1-P2, multiplications ensuite. */
export function defaultOperation(gradeYear: number, primary: boolean): TableOperation {
  return primary && gradeYear <= 2 ? 'addition' : 'multiplication';
}
