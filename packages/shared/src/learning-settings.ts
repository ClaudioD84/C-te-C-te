import type { ChildProfile } from './profile';
import { gradeYear, schoolLevel } from './school';

export type FontFamilyKey = 'standard' | 'dyslexia';

/**
 * Réglages pédagogiques et visuels déduits du profil de l'enfant (F12).
 * Une seule source de vérité, utilisée par l'application et par l'export PDF.
 */
export interface LearningSettings {
  /** Durée d'une période de travail (Pomodoro), en minutes. */
  workMinutes: number;
  /** Durée d'une pause, en minutes. */
  breakMinutes: number;
  fontFamily: FontFamilyKey;
  /** Multiplicateur appliqué aux tailles de police. */
  fontScale: number;
  /** Interlignage, en multiple de la taille de police. */
  lineHeight: number;
  /** Espacement des lettres, en fraction de la taille de police. */
  letterSpacing: number;
  /** Nombre maximal de consignes ou d'éléments affichés à la fois. */
  maxItemsPerScreen: number;
  /** Proposer la lecture vocale des consignes. */
  readAloud: boolean;
  /** Remplacer ou compléter le texte par des pictogrammes. */
  pictograms: boolean;
  /** Supports visuels pour les mathématiques (schémas, manipulation). */
  visualMath: boolean;
  /** Autoriser les exercices chronométrés. */
  timedExercises: boolean;
}

function baseWorkMinutes(profile: Pick<ChildProfile, 'grade'>): number {
  const level = schoolLevel(profile.grade);
  if (level === 'maternelle') return 10;
  if (level === 'primaire') return gradeYear(profile.grade) <= 2 ? 15 : 20;
  return 25;
}

export function deriveLearningSettings(
  profile: Pick<ChildProfile, 'grade' | 'needs' | 'preferences'>,
): LearningSettings {
  const needs = new Set(profile.needs);
  const level = schoolLevel(profile.grade);
  const youngReader = level === 'maternelle' || (level === 'primaire' && gradeYear(profile.grade) <= 2);

  let workMinutes = baseWorkMinutes(profile);
  if (needs.has('tdah')) {
    // Sessions plus courtes, arrondies à 5 minutes, jamais moins de 5.
    workMinutes = Math.max(5, Math.round((workMinutes * 0.6) / 5) * 5);
  }
  if (profile.preferences.sessionMinutes !== undefined) {
    workMinutes = profile.preferences.sessionMinutes;
  }

  const dyslexia = needs.has('dyslexie');

  return {
    workMinutes,
    breakMinutes: workMinutes >= 25 ? 5 : workMinutes >= 15 ? 4 : 3,
    fontFamily: dyslexia ? 'dyslexia' : 'standard',
    fontScale: dyslexia || youngReader ? 1.2 : 1,
    lineHeight: dyslexia ? 1.8 : 1.5,
    letterSpacing: dyslexia ? 0.12 : 0,
    maxItemsPerScreen: needs.has('tdah') || youngReader ? 1 : dyslexia ? 3 : 5,
    readAloud: dyslexia || youngReader,
    pictograms: youngReader,
    visualMath: needs.has('dyscalculie') || level === 'maternelle',
    timedExercises: !needs.has('dyscalculie') && !needs.has('tdah'),
  };
}
