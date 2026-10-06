import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('maîtrise visible : tables maîtrisées, mots écrits, livres lus', async ({ page }) => {
  const email = await signUp(page, 'maitrise');
  const { childId, familyId } = await addChild(page, email, 'Faon');
  sql(`insert into learning_event (family_id, child_id, type, meta) values
    ('${familyId}', '${childId}', 'quiz', '{"mode":"tables","operation":"multiplication","score":10,"total":10,"perTable":{"3":[10,10]}}'),
    ('${familyId}', '${childId}', 'quiz', '{"mode":"tables","operation":"multiplication","score":5,"total":10,"perTable":{"7":[5,10]}}'),
    ('${familyId}', '${childId}', 'quiz', '{"mode":"dictee","score":8,"total":10}'),
    ('${familyId}', '${childId}', 'activite', '{"mode":"lecture","minutes":20,"book":"Matilda"}')`);
  await enterChildMode(page, 'Faon');
  await button(page, /Voir mes badges/).click();
  await expect(page.getByText('Ce que je sais')).toBeVisible();
  await expect(page.getByText('✖️ Table maîtrisée : 3 ⭐')).toBeVisible();
  await expect(page.getByText('✏️ 8 mots bien écrits en dictée')).toBeVisible();
  await expect(page.getByText('📚 1 livre lu')).toBeVisible();
});
