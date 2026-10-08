import { expect, test } from '@playwright/test';

import { addChild, button, insertValidatedTasks, publishPlanning, signUp, sql } from './helpers';

test('ce soir à table : questions sur ce qui a été travaillé aujourd’hui', async ({ page }) => {
  const email = await signUp(page, 'a-table');
  const { childId, familyId } = await addChild(page, email, 'Hérisson');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Hérisson', childId);
  await page.goBack();
  await expect(page.getByText('🍽️ Ce soir à table')).toHaveCount(0);

  // L'enfant a étudié aujourd'hui une leçon qui a une fiche et un quiz.
  sql(`update study_session_task st set done_at = now()
       from study_session s, study_pack p
       where s.id = st.session_id and p.task_id = st.task_id and s.child_id = '${childId}'
         and st.activity <> 'faire'`);
  await page.reload();
  await expect(page.getByText('🍽️ Ce soir à table')).toBeVisible();
  await button(page, 'Voir les questions').click();
  await expect(page.getByText(/Quel fleuve traverse Liège \?|Quel fleuve/).first()).toBeVisible();
  await button(page, 'Voir les réponses').click();
  await expect(page.getByText(/^Réponse : /).first()).toBeVisible();
});
