import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('récompense en famille : choisie par le parent, gagnée par les missions, donnée', async ({ page }) => {
  const email = await signUp(page, 'recompense');
  const { childId, familyId } = await addChild(page, email, 'Ourson');
  await button(page, 'Suivi et épreuves').click();
  await button(page, '🎁 Récompense en famille').click();
  await page.getByRole('radio', { name: 'Choisir le dessert' }).click();
  await page.getByRole('radio', { name: '3 missions' }).click();
  await button(page, 'Choisir cette récompense').click();
  await expect(page.getByText('En cours : « Choisir le dessert » · 0 mission sur 3')).toBeVisible();

  // Deux missions accomplies : la console montre la progression.
  const missions = (n: number) =>
    sql(`insert into learning_event (family_id, child_id, type, meta)
         select '${familyId}', '${childId}', 'session', '{}' from generate_series(1, ${n})`);
  missions(2);
  await page.goto('/');
  await enterChildMode(page, 'Ourson');
  await expect(page.getByText('🎁 Ta récompense : Choisir le dessert · 2 missions sur 3')).toBeVisible();

  missions(1);
  await page.reload();
  await expect(
    page.getByText('🎉 Tu as gagné : Choisir le dessert ! Montre cet écran à ton parent.'),
  ).toBeVisible();

  await button(page, 'Espace parent (code demandé)').click();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText('🎁 Ourson a gagné : Choisir le dessert')).toBeVisible();
  await button(page, 'C’est donné !').click();
  await expect(page.getByText('🎁 Ourson a gagné : Choisir le dessert')).toHaveCount(0);
  expect(
    sql(`select count(*) from family_reward where child_id = '${childId}' and given_at is not null`),
  ).toBe('1');
});
