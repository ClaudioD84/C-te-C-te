import { describe, expect, it } from 'vitest';

import { deriveLearningSettings } from './learning-settings';
import type { ChildProfile } from './profile';

const preferences: ChildProfile['preferences'] = { availableDays: ['lun'], prefersPaper: false };

describe('deriveLearningSettings', () => {
  it('donne des sessions de 25 minutes en secondaire sans besoin particulier', () => {
    const s = deriveLearningSettings({ grade: 'S3', needs: [], preferences });
    expect(s.workMinutes).toBe(25);
    expect(s.breakMinutes).toBe(5);
    expect(s.fontFamily).toBe('standard');
    expect(s.timedExercises).toBe(true);
  });

  it('raccourcit les sessions et limite à une consigne pour un enfant TDAH', () => {
    const s = deriveLearningSettings({ grade: 'P5', needs: ['tdah'], preferences });
    expect(s.workMinutes).toBe(10);
    expect(s.maxItemsPerScreen).toBe(1);
    expect(s.timedExercises).toBe(false);
  });

  it('applique la mise en forme dyslexie', () => {
    const s = deriveLearningSettings({ grade: 'S1', needs: ['dyslexie'], preferences });
    expect(s.fontFamily).toBe('dyslexia');
    expect(s.lineHeight).toBeGreaterThanOrEqual(1.8);
    expect(s.letterSpacing).toBeGreaterThan(0);
    expect(s.readAloud).toBe(true);
  });

  it('active les supports visuels et retire le chrono pour la dyscalculie', () => {
    const s = deriveLearningSettings({ grade: 'P3', needs: ['dyscalculie'], preferences });
    expect(s.visualMath).toBe(true);
    expect(s.timedExercises).toBe(false);
  });

  it('adapte la maternelle : sessions courtes, pictogrammes, lecture vocale', () => {
    const s = deriveLearningSettings({ grade: 'M2', needs: [], preferences });
    expect(s.workMinutes).toBe(10);
    expect(s.pictograms).toBe(true);
    expect(s.readAloud).toBe(true);
  });

  it('ne descend jamais sous 5 minutes', () => {
    const s = deriveLearningSettings({ grade: 'M1', needs: ['tdah'], preferences });
    expect(s.workMinutes).toBe(5);
  });

  it('respecte la durée choisie par le parent', () => {
    const s = deriveLearningSettings({
      grade: 'S5',
      needs: ['tdah'],
      preferences: { ...preferences, sessionMinutes: 20 },
    });
    expect(s.workMinutes).toBe(20);
  });
});
