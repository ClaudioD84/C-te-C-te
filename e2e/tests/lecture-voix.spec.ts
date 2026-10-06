import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('lecture à voix haute : texte du niveau, mots difficiles notés, progrès dans le suivi', async ({
  page,
}) => {
  const email = await signUp(page, 'lecture-voix');
  const { childId } = await addChild(page, email, 'Écureuil', { grade: '2e primaire' });

  await enterChildMode(page, 'Écureuil');
  await button(page, '🗣️ Je lis à voix haute').click();
  await expect(page.getByText(/^(Le chat de Léa|La pluie|Au parc|Le gâteau)$/)).toBeVisible();
  await button(page, '▶️ Je commence à lire').click();
  await page.waitForTimeout(2_000);
  await button(page, '⏹️ J’ai fini de lire').click();
  // Le parent touche les mots difficiles.
  await expect(page.getByText('Avec ton parent')).toBeVisible();
  const words = page.getByRole('checkbox');
  await words.nth(2).click();
  await expect(words.nth(2)).toHaveAttribute('aria-checked', 'true');
  await button(page, 'Enregistrer ma lecture').click();
  await expect(page.getByText('Première lecture enregistrée : bravo !')).toBeVisible();
  await expect(page.getByText(/Tu as lu \d+ secondes, à \d+ mots par minute\./)).toBeVisible();

  await expect
    .poll(() =>
      sql(`select json_build_object('subject', meta->>'subject', 'hard', jsonb_array_length(meta->'hard_words'),
             'fast', (meta->>'wpm')::int > 0) from learning_event
           where child_id = '${childId}' and meta->>'mode' = 'lecture_voix'`),
    )
    .toBe('{"subject" : "Français", "hard" : 1, "fast" : true}');

  await button(page, 'Retour à la mission').click();
  await button(page, 'Espace parent (code demandé)').click();
  for (const digit of '2809') await button(page, digit).click();
  await button(page, 'Suivi et épreuves').click();
  await expect(page.getByText('Lecture à voix haute')).toBeVisible();
  await expect(page.getByText(/\d+ mots\/min/)).toBeVisible();
  await expect(page.getByText(/mots difficiles : /)).toBeVisible();
});
