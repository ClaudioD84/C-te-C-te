import type { IsoDate } from './dates';

/**
 * Calendrier scolaire de la Fédération Wallonie-Bruxelles (enseignement fondamental et secondaire),
 * proposé au parent dans « Congés et absences » : il l'ajoute en un geste après l'avoir vu.
 * Source : calendrier adopté par le Gouvernement (relayé par la presse) — À CONFIRMER sur enseignement.be
 * avant chaque rentrée. Les jours fériés légaux (lundi de Pâques, lundi de Pentecôte, 11 novembre) sont inclus.
 */
export interface SchoolBreak {
  label: string;
  start: IsoDate;
  end: IsoDate;
}

export const FWB_SCHOOL_YEARS: Record<string, { start: IsoDate; end: IsoDate; breaks: SchoolBreak[] }> = {
  '2026-2027': {
    start: '2026-08-24',
    end: '2027-07-02',
    breaks: [
      { label: 'Congé d’automne', start: '2026-10-19', end: '2026-10-30' },
      { label: 'Armistice', start: '2026-11-11', end: '2026-11-11' },
      { label: 'Vacances d’hiver', start: '2026-12-21', end: '2027-01-01' },
      { label: 'Congé de détente', start: '2027-02-22', end: '2027-03-05' },
      { label: 'Lundi de Pâques', start: '2027-03-29', end: '2027-03-29' },
      { label: 'Vacances de printemps', start: '2027-04-26', end: '2027-05-07' },
      { label: 'Lundi de Pentecôte', start: '2027-05-17', end: '2027-05-17' },
    ],
  },
};

/** Année scolaire en cours (ou la prochaine, l'été) ; undefined si le calendrier n'est pas connu. */
export function currentSchoolYear(today: IsoDate) {
  const entries = Object.entries(FWB_SCHOOL_YEARS).sort(([a], [b]) => a.localeCompare(b));
  const found = entries.find(([, year]) => today <= year.end);
  return found ? { name: found[0], ...found[1] } : undefined;
}

/** Congés encore à venir (ou en cours) de l'année scolaire. */
export function upcomingBreaks(today: IsoDate): SchoolBreak[] {
  return currentSchoolYear(today)?.breaks.filter((b) => b.end >= today) ?? [];
}
