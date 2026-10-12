/**
 * Notation du banc d'essai de l'IA : fonctions pures, testées sans appel à l'API.
 *
 * Lecture d'une photo : chaque devoir attendu est cherché parmi les devoirs lus (même matière, même type, tous
 * les mots clés présents dans la consigne). On mesure le rappel (devoirs attendus retrouvés), la précision
 * (devoirs lus qui correspondent à un devoir attendu), et l'exactitude des dates parmi les devoirs retrouvés.
 */

export interface ExpectedTask {
  subject: string;
  kind: 'devoir' | 'lecon' | 'interro' | 'examen';
  /** Mots qui doivent figurer dans la consigne lue (sans tenir compte des accents ni des majuscules). */
  keywords: string[];
  /** Échéance attendue (AAAA-MM-JJ) ; null si la page n'en donne pas. Absente : non vérifiée. */
  dueDate?: string | null;
}

export interface PhotoCase {
  id: string;
  /** Année de l'élève (code : P5, S2…). */
  grade: string;
  documentType: string | null;
  /** Date « d'aujourd'hui » donnée au modèle (les jours de la semaine sont résolus par rapport à elle). */
  today: string;
  tasks: ExpectedTask[];
  /** Mots de dictée attendus (dictée préparée ou corrigée), si la page en contient. */
  spellingWords?: string[];
  /** Mots de vocabulaire attendus (le terme), si la page est une liste de vocabulaire. */
  vocabulary?: string[];
}

export interface ReadTask {
  subject: string;
  kind: string;
  description: string;
  dueDate: string | null;
}

export interface PhotoScore {
  expected: number;
  read: number;
  found: number;
  /** Devoirs lus qui correspondent à un devoir attendu. */
  matched: number;
  datesChecked: number;
  datesRight: number;
  recall: number;
  precision: number;
  dateAccuracy: number | null;
  spellingRecall: number | null;
  vocabularyRecall: number | null;
}

export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

function matches(expected: ExpectedTask, read: ReadTask): boolean {
  if (normalize(expected.subject) !== normalize(read.subject)) return false;
  if (expected.kind !== read.kind) return false;
  const description = normalize(read.description);
  return expected.keywords.every((k) => description.includes(normalize(k)));
}

const ratio = (a: number, b: number) => (b === 0 ? 1 : a / b);

function recallOf(expected: string[] | undefined, read: string[]): number | null {
  if (!expected || expected.length === 0) return null;
  const got = new Set(read.map(normalize));
  return expected.filter((w) => got.has(normalize(w))).length / expected.length;
}

/** Appariement glouton : chaque devoir lu ne sert qu'une fois. */
export function scorePhoto(
  expected: PhotoCase,
  read: { tasks: ReadTask[]; spellingWords?: string[]; vocabulary?: { term: string }[] },
): PhotoScore {
  const used = new Set<number>();
  let found = 0;
  let datesChecked = 0;
  let datesRight = 0;
  for (const task of expected.tasks) {
    const index = read.tasks.findIndex((r, i) => !used.has(i) && matches(task, r));
    if (index < 0) continue;
    used.add(index);
    found++;
    if (task.dueDate !== undefined) {
      datesChecked++;
      if ((read.tasks[index]!.dueDate ?? null) === task.dueDate) datesRight++;
    }
  }
  return {
    expected: expected.tasks.length,
    read: read.tasks.length,
    found,
    matched: used.size,
    datesChecked,
    datesRight,
    recall: ratio(found, expected.tasks.length),
    precision: ratio(used.size, read.tasks.length),
    dateAccuracy: datesChecked === 0 ? null : datesRight / datesChecked,
    spellingRecall: recallOf(expected.spellingWords, read.spellingWords ?? []),
    vocabularyRecall: recallOf(
      expected.vocabulary,
      (read.vocabulary ?? []).map((v) => v.term),
    ),
  };
}

/** Moyenne, minimum et maximum d'une mesure sur plusieurs passages (null ignorés). */
export function spread(values: (number | null)[]): { mean: number; min: number; max: number } | null {
  const kept = values.filter((v): v is number => v !== null);
  if (kept.length === 0) return null;
  return {
    mean: kept.reduce((a, b) => a + b, 0) / kept.length,
    min: Math.min(...kept),
    max: Math.max(...kept),
  };
}

export const percent = (s: { mean: number; min: number; max: number } | null) =>
  s === null
    ? '—'
    : s.min === s.max
      ? `${Math.round(s.mean * 100)} %`
      : `${Math.round(s.mean * 100)} % (${Math.round(s.min * 100)}–${Math.round(s.max * 100)})`;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Contrôles d'une fiche sans IA : contenu présent et assez fourni pour l'élève. */
export function checkPack(pack: {
  topicUnclear: boolean;
  fiche: { sections: unknown[] } | null;
  quiz: unknown[];
  exercises: unknown[];
  flashcards: unknown[];
}): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (pack.topicUnclear) problems.push('sujet jugé trop vague');
  if (!pack.fiche || pack.fiche.sections.length === 0) problems.push('fiche vide');
  if (pack.quiz.length < 3) problems.push(`quiz trop court (${pack.quiz.length})`);
  if (pack.flashcards.length < 3) problems.push(`trop peu de cartes (${pack.flashcards.length})`);
  return { ok: problems.length === 0, problems };
}
