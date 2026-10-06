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
  // Diplôme à imprimer pour un badge gagné, pas pour un badge à découvrir.
  await expect(button(page, 'Imprimer le diplôme Premier pas')).toBeVisible();
  await expect(button(page, 'Imprimer le diplôme Belle série')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Couronne, à débloquer/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Casquette', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Casquette, porté' })).toBeVisible();
  await expect
    .poll(() => sql(`select accessory from child_profile where id = '${childId}'`))
    .toBe('casquette');

  // Couleur préférée : la couleur principale de la console change (contrastes vérifiés par test).
  await page.getByRole('radio', { name: '🔵 Bleu' }).click();
  await expect(button(page, 'Retour à la mission')).toHaveCSS('background-color', 'rgb(29, 95, 168)');

  // Fond d'écran : ceux de son âge, certains débloqués par l'effort.
  // Sans choix : un fond de son âge est proposé d'office (le fond uni reste au choix).
  await expect(page.getByRole('button', { name: 'Fond Ciel étoilé, choisi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fond Fond uni', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^Fond Aurore boréale, à débloquer/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Fond Océan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fond Océan, choisi' })).toBeVisible();
  await expect.poll(() => sql(`select background from child_profile where id = '${childId}'`)).toBe('ocean');

  await button(page, 'Retour à la mission').click();
  await expect(page.getByText(/🧢 Bonjour Renardeau/)).toBeVisible();
  // Le motif décoratif est derrière la mission, caché aux lecteurs d'écran.
  await expect(page.getByText('🐠').first()).toBeAttached();
});
