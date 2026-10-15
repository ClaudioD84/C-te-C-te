import { expect, test } from '@playwright/test';

import { button, uniqueEmail } from './helpers';
import { GATEWAY_URL, supabaseStatus } from '../support/supabase.mjs';

// Boîte aux lettres de test de la pile locale (Mailpit) : les e-mails n'y sont pas envoyés pour de vrai.
const MAILPIT = 'http://127.0.0.1:54324';

async function codeReceivedBy(request: import('@playwright/test').APIRequestContext, email: string) {
  for (let i = 0; i < 20; i++) {
    const search = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = (await (await request.get(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`)).json()) as {
        Subject: string;
        Text: string;
      };
      expect(message.Subject).toBe('Votre code Côte à Côte');
      return /\b(\d{6})\b/.exec(message.Text)![1]!;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Aucun e-mail pour ${email}`);
}

test('mot de passe oublié : code reçu par e-mail, nouveau mot de passe, connexion', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('oubli');
  const { ANON_KEY } = supabaseStatus() as { ANON_KEY: string };
  const signup = await request.post(`${GATEWAY_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY },
    data: { email, password: 'ancien-mdp-1' },
  });
  expect(signup.ok()).toBeTruthy();

  await page.goto('/');
  await page.getByLabel('Adresse e-mail').fill(email);
  await button(page, 'Mot de passe oublié ?').click();
  // L'adresse déjà saisie est reprise.
  await expect(page.getByLabel('Adresse e-mail du compte')).toHaveValue(email);
  await button(page, 'Recevoir un code').click();
  await expect(page.getByText(/un code à 6 chiffres vient d’être envoyé/)).toBeVisible();

  // Un code faux est refusé clairement.
  await page.getByLabel('Code reçu par e-mail').fill('000000');
  await page.getByLabel('Nouveau mot de passe').fill('nouveau-mdp-1');
  await button(page, 'Changer le mot de passe').click();
  await expect(page.getByText('Code incorrect ou expiré. Demandez-en un nouveau.')).toBeVisible();

  await page.getByLabel('Code reçu par e-mail').fill(await codeReceivedBy(request, email));
  await button(page, 'Changer le mot de passe').click();
  await expect(page.getByText('Vos enfants')).toBeVisible();

  // L'ancien mot de passe ne fonctionne plus, le nouveau oui.
  const login = (password: string) =>
    request.post(`${GATEWAY_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY },
      data: { email, password },
    });
  expect((await login('ancien-mdp-1')).ok()).toBeFalsy();
  expect((await login('nouveau-mdp-1')).ok()).toBeTruthy();
});
