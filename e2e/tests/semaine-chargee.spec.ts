import { expect, test } from '@playwright/test';

import { addChild, button, insertValidatedTasks, signUp, sql } from './helpers';

test('semaine chargée : l’essentiel seulement, les leçons lointaines sont reportées', async ({ page }) => {
  const email = await signUp(page, 'chargee');
  const { childId, familyId } = await addChild(page, email, 'Marmotte');
  insertValidatedTasks(familyId, childId);
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, status) values
    ('${familyId}', '${childId}', 'Néerlandais', 'lecon', 'Étudier le vocabulaire des animaux', current_date + 6, 'validated')`);
  await button(page, 'Planning de la semaine').click();
  await button(page, 'Calculer le planning').click();
  await expect(page.getByText(/Étudier le vocabulaire des animaux/).first()).toBeVisible();

  await button(page, 'Semaine chargée : l’essentiel seulement').click();
  await expect(page.getByText('Semaine allégée : 1 leçon reportée au prochain planning')).toBeVisible();
  await expect(page.getByText(/Étudier le vocabulaire des animaux/)).toHaveCount(0);
  await expect(page.getByText(/Revoir les fleuves de Belgique/).first()).toBeVisible();

  await button(page, 'Revenir au planning complet').click();
  await expect(page.getByText(/Étudier le vocabulaire des animaux/).first()).toBeVisible();
});
