import { expect, test } from '@playwright/test';

import {
  addChild,
  button,
  insertValidatedTasks,
  prepareWeekPacks,
  publishPlanning,
  signUp,
  sql,
} from './helpers';

test('faire le tri : tâches retirées du planning, éléments retirés d’une fiche', async ({ page }) => {
  const email = await signUp(page, 'retirer');
  const { childId, familyId } = await addChild(page, email, 'Blaireau');
  // Tous les jours disponibles : le test ne dépend pas du jour où il tourne.
  sql(`update child_profile set preferences = preferences || '{"availableDays":["lun","mar","mer","jeu","ven","sam","dim"]}'
    where id = '${childId}'`);
  insertValidatedTasks(familyId, childId);
  await page.reload();
  await publishPlanning(page, 'Blaireau', childId);
  await prepareWeekPacks(page);
  const task = (description: string) =>
    sql(
      `select coalesce(max(status), 'supprimée') from task where child_id = '${childId}' and description = '${description}'`,
    );
  const upcomingItems = (description: string) =>
    sql(`select count(*) from study_session_task st join study_session s on s.id = st.session_id
         join task t on t.id = st.task_id
         where t.child_id = '${childId}' and t.description = '${description}' and st.done_at is null`);

  // Déjà faite : gardée dans le suivi, retirée des jours à venir.
  await button(page, 'Retirer : Mathématiques · Faire les exercices de division').click();
  await button(page, 'C’est déjà fait : Mathématiques · Faire les exercices de division').click();
  await expect.poll(() => task('Faire les exercices de division')).toBe('done');
  expect(upcomingItems('Faire les exercices de division')).toBe('0');
  await expect(button(page, 'Retirer : Mathématiques · Faire les exercices de division')).toHaveCount(0);

  // Supprimée : la tâche, sa fiche et ses cartes disparaissent.
  await button(page, "Retirer : Éveil · Étudier la Meuse et l'Escaut").click();
  await button(page, "Supprimer la tâche : Éveil · Étudier la Meuse et l'Escaut").click();
  await expect.poll(() => task("Étudier la Meuse et l''Escaut")).toBe('supprimée');
  expect(sql(`select count(*) from study_pack p where p.child_id = '${childId}'`)).toBe('1');
  // Plus aucune séance à venir vide.
  expect(
    sql(`select count(*) from study_session s where s.child_id = '${childId}'
         and not exists (select 1 from study_session_task st where st.session_id = s.id)`),
  ).toBe('0');

  // Fiche : une question et une carte retirées ; la fiche retouchée n'est plus réutilisée ailleurs.
  const pack = () =>
    sql(`select jsonb_array_length(content -> 'quiz') || ' ' || jsonb_array_length(content -> 'flashcards') || ' '
         || (request_key is null) from study_pack where child_id = '${childId}'`);
  const before = pack().split(' ').map(Number);
  await button(page, 'Éveil · Revoir les fleuves de Belgique').click();
  await button(page, 'Retirer la question 1 du quiz').click();
  await expect.poll(pack).toBe(`${before[0]! - 1} ${before[1]} true`);
  await button(page, 'Retirer la carte « Fleuve qui traverse Liège »').click();
  await expect.poll(pack).toBe(`${before[0]! - 1} ${before[1]! - 1} true`);
  expect(
    sql(
      `select count(*) from flashcard where child_id = '${childId}' and front = 'Fleuve qui traverse Liège'`,
    ),
  ).toBe('0');

  // Fiche supprimée : elle sera préparée de nouveau seulement si l'enfant ouvre la leçon.
  await button(page, 'Supprimer la fiche').click();
  await button(page, 'Confirmer : supprimer la fiche').click();
  await expect(page.getByText("La fiche et le quiz n'ont pas encore été préparés.")).toBeVisible();
  expect(sql(`select count(*) from study_pack where child_id = '${childId}'`)).toBe('0');
  expect(sql(`select count(*) from flashcard where child_id = '${childId}'`)).toBe('0');

  // Tâche supprimée depuis sa fiche : retour au planning.
  await button(page, 'Supprimer la tâche').click();
  await button(page, 'Confirmer : supprimer la tâche').click();
  await expect(page.getByText('Semaine de Blaireau')).toBeVisible();
  await expect.poll(() => task('Revoir les fleuves de Belgique')).toBe('supprimée');
});
