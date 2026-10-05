import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { addChild, button, enterChildMode, insertValidatedTasks, publishPlanning, signUp } from './helpers';

/** Audit WCAG 2.2 AA (exigence 6.2) des écrans principaux, en thème clair et sombre. */
async function audit(page: Page, screen: string) {
  await page.waitForTimeout(500);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    `Écran « ${screen} »`,
  ).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`accessibilité des écrans principaux (thème ${colorScheme === 'light' ? 'clair' : 'sombre'})`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 412, height: 915 } });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByText(/Inscription|Connexion/).first()).toBeVisible();
    await audit(page, 'connexion');

    const email = await signUp(page, `a11y-${colorScheme}`);
    await audit(page, 'cockpit vide');
    const { childId, familyId } = await addChild(page, email, 'Castor', { needs: ['Dyslexie'] });
    await audit(page, 'cockpit');
    insertValidatedTasks(familyId, childId);
    await publishPlanning(page, 'Castor');
    await audit(page, 'planning');
    await page.goBack();

    await button(page, 'Modifier le profil').click();
    await audit(page, 'modifier le profil');
    await page.goBack();
    await button(page, 'Suivi et épreuves').click();
    await expect(page.getByText('Minutes de travail par semaine')).toBeVisible();
    await audit(page, 'suivi');
    await page.goBack();
    await button(page, 'Mon compte et réglages').click();
    await audit(page, 'compte');
    await button(page, 'Mon abonnement').click();
    await audit(page, 'abonnement');
    await page.goBack();
    await page.goBack();

    await enterChildMode(page, 'Castor');
    await audit(page, 'console enfant');
    await button(page, "S'entraîner").first().click();
    await expect(page.getByText('Les fleuves de Belgique', { exact: true })).toBeVisible();
    await audit(page, 'fiche');
    await page.getByRole('radio', { name: 'Quiz' }).click();
    await audit(page, 'quiz');
    await context.close();
  });
}
