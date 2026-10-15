import { assertEquals } from 'jsr:@std/assert@1';

import { hasBearerSecret, isLocalStack, timingSafeEqual } from './secret.ts';

const withAuth = (value?: string) =>
  new Request('http://x', { method: 'POST', headers: value ? { Authorization: value } : {} });

Deno.test('comparaison de secrets', () => {
  assertEquals(timingSafeEqual('abc', 'abc'), true);
  assertEquals(timingSafeEqual('abc', 'abd'), false);
  assertEquals(timingSafeEqual('abc', 'abcd'), false);
});

Deno.test('en-tête Bearer', () => {
  assertEquals(hasBearerSecret(withAuth('Bearer s3cret'), 's3cret'), true);
  assertEquals(hasBearerSecret(withAuth('Bearer autre'), 's3cret'), false);
  assertEquals(hasBearerSecret(withAuth(), 's3cret'), false);
  // Secret non configuré : toujours refusé, même avec un en-tête vide.
  assertEquals(hasBearerSecret(withAuth('Bearer '), undefined), false);
  assertEquals(hasBearerSecret(withAuth('Bearer '), ''), false);
});

Deno.test('pile locale ou projet hébergé', () => {
  assertEquals(isLocalStack('http://127.0.0.1:54321'), true);
  assertEquals(isLocalStack('http://kong:8000'), true);
  assertEquals(isLocalStack('https://abcd.supabase.co'), false);
  assertEquals(isLocalStack(undefined), false);
});
