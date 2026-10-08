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

test('adaptations : pictogrammes pour les jeunes lecteurs et supports de calcul (dyscalculie)', async ({
  page,
}) => {
  const email = await signUp(page, 'adaptations');
  const { childId, familyId } = await addChild(page, email, 'Écureuil', {
    grade: '2e primaire',
    needs: ['Dyscalculie'],
  });
  insertValidatedTasks(familyId, childId);
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, status) values
    ('${familyId}', '${childId}', 'Mathématiques', 'lecon', 'Les tables de 2', current_date + 1, 'validated')`);
  await publishPlanning(page, 'Écureuil', childId);
  await page.goBack();
  await enterChildMode(page, 'Écureuil');

  // Une activité à la fois pour un jeune lecteur : son pictogramme de matière est affiché, caché aux lecteurs d'écran.
  const pictograms = page.locator('[aria-hidden="true"]').filter({ hasText: /🔢|🌍/ });
  await expect(pictograms.first()).toBeVisible();

  // Exercices de mathématiques : rappel des supports concrets.
  const mathsLesson = sql(
    `select id from task where child_id = '${childId}' and description = 'Les tables de 2'`,
  );
  await page.goto(`/enfant/etude/${mathsLesson}?mode=exercices&subject=Math%C3%A9matiques`);
  await expect(page.getByText(/compte avec des objets/)).toBeVisible({ timeout: 30_000 });

  // Pas de rappel en Éveil.
  const eveilLesson = sql(
    `select id from task where child_id = '${childId}' and description = 'Étudier la Meuse et l''Escaut'`,
  );
  await page.goto(`/enfant/etude/${eveilLesson}?mode=exercices&subject=%C3%89veil`);
  await expect(page.getByText('Complète.').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/compte avec des objets/)).toHaveCount(0);
});
