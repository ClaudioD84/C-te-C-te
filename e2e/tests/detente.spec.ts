import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql, openTools } from './helpers';

test('coin détente : jeux calmes après la mission, limités par jour, sans points d’effort', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = await signUp(page, 'detente');
  const { childId, familyId } = await addChild(page, email, 'Loutre');

  // Le parent règle la durée (10 minutes par défaut).
  await openTools(page, 'Loutre');
  await button(page, 'Modifier le profil').click();
  const relax = page.getByRole('radiogroup', { name: /^Coin détente/ });
  await expect(relax.getByRole('radio', { name: '10 min', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await relax.getByRole('radio', { name: '5 min', exact: true }).click();
  await button(page, 'Enregistrer').click();
  await expect
    .poll(() => sql(`select preferences->>'relaxMinutes' from child_profile where id = '${childId}'`))
    .toBe('5');

  // Pas de mission aujourd'hui : le coin détente est ouvert.
  await enterChildMode(page, 'Loutre');
  await button(page, '🎈 Coin détente').click();
  await expect(page.getByText('Encore 5 minutes de jeu aujourd’hui.')).toBeVisible();
  for (const game of ['🧠 Memory', '🎨 Coloriage', '🧩 Taquin', '🔤 Mots mêlés', '🔢 Sudoku']) {
    await expect(button(page, game)).toBeVisible();
  }

  // Bulles : une feuille éclatée rapporte le trésor du jour (une fois par jour).
  await button(page, '🫧 Bulles à éclater').click();
  for (let i = 1; i <= 30; i++) await button(page, `Bulle ${i}`).click();
  await expect(page.getByText('Toutes éclatées ! Pop pop pop.')).toBeVisible();
  await expect(page.getByText(/Un trésor/)).toBeVisible();
  await button(page, 'Nouvelle feuille').click();
  await expect(button(page, 'Bulle 1')).toBeEnabled();

  // Memory : deux cartes retournées restent visibles, sans délai.
  await button(page, 'Changer de jeu').click();
  await button(page, '🧠 Memory').click();
  await button(page, 'Carte 1, cachée').click();
  await expect(page.getByRole('button', { name: /^Carte 1 : / })).toBeVisible();

  // Taquin : une pièce qui n'est pas à côté de la case vide ne bouge pas ; le jeu reste ouvert.
  await button(page, 'Changer de jeu').click();
  await button(page, '🧩 Taquin').click();
  await expect(page.getByRole('button', { name: /^Pièce \d$/ })).toHaveCount(8);

  // Le temps de jeu est noté en quittant (à partir de 20 secondes), à part du travail.
  await page.waitForTimeout(21_000);
  await button(page, 'Retour à la mission').click();
  await expect(page.getByText(/Bonjour Loutre/)).toBeVisible();
  await expect
    .poll(() =>
      sql(`select meta->>'minutes' from learning_event where child_id = '${childId}' and type = 'detente'`),
    )
    .toBe('1');
  expect(sql(`select count(*) from child_effort_days('${childId}')`)).toBe('0');

  // Temps du jour épuisé (aussi sur un autre appareil) : une fin douce.
  sql(`insert into learning_event (family_id, child_id, type, meta)
       values ('${familyId}', '${childId}', 'detente', '{"minutes": 4}')`);
  await page.reload();
  await button(page, '🎈 Coin détente').click();
  await expect(page.getByText('Ta pause est finie, à demain ! 🌙')).toBeVisible();
  await button(page, 'Retour à la mission').click();

  // Coin détente fermé par le parent : plus de bouton.
  sql(`update child_profile set preferences = preferences || '{"relaxMinutes": 0}' where id = '${childId}'`);
  await page.reload();
  await expect(page.getByText(/Bonjour Loutre/)).toBeVisible();
  await expect(button(page, '🎈 Coin détente')).toHaveCount(0);
});
