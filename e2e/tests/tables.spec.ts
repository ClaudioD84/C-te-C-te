import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('les tables : 10 questions, une erreur revient à la fin, effort enregistré', async ({ page }) => {
  const email = await signUp(page, 'tables');
  const { childId } = await addChild(page, email, 'Castor', { needs: ['Dyscalculie'] });
  await enterChildMode(page, 'Castor');
  await button(page, '✖️ Les tables').click();
  await button(page, "C'est parti !").click();

  for (let i = 0; i < 11; i++) {
    await expect(
      page.getByText(`Question ${i + 1} sur 11`).or(page.getByText(`Question ${i + 1} sur 10`)),
    ).toBeVisible();
    const label = (await page.getByRole('heading', { name: /^2 fois \d+$/ }).getAttribute('aria-label'))!;
    const b = Number(label.replace('2 fois ', ''));
    if (i === 0) {
      // Support visuel (dyscalculie) : 2 rangées de b points.
      await expect(page.getByLabel(`2 rangées de ${b} points`)).toBeVisible();
    }
    await page.getByLabel('Ta réponse').fill(String(i === 0 ? 2 * b + 1 : 2 * b));
    await button(page, 'Vérifier').click();
    if (i === 0)
      await expect(
        page.getByText(/^Pas tout à fait : 2 × \d+ = \d+\. Elle reviendra à la fin\.$/),
      ).toBeVisible();
    else await expect(page.getByText('Bravo !')).toBeVisible();
    await button(page, i < 10 ? 'Suivante' : 'Terminer').click();
  }
  await expect(
    page.getByText('9 réponses justes du premier coup sur 10. Bravo pour ton effort !'),
  ).toBeVisible();
  await expect
    .poll(() =>
      sql(`select meta->>'mode' || ':' || (meta->>'score') || '/' || (meta->>'total') || ':' || (meta->>'subject')
           from learning_event where child_id = '${childId}' and type = 'quiz'`),
    )
    .toBe('tables:9/10:Mathématiques');
});
