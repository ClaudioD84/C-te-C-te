import { z } from 'zod';

/**
 * Années scolaires de la Fédération Wallonie-Bruxelles.
 * M = maternelle, P = primaire, S = secondaire (S7 : 7e année du qualifiant).
 */
export const GRADES = [
  'M1',
  'M2',
  'M3',
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
  'S1',
  'S2',
  'S3',
  'S4',
  'S5',
  'S6',
  'S7',
] as const;
export const gradeSchema = z.enum(GRADES);
export type Grade = z.infer<typeof gradeSchema>;

export type SchoolLevel = 'maternelle' | 'primaire' | 'secondaire';

export function schoolLevel(grade: Grade): SchoolLevel {
  switch (grade[0]) {
    case 'M':
      return 'maternelle';
    case 'P':
      return 'primaire';
    default:
      return 'secondaire';
  }
}

/** Numéro de l'année dans son niveau (P4 → 4). */
export function gradeYear(grade: Grade): number {
  return Number(grade.slice(1));
}

/** Types d'enseignement. Technique et professionnel commencent au 2e degré du secondaire (S3). */
export const TRACKS = ['general', 'technique', 'professionnel', 'specialise'] as const;
export const trackSchema = z.enum(TRACKS);
export type Track = z.infer<typeof trackSchema>;

/** Réseaux d'enseignement : leurs programmes diffèrent en secondaire. */
export const NETWORKS = [
  'wbe', // Wallonie-Bruxelles Enseignement
  'libre_confessionnel', // SeGEC
  'officiel_subventionne', // CPEONS
  'libre_non_confessionnel', // FELSI
] as const;
export const networkSchema = z.enum(NETWORKS);
export type Network = z.infer<typeof networkSchema>;

export const NETWORK_LABELS: Record<Network, string> = {
  wbe: 'Wallonie-Bruxelles Enseignement',
  libre_confessionnel: 'Libre confessionnel',
  officiel_subventionne: 'Officiel subventionné (communes, provinces)',
  libre_non_confessionnel: 'Libre non confessionnel',
};

/** Indique si un type d'enseignement est possible pour une année donnée. */
export function isTrackAllowed(grade: Grade, track: Track): boolean {
  if (track === 'general' || track === 'specialise') {
    return grade !== 'S7';
  }
  return schoolLevel(grade) === 'secondaire' && gradeYear(grade) >= 3;
}

export const GRADE_LABELS: Record<Grade, string> = {
  M1: '1re maternelle',
  M2: '2e maternelle',
  M3: '3e maternelle',
  P1: '1re primaire',
  P2: '2e primaire',
  P3: '3e primaire',
  P4: '4e primaire',
  P5: '5e primaire',
  P6: '6e primaire',
  S1: '1re secondaire',
  S2: '2e secondaire',
  S3: '3e secondaire',
  S4: '4e secondaire',
  S5: '5e secondaire',
  S6: '6e secondaire',
  S7: '7e secondaire',
};

export const TRACK_LABELS: Record<Track, string> = {
  general: 'Général',
  technique: 'Technique',
  professionnel: 'Professionnel',
  specialise: 'Spécialisé',
};
