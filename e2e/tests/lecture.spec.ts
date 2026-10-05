import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('carnet de lecture : une lecture notée compte comme un effort', async ({ page }) => {
  const email = await signUp(page, 'lecture');
  const { childId } = await addChild(page, email, 'Chouette');
  await enterChildMode(page, 'Chouette');
  await button(page, '📚 J’ai lu').click();
  await page.getByRole('radio', { name: '20 min' }).click();
  await page.getByLabel('Mon livre (facultatif)').fill('Le Petit Prince');
  await button(page, 'J’ai lu !').click();
  await expect(page.getByText('Bravo ! C’est noté dans ton carnet.')).toBeVisible();
  await expect(page.getByText('20 minutes de lecture · 1 fois · 1 livre')).toBeVisible();
  await expect
    .poll(() =>
      sql(`select meta->>'mode' || ':' || (meta->>'minutes') || ':' || (meta->>'book') from learning_event
           where child_id = '${childId}' and type = 'activite'`),
    )
    .toBe('lecture:20:Le Petit Prince');
});
