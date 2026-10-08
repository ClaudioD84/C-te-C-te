import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

test('remarque de l’enseignant : devient une leçon à retravailler dans le planning', async ({ page }) => {
  const email = await signUp(page, 'enseignant');
  const { childId } = await addChild(page, email, 'Mésange');
  await button(page, 'Planning de la semaine').click();
  await page.getByRole('radio', { name: 'Français' }).click();
  await page.getByLabel('Notion à retravailler').fill('l’accord du participe passé');
  await button(page, 'Ajouter au planning').click();
  await expect(page.getByText(/« Retravailler : l’accord du participe passé » ajouté/)).toBeVisible();
  expect(
    sql(`select kind || ':' || status || ':' || (due_date - current_date) from task
         where child_id = '${childId}' and description = 'Retravailler : l’accord du participe passé'`),
  ).toBe('lecon:validated:7');

  await button(page, 'Calculer le planning').click();
  await expect(page.getByText(/Retravailler : l’accord du participe passé/).first()).toBeVisible();
});
