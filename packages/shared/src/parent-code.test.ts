import { describe, expect, it } from 'vitest';

import { checkNewParentCode, lockoutSeconds } from './parent-code';

describe('checkNewParentCode', () => {
  it('accepte un code de 4 chiffres', () => {
    expect(checkNewParentCode('2809')).toBeNull();
  });

  it('refuse un mauvais format', () => {
    expect(checkNewParentCode('12a4')).toBe('format');
    expect(checkNewParentCode('123')).toBe('format');
    expect(checkNewParentCode('12345')).toBe('format');
  });

  it('refuse les codes trop simples', () => {
    expect(checkNewParentCode('1234')).toBe('trop_simple');
    expect(checkNewParentCode('0000')).toBe('trop_simple');
  });
});

describe('lockoutSeconds', () => {
  it('laisse 5 essais libres', () => {
    expect(lockoutSeconds(4)).toBe(0);
  });

  it('bloque de plus en plus longtemps, avec un plafond', () => {
    expect(lockoutSeconds(5)).toBe(30);
    expect(lockoutSeconds(6)).toBe(60);
    expect(lockoutSeconds(20)).toBe(900);
  });
});
