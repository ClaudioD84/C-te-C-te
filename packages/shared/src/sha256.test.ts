import { describe, expect, it } from 'vitest';

import { sha256Hex } from './sha256';

describe('sha256Hex', () => {
  it('donne les valeurs de référence du NIST', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('gère accents et messages sur plusieurs blocs (valeurs calculées avec OpenSSL)', () => {
    const cases: [string, string][] = [
      ['a3f9:2809', 'ab3f503274680566ac1b96cbfdbaa449f5e96ca5a587408b6af4c44053e3a232'],
      ['é'.repeat(100), 'f42ec48e1e4b487e590e0b3d4e58437c8327efa855d769709f4942a4f73a7eb6'],
      ['x'.repeat(55), 'd5e285683cd4efc02d021a5c62014694958901005d6f71e89e0989fac77e4072'],
      ['x'.repeat(56), '04c26261370ee7541549d16dee320c723e3fd14671e66a099afe0a377c16888e'],
      ['x'.repeat(64), '7ce100971f64e7001e8fe5a51973ecdfe1ced42befe7ee8d5fd6219506b5393c'],
    ];
    for (const [text, expected] of cases) expect(sha256Hex(text)).toBe(expected);
  });
});
