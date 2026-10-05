import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, insertValidatedTasks, publishPlanning, signUp } from './helpers';

test('météo de l’enfant : fatigué, la mission se limite à l’essentiel', async ({ page }) => {
  const email = await signUp(page, 'meteo');
  const { childId, familyId } = await addChild(page, email, 'Tortue');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Tortue', childId);
  await page.goBack();

  await enterChildMode(page, 'Tortue', '⛅ Un peu fatigué');
  await expect(page.getByText('⛅ Aujourd’hui, juste l’essentiel. Le reste peut attendre.')).toBeVisible();
  await expect(button(page, "C'est fait !")).toHaveCount(1);

  await button(page, "C'est fait !").click();
  await expect(page.getByText("Bravo, l'essentiel est fait ! Le reste peut attendre.")).toBeVisible();
  await button(page, "J'ai encore de l'énergie : continuer").click();
  await expect(button(page, "C'est fait !").first()).toBeVisible();

  // La réponse vaut pour la journée : pas de nouvelle question au retour.
  await page.reload();
  await expect(page.getByText('Bonjour Tortue')).toBeVisible();
  await expect(page.getByText('Comment tu te sens aujourd’hui ?')).toHaveCount(0);
});
