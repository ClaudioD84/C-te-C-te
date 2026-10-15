import { expect, test } from '@playwright/test';

import { addChild, button, openTools, signUp } from './helpers';

test('changement de jour : à minuit, l’application passe au jour suivant sans être rouverte', async ({
  page,
}) => {
  // Horloge simulée : l'application démarre à l'heure réelle, puis on avance jusqu'au lendemain.
  await page.clock.install();
  const email = await signUp(page, 'minuit');
  await addChild(page, email, 'Hibou');
  await openTools(page, 'Hibou');
  await button(page, 'Ajouter un devoir à la main pour Hibou').click();

  // Jours proposés : « Sans date », « Aujourd'hui », demain, après-demain…
  const days = page.getByRole('radiogroup', { name: 'Pour quand ?' }).getByRole('radio');
  await expect(days.nth(1)).toHaveText("Aujourd'hui");
  const tomorrow = await days.nth(2).innerText();
  const dayAfter = await days.nth(3).innerText();

  const msToMidnight = await page.evaluate(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
  });
  await page.clock.fastForward(msToMidnight);

  // Le lendemain est devenu « Aujourd'hui » : la liste commence un jour plus tard.
  await expect(days.nth(1)).toHaveText("Aujourd'hui");
  await expect(days.nth(2)).toHaveText(dayAfter);
  await expect(page.getByRole('radio', { name: tomorrow, exact: true })).toHaveCount(0);
});
