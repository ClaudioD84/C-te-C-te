import { expect, test } from '@playwright/test';

import {
  button,
  childOf,
  enterChildMode,
  familyOf,
  insertValidatedTasks,
  publishPlanning,
  signUp,
  sql,
  openTraining,
  childTitle,
} from './helpers';

test('parcours complet : profil, planning, fiches, console enfant, suivi, dossier de révision', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const email = await signUp(page, 'parcours');

  await test.step('profil avec besoin particulier : consentement obligatoire', async () => {
    await button(page, 'Ajouter un enfant').click();
    await page.getByLabel("Pseudonyme de l'enfant").fill('Petit Lion');
    await page.getByRole('radio', { name: '5e primaire' }).click();
    await page.getByRole('checkbox', { name: 'TDAH' }).click();
    await expect(button(page, 'Enregistrer')).toBeDisabled();
    await page.getByRole('checkbox', { name: /J'accepte/ }).click();
    await button(page, 'Enregistrer').click();
    await expect(childTitle(page, 'Petit Lion')).toBeVisible();
  });
  const childId = childOf(email, 'Petit Lion');
  const familyId = familyOf(email);
  expect(sql(`select needs_consent_at is not null from child_profile where id = '${childId}'`)).toBe('t');

  await test.step('planning publié et fiches préparées par l’IA', async () => {
    insertValidatedTasks(familyId, childId);
    await publishPlanning(page, 'Petit Lion', childId);
    expect(Number(sql(`select count(*) from study_session where child_id = '${childId}'`))).toBeGreaterThan(
      0,
    );
    await expect
      .poll(() => Number(sql(`select count(*) from study_pack where child_id = '${childId}'`)))
      .toBeGreaterThan(0);
  });

  await test.step('fiche côté parent et signalement d’une erreur', async () => {
    await button(page, 'Éveil · Revoir les fleuves de Belgique').click();
    await expect(page.getByText('Les fleuves de Belgique', { exact: true })).toBeVisible();
    await button(page, 'Signaler une erreur').click();
    await page.getByLabel('Quelle erreur avez-vous vue ?').fill('La question 2 est ambiguë');
    await button(page, 'Envoyer le signalement').click();
    await expect(page.getByText('Erreur signalée')).toBeVisible();
    expect(
      sql(`select report_reason from study_pack where child_id = '${childId}' and reported_at is not null`),
    ).toBe('La question 2 est ambiguë');
    await page.goBack();
    await page.goBack();
  });

  await test.step('console enfant : activité, fiche, quiz, cartes', async () => {
    await enterChildMode(page, 'Petit Lion');
    await page.reload();
    await expect(page.getByText('Bonjour Petit Lion')).toBeVisible();

    await openTraining(page);
    await expect(page.getByText('Les fleuves de Belgique', { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Quiz' }).click();
    await button(page, 'La Meuse').click();
    await expect(page.getByText('Bonne réponse !')).toBeVisible();
    await button(page, 'Question suivante').click();
    await button(page, "L'Escaut").click();
    await button(page, 'Voir le résultat').click();
    await expect(page.getByText('Quiz terminé !')).toBeVisible();
    await button(page, 'Retour à la mission').click();
    // L'ordre des activités du jour varie : on coche après l'entraînement.
    await button(page, "C'est fait !").first().click();
    await expect
      .poll(() =>
        sql(
          `select count(*) from study_session_task st join study_session s on s.id = st.session_id where s.child_id = '${childId}' and st.done_at is not null`,
        ),
      )
      .not.toBe('0');

    await button(page, /Cartes à revoir/).click();
    await page.getByRole('button', { name: /^Question :/ }).click();
    await button(page, 'Facile !').click();
    await expect
      .poll(() =>
        sql(`select count(*) from flashcard where child_id = '${childId}' and last_reviewed_at is not null`),
      )
      .toBe('1');
    await button(page, "Arrêter pour aujourd'hui").click();
  });

  await test.step('retour à l’espace parent avec le code', async () => {
    await button(page, 'Espace parent (code demandé)').click();
    for (const digit of '1111') await button(page, digit).click();
    await expect(page.getByText('Code incorrect.')).toBeVisible();
    for (const digit of '2809') await button(page, digit).click();
    await expect(page.getByText('Vos enfants')).toBeVisible();
    const events = sql(
      `select string_agg(distinct type, ',' order by type) from learning_event where child_id = '${childId}'`,
    );
    // « session » s'y ajoute quand toute la mission du jour a été faite (selon l'ordre des activités).
    expect(events.split(',')).toEqual(expect.arrayContaining(['activite', 'carte', 'quiz']));
  });

  await test.step('suivi et dossier de révision', async () => {
    await button(page, 'Suivi et épreuves').click();
    await expect(page.getByText('Minutes de travail par semaine')).toBeVisible();
    await button(page, 'Nouveau dossier de révision').click();
    await page.getByRole('radio', { name: 'Bilan ou examens de fin de période' }).click();
    await page.getByRole('radiogroup', { name: 'Mois' }).getByRole('radio').nth(1).click();
    await page
      .getByRole('radiogroup', { name: 'Jour' })
      .getByRole('radio', { name: '15', exact: true })
      .click();
    for (const subject of ['Mathématiques', 'Éveil']) {
      await page.getByLabel('Ajouter une matière').fill(subject);
      await button(page, 'Ajouter').click();
    }
    await button(page, 'Proposer les thèmes à revoir').click();
    await expect(page.getByText('Les fractions').first()).toBeVisible();
    await button(page, 'Créer le dossier de révision').click();
    await expect(page.getByText(/Bilan ou examens de fin de période ·/)).toBeVisible();
    expect(
      Number(sql(`select count(*) from task where child_id = '${childId}' and exam_id is not null`)),
    ).toBeGreaterThan(0);
    // Un examen blanc par matière (F5), chacun un jour différent.
    const mocks = sql(
      `select string_agg(subject || '|' || due_date, ',' order by subject) from task where child_id = '${childId}' and description like 'Examen blanc de %'`,
    ).split(',');
    expect(mocks).toHaveLength(2);
    expect(new Set(mocks.map((m) => m.split('|')[1])).size).toBe(2);
  });

  expect(errors).toEqual([]);
});
