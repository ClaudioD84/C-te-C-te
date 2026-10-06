import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('défi de la semaine : choisi par l’enfant, fêté quand il est atteint', async ({ page }) => {
  const email = await signUp(page, 'defi');
  const { childId, familyId } = await addChild(page, email, 'Écureuil');
  await enterChildMode(page, 'Écureuil');
  await expect(
    page.getByText('🎯 Ton défi de la semaine : combien de jours veux-tu travailler ?'),
  ).toBeVisible();
  await button(page, '2 jours').click();
  await expect(page.getByText('🎯 Défi : 2 jours cette semaine · 0 sur 2')).toBeVisible();

  // Deux jours de travail cette semaine (aujourd'hui et, si possible, un autre jour de la semaine).
  sql(`insert into learning_event (family_id, child_id, type, meta, created_at) values
    ('${familyId}', '${childId}', 'activite', '{"minutes": 10}', now()),
    ('${familyId}', '${childId}', 'activite', '{"minutes": 10}',
     case when extract(isodow from now()) = 1 then now() + interval '1 day' else now() - interval '1 day' end)`);
  await page.reload();
  await expect(
    page.getByText(/^(🏆 Défi réussi : 2 jours|🎯 Défi : 2 jours cette semaine · 1 sur 2)/),
  ).toBeVisible();
});
