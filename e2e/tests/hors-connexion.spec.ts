import { expect, test } from '@playwright/test';

import {
  addChild,
  button,
  enterChildMode,
  insertValidatedTasks,
  publishPlanning,
  signUp,
  sql,
  openTraining,
} from './helpers';

test('la mission du jour fonctionne hors connexion et se synchronise sans doublon', async ({
  context,
  page,
}) => {
  const email = await signUp(page, 'hors-ligne');
  const { childId, familyId } = await addChild(page, email, 'Hibou');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Hibou', childId);
  const sessionId = sql(
    `select id from study_session where child_id = '${childId}' and scheduled_on = (now() at time zone 'Europe/Brussels')::date`,
  );
  test.skip(!sessionId, "Pas de séance aujourd'hui (jour sans travail prévu).");
  await page.goBack();

  await enterChildMode(page, 'Hibou');
  // La mission et ses fiches sont gardées sur l'appareil.
  await expect
    .poll(() => Number(sql(`select count(*) from study_pack where child_id = '${childId}'`)))
    .toBeGreaterThan(0);
  await page.waitForTimeout(3000);

  await context.setOffline(true);
  await expect(page.getByText(/Pas de connexion\. Tu peux continuer/)).toBeVisible();
  await openTraining(page, 'Fiche');
  await expect(page.getByText('Les fleuves de Belgique', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Quiz' }).click();
  await button(page, 'La Meuse').click();
  await button(page, 'Question suivante').click();
  await button(page, "L'Escaut").click();
  await button(page, 'Voir le résultat').click();
  await expect(page.getByText('Quiz terminé !')).toBeVisible();
  await button(page, 'Retour à la mission').click();
  // Une activité cochée hors connexion disparaît tout de suite de l'écran.
  const todo = await button(page, "C'est fait !").count();
  await button(page, "C'est fait !").first().click();
  await expect(button(page, "C'est fait !")).toHaveCount(todo - 1);
  // Une à une, en attendant que chaque activité cochée disparaisse avant de cliquer sur la suivante.
  for (let left = await button(page, "C'est fait !").count(); left > 0; left--) {
    await button(page, "C'est fait !").first().click();
    await expect(button(page, "C'est fait !")).toHaveCount(left - 1);
  }
  await expect(page.getByText('Mission accomplie !', { exact: true })).toBeVisible();

  // Rien n'est encore arrivé sur le serveur.
  expect(
    sql(`select count(*) from study_session_task where session_id = '${sessionId}' and done_at is not null`),
  ).toBe('0');

  // Fermeture hors connexion, réouverture avec le réseau : les actions en attente sont rejouées.
  await page.waitForTimeout(1500);
  await page.close();
  await context.setOffline(false);
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByText('Bonjour Hibou')).toBeVisible();
  await expect
    .poll(() => sql(`select status from study_session where id = '${sessionId}'`), { timeout: 20_000 })
    .toBe('done');
  expect(
    sql(`select count(*) - count(distinct client_id) from learning_event where child_id = '${childId}'`),
  ).toBe('0');
  expect(sql(`select count(*) from learning_event where child_id = '${childId}' and type = 'quiz'`)).toBe(
    '1',
  );
});
