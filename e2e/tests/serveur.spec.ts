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

test('sécurité : chemin de photo d’une autre famille et contournement des quotas refusés', async ({
  request,
}) => {
  const victim = await createParent(request);
  const attacker = await createParent(request);
  const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: { ...headers(attacker.token), Prefer: 'return=representation' },
    data: { alias: 'Pirate', grade: 'P5' },
  });
  const [{ id: childId }] = await child.json();

  // Une numérisation pointant vers le dossier d'une autre famille est refusée.
  const foreign = await request.post(`${GATEWAY_URL}/rest/v1/scan`, {
    headers: headers(attacker.token),
    data: {
      child_id: childId,
      document_type: 'journal_de_classe',
      storage_path: `${victim.familyId}/photo.jpg`,
    },
  });
  expect(foreign.ok()).toBeFalsy();

  // Numérisation légitime, déjà analysée.
  const scanId = crypto.randomUUID();
  const created = await request.post(`${GATEWAY_URL}/rest/v1/scan`, {
    headers: headers(attacker.token),
    data: {
      id: scanId,
      child_id: childId,
      document_type: 'journal_de_classe',
      storage_path: `${attacker.familyId}/${scanId}.jpg`,
    },
  });
  expect(created.status()).toBe(201);
  sql(`update scan set status = 'draft', storage_path = null, processed_at = now() where id = '${scanId}'`);

  const patch = (data: Record<string, unknown>) =>
    request.patch(`${GATEWAY_URL}/rest/v1/scan?id=eq.${scanId}`, { headers: headers(attacker.token), data });
  // Ni la date de traitement (quota), ni le chemin du fichier, ni un retour en arrière du statut.
  expect((await patch({ processed_at: '2020-01-01T00:00:00Z' })).ok()).toBeFalsy();
  expect((await patch({ storage_path: `${victim.familyId}/photo.jpg` })).ok()).toBeFalsy();
  expect((await patch({ status: 'uploaded' })).ok()).toBeFalsy();
  // La validation par le parent reste possible.
  expect((await patch({ status: 'validated' })).ok()).toBeTruthy();
  expect(sql(`select status from scan where id = '${scanId}'`)).toBe('validated');

  // Le contenu d'une fiche générée n'est pas modifiable par le parent.
  const pack = await request.patch(`${GATEWAY_URL}/rest/v1/study_pack?family_id=eq.${attacker.familyId}`, {
    headers: headers(attacker.token),
    data: { content: {} },
  });
  expect(pack.ok()).toBeFalsy();
});

test('bêta : inscription sur code d’invitation (usage limité), sans code tant qu’il n’y en a aucun', () => {
  // Dans une transaction annulée : les autres tests, qui s'inscrivent en parallèle, ne voient pas le code.
  const signup = (label: string, meta: string) => `
    begin
      insert into auth.users (id, email, raw_user_meta_data, aud, role)
        values (gen_random_uuid(), '${label}-' || gen_random_uuid() || '@exemple.be', '${meta}'::jsonb,
                'authenticated', 'authenticated');
      insert into resultat values ('${label}:ok');
    exception when others then
      insert into resultat values ('${label}:' || sqlerrm);
    end;`;
  const result = sql(`
    begin;
    create temp table resultat (v text);
    do $$ begin ${signup('libre', '{}')} end $$;
    insert into invite_code (code, max_uses) values ('BETA-E2E', 1);
    do $$ begin
      ${signup('sans', '{}')}
      ${signup('faux', '{"invite_code": "AUTRE"}')}
      ${signup('bon', '{"invite_code": " beta-e2e "}')}
      ${signup('epuise', '{"invite_code": "BETA-E2E"}')}
    end $$;
    select string_agg(v, ' ') from resultat;
    rollback;`);
  expect(result).toBe(
    'libre:ok sans:code_invitation_invalide faux:code_invitation_invalide bon:ok epuise:code_invitation_invalide',
  );
});

test('bêta : avis et journal d’erreurs par compte ; mesures réservées au serveur', async ({ request }) => {
  const { token, familyId } = await createParent(request);
  const rpc = (name: string, data: object, key = token) =>
    request.post(`${GATEWAY_URL}/rest/v1/rpc/${name}`, { headers: headers(key), data });

  expect((await rpc('signup_requires_code', {})).ok()).toBeTruthy();
  expect((await rpc('log_app_error', { p_message: 'Boom', p_screen: '/planning' })).ok()).toBeTruthy();
  const avis = await request.post(`${GATEWAY_URL}/rest/v1/feedback`, {
    headers: headers(token),
    data: { message: 'Très pratique', mood: 'content', screen: '/' },
  });
  expect(avis.ok()).toBeTruthy();
  expect(sql(`select count(*) from feedback where family_id = '${familyId}'`)).toBe('1');

  // Le journal des erreurs n'est pas lisible depuis l'application, les mesures non plus.
  const errors = await request.get(`${GATEWAY_URL}/rest/v1/app_error?select=*`, { headers: headers(token) });
  expect(errors.ok()).toBeFalsy();
  expect((await rpc('beta_metrics', {})).ok()).toBeFalsy();

  const { SERVICE_ROLE_KEY } = supabaseStatus() as { SERVICE_ROLE_KEY: string };
  const metrics = await rpc('beta_metrics', {}, SERVICE_ROLE_KEY);
  expect(metrics.ok()).toBeTruthy();
  const mine = ((await metrics.json()) as { family_id: string; feedbacks: number }[]).find(
    (m) => m.family_id === familyId,
  );
  expect(mine?.feedbacks).toBe(1);
});
