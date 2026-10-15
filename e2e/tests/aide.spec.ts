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

test('« J’ai besoin d’aide » : l’enfant signale, le parent le voit et le note', async ({ page }) => {
  const email = await signUp(page, 'aide');
  const { childId, familyId } = await addChild(page, email, 'Loutre');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Loutre', childId);
  await page.goBack();

  await enterChildMode(page, 'Loutre');
  await button(page, '🙋 J’ai besoin d’aide').first().click();
  await expect(page.getByText('🙋 Ton parent est prévenu : vous regarderez ensemble.')).toBeVisible();
  expect(sql(`select count(*) from help_request where child_id = '${childId}' and resolved_at is null`)).toBe(
    '1',
  );

  await button(page, 'Espace parent (code demandé)').click();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText('🙋 Loutre a besoin d’aide')).toBeVisible();
  await page.getByRole('button', { name: /^C’est noté : / }).click();
  await expect(page.getByText('🙋 Loutre a besoin d’aide')).toHaveCount(0);
  expect(
    sql(`select count(*) from help_request where child_id = '${childId}' and resolved_at is not null`),
  ).toBe('1');
});
