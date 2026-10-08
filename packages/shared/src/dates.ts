/**
 * Dates « calendrier » au format AAAA-MM-JJ, sans fuseau horaire :
 * une échéance scolaire est un jour, pas un instant.
 */
export type IsoDate = string;

export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Nombre de jours de `from` à `to` (négatif si `to` est avant). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const ms = parseIsoDate(to).getTime() - parseIsoDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

const WEEKDAY_KEYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'] as const;
const WEEKDAY_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Clé du jour de la semaine (« lun », « mar »…), cohérente avec les préférences du profil. */
export function weekdayKey(iso: IsoDate): (typeof WEEKDAY_KEYS)[number] {
  return WEEKDAY_KEYS[parseIsoDate(iso).getDay()]!;
}

/** « mar. 7 oct. » */
export function formatShortDate(iso: IsoDate): string {
  const date = parseIsoDate(iso);
  return `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** « aujourd'hui », « demain », ou « mardi 7 oct. » */
export function formatRelativeDate(iso: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  const date = parseIsoDate(iso);
  return `${WEEKDAY_LONG[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
