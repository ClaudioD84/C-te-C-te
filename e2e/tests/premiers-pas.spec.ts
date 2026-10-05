import { expect, test } from '@playwright/test';

import { addChild, button, insertValidatedTasks, signUp } from './helpers';

test('premiers pas : étapes cochées au fur et à mesure, masquables', async ({ page }) => {
  const email = await signUp(page, 'premiers-pas');
  await expect(page.getByText('Premiers pas · 0 sur 4')).toBeVisible();
  await expect(button(page, 'Ajouter mon premier enfant')).toBeVisible();

  const { childId, familyId } = await addChild(page, email, 'Pingouin');
  await expect(page.getByText('Premiers pas · 1 sur 4')).toBeVisible();
  await expect(page.getByLabel('Ajouter votre enfant, fait')).toBeVisible();
  await expect(button(page, 'Prendre la photo')).toBeVisible();

  insertValidatedTasks(familyId, childId);
  await page.reload();
  await expect(page.getByText('Premiers pas · 2 sur 4')).toBeVisible();
  await expect(button(page, 'Voir le planning')).toBeVisible();

  await button(page, 'Masquer les premiers pas').click();
  await expect(page.getByText(/Premiers pas ·/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Vos enfants')).toBeVisible();
  await expect(page.getByText(/Premiers pas ·/)).toHaveCount(0);
});
