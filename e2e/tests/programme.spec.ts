import { expect, test } from '@playwright/test';

import { addChild, button, insertValidatedTasks, publishPlanning, signUp, sql } from './helpers';

test('rattachement au programme : proposé par l’IA, corrigé par le parent, visible dans le programme', async ({
  page,
}) => {
  const email = await signUp(page, 'programme');
  const { childId, familyId } = await addChild(page, email, 'Castor');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Castor', childId);

  // L'IA (simulée) choisit le premier attendu proposé : la leçon d'Éveil est rattachée.
  const taskId = sql(
    `select id from task where child_id = '${childId}' and description = 'Revoir les fleuves de Belgique'`,
  );
  await expect
    .poll(() => sql(`select curriculum_item_id is not null from task where id = '${taskId}'`))
    .toBe('t');

  await button(page, 'Éveil · Revoir les fleuves de Belgique').click();
  await expect(page.getByText('Programme officiel')).toBeVisible();
  const proposed = sql(
    `select c.label from task t join curriculum_item c on c.id = t.curriculum_item_id where t.id = '${taskId}'`,
  );
  await expect(page.getByText(proposed, { exact: false }).first()).toBeVisible();

  // Le parent choisit un autre attendu de Sciences.
  await button(page, 'Modifier le rattachement').click();
  await page.getByRole('radio', { name: 'Sciences', exact: true }).click();
  const other = page.getByRole('button', { name: /^Rattacher à : / }).nth(1);
  const otherLabel = (await other.getAttribute('aria-label'))!.replace('Rattacher à : ', '');
  await other.click();
  await expect(button(page, 'Modifier le rattachement')).toBeVisible();
  expect(
    sql(
      `select c.label from task t join curriculum_item c on c.id = t.curriculum_item_id where t.id = '${taskId}'`,
    ),
  ).toBe(otherLabel);

  // Régénérer la fiche ne remplace pas le choix du parent.
  await button(page, 'Régénérer la fiche et le quiz').click();
  await expect(button(page, 'Régénérer la fiche et le quiz')).toBeEnabled({ timeout: 30_000 });
  expect(
    sql(
      `select c.label from task t join curriculum_item c on c.id = t.curriculum_item_id where t.id = '${taskId}'`,
    ),
  ).toBe(otherLabel);

  // Le programme de l'année marque l'attendu comme travaillé.
  await page.goBack();
  await button(page, "Voir le programme de l'année").click();
  await page.getByRole('radio', { name: 'Sciences', exact: true }).click();
  await expect(page.getByLabel(`${otherLabel}, déjà travaillé`)).toBeVisible();
});
