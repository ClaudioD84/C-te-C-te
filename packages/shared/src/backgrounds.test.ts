/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import unlockMigration from '../../../supabase/migrations/20261110000000_blocus_weekend_background_unlock.sql?raw';
import { AVATAR_STAGES, POINTS } from './rewards';

import {
  ageGroup,
  backgroundsFor,
  defaultBackground,
  isBackground,
  isBackgroundUnlocked,
} from './backgrounds';

describe('fonds d’écran', () => {
  it('tranches d’âge', () => {
    expect(ageGroup('M2')).toBe('petit');
    expect(ageGroup('P2')).toBe('petit');
    expect(ageGroup('P5')).toBe('moyen');
    expect(ageGroup('S3')).toBe('grand');
  });

  it('fond uni d’abord, puis les centres d’intérêt, fonds à débloquer à la fin', () => {
    const list = backgroundsFor('P5', ['espace']);
    expect(list[0]).toBe('uni');
    expect(list.slice(1, 3)).toEqual(expect.arrayContaining(['etoiles', 'galaxie']));
    expect(list.at(-1)).toBe('aurore');
    expect(backgroundsFor('S4', [])).not.toContain('dinos');
    expect(backgroundsFor('M1', [])).not.toContain('minimal');
  });

  it('déblocage par le stade de l’avatar', () => {
    expect(isBackgroundUnlocked('aurore', 4)).toBe(false);
    expect(isBackgroundUnlocked('aurore', 5)).toBe(true);
    expect(isBackgroundUnlocked('ocean', 1)).toBe(true);
    expect(isBackground('ocean')).toBe(true);
    expect(isBackground('lave')).toBe(false);
  });
});

import migration from '../../../supabase/migrations/20261104000000_child_background.sql?raw';
import { BACKGROUND_CODES, BACKGROUNDS } from './backgrounds';

describe('fonds acceptés par la base', () => {
  it('la contrainte SQL connaît exactement les mêmes codes', () => {
    const codes = [...migration.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(new Set(codes)).toEqual(new Set(BACKGROUND_CODES));
  });

  it('fond par défaut : selon l’âge et les intérêts, uni avec le TDAH', () => {
    expect(defaultBackground('P5', ['mer'], [])).toBe('ocean');
    expect(defaultBackground('S3', ['football'], [])).toBe('foot');
    expect(defaultBackground('P5', [], ['dyslexie'])).not.toBe('uni');
    expect(defaultBackground('P5', ['mer'], ['tdah'])).toBe('uni');
  });
});

describe('fonds à débloquer : vérifiés aussi par la base', () => {
  it('mêmes seuils que les stades de l’avatar, même calcul des points', () => {
    for (const [code, theme] of Object.entries(BACKGROUNDS) as [string, { unlockLevel?: number }][]) {
      if (theme.unlockLevel === undefined) continue;
      const threshold = AVATAR_STAGES.find((s) => s.level === theme.unlockLevel)!.threshold;
      expect(unlockMigration).toContain(`when '${code}' then ${threshold}`);
    }
    expect(unlockMigration).toContain(
      `activities * ${POINTS.activity} + cards + quizzes * ${POINTS.quiz} + sessions * ${POINTS.session} + recovered * ${POINTS.recovered}`,
    );
    expect(POINTS.card).toBe(1);
  });
});
