import { expect, test } from '@playwright/test';

import { addChild, button, insertValidatedTasks, signUp, sql } from './helpers';

test('congés et absences : aucun travail ces jours-là, tâches signalées', async ({ page }) => {
  const email = await signUp(page, 'conges');
  const { childId, familyId } = await addChild(page, email, 'Marmotte');
  insertValidatedTasks(familyId, childId);
  await button(page, 'Planning de la semaine').click();

  // Absence aujourd'hui : les tâches pour demain n'ont plus de jour de préparation.
  await button(page, 'Ajouter un congé ou une absence').click();
  await page.getByRole('radio', { name: 'Absence (maladie, voyage…)' }).click();
  const today = new Date();
  await page
    .getByRole('radiogroup', { name: 'Jour' })
    .first()
    .getByRole('radio', { name: String(today.getDate()), exact: true })
    .click();
  await button(page, /^Enregistrer \(le /).click();
  await expect(page.getByText(/^Absence \(maladie, voyage…\) le /)).toBeVisible();
  expect(
    sql(`select kind || ':' || (end_date - start_date) from day_off where child_id = '${childId}'`),
  ).toBe('absence:0');

  await button(page, 'Calculer le planning').click();
  await expect(
    page.getByText('2 tâches tombent pendant un congé : prévoyez-les avant ou après'),
  ).toBeVisible();
  await expect(page.getByText("Aujourd'hui", { exact: false })).toHaveCount(0);

  // Retirer l'absence rétablit le planning habituel.
  await button(page, 'Annuler').click();
  await button(page, /^Retirer Absence/).click();
  await expect(page.getByText(/^Absence \(maladie, voyage…\) le /)).toHaveCount(0);
  await button(page, 'Calculer le planning').click();
  await expect(page.getByText(/tombent? pendant un congé/)).toHaveCount(0);
});
