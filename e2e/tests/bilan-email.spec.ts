import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

import { GATEWAY_URL } from '../support/supabase.mjs';

const MOCKS = 'http://127.0.0.1:5300';

test('bilan de la semaine par e-mail : seulement sur demande, une fois par semaine', async ({
  page,
  request,
}) => {
  const email = await signUp(page, 'bilan-email');
  const { childId, familyId } = await addChild(page, email, 'Héron');
  sql(`insert into learning_event (family_id, child_id, type, meta)
       values ('${familyId}', '${childId}', 'activite', '{"minutes": 25}')`);
  const recap = () =>
    request.post(`${GATEWAY_URL}/functions/v1/weekly-recap`, {
      headers: { Authorization: 'Bearer purge-e2e' },
    });
  const sentTo = async () =>
    (
      (await (await request.get(`${MOCKS}/__emails`)).json()) as {
        to: { email: string }[];
        textContent: string;
      }[]
    ).filter((e) => e.to[0]!.email === email);

  // Désactivé par défaut : rien n'est envoyé.
  expect((await recap()).ok()).toBeTruthy();
  expect(await sentTo()).toHaveLength(0);

  await button(page, 'Mon compte et réglages').click();
  await page.getByRole('radio', { name: 'Le dimanche soir' }).click();
  await expect
    .poll(() =>
      sql(
        `select weekly_email from parent p join auth.users u on u.id = p.user_id where u.email = '${email}'`,
      ),
    )
    .toBe('t');

  expect((await recap()).ok()).toBeTruthy();
  const mails = await sentTo();
  expect(mails).toHaveLength(1);
  expect(mails[0]!.textContent).toContain('Héron\n• 1 jour de travail\n• 25 minutes au total');

  // Relancée le même jour : pas de second e-mail.
  expect((await recap()).ok()).toBeTruthy();
  expect(await sentTo()).toHaveLength(1);
  expect(
    (
      await request.post(`${GATEWAY_URL}/functions/v1/weekly-recap`, {
        headers: { Authorization: 'Bearer faux' },
      })
    ).status(),
  ).toBe(401);
});
