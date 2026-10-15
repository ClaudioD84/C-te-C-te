import { describe, expect, it } from 'vitest';

import { avatarOf, childProfileSchema, nextNeedsConsentAt } from './profile';
import { isTrackAllowed, schoolLevel } from './school';

describe('childProfileSchema', () => {
  it('applique les valeurs par défaut', () => {
    const p = childProfileSchema.parse({ alias: 'Léo', grade: 'P4' });
    expect(p.track).toBe('general');
    expect(p.needs).toEqual([]);
    expect(p.preferences.availableDays).toHaveLength(5);
  });

  it('refuse un alias trop court', () => {
    expect(childProfileSchema.safeParse({ alias: 'A', grade: 'P4' }).success).toBe(false);
  });

  it("refuse l'enseignement professionnel en primaire", () => {
    const r = childProfileSchema.safeParse({ alias: 'Zébu', grade: 'P6', track: 'professionnel' });
    expect(r.success).toBe(false);
  });

  it('refuse un besoin en double', () => {
    const r = childProfileSchema.safeParse({ alias: 'Zébu', grade: 'S2', needs: ['tdah', 'tdah'] });
    expect(r.success).toBe(false);
  });
});

describe('school', () => {
  it('déduit le niveau scolaire', () => {
    expect(schoolLevel('M3')).toBe('maternelle');
    expect(schoolLevel('P1')).toBe('primaire');
    expect(schoolLevel('S7')).toBe('secondaire');
  });

  it('réserve le qualifiant au secondaire à partir de S3', () => {
    expect(isTrackAllowed('S2', 'technique')).toBe(false);
    expect(isTrackAllowed('S3', 'technique')).toBe(true);
    expect(isTrackAllowed('S7', 'professionnel')).toBe(true);
    expect(isTrackAllowed('S7', 'general')).toBe(false);
    expect(isTrackAllowed('P2', 'specialise')).toBe(true);
  });
});

describe('nextNeedsConsentAt', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  const before = '2026-09-01T08:00:00.000Z';

  it('efface le consentement quand les besoins sont retirés', () => {
    expect(nextNeedsConsentAt(['tdah'], [], before, now)).toBeNull();
  });

  it('garde la date quand les besoins ne changent pas ou diminuent', () => {
    expect(nextNeedsConsentAt(['tdah', 'dyslexie'], ['tdah'], before, now)).toBe(before);
  });

  it('renouvelle la date quand un besoin est ajouté', () => {
    expect(nextNeedsConsentAt(['tdah'], ['tdah', 'dyscalculie'], before, now)).toBe(now.toISOString());
    expect(nextNeedsConsentAt([], ['dyslexie'], null, now)).toBe(now.toISOString());
  });
});

describe('avatars', () => {
  it('retombe sur le lion pour un code inconnu', () => {
    expect(avatarOf('renard').emoji).toBe('🦊');
    expect(avatarOf('dragon').emoji).toBe('🦁');
  });
});
