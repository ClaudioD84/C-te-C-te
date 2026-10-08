import { expect, test } from '@playwright/test';

import {
  addChild,
  button,
  childTitle,
  insertValidatedTasks,
  publishPlanning,
  signUp,
  sql,
  openTools,
} from './helpers';

test('préférences du profil : jours, durée, papier, avatar, réseau ; impression de la semaine', async ({
  page,
}) => {
  const email = await signUp(page, 'preferences');
  const { childId, familyId } = await addChild(page, email, 'Blaireau');

  await openTools(page, 'Blaireau');
  await button(page, 'Modifier le profil').click();
  await page.getByRole('radio', { name: '1re secondaire' }).click();
  await page.getByRole('radio', { name: '🦊 Renard' }).click();
  // Jours : retirer vendredi, ajouter samedi.
  await page.getByRole('checkbox', { name: 'Vendredi' }).click();
  await page.getByRole('checkbox', { name: 'Samedi' }).click();
  await page.getByRole('radio', { name: '25 min', exact: true }).click();
  await page.getByRole('radio', { name: 'Imprimés sur papier' }).click();
  // Centres d'intérêt : 3 au plus, un 4e choix est ignoré.
  for (const interest of ['🚀 Espace', '⚽ Football', '🎨 Dessin', '🐴 Chevaux']) {
    await page.getByRole('checkbox', { name: interest }).click();
  }
  await expect(page.getByRole('checkbox', { name: '🐴 Chevaux' })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('checkbox', { name: '⚽ Football' }).click();
  await page.getByRole('radio', { name: 'Libre confessionnel' }).click();
  await page.getByLabel('Options (facultatif, séparées par des virgules)').fill('Latin,  Sciences 5 h, ');
  await button(page, 'Enregistrer').click();
  await expect(childTitle(page, 'Blaireau')).toHaveText('🦊 Blaireau');

  const saved = JSON.parse(
    sql(`select json_build_object('avatar', avatar, 'grade', grade, 'network', network, 'options', options,
           'preferences', preferences) from child_profile where id = '${childId}'`),
  );
  expect(saved).toMatchObject({
    avatar: 'renard',
    grade: 'S1',
    network: 'libre_confessionnel',
    options: ['Latin', 'Sciences 5 h'],
    preferences: {
      availableDays: ['lun', 'mar', 'mer', 'jeu', 'sam'],
      sessionMinutes: 25,
      prefersPaper: true,
      interests: ['espace', 'dessin'],
    },
  });

  // Préférence papier : l'impression des fiches de la semaine est mise en avant.
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Blaireau', childId);
  await expect(page.getByText('Blaireau préfère travailler sur papier')).toBeVisible();
  await expect(button(page, /^Imprimer les fiches de la semaine \(\d+\)$/)).toBeVisible();
});

test('au moins un jour de travail est exigé', async ({ page }) => {
  const email = await signUp(page, 'jours');
  await addChild(page, email, 'Hérisson');
  await openTools(page, 'Hérisson');
  await button(page, 'Modifier le profil').click();
  for (const day of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']) {
    await page.getByRole('checkbox', { name: day }).click();
  }
  await expect(page.getByText('Choisissez au moins un jour.')).toBeVisible();
  await expect(button(page, 'Enregistrer')).toBeDisabled();
});
