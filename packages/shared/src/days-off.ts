import { addDays, type IsoDate } from './dates';

/** Congés et absences d'un enfant : aucun travail n'est planifié ces jours-là. */
export const DAY_OFF_KINDS = ['conge', 'absence', 'activite'] as const;
export type DayOffKind = (typeof DAY_OFF_KINDS)[number];

export const DAY_OFF_LABELS: Record<DayOffKind, string> = {
  conge: 'Congé scolaire',
  absence: 'Absence (maladie, voyage…)',
  activite: 'Stage ou activité',
};

/** Durée maximale d'une période (un trimestre), comme en base. */
export const MAX_DAY_OFF_DAYS = 93;

export interface DayOffRange {
  start: IsoDate;
  end: IsoDate;
}

/** Jours couverts par des périodes, limités à [from, to]. */
export function datesInRanges(ranges: readonly DayOffRange[], from: IsoDate, to: IsoDate): IsoDate[] {
  const dates = new Set<IsoDate>();
  for (const range of ranges) {
    let day = range.start < from ? from : range.start;
    const last = range.end > to ? to : range.end;
    while (day <= last) {
      dates.add(day);
      day = addDays(day, 1);
    }
  }
  return [...dates].sort();
}
