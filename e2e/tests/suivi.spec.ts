import { expect, test } from '@playwright/test';

import { addChild, button, insertValidatedTasks, signUp, sql } from './helpers';

test('cockpit avancé : comparaison avec la semaine dernière, matières et historique', async ({ page }) => {
  const email = await signUp(page, 'suivi');
  const { childId, familyId } = await addChild(page, email, 'Loutre');
  insertValidatedTasks(familyId, childId);
  const maths = sql(`select id from task where child_id = '${childId}' and subject = 'Mathématiques'`);
  const eveil = sql(
    `select id from task where child_id = '${childId}' and description = 'Revoir les fleuves de Belgique'`,
  );

  // Aujourd'hui : 30 min de mathématiques et un quiz d'Éveil à 7/10. Même jour la semaine dernière : 10 min.
  sql(`insert into learning_event (family_id, child_id, type, meta) values
    ('${familyId}', '${childId}', 'activite', '{"task_id": "${maths}", "minutes": 30}'),
    ('${familyId}', '${childId}', 'quiz', '{"task_id": "${eveil}", "score": 7, "total": 10}'),
    ('${familyId}', '${childId}', 'activite', '{"task_id": "${maths}", "minutes": 10, "ancien": true}')`);
  sql(`update learning_event set created_at = now() - interval '7 days'
       where child_id = '${childId}' and meta ? 'ancien'`);

  await button(page, 'Suivi et épreuves').click();
  // Bilan positif de la semaine, à lire à l'enfant ou à partager.
  await expect(page.getByText('Bilan de la semaine')).toBeVisible();
  await expect(page.getByText('• 1 jour de travail')).toBeVisible();
  await expect(page.getByText('• 30 minutes au total')).toBeVisible();
  await expect(page.getByText(/^• Matières travaillées : .*Mathématiques/)).toBeVisible();
  await expect(page.getByText(/Bravo Loutre ! Chaque moment de travail compte/)).toBeVisible();
  await expect(button(page, 'Lire à Loutre')).toBeVisible();
  await expect(button(page, 'Partager le bilan')).toBeVisible();

  await expect(page.getByText('Par rapport à la semaine dernière')).toBeVisible();
  await expect(
    page.getByLabel('Minutes de travail : 30, +20 par rapport à la semaine dernière'),
  ).toBeVisible();
  await expect(page.getByLabel('Quiz faits : 1, +1 par rapport à la semaine dernière')).toBeVisible();

  await expect(page.getByText('Par matière (4 dernières semaines)')).toBeVisible();
  await expect(page.getByText('40 min · 2 activités · 0 carte')).toBeVisible();
  await expect(page.getByText('Quiz : 7 bonnes réponses sur 10 (70 %)')).toBeVisible();

  await expect(page.getByText('Historique des semaines')).toBeVisible();
  await expect(page.getByText('30 min · 1 jour actif · 1 activité · 0 carte · 1 quiz')).toBeVisible();
});
