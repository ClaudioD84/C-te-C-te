import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  addChild,
  answerMood,
  button,
  insertValidatedTasks,
  publishPlanning,
  signUp,
  sql,
  uniqueEmail,
} from './helpers';

import { GATEWAY_URL, supabaseStatus } from '../support/supabase.mjs';

const status = supabaseStatus() as { ANON_KEY: string };

/** Adresse IP fictive propre au test : le nombre d'essais erronés est compté par adresse. */
function fakeIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function headers(token: string) {
  return { apikey: status.ANON_KEY, Authorization: `Bearer ${token}` };
}

/** Jeton de la session gardée par l'application web. */
async function accessToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (/^sb-.*-auth-token$/.test(key))
        return JSON.parse(localStorage.getItem(key)!).access_token as string;
    }
    throw new Error('Pas de session');
  });
}

test('tablette de l’enfant : reliée par code, console seule, retirée par le parent', async ({
  page,
  browser,
}) => {
  const email = await signUp(page, 'tablette');
  const { childId, familyId } = await addChild(page, email, 'Loutre');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Loutre', childId);
  await page.goBack();

  // Le parent demande un code depuis le profil de l'enfant.
  await button(page, 'Modifier le profil').click();
  await button(page, 'Tablette de l’enfant').click();
  await expect(page.getByText('Aucune pour l’instant.')).toBeVisible();
  await button(page, 'Relier une tablette').click();
  const shown = await page.getByText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/).textContent();
  const code = shown!.replace('-', '');
  await expect(page.getByRole('img', { name: 'QR code de liaison de la tablette' })).toBeVisible();

  // La tablette : un code erroné est refusé, puis le lien du QR code remplit le bon code.
  const tablet = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': fakeIp() } });
  const tabletPage = await tablet.newPage();
  await tabletPage.goto('/');
  await button(tabletPage, 'Relier la tablette de mon enfant').click();
  await tabletPage.getByLabel('Code de liaison').fill('AAAA-AAAA');
  await button(tabletPage, 'Relier cette tablette').click();
  await expect(tabletPage.getByText(/Code inconnu ou expiré/)).toBeVisible();

  await tabletPage.goto(`/appareil?code=${code}`);
  await expect(tabletPage.getByLabel('Code de liaison')).toHaveValue(code);
  await tabletPage.getByLabel('Nom de cette tablette (facultatif)').fill('Tablette du salon');
  await button(tabletPage, 'Relier cette tablette').click();
  await expect(tabletPage.getByText('Bonjour Loutre')).toBeVisible();
  await answerMood(tabletPage);

  // Le code ne sert qu'une fois ; le parent voit la tablette arriver.
  expect(sql(`select count(*) from device_pairing where child_id = '${childId}'`)).toBe('0');
  await expect(page.getByText('La tablette est reliée.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Tablette du salon')).toBeVisible();

  // Pas d'espace parent sur la tablette ; le travail fait y est enregistré pour l'enfant.
  await expect(button(tabletPage, 'Espace parent (code demandé)')).toHaveCount(0);
  await expect(button(tabletPage, 'Réglages de la tablette')).toBeVisible();
  await button(tabletPage, "C'est fait !").first().click();
  await expect
    .poll(() =>
      Number(
        sql(`select count(*) from study_session_task st join study_session s on s.id = st.session_id
             where s.child_id = '${childId}' and st.done_at is not null`),
      ),
    )
    .toBe(1);
  await expect
    .poll(() =>
      sql(`select count(*) from learning_event where child_id = '${childId}' and family_id = '${familyId}'`),
    )
    .not.toBe('0');

  // Le parent retire la tablette : son compte est supprimé et elle perd l'accès.
  const deviceUser = sql(`select user_id from child_device where child_id = '${childId}'`);
  await button(page, 'Retirer Tablette du salon').click();
  await expect(page.getByText('Aucune pour l’instant.')).toBeVisible();
  expect(sql(`select count(*) from auth.users where id = '${deviceUser}'`)).toBe('0');
  // La tablette le constate : déconnectée, ses données locales sont effacées.
  await tabletPage.reload();
  await expect(button(tabletPage, 'Relier la tablette de mon enfant')).toBeVisible({ timeout: 15_000 });
  await expect(tabletPage.getByText('Bonjour Loutre')).toHaveCount(0);
  await tablet.close();
});

/** Parent créé par l'API, avec un enfant, une tâche et une session planifiée. */
async function parentWithChild(request: APIRequestContext, alias: string) {
  const email = uniqueEmail('tablette-api');
  const signup = await request.post(`${GATEWAY_URL}/auth/v1/signup`, {
    headers: { apikey: status.ANON_KEY },
    data: { email, password: 'motdepasse1' },
  });
  const { access_token: token, user } = await signup.json();
  const familyId = sql(`select family_id from parent where user_id = '${user.id}'`);
  const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: { ...headers(token), Prefer: 'return=representation' },
    data: { alias, grade: 'P5' },
  });
  const [{ id: childId }] = await child.json();
  insertValidatedTasks(familyId, childId);
  const sessionId = sql(`insert into study_session (family_id, child_id, scheduled_on, duration_minutes)
    values ('${familyId}', '${childId}', current_date, 30) returning id`).split('\n')[0];
  sql(`insert into study_session_task (session_id, task_id, family_id, activity, minutes)
    select '${sessionId}', id, family_id, 'faire', 10 from task where child_id = '${childId}' limit 1`);
  return { token: token as string, familyId, childId, sessionId };
}

test('tablette : droits limités à la console de son enfant', async ({ request }) => {
  const family = await parentWithChild(request, 'Héron');
  const other = await parentWithChild(request, 'Pirate');
  const sibling = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: { ...headers(family.token), Prefer: 'return=representation' },
    data: { alias: 'Grand frère', grade: 'S2' },
  });
  const [{ id: siblingId }] = await sibling.json();

  // Un parent ne peut pas demander de code pour l'enfant d'une autre famille.
  const foreign = await request.post(`${GATEWAY_URL}/rest/v1/rpc/create_device_pairing`, {
    headers: headers(other.token),
    data: { p_child_id: family.childId },
  });
  expect(foreign.ok()).toBeFalsy();

  const created = await request.post(`${GATEWAY_URL}/rest/v1/rpc/create_device_pairing`, {
    headers: headers(family.token),
    data: { p_child_id: family.childId },
  });
  expect(created.ok()).toBeTruthy();
  const code = (await created.json()) as string;
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);

  const ip = fakeIp();
  const pair = (value: string) =>
    request.post(`${GATEWAY_URL}/functions/v1/pair-device`, {
      headers: { apikey: status.ANON_KEY, 'x-forwarded-for': ip },
      data: { code: value },
    });
  const paired = await pair(code.toLowerCase());
  expect(paired.status()).toBe(200);
  const { email, password } = await paired.json();
  // Usage unique.
  expect((await pair(code)).status()).toBe(404);

  const login = await request.post(`${GATEWAY_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: status.ANON_KEY },
    data: { email, password },
  });
  const { access_token: token } = await login.json();
  const get = async (path: string) =>
    (await (
      await request.get(`${GATEWAY_URL}/rest/v1/${path}`, { headers: headers(token) })
    ).json()) as unknown[];

  // Lecture : seulement son enfant, pas le reste de la famille ni les autres familles.
  expect(await get('child_profile?select=id')).toEqual([{ id: family.childId }]);
  expect(await get(`child_profile?id=eq.${siblingId}`)).toEqual([]);
  expect(await get(`task?child_id=eq.${other.childId}`)).toEqual([]);
  expect(
    (await get('task?select=child_id')).every((t) => (t as { child_id: string }).child_id === family.childId),
  ).toBe(true);
  expect(await get('scan')).toEqual([]);
  expect(await get('subscription')).toEqual([]);
  expect(await get('family')).toEqual([]);
  expect(await get('child_device?select=child_id')).toEqual([{ child_id: family.childId }]);

  // Écriture : cocher une activité oui ; changer la durée, créer une tâche ou un enfant, non.
  const patchSessionTask = (data: Record<string, unknown>) =>
    request.patch(`${GATEWAY_URL}/rest/v1/study_session_task?session_id=eq.${family.sessionId}`, {
      headers: headers(token),
      data,
    });
  expect((await patchSessionTask({ done_at: new Date().toISOString() })).ok()).toBeTruthy();
  expect((await patchSessionTask({ minutes: 1 })).ok()).toBeFalsy();
  const session = await request.patch(`${GATEWAY_URL}/rest/v1/study_session?id=eq.${family.sessionId}`, {
    headers: headers(token),
    data: { duration_minutes: 5 },
  });
  expect(session.ok()).toBeFalsy();
  const task = await request.post(`${GATEWAY_URL}/rest/v1/task`, {
    headers: headers(token),
    data: {
      family_id: family.familyId,
      child_id: family.childId,
      subject: 'Maths',
      kind: 'devoir',
      description: 'x',
    },
  });
  expect(task.ok()).toBeFalsy();
  const child = await request.post(`${GATEWAY_URL}/rest/v1/child_profile`, {
    headers: headers(token),
    data: { alias: 'Intrus', grade: 'P5', family_id: family.familyId },
  });
  expect(child.ok()).toBeFalsy();

  // Événements : pour son enfant uniquement, famille déduite automatiquement.
  const event = (childId: string) =>
    request.post(`${GATEWAY_URL}/rest/v1/learning_event`, {
      headers: headers(token),
      data: { child_id: childId, type: 'carte', meta: {} },
    });
  expect((await event(family.childId)).status()).toBe(201);
  expect((await event(siblingId)).ok()).toBeFalsy();

  // Ni code pour une autre tablette, ni fonctions réservées aux parents.
  const rpc = await request.post(`${GATEWAY_URL}/rest/v1/rpc/create_device_pairing`, {
    headers: headers(token),
    data: { p_child_id: family.childId },
  });
  expect(rpc.ok()).toBeFalsy();
  const purchase = await request.post(`${GATEWAY_URL}/functions/v1/simulate-purchase`, {
    headers: headers(token),
    data: { plan: 'famille', period: 'annee' },
  });
  expect(purchase.status()).toBe(403);
  const taskId = sql(`select id from task where child_id = '${family.childId}' limit 1`);
  const regenerate = await request.post(`${GATEWAY_URL}/functions/v1/generate-pack`, {
    headers: headers(token),
    data: { taskId, regenerate: true },
  });
  expect(regenerate.status()).toBe(403);
  const otherTask = sql(`select id from task where child_id = '${other.childId}' limit 1`);
  const foreignPack = await request.post(`${GATEWAY_URL}/functions/v1/generate-pack`, {
    headers: headers(token),
    data: { taskId: otherTask },
  });
  expect(foreignPack.status()).toBe(404);

  // Petits mots : lus et marqués comme lus, jamais modifiés.
  sql(
    `insert into child_note (family_id, child_id, message) values ('${family.familyId}', '${family.childId}', 'Bravo !')`,
  );
  expect(await get('child_note?select=message')).toEqual([{ message: 'Bravo !' }]);
  const note = (data: Record<string, unknown>) =>
    request.patch(`${GATEWAY_URL}/rest/v1/child_note?child_id=eq.${family.childId}`, {
      headers: headers(token),
      data,
    });
  expect((await note({ message: 'Modifié' })).ok()).toBeFalsy();
  expect((await note({ seen_at: new Date().toISOString() })).ok()).toBeTruthy();

  // Accessoire de l'avatar : pour son enfant seulement.
  const accessory = (childId: string, value: string) =>
    request.post(`${GATEWAY_URL}/rest/v1/rpc/set_avatar_accessory`, {
      headers: headers(token),
      data: { p_child_id: childId, p_accessory: value },
    });
  expect((await accessory(family.childId, 'cape')).ok()).toBeTruthy();
  expect((await accessory(siblingId, 'cape')).ok()).toBeFalsy();
  expect((await accessory(family.childId, 'inconnu')).ok()).toBeFalsy();

  // Fond d'écran : pour son enfant seulement, parmi les fonds connus.
  const background = (childId: string, value: string) =>
    request.post(`${GATEWAY_URL}/rest/v1/rpc/set_child_background`, {
      headers: headers(token),
      data: { p_child_id: childId, p_background: value },
    });
  expect((await background(family.childId, 'foret')).ok()).toBeTruthy();
  expect((await background(siblingId, 'foret')).ok()).toBeFalsy();
  expect((await background(family.childId, 'inconnu')).ok()).toBeFalsy();
  // Fonds à débloquer : refusés par le serveur tant que l'effort ne suffit pas (Arc-en-ciel : 200 points).
  expect((await background(family.childId, 'arc_en_ciel')).ok()).toBeFalsy();
  sql(`insert into learning_event (family_id, child_id, type, meta)
       select family_id, id, 'activite', '{"minutes": 10}' from child_profile, generate_series(1, 20)
       where id = '${family.childId}'`);
  expect((await background(family.childId, 'arc_en_ciel')).ok()).toBeTruthy();
  expect((await background(family.childId, 'aurore')).ok()).toBeFalsy();

  // Cartable : la tablette lit la liste de son enfant, sans pouvoir la modifier.
  sql(`insert into school_bag_item (family_id, child_id, label, days)
       select family_id, id, 'Plumier', array['lun'] from child_profile where id in ('${family.childId}', '${siblingId}')`);
  expect(await get('school_bag_item?select=label,child_id')).toEqual([
    { label: 'Plumier', child_id: family.childId },
  ]);
  const bagInsert = await request.post(`${GATEWAY_URL}/rest/v1/school_bag_item`, {
    headers: headers(token),
    data: { child_id: family.childId, label: 'Console de jeu', days: ['lun'] },
  });
  expect(bagInsert.ok()).toBeFalsy();

  // Carnet de fierté : l'enfant y ajoute un moment, seulement pour lui.
  const pride = (childId: string) =>
    request.post(`${GATEWAY_URL}/rest/v1/pride_entry`, {
      headers: headers(token),
      data: { child_id: childId, emoji: '⭐', text: 'Mon exposé' },
    });
  expect((await pride(family.childId)).status()).toBe(201);
  expect((await pride(siblingId)).ok()).toBeFalsy();
  expect(await get('pride_entry?select=text')).toEqual([{ text: 'Mon exposé' }]);

  // Défi de la fratrie : la tablette voit le défi de sa famille (le total seulement).
  sql(`insert into sibling_challenge (family_id, label, missions_needed)
       select family_id, 'Soirée pizza', 10 from child_profile where id = '${family.childId}'`);
  const challenge = await request.post(`${GATEWAY_URL}/rest/v1/rpc/sibling_challenge_progress`, {
    headers: headers(token),
  });
  expect(await challenge.json()).toEqual([
    expect.objectContaining({ label: 'Soirée pizza', missions_needed: 10 }),
  ]);
  expect(await get('sibling_challenge')).toEqual([]);

  // Demande d'aide : pour une tâche de son enfant, famille déduite ; pas pour un autre enfant.
  const ownTask = sql(`select id from task where child_id = '${family.childId}' limit 1`);
  const ask = (childId: string, taskId: string) =>
    request.post(`${GATEWAY_URL}/rest/v1/help_request`, {
      headers: headers(token),
      data: { child_id: childId, task_id: taskId },
    });
  expect((await ask(family.childId, ownTask)).status()).toBe(201);
  expect(
    (await ask(other.childId, sql(`select id from task where child_id = '${other.childId}' limit 1`))).ok(),
  ).toBeFalsy();

  // Pas de demande d'aide sur la tâche d'un frère ou d'une sœur (même famille).
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, status)
       values ('${family.familyId}', '${siblingId}', 'Latin', 'devoir', 'Version', current_date + 2, 'validated')`);
  const siblingTask = sql(`select id from task where child_id = '${siblingId}' limit 1`);
  expect((await ask(family.childId, siblingTask)).ok()).toBeFalsy();

  // Essais de codes au hasard : bloqués après 10 erreurs pour une même adresse.
  for (let i = 0; i < 9; i++) expect((await pair('ZZZZZZZZ')).status()).toBe(404);
  expect((await pair('ZZZZZZZZ')).status()).toBe(429);

  // Supprimer le profil supprime aussi le compte de la tablette.
  const deviceUser = sql(`select user_id from child_device where child_id = '${family.childId}'`);
  sql(`delete from child_profile where id = '${family.childId}'`);
  expect(sql(`select count(*) from auth.users where id = '${deviceUser}'`)).toBe('0');
});
