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

test('fin de mission : fête, coffre-surprise éventuel, défi bonus, annonce au parent', async ({ page }) => {
  const email = await signUp(page, 'fin-mission');
  const { childId, familyId } = await addChild(page, email, 'Colibri');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Colibri', childId);
  await page.goBack();

  // Tout est fait sauf une activité ; l'enfant coche la dernière.
  sql(`update study_session_task st set done_at = now() from study_session s
       where s.id = st.session_id and s.child_id = '${childId}' and s.scheduled_on = current_date
         and st.task_id <> (select st2.task_id from study_session_task st2 join study_session s2 on s2.id = st2.session_id
                            where s2.child_id = '${childId}' and s2.scheduled_on = current_date limit 1)`);
  await enterChildMode(page, 'Colibri');
  await page.reload();
  await expect(button(page, "C'est fait !")).toHaveCount(1);
  await button(page, "C'est fait !").click();
  await expect(page.getByText('Mission accomplie !', { exact: true })).toBeVisible();

  // Coffre-surprise : un jour sur trois environ (tirage du jour).
  const chest = button(page, '🎁 Ouvrir le coffre-surprise');
  if (await chest.isVisible().catch(() => false)) {
    await chest.click();
    await expect(page.getByText(/^(💡 Le savais-tu \?|😄 Une blague)$/)).toBeVisible();
  }

  // Défi bonus : questions des fiches récentes, comptées dans l'effort.
  await button(page, '⭐ Défi bonus').click();
  await expect(page.getByText(/^Question 1 sur \d$/)).toBeVisible();
  await page.goBack();

  await button(page, 'Espace parent (code demandé)').click();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText('✅ Mission du jour accomplie')).toBeVisible();
});
