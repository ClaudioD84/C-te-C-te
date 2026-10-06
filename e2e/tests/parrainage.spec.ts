import { expect, test } from '@playwright/test';

import { button, familyOf, signUp, sql } from './helpers';

const daysLeft = (email: string) =>
  Number(
    sql(`select round(extract(epoch from current_period_end - now()) / 86400) from subscription
              where family_id = '${familyOf(email)}'`),
  );

test('parrainage : un mois offert à la nouvelle famille et à la marraine', async ({ page, browser }) => {
  const email = await signUp(page, 'marraine');
  await button(page, 'Mon compte et réglages').click();
  await button(page, 'Mon abonnement').click();
  const code = (await page.getByText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/).textContent())!;

  // Son propre code ne compte pas.
  await page.getByLabel('Vous avez reçu un code ?').fill(code);
  await button(page, 'Utiliser ce code').click();
  await expect(page.getByText(/C’est votre propre code/)).toBeVisible();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const otherEmail = await signUp(otherPage, 'filleule');
  await button(otherPage, 'Mon compte et réglages').click();
  await button(otherPage, 'Mon abonnement').click();
  await otherPage.getByLabel('Vous avez reçu un code ?').fill(code.toLowerCase());
  await button(otherPage, 'Utiliser ce code').click();
  await expect(otherPage.getByText('✓ Code accepté : un mois de plus pour votre famille.')).toBeVisible();
  expect(daysLeft(otherEmail)).toBe(44);
  expect(daysLeft(email)).toBe(44);

  // Une seule fois par famille.
  await otherPage.reload();
  await otherPage.getByLabel('Vous avez reçu un code ?').fill(code);
  await button(otherPage, 'Utiliser ce code').click();
  await expect(otherPage.getByText('Votre famille a déjà utilisé un code de parrainage.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('1 famille parrainée. Merci !')).toBeVisible();
  await other.close();
});
