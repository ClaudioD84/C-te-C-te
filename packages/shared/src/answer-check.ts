/**
 * Vérification d'une réponse tapée par l'enfant (exercices, cartes de révision). Bienveillante sans être
 * laxiste : majuscules, espaces, ponctuation finale et article français ne comptent pas ; un accent, un article
 * de langue étrangère (de/het, der/die/das…), une petite faute de frappe ou une unité oubliée donnent
 * « presque » : l'enfant corrige lui-même avant de voir la correction.
 */

export type AnswerResult = 'juste' | 'presque' | 'faux';
export type NearMiss = 'accents' | 'article' | 'orthographe' | 'unite';
export interface AnswerVerdict {
  result: AnswerResult;
  /** Ce qui manque quand la réponse est « presque » juste. */
  nearMiss?: NearMiss;
}

export const NEAR_MISS_MESSAGES: Record<NearMiss, string> = {
  accents: 'Presque ! Vérifie les accents.',
  article: 'Presque ! Vérifie l’article.',
  orthographe: 'Presque ! Vérifie l’orthographe.',
  unite: 'Presque ! Vérifie l’unité.',
};

const stripAccents = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '');

function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[’`´ʼ]/g, "'")
    .replace(/[«»"“”]/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.!?;:…]+$/u, '')
    .toLocaleLowerCase('fr');
}

/** Article français en tête (« la Meuse » = « Meuse ») : il ne change pas la réponse. */
const stripFrenchArticle = (text: string) => text.replace(/^(?:(?:le|la|les|un|une|des|du)\s+|l')/, '');
/** Article d'une langue étudiée : il fait partie du mot à apprendre (de hond, het huis, der Hund). */
const stripForeignArticle = (text: string) =>
  text.replace(/^(?:de|het|een|der|die|das|den|dem|ein|eine|the)\s+/, '');

const UNIT_ALIASES: Record<string, string> = {
  euro: '€',
  euros: '€',
  eur: '€',
  'pour cent': '%',
  pourcent: '%',
  heure: 'h',
  heures: 'h',
  minute: 'min',
  minutes: 'min',
  seconde: 's',
  secondes: 's',
};

/** Nombre écrit à la belge (1 000 ; 1.000 ; 3,5 ; 3/4), éventuellement suivi d'une unité courte. */
export function parseNumber(text: string): { value: number; unit: string; fraction: boolean } | null {
  const match = /^(-?)\s*(\d[\d\s.,]*?)(?:\s*\/\s*(\d+))?\s*([^\d\s][^\d]{0,11})?$/.exec(normalize(text));
  if (!match) return null;
  const [, sign, digits, denominator, rawUnit] = match;
  let number = digits!.replace(/\s+/g, '');
  if (number.includes(',')) number = number.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(number)) number = number.replace(/\./g, '');
  if (!/^\d+(\.\d+)?$/.test(number)) return null;
  let value = Number(number);
  if (denominator !== undefined) {
    if (Number(denominator) === 0 || number.includes('.')) return null;
    value /= Number(denominator);
  }
  const unit = (rawUnit ?? '').trim();
  return {
    value: sign ? -value : value,
    unit: UNIT_ALIASES[unit] ?? unit,
    fraction: denominator !== undefined,
  };
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
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

function compare(expected: string, typed: string): AnswerVerdict {
  const e = normalize(expected);
  const t = normalize(typed);
  if (t === '') return { result: 'faux' };
  if (e === t) return { result: 'juste' };

  const expectedNumber = parseNumber(e);
  if (expectedNumber) {
    // Une fraction s'écrit sous la forme demandée (2/4 n'est pas 1/2 simplifiée, ni 0,5).
    if (expectedNumber.fraction)
      return { result: e.replace(/\s+/g, '') === t.replace(/\s+/g, '') ? 'juste' : 'faux' };
    const typedNumber = parseNumber(t);
    if (!typedNumber) return { result: 'faux' };
    const same =
      Math.abs(expectedNumber.value - typedNumber.value) <=
      1e-9 * Math.max(1, Math.abs(expectedNumber.value));
    if (!same) return { result: 'faux' };
    if (expectedNumber.unit === typedNumber.unit || expectedNumber.unit === '') return { result: 'juste' };
    return { result: 'presque', nearMiss: 'unite' };
  }

  const e1 = stripFrenchArticle(e);
  const t1 = stripFrenchArticle(t);
  if (e1 === t1) return { result: 'juste' };
  if (stripAccents(e1) === stripAccents(t1)) return { result: 'presque', nearMiss: 'accents' };
  if (stripAccents(stripForeignArticle(e1)) === stripAccents(stripForeignArticle(t1)))
    return { result: 'presque', nearMiss: 'article' };
  const plainExpected = stripAccents(e1);
  if (plainExpected.length >= 5 && distance(plainExpected, stripAccents(t1)) <= 1)
    return { result: 'presque', nearMiss: 'orthographe' };
  return { result: 'faux' };
}

const RANK: Record<AnswerResult, number> = { juste: 2, presque: 1, faux: 0 };

/** Meilleur verdict parmi les réponses acceptées. */
export function checkAnswer(accepted: readonly string[], typed: string): AnswerVerdict {
  let best: AnswerVerdict = { result: 'faux' };
  for (const expected of accepted) {
    const verdict = compare(expected, typed);
    if (RANK[verdict.result] > RANK[best.result]) best = verdict;
    if (best.result === 'juste') break;
  }
  return best;
}

/**
 * Réponses d'une carte que l'application peut vérifier : un mot, un nom, une date, un nombre, une
 * traduction (3 mots au plus, variantes séparées par « / » ou « ; »). Sinon null : l'enfant écrit ou dit
 * sa réponse, puis la compare lui-même à celle de la carte.
 */
export function cardAnswers(back: string): string[] | null {
  const parts = back
    .split(/\s+\/\s+|\s*;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const short = parts.every((part) => part.length <= 30 && part.split(/\s+/).length <= 3);
  return short ? parts : null;
}
