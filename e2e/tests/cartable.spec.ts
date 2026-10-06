import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('cartable du soir : le parent note les affaires, l’enfant coche sa liste', async ({ page }) => {
  const email = await signUp(page, 'cartable');
  const { childId } = await addChild(page, email, 'Mésange');

  await button(page, 'Cartable de Mésange').click();
  await page.getByRole('radio', { name: '✏️ Plumier' }).click();
  await expect(page.getByRole('checkbox', { name: 'Vendredi' })).toHaveAttribute('aria-checked', 'true');
  await button(page, 'Ajouter au cartable').click();
  await expect(page.getByText('Tous les jours d’école')).toBeVisible();
  // Une affaire tous les jours (week-end compris) pour que la liste s'affiche quel que soit le jour du test.
  await page.getByLabel('À emporter').fill('Doudou');
  await expect(button(page, 'Ajouter au cartable')).toBeDisabled();
  for (const day of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']) {
    await page.getByRole('checkbox', { name: day }).click();
  }
  await button(page, 'Ajouter au cartable').click();
  await expect(page.getByText('Doudou')).toBeVisible();
  expect(sql(`select count(*) from school_bag_item where child_id = '${childId}'`)).toBe('2');
  await button(page, 'Retirer Doudou').click();
  await expect(page.getByText('Doudou')).toHaveCount(0);
  sql(`insert into school_bag_item (family_id, child_id, label, days)
       select family_id, id, 'Doudou', array['lun','mar','mer','jeu','ven','sam','dim'] from child_profile
       where id = '${childId}'`);
  await page.goBack();

  await enterChildMode(page, 'Mésange');
  await page.reload();
  // Le cartable se prépare pour un jour d'école (aujourd'hui avant 10 h, sinon demain).
  const now = new Date();
  const target = new Date(now);
  if (now.getHours() >= 10) target.setDate(now.getDate() + 1);
  if (target.getDay() === 0 || target.getDay() === 6) {
    await expect(page.getByText(/Mon cartable pour/)).toHaveCount(0);
    return;
  }
  await expect(page.getByText(/🎒 Mon cartable pour/)).toBeVisible();
  await page.getByRole('checkbox', { name: '✏️ Plumier' }).click();
  await page.getByRole('checkbox', { name: 'Doudou' }).click();
  await expect(page.getByText('Cartable prêt ✓')).toBeVisible();
  // Les coches restent sur l'appareil.
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Doudou' })).toHaveAttribute('aria-checked', 'true');
});
