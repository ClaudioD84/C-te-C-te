import { describe, expect, it } from 'vitest';

import { ADO_CELEBRATION_PHRASES, celebrationPhrase, TREASURES, treasureOfTheDay } from './celebration';
import { deriveLearningSettings } from './learning-settings';
import { byTone, defaultPresentation } from './tone';

const profile = (grade: 'P4' | 'S3', presentation?: 'enfant' | 'ado') => ({
  grade,
  needs: [],
  preferences: { availableDays: ['lun' as const], prefersPaper: false, presentation },
});

describe('console ludique ou sobre', () => {
  it('sobre par défaut au secondaire, au choix du parent', () => {
    expect(defaultPresentation('P6')).toBe('enfant');
    expect(defaultPresentation('S1')).toBe('ado');
    expect(deriveLearningSettings(profile('S3')).tone).toBe('ado');
    expect(deriveLearningSettings(profile('P4')).tone).toBe('enfant');
    expect(deriveLearningSettings(profile('S3', 'enfant')).tone).toBe('enfant');
    expect(deriveLearningSettings(profile('P4', 'ado')).tone).toBe('ado');
  });

  it('textes sobres : ni fête ni blague pour enfants', () => {
    expect(byTone('ado', 'Bravo !', 'Juste.')).toBe('Juste.');
    expect(ADO_CELEBRATION_PHRASES).toContain(celebrationPhrase('ado-1', '2026-10-15', 'ado'));
    for (const phrase of ADO_CELEBRATION_PHRASES)
      expect(phrase).not.toMatch(/bravo|youpi|champion|super|avatar/i);
    const owned = TREASURES.filter((t) => t.kind === 'anecdote').map((t) => t.id);
    // Même quand toutes les anecdotes sont déjà vues, jamais une blague.
    for (const day of ['2026-10-15', '2026-10-16', '2026-10-17'])
      expect(treasureOfTheDay('ado-1', day, owned, 'ado').kind).toBe('anecdote');
  });
});
