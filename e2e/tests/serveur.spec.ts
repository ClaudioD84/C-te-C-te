import { expect, test } from '@playwright/test';

import { sql, uniqueEmail } from './helpers';

import { GATEWAY_URL, supabaseStatus } from '../support/supabase.mjs';

const status = supabaseStatus() as { ANON_KEY: string };
const MOCKS = 'http://127.0.0.1:5300';

/** Crée un parent par l'API et renvoie son jeton et sa famille. */
async function createParent(request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail('api');
  const response = await request.post(`${GATEWAY_URL}/auth/v1/signup`, {
    headers: { apikey: status.ANON_KEY },
    data: { email, password: 'motdepasse1' },
  });
  expect(response.ok()).toBeTruthy();
  const { access_token: token, user } = await response.json();
  const familyId = sql(`select family_id from parent where user_id = '${user.id}'`);
  return { email, token: token as string, familyId };
}

function headers(token: string) {
  return { apikey: status.ANON_KEY, Authorization: `Bearer ${token}` };
}

test('analyse d’une photo : tâches extraites puis photo supprimée', async ({ request }) => {
  const { token, familyId } = await createParent(request);
  const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: { ...headers(token), Prefer: 'return=representation' },
    data: { alias: 'Loutre', grade: 'P5' },
  });
  expect(child.status()).toBe(201);
  const [{ id: childId }] = await child.json();

  const scanId = crypto.randomUUID();
  const path = `${familyId}/${scanId}.jpg`;
  const upload = await request.post(`${GATEWAY_URL}/storage/v1/object/scans/${path}`, {
    headers: { ...headers(token), 'content-type': 'image/jpeg' },
    data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  expect(upload.ok()).toBeTruthy();
  const scan = await request.post(`${GATEWAY_URL}/rest/v1/scan`, {
    headers: headers(token),
    data: { id: scanId, child_id: childId, document_type: 'journal_de_classe', storage_path: path },
  });
  expect(scan.status()).toBe(201);

  const extract = await request.post(`${GATEWAY_URL}/functions/v1/scan-extract`, {
    headers: headers(token),
    data: { scanId },
  });
  expect(extract.ok(), await extract.text()).toBeTruthy();
  expect(sql(`select status || ' ' || (storage_path is null) from scan where id = '${scanId}'`)).toBe(
    'draft true',
  );
  expect(
    sql(`select string_agg(subject, ',') from task where scan_id = '${scanId}'`).split(',').sort(),
  ).toEqual(['Mathématiques', 'Éveil']);
  expect(sql(`select count(*) from storage.objects where name = '${path}'`)).toBe('0');
});

test('cloisonnement : une famille ne voit pas les enfants d’une autre', async ({ request }) => {
  const a = await createParent(request);
  const b = await createParent(request);
  await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: headers(a.token),
    data: { alias: 'Secret', grade: 'P2' },
  });
  const seen = await request.get(`${GATEWAY_URL}/rest/v1/child_profile?select=alias`, {
    headers: headers(b.token),
  });
  expect(await seen.json()).toEqual([]);
  const write = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: headers(b.token),
    data: { alias: 'Intrus', grade: 'P2', family_id: a.familyId },
  });
  expect(write.ok()).toBeFalsy();
});

test('conservation : compte inactif averti puis supprimé, journal de plus de 2 ans effacé', async ({
  request,
}) => {
  const warned = await createParent(request);
  const expired = await createParent(request);
  sql(`update family set last_active_at = now() - interval '25 months' where id = '${warned.familyId}'`);
  sql(`update family set last_active_at = now() - interval '26 months', inactivity_warned_at = now() - interval '31 days'
       where id = '${expired.familyId}'`);

  const purge = (secret: string) =>
    request.post(`${GATEWAY_URL}/functions/v1/purge-inactive`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
  expect((await purge('mauvais-secret')).status()).toBe(401);
  expect((await purge('purge-e2e')).ok()).toBeTruthy();

  expect(sql(`select inactivity_warned_at is not null from family where id = '${warned.familyId}'`)).toBe(
    't',
  );
  expect(sql(`select count(*) from family where id = '${expired.familyId}'`)).toBe('0');
  expect(sql(`select count(*) from auth.users where email = '${expired.email}'`)).toBe('0');
  const emails = (await (await request.get(`${MOCKS}/__emails`)).json()) as { to: { email: string }[] }[];
  expect(emails.some((e) => e.to[0].email === warned.email)).toBeTruthy();

  // Une reconnexion annule l'avertissement.
  const touch = await request.post(`${GATEWAY_URL}/rest/v1/rpc/touch_family_activity`, {
    headers: headers(warned.token),
    data: {},
  });
  expect(touch.ok()).toBeTruthy();
  expect(sql(`select inactivity_warned_at is null from family where id = '${warned.familyId}'`)).toBe('t');
});
