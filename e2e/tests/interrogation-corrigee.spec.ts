import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, openTools, signUp, sql } from './helpers';

const PHOTO = new URL('../fixtures/journal.jpg', import.meta.url).pathname;

test('interrogation corrigée : erreurs relevées, puis remédiation guidée et en autonomie', async ({
  page,
}) => {
  const email = await signUp(page, 'interro');
  const { childId } = await addChild(page, email, 'Lynx');

  // Le parent photographie l'interrogation corrigée depuis « Plus d'outils ».
  await openTools(page, 'Lynx');
  await button(page, 'Photographier une interrogation corrigée de Lynx').click();
  await expect(page.getByRole('radio', { name: 'Interrogation' })).toHaveAttribute('aria-checked', 'true');
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choisir dans la galerie').click();
  await (await chooser).setFiles(PHOTO);
  await button(page, 'Envoyer pour analyse').click();

  // Relecture : la notion à retravailler et ses erreurs, jamais la note.
  await expect(page.getByText("Retravailler : l'accord du participe passé")).toBeVisible();
  await expect(page.getByText('Erreurs relevées (2) :')).toBeVisible();
  await expect(page.getByText('• Accorde : elles sont (parti) tôt — écrit : partit → parties')).toBeVisible();
  await button(page, 'Valider la liste').click();
  const taskId = sql(
    `select id from task where child_id = '${childId}' and description like 'Retravailler%' and status = 'validated'`,
  );
  expect(sql(`select jsonb_array_length(remediation -> 'errors') from task where id = '${taskId}'`)).toBe(
    '2',
  );

  // L'enfant : rappel ciblé sur ses erreurs, puis exercices guidés et en autonomie.
  await enterChildMode(page, 'Lynx');
  await page.goto(`/enfant/etude/${taskId}?subject=Fran%C3%A7ais`);
  await expect(page.getByText('Tes erreurs à l’interro')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('✓ Cherche le sujet avant d’accorder.')).toBeVisible();
  await button(page, 'J’ai revu la leçon : je m’entraîne →').click();

  await page.getByTestId('question-1').getByRole('radio', { name: 'être', exact: true }).click();
  const guided = page.getByTestId('question-2');
  await expect(guided.getByText('🧭 Exercice guidé')).toBeVisible();
  await expect(guided.getByText('Étape 1 : Repère l’auxiliaire.')).toBeVisible();
  await expect(guided.getByText('Étape 2 : Trouve le sujet.')).toHaveCount(0);
  await guided.getByRole('button', { name: 'Étape suivante', exact: true }).click();
  await expect(guided.getByText('Étape 2 : Trouve le sujet.')).toBeVisible();
  await guided.getByLabel('Ta réponse', { exact: true }).fill('arrivées');
  const alone = page.getByTestId('question-3');
  await expect(alone.getByText('💪 En autonomie')).toBeVisible();
  await expect(alone.getByText(/^Étape/)).toHaveCount(0);
  await alone.getByLabel('Ta réponse', { exact: true }).fill('tombes');
  await button(page, 'J’ai fini : je vérifie').click();

  // Accent oublié : « presque », l'enfant corrige lui-même.
  const check = page.getByTestId('verification-3');
  await expect(check.getByText('Presque ! Vérifie les accents.')).toBeVisible();
  await check.getByLabel('Corrige ta réponse', { exact: true }).fill('tombés');
  await check.getByRole('button', { name: 'Vérifier', exact: true }).click();
  await expect(check.getByText('✓ Bien corrigé !')).toBeVisible();
  await expect(
    page.getByText('2 sur 3 du premier coup, et 1 corrigée ensuite.', { exact: false }),
  ).toBeVisible();
});
