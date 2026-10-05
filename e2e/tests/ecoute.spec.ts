import { expect, test } from '@playwright/test';

import {
  addChild,
  enterChildMode,
  insertValidatedTasks,
  openTraining,
  publishPlanning,
  signUp,
  sql,
  button,
} from './helpers';

test('écoute et écris : les mots clés de la fiche, accents tolérés, effort enregistré', async ({ page }) => {
  const email = await signUp(page, 'ecoute');
  const { childId, familyId } = await addChild(page, email, 'Écureuil');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Écureuil', childId);
  await page.goBack();
  await enterChildMode(page, 'Écureuil');
  await openTraining(page);

  // Lecture à voix haute de toute la fiche (arrêtable).
  await page.getByRole('radio', { name: 'Fiche' }).click();
  await button(page, '🔊 Écouter la fiche').click();
  await expect(button(page, '⏹️ Arrêter la lecture').or(button(page, '🔊 Écouter la fiche'))).toBeVisible();

  await page.getByRole('radio', { name: 'Écoute et écris' }).click();
  await expect(page.getByText('Mot 1 sur 2')).toBeVisible();
  await page.getByLabel('Écris le mot que tu entends').fill(' fleuve ');
  await button(page, 'Vérifier').click();
  await expect(page.getByText('Bravo, c’est bien écrit !')).toBeVisible();
  await button(page, 'Mot suivant').click();

  await page.getByLabel('Écris le mot que tu entends').fill('afluent');
  await button(page, 'Vérifier').click();
  await expect(page.getByText('Le mot s’écrit :')).toBeVisible();
  await expect(page.getByText('Affluent', { exact: true })).toBeVisible();
  await button(page, 'Terminer').click();
  await expect(page.getByText('Tu as écrit 2 mots. Bravo pour ton effort !')).toBeVisible();

  await expect
    .poll(() =>
      sql(`select meta->>'mode' || ':' || (meta->>'score') || '/' || (meta->>'total') from learning_event
           where child_id = '${childId}' and type = 'quiz'`),
    )
    .toBe('ecoute:1/2');
});
