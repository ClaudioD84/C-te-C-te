import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('dictée préparée : mots recopiés par le parent, entraînement de l’enfant', async ({ page }) => {
  const email = await signUp(page, 'dictee');
  const { childId } = await addChild(page, email, 'Moineau');
  await button(page, 'Planning de la semaine').click();
  await page.getByLabel('Mots de la dictée').fill('le château\nune forêt\nle château');
  await button(page, 'Enregistrer la dictée').click();
  await expect(button(page, 'Enregistrée (2 mots)')).toBeVisible();
  expect(sql(`select array_to_string(words, '|') from spelling_list where child_id = '${childId}'`)).toBe(
    'le château|une forêt',
  );
  await page.goBack();

  await enterChildMode(page, 'Moineau');
  await button(page, '✏️ Ma dictée (2 mots)').click();
  await page.getByLabel('Écris le mot que tu entends').fill('Le château');
  await button(page, 'Vérifier').click();
  await expect(page.getByText('Bravo, c’est bien écrit !')).toBeVisible();
  await button(page, 'Mot suivant').click();
  await page.getByLabel('Écris le mot que tu entends').fill('une foret');
  await button(page, 'Vérifier').click();
  await expect(page.getByText('Presque ! Attention aux accents :')).toBeVisible();
  await button(page, 'Terminer').click();
  await expect(page.getByText('Tu as écrit 2 mots. Bravo pour ton effort !')).toBeVisible();
  await expect
    .poll(() =>
      sql(`select meta->>'mode' || ':' || (meta->>'score') || '/' || (meta->>'total') from learning_event
           where child_id = '${childId}' and type = 'quiz'`),
    )
    .toBe('dictee:2/2');
});
