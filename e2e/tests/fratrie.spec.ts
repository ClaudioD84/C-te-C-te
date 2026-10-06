import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

test('défi des frères et sœurs : objectif commun, total sans classement, récompense donnée', async ({
  page,
}) => {
  const email = await signUp(page, 'fratrie');
  const { childId: first, familyId } = await addChild(page, email, 'Renard');
  await expect(page.getByText('🤝 Défi des frères et sœurs')).toHaveCount(0);
  const { childId: second } = await addChild(page, email, 'Belette', { grade: '2e primaire' });

  await button(page, 'Lancer un défi commun').click();
  await page.getByRole('radio', { name: 'Une soirée pizza' }).click();
  await page.getByRole('radio', { name: '6 missions' }).click();
  await button(page, 'Lancer le défi').click();
  await expect(page.getByText('En cours : « Une soirée pizza » · 0 mission sur 6')).toBeVisible();

  // Trois missions chacun : le total de la fratrie atteint l'objectif.
  sql(`insert into learning_event (family_id, child_id, type, meta)
       select '${familyId}', c.id, 'session', '{}' from (values ('${first}'::uuid), ('${second}'::uuid)) as c(id),
       generate_series(1, 3)`);
  await page.goBack();
  await page.reload();
  await expect(page.getByText('« Une soirée pizza » · 6 missions sur 6 à eux tous')).toBeVisible();

  // Deux enfants : la mission de Belette (deuxième carte).
  await page.getByRole('button', { name: 'Lancer la mission du jour' }).nth(1).click();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText('Saisissez à nouveau')).toBeVisible();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText(/Bonjour Belette/)).toBeVisible();
  await expect(
    page.getByText('🎉 Défi de la fratrie réussi : Une soirée pizza ! Bravo à vous tous.'),
  ).toBeVisible();
  await button(page, 'Espace parent (code demandé)').click();
  for (const digit of '2809') await button(page, digit).click();

  await button(page, 'Voir le défi').click();
  await button(page, 'Récompense donnée').click();
  await expect(page.getByText(/^En cours :/)).toHaveCount(0);
  expect(
    sql(`select count(*) from sibling_challenge where family_id = '${familyId}' and given_at is not null`),
  ).toBe('1');
});
