import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql, childTitle } from './helpers';

test('modification du profil, retrait du consentement et suppression', async ({ page }) => {
  const email = await signUp(page, 'profil');
  const { childId } = await addChild(page, email, 'Renard', { needs: ['TDAH'] });

  await button(page, 'Modifier le profil').click();
  await page.getByLabel("Prénom de l'enfant").fill('Grand Renard');
  // Ajouter un besoin demande un nouvel accord.
  await page.getByRole('checkbox', { name: 'Dyslexie' }).click();
  await expect(page.getByRole('checkbox', { name: /J'accepte/ })).toBeVisible();
  await expect(button(page, 'Enregistrer')).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Dyslexie' }).click();
  // Retirer tous les besoins retire le consentement.
  await page.getByRole('checkbox', { name: 'TDAH' }).click();
  await expect(page.getByText(/vous retirez votre consentement/)).toBeVisible();
  await button(page, 'Enregistrer').click();
  await expect(childTitle(page, 'Grand Renard')).toBeVisible();
  expect(
    sql(
      `select alias || ' ' || cardinality(needs) || ' ' || (needs_consent_at is null) from child_profile where id = '${childId}'`,
    ),
  ).toBe('Grand Renard 0 true');

  await button(page, 'Modifier le profil').click();
  await button(page, 'Supprimer ce profil').click();
  await button(page, 'Supprimer définitivement').click();
  await expect(page.getByText(/Ajoutez un premier profil/)).toBeVisible();
  expect(sql(`select count(*) from child_profile where id = '${childId}'`)).toBe('0');
});
