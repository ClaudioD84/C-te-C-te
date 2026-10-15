import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';

import { normalizePairingCode, randomSecret, sha256Hex } from './pairing.ts';

Deno.test('code de liaison : saisie tolérante, alphabet sans ambiguïté', () => {
  assertEquals(normalizePairingCode('abcd-ef23'), 'ABCDEF23');
  assertEquals(normalizePairingCode(' K7M2 QX9P '), 'K7M2QX9P');
  assertEquals(normalizePairingCode('ABCDEF2'), null);
  assertEquals(normalizePairingCode('ABCDEF20'), null);
  assertEquals(normalizePairingCode('ABCDEFIL'), null);
  assertEquals(normalizePairingCode("ABCD'; --"), null);
});

Deno.test('empreinte identique à celle de la base (extensions.digest sha256)', async () => {
  assertEquals(
    await sha256Hex('ABCDEF23'),
    '9185f3c8b6f26feaca3f87f609b284323121a6771893bf9119058fe101d64749',
  );
});

Deno.test('secrets aléatoires', () => {
  assertEquals(randomSecret().length, 64);
  assertNotEquals(randomSecret(), randomSecret());
});
