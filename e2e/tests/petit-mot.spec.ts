import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql, openTools } from './helpers';

test('petit mot du parent : affiché sur la console, lu par l’enfant', async ({ page }) => {
  const email = await signUp(page, 'petit-mot');
  const { childId } = await addChild(page, email, 'Panda');

  await openTools(page, 'Panda');
  await button(page, 'Écrire un petit mot à Panda').click();
  await page.getByRole('radio', { name: 'Tu progresses, continue comme ça !' }).click();
  await expect(page.getByLabel('Votre mot')).toHaveValue('Tu progresses, continue comme ça !');
  await button(page, 'Envoyer le mot').click();
  await expect(page.getByText('Envoyé ! Panda le verra sur sa console.')).toBeVisible();
  await expect(page.getByText('pas encore lu', { exact: false })).toBeVisible();
  await page.goBack();

  await enterChildMode(page, 'Panda');
  await expect(page.getByText('💌 Un petit mot pour toi')).toBeVisible();
  await expect(page.getByText('Tu progresses, continue comme ça !')).toBeVisible();
  await button(page, 'Merci !').click();
  await expect(page.getByText('💌 Un petit mot pour toi')).toHaveCount(0);
  await expect
    .poll(() => sql(`select count(*) from child_note where child_id = '${childId}' and seen_at is not null`))
    .toBe('1');
});
