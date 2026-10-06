/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { ageGroup, backgroundsFor, isBackground, isBackgroundUnlocked } from './backgrounds';

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
import { BACKGROUND_CODES } from './backgrounds';

describe('fonds acceptés par la base', () => {
  it('la contrainte SQL connaît exactement les mêmes codes', () => {
    const codes = [...migration.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(new Set(codes)).toEqual(new Set(BACKGROUND_CODES));
  });
});
