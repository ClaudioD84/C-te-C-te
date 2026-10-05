import { expect, test } from '@playwright/test';

import { addChild, button, childTitle, familyOf, signUp, sql } from './helpers';

test('deuxième parent : invité par code, voit les enfants, peut être retiré', async ({ page, browser }) => {
  const email = await signUp(page, 'parent-a');
  await addChild(page, email, 'Koala');
  await button(page, 'Mon compte et réglages').click();
  await button(page, 'Inviter un autre parent').click();
  const code = (await page.getByText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/).textContent())!;

  // L'autre parent crée son compte, puis rejoint la famille.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const otherEmail = await signUp(otherPage, 'parent-b');
  await button(otherPage, 'Mon compte et réglages').click();
  await button(otherPage, 'Rejoindre une famille').click();
  await otherPage.getByLabel('Code d’invitation reçu').fill('AAAA-AAAA');
  await button(otherPage, 'Rejoindre cette famille').click();
  await expect(
    otherPage.getByText('Code inconnu ou expiré. Demandez une nouvelle invitation.'),
  ).toBeVisible();
  await otherPage.getByLabel('Code d’invitation reçu').fill(code.toLowerCase());
  await button(otherPage, 'Rejoindre cette famille').click();
  await expect(otherPage.getByText('Vous avez rejoint la famille.')).toBeVisible();
  expect(familyOf(otherEmail)).toBe(familyOf(email));
  await expect(otherPage.getByText(`${email}`)).toBeVisible();
  await otherPage.goBack();
  await expect(childTitle(otherPage, 'Koala')).toBeVisible();

  // Le code ne sert qu'une fois ; aucune famille orpheline ne reste.
  expect(sql(`select count(*) from family_invitation where family_id = '${familyOf(email)}'`)).toBe('0');

  // Le premier parent retire le second, qui repart sans enfant.
  await page.reload();
  await expect(page.getByText(otherEmail)).toBeVisible();
  await button(page, `Retirer ${otherEmail}`).click();
  await button(page, 'Confirmer').click();
  await expect(page.getByText(otherEmail)).toHaveCount(0);
  expect(familyOf(otherEmail)).not.toBe(familyOf(email));
  // Sa nouvelle famille est vide (son affichage se met à jour au prochain rafraîchissement des données).
  expect(sql(`select count(*) from child_profile where family_id = '${familyOf(otherEmail)}'`)).toBe('0');
  await otherPage.goto('/compte');
  await expect(otherPage.getByText(`${otherEmail} (vous)`)).toBeVisible();
  await expect(otherPage.getByText(email, { exact: true })).toHaveCount(0);
  await other.close();
});

test('rejoindre une famille est refusé quand son compte a déjà des enfants', async ({ page, browser }) => {
  const email = await signUp(page, 'parent-c');
  await button(page, 'Mon compte et réglages').click();
  await button(page, 'Inviter un autre parent').click();
  const code = (await page.getByText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/).textContent())!;

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const otherEmail = await signUp(otherPage, 'parent-d');
  await addChild(otherPage, otherEmail, 'Hibou');
  await button(otherPage, 'Mon compte et réglages').click();
  await button(otherPage, 'Rejoindre une famille').click();
  await otherPage.getByLabel('Code d’invitation reçu').fill(code);
  await button(otherPage, 'Rejoindre cette famille').click();
  await expect(otherPage.getByText(/contient déjà des profils d’enfants/)).toBeVisible();
  expect(familyOf(otherEmail)).not.toBe(familyOf(email));
  await other.close();
});
