import { expect, test } from '@playwright/test';

import {
  addChild,
  button,
  enterChildMode,
  insertValidatedTasks,
  publishPlanning,
  signUp,
  sql,
} from './helpers';

test('révision express la veille d’une interro : toutes ses cartes, une fois', async ({ page }) => {
  const email = await signUp(page, 'express');
  const { childId, familyId } = await addChild(page, email, 'Colibri');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Colibri', childId);
  await page.goBack();
  // L'interrogation d'Éveil a lieu demain.
  sql(`update task set due_date = current_date + 1
       where child_id = '${childId}' and description = 'Revoir les fleuves de Belgique'`);
  const cards = Number(
    sql(`select count(*) from flashcard f join study_pack p on p.id = f.pack_id join task t on t.id = p.task_id
         where t.child_id = '${childId}' and t.description = 'Revoir les fleuves de Belgique'`),
  );
  expect(cards).toBeGreaterThan(0);

  await enterChildMode(page, 'Colibri');
  // La date vient d'être changée directement en base : on recharge les données.
  await page.reload();
  await expect(page.getByText(/^⚡ Demain : /)).toBeVisible();
  await button(page, `Révision express (${cards} carte${cards > 1 ? 's' : ''})`).click();
  await expect(page.getByText(new RegExp(`encore ${cards} carte`))).toBeVisible();
  await page.getByRole('button', { name: /^Question : / }).click();
  await button(page, 'Facile !').click();
  if (cards > 1) await expect(page.getByText(new RegExp(`encore ${cards - 1} carte`))).toBeVisible();
  else await expect(page.getByText('Bravo, 1 carte revue !')).toBeVisible();
});
