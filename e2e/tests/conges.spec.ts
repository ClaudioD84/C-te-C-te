import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, insertValidatedTasks, signUp, sql } from './helpers';

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

test('vacances : idées pour le parent, message sur la console de l’enfant', async ({ page }) => {
  const email = await signUp(page, 'vacances');
  const { childId, familyId } = await addChild(page, email, 'Mouette');
  sql(`insert into day_off (family_id, child_id, start_date, end_date, kind)
       values ('${familyId}', '${childId}', current_date - 1, current_date + 6, 'conge')`);
  await page.reload();
  await button(page, '🏖️ Idées pour les vacances').click();
  await expect(page.getByText('Le chef pâtissier')).toBeVisible();
  await expect(page.getByText('Le carnet de vacances')).toBeVisible();
  await page.goBack();

  await enterChildMode(page, 'Mouette');
  await expect(page.getByText('🏖️ C’est les vacances !')).toBeVisible();
});

test('congés scolaires officiels : ajoutés en un geste, puis plus proposés', async ({ page }) => {
  // Calendrier connu jusqu'au lundi de Pentecôte 2027 (à compléter pour les années suivantes).
  test.skip(new Date() > new Date('2027-05-16'), 'Calendrier scolaire suivant pas encore ajouté');
  const email = await signUp(page, 'conges-officiels');
  const { childId } = await addChild(page, email, 'Loir');
  await button(page, 'Planning de la semaine').click();
  await expect(page.getByText('Congés scolaires 2026-2027')).toBeVisible();
  await button(page, /^Ajouter les congés scolaires \(\d+\)$/).click();
  await expect(page.getByText('Congés scolaires 2026-2027')).toHaveCount(0);
  expect(
    Number(sql(`select count(*) from day_off where child_id = '${childId}' and kind = 'conge'`)),
  ).toBeGreaterThan(0);
});
