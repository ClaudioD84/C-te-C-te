import { expect, test } from '@playwright/test';

import { button, signUp, sql } from './helpers';

test('essai, achat simulé de la formule Solo et limite d’un enfant', async ({ page }) => {
  const email = await signUp(page, 'abonnement');
  await expect(page.getByText(/Essai gratuit : 14 jours restants/)).toBeVisible();

  await button(page, 'Voir les formules').click();
  await expect(page.getByText('Famille annuel')).toBeVisible();
  await button(page, 'Choisir la formule Solo').click();
  await expect(page.getByText(/La formule Solo est active/)).toBeVisible({ timeout: 30_000 });
  expect(
    sql(`select plan || ' ' || status || ' ' || store from subscription s join parent p using (family_id)
         join auth.users u on u.id = p.user_id where u.email = '${email}'`),
  ).toBe('solo active simulation');
  await page.goBack();

  for (const alias of ['Ours', 'Loup']) {
    await button(page, 'Ajouter un enfant').click();
    await page.getByLabel("Pseudonyme de l'enfant").fill(alias);
    await button(page, 'Enregistrer').click();
    if (alias === 'Ours') await expect(page.getByText('Ours', { exact: true })).toBeVisible();
  }
  await expect(page.getByText(/formule Solo concerne un seul enfant/)).toBeVisible();
});
