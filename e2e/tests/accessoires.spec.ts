import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('accessoires de l’avatar : débloqués par l’effort, choisis par l’enfant', async ({ page }) => {
  const email = await signUp(page, 'accessoires');
  const { childId, familyId } = await addChild(page, email, 'Renardeau');
  // 5 activités : 50 points d'effort, l'avatar devient « Pousse » (casquette débloquée).
  sql(`insert into learning_event (family_id, child_id, type, meta)
       select '${familyId}', '${childId}', 'activite', '{"minutes": 10}' from generate_series(1, 5)`);

  await enterChildMode(page, 'Renardeau');
  await button(page, /Voir mes badges/).click();
  await expect(page.getByText(/^Mon avatar :/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Couronne, à débloquer/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Casquette', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Casquette, porté' })).toBeVisible();
  await expect
    .poll(() => sql(`select accessory from child_profile where id = '${childId}'`))
    .toBe('casquette');

  await button(page, 'Retour à la mission').click();
  await expect(page.getByText(/🧢 Bonjour Renardeau/)).toBeVisible();
});
