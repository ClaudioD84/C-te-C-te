import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('carnet de fierté : l’enfant note un moment, le parent le voit et peut l’imprimer', async ({ page }) => {
  const email = await signUp(page, 'fierte');
  const { childId } = await addChild(page, email, 'Castor');

  await enterChildMode(page, 'Castor');
  await button(page, '🌟 De quoi es-tu fier·e cette semaine ?').click();
  await expect(button(page, 'Ajouter à mon carnet')).toBeDisabled();
  await page.getByRole('radio', { name: '🤝' }).click();
  await button(page, 'J’ai aidé quelqu’un').click();
  await expect(page.getByLabel('En quelques mots (si tu veux)')).toHaveValue('J’ai aidé quelqu’un');
  await page.getByLabel('En quelques mots (si tu veux)').fill('J’ai aidé mon copain en maths');
  await button(page, 'Ajouter à mon carnet').click();
  await expect(page.getByText('C’est noté dans ton carnet. Bravo !')).toBeVisible();
  await expect(page.getByText('J’ai aidé mon copain en maths')).toBeVisible();
  expect(sql(`select emoji || ' ' || text from pride_entry where child_id = '${childId}'`)).toBe(
    '🤝 J’ai aidé mon copain en maths',
  );

  // Le rappel disparaît une fois le carnet rempli cette semaine.
  await button(page, 'Retour à la mission').click();
  await expect(page.getByText(/Bonjour Castor/)).toBeVisible();
  await expect(button(page, '🌟 De quoi es-tu fier·e cette semaine ?')).toHaveCount(0);

  await button(page, 'Espace parent (code demandé)').click();
  for (const digit of '2809') await button(page, digit).click();
  await button(page, 'Suivi et épreuves').click();
  await expect(page.getByText('🌟 Carnet de fierté de Castor')).toBeVisible();
  await expect(page.getByText(/🤝 .* · J’ai aidé mon copain en maths/)).toBeVisible();
  await expect(button(page, '🖨️ Imprimer le carnet')).toBeVisible();
});
