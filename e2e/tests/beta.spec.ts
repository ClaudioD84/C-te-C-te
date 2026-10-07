import { expect, test } from '@playwright/test';

import { button, familyOf, signUp, sql, uniqueEmail } from './helpers';

test('donner mon avis : depuis l’en-tête, avec l’écran d’origine', async ({ page }) => {
  const email = await signUp(page, 'avis');
  await button(page, 'Mon compte et réglages').click();
  await button(page, 'Donner mon avis').click();
  await page.getByRole('radio', { name: '😣 Je suis bloqué' }).click();
  await page.getByLabel('Votre message').fill('Je ne trouve pas le planning.');
  await button(page, 'Envoyer mon avis').click();
  await expect(page.getByText('Merci ! 🙏')).toBeVisible();
  expect(
    sql(
      `select mood || ' ' || screen || ' ' || message from feedback where family_id = '${familyOf(email)}'`,
    ),
  ).toBe('bloque /compte Je ne trouve pas le planning.');
});

test('inscription en bêta privée : le code d’invitation est demandé', async ({ page }) => {
  // La base de test n'a pas de code (les autres tests s'inscrivent en parallèle) : la réponse est simulée.
  await page.route('**/rest/v1/rpc/signup_requires_code', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'true' }),
  );
  await page.goto('/');
  await button(page, 'Pas encore de compte ? Inscription').click();
  await page.getByLabel('Adresse e-mail').fill(uniqueEmail('code'));
  await page.getByLabel('Mot de passe').fill('motdepasse1');
  await expect(page.getByText(/le code figure dans votre invitation/)).toBeVisible();
  await expect(button(page, 'Créer mon compte')).toBeDisabled();
  await page.getByLabel('Code d’invitation').fill('famille-01');
  await button(page, 'Créer mon compte').click();
  await expect(page.getByText('Vos enfants')).toBeVisible();
});
