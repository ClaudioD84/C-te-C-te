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
  // De même pour une page suivante d'un document de plusieurs pages.
  const foreignPage = await request.post(`${GATEWAY_URL}/rest/v1/scan`, {
    headers: headers(attacker.token),
    data: {
      child_id: childId,
      document_type: 'interrogation',
      storage_path: `${attacker.familyId}/page-1.jpg`,
      extra_storage_paths: [`${attacker.familyId}/page-2.jpg`, `${victim.familyId}/photo.jpg`],
    },
  });
  expect(foreignPage.ok()).toBeFalsy();

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
  expect((await patch({ extra_storage_paths: [`${victim.familyId}/photo.jpg`] })).ok()).toBeFalsy();
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
    insert into invite_code (code, max_uses, trial_days) values ('BETA-E2E', 1, 90);
    do $$ begin
      ${signup('sans', '{}')}
      ${signup('faux', '{"invite_code": "AUTRE"}')}
      ${signup('bon', '{"invite_code": " beta-e2e "}')}
      ${signup('epuise', '{"invite_code": "BETA-E2E"}')}
    end $$;
    insert into resultat
      select 'essai:' || (current_period_end::date - current_date)
      from subscription s join parent p using (family_id) join auth.users u on u.id = p.user_id
      where u.email like 'bon-%';
    select string_agg(v, ' ') from resultat;
    rollback;`);
  expect(result).toBe(
    'libre:ok sans:code_invitation_invalide faux:code_invitation_invalide bon:ok epuise:code_invitation_invalide essai:90',
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

test('tâches programmées : purges et bilan appelés avec le secret du coffre, rien sans secret', () => {
  expect(sql(`select string_agg(jobname || '=' || schedule, ' ' order by jobname) from cron.job`)).toBe(
    'notify-parents=*/5 * * * * purge-inactive=30 2 * * * purge-photos=7 * * * * weekly-recap=0 17 * * 0',
  );
  // Sans secrets (développement, CI) : aucune requête.
  expect(sql(`select public.call_scheduled_function('purge-photos') is null`)).toBe('t');
  // Avec les secrets (dans une transaction annulée) : la requête part vers la fonction, avec le secret.
  const queued = sql(`
    begin;
    select vault.create_secret('https://projet.example/', 'project_url');
    select vault.create_secret('secret-e2e', 'purge_secret');
    select public.call_scheduled_function('purge-photos');
    select url || ' ' || (headers ->> 'Authorization') from net.http_request_queue order by id desc limit 1;
    rollback;`);
  expect(queued.split('\n').at(-1)).toBe(
    'https://projet.example/functions/v1/purge-photos Bearer secret-e2e',
  );
  expect(() => sql(`select public.call_scheduled_function('delete-account')`)).toThrow();
});

test('erreur inattendue d’une fonction serveur : journalisée avec les erreurs de l’application', async ({
  request,
}) => {
  const { token, familyId } = await createParent(request);
  const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: { ...headers(token), Prefer: 'return=representation' },
    data: { alias: 'Pic', grade: 'P4' },
  });
  const [{ id: childId }] = await child.json();
  // Numérisation dont la photo n'existe pas dans le stockage : erreur imprévue côté serveur.
  const scanId = sql(`insert into scan (family_id, child_id, document_type, storage_path)
    values ('${familyId}', '${childId}', 'journal_de_classe', '${familyId}/absente.jpg') returning id`).split(
    '\n',
  )[0];
  const response = await request.post(`${GATEWAY_URL}/functions/v1/scan-extract`, {
    headers: headers(token),
    data: { scanId },
  });
  expect(response.status()).toBe(500);
  expect((await response.json()).error).toBe("L'analyse a échoué. Réessayez dans un instant.");
  await expect
    .poll(() =>
      sql(`select count(*) from app_error where platform = 'serveur' and screen = 'scan-extract'
           and message = 'Photo ou profil introuvable' and created_at > now() - interval '1 minute'`),
    )
    .not.toBe('0');
});

test('fiches : une demande identique d’une autre famille réutilise la fiche, sans IA ni quota', async ({
  request,
}) => {
  // Texte de tâche propre à ce test (les autres tests tournent en parallèle sur la même base).
  const description = `Étudier les volcans ${crypto.randomUUID().slice(0, 8)}`;
  const familyWithTask = async () => {
    const parent = await createParent(request);
    const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
      headers: { ...headers(parent.token), Prefer: 'return=representation' },
      data: { alias: 'Lynx', grade: 'P5' },
    });
    const [{ id: childId }] = await child.json();
    const task = await request.post(`${GATEWAY_URL}/rest/v1/task`, {
      headers: { ...headers(parent.token), Prefer: 'return=representation' },
      data: { child_id: childId, subject: 'Éveil', kind: 'lecon', description, status: 'validated' },
    });
    const [{ id: taskId }] = await task.json();
    const pack = await request.post(`${GATEWAY_URL}/functions/v1/generate-pack`, {
      headers: headers(parent.token),
      data: { taskId },
    });
    expect(pack.ok()).toBeTruthy();
    const usage = (fn: string) =>
      sql(`select count(*) from ai_usage where family_id = '${parent.familyId}' and function_name = '${fn}'`);
    return { ...parent, childId, pack: (await pack.json()).pack, usage };
  };

  const first = await familyWithTask();
  expect(first.usage('generate-pack')).toBe('1');

  const second = await familyWithTask();
  expect(second.usage('generate-pack')).toBe('0');
  expect(second.usage('generate-pack-reutilise')).toBe('1');
  expect(second.pack.content).toEqual(first.pack.content);
  expect(Number(sql(`select count(*) from flashcard where child_id = '${second.childId}'`))).toBeGreaterThan(
    0,
  );

  // Une fiche signalée par un parent n'est plus jamais reprise.
  sql(`update study_pack set reported_at = now(), report_reason = 'Erreur' where family_id in
       ('${first.familyId}', '${second.familyId}')`);
  const third = await familyWithTask();
  expect(third.usage('generate-pack')).toBe('1');
  expect(third.usage('generate-pack-reutilise')).toBe('0');
});

test('notifications au parent : aide et mission terminée, jamais sur le téléphone d’où vient l’action', async ({
  request,
}) => {
  const { token, familyId } = await createParent(request);
  const suffix = crypto.randomUUID().slice(0, 8);
  const phone = `ExponentPushToken[e2e-${suffix}]`;
  const oldPhone = `ExponentPushToken[perime-${suffix}]`;
  for (const pushToken of [phone, oldPhone]) {
    const registered = await request.post(`${GATEWAY_URL}/rest/v1/rpc/register_push_token`, {
      headers: headers(token),
      data: { p_token: pushToken, p_platform: 'ios', p_notify_help: true, p_notify_mission: true },
    });
    expect(registered.ok()).toBeTruthy();
  }
  const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: { ...headers(token), Prefer: 'return=representation' },
    data: { alias: 'Hermine', grade: 'P3' },
  });
  const [{ id: childId }] = await child.json();
  const taskId = sql(`insert into task (family_id, child_id, subject, kind, description, status)
    values ('${familyId}', '${childId}', 'Mathématiques', 'devoir', 'Calculs', 'validated') returning id`).split(
    '\n',
  )[0];

  // Le parent a prêté son propre téléphone (console enfant) : il n'y est pas prévenu.
  const ownHelp = await request.post(`${GATEWAY_URL}/rest/v1/help_request`, {
    headers: headers(token),
    data: { child_id: childId, task_id: taskId },
  });
  expect(ownHelp.ok()).toBeTruthy();
  sql(`update help_request set resolved_at = now() where child_id = '${childId}'`);
  // Depuis la tablette de l'enfant (un autre compte) : demande d'aide, puis mission terminée.
  sql(
    `insert into help_request (family_id, child_id, task_id) values ('${familyId}', '${childId}', '${taskId}')`,
  );
  const sessionId =
    sql(`insert into study_session (family_id, child_id, scheduled_on, duration_minutes, status)
    values ('${familyId}', '${childId}', current_date, 20, 'planned') returning id`).split('\n')[0];
  sql(`update study_session set status = 'done' where id = '${sessionId}'`);
  expect(sql(`select count(*) from parent_notification where child_id = '${childId}'`)).toBe('3');

  const send = await request.post(`${GATEWAY_URL}/functions/v1/notify-parents`, {
    headers: { Authorization: 'Bearer purge-e2e' },
  });
  expect(send.ok()).toBeTruthy();
  const pushes = (await (await request.get(`${MOCKS}/__push`)).json()) as { to: string; title: string }[];
  expect(pushes.filter((p) => p.to === phone).map((p) => p.title)).toEqual([
    "🙋 Hermine a besoin d'aide",
    '✅ Hermine a terminé sa mission du jour',
  ]);
  // Application désinstallée : le jeton est retiré ; la file est vidée.
  expect(sql(`select count(*) from push_token where token = '${oldPhone}'`)).toBe('0');
  expect(sql(`select count(*) from push_token where token = '${phone}'`)).toBe('1');
  expect(
    sql(`select count(*) from parent_notification where child_id = '${childId}' and sent_at is null`),
  ).toBe('0');
  expect((await request.post(`${GATEWAY_URL}/functions/v1/notify-parents`)).status()).toBe(401);
});
