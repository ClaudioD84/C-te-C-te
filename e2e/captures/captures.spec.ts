import { mkdirSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import {
  addChild,
  button,
  enterChildMode,
  insertValidatedTasks,
  publishPlanning,
  signUp,
  sql,
  openTraining,
} from '../tests/helpers';

/**
 * Captures d'écran des fiches App Store et Google Play, avec des données de démonstration.
 * Générées depuis la version web : à remplacer par des captures d'appareil si l'on préfère la barre d'état réelle.
 * Lancement : pnpm --filter e2e captures
 */
test('captures des stores', async ({ page }, testInfo) => {
  const dir = `../docs/publication/captures/${testInfo.project.name}`;
  mkdirSync(dir, { recursive: true });
  const shot = async (name: string) => {
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll('*').forEach((element) => (element.scrollTop = 0)));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${dir}/${name}.png` });
  };

  const email = await signUp(page, `captures-${testInfo.project.name}`);
  const { childId, familyId } = await addChild(page, email, 'Léo', { needs: ['Dyslexie'] });
  insertValidatedTasks(familyId, childId);
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, status) values
    ('${familyId}', '${childId}', 'Néerlandais', 'interro', 'Vocabulaire : les animaux', current_date + 3, 'validated'),
    ('${familyId}', '${childId}', 'Français', 'devoir', 'Lire le chapitre 3 du roman', current_date + 2, 'validated')`);
  // Trois semaines d'efforts pour le suivi : une ou deux activités par jour, des cartes et des quiz.
  sql(`insert into learning_event (family_id, child_id, type, meta)
       select '${familyId}', '${childId}', t, jsonb_build_object('minutes', 15 + (d % 3) * 10, 'jour', d)
       from generate_series(0, 20) d, unnest(array['activite', 'activite', 'carte', 'carte', 'carte', 'quiz']) t
       where extract(isodow from current_date - d) < 7`);
  sql(`update learning_event set created_at = now() - ((meta ->> 'jour') || ' days')::interval
       where child_id = '${childId}'`);

  // Vérification d'une photo analysée (tâches proposées au parent).
  const scanId = sql(`insert into scan (family_id, child_id, document_type, status)
    values ('${familyId}', '${childId}', 'journal_de_classe', 'draft') returning id`);
  sql(`insert into task (family_id, child_id, scan_id, subject, kind, description, due_date, reference, status, confidence) values
    ('${familyId}', '${childId}', '${scanId}', 'Mathématiques', 'devoir', 'Exercices sur les fractions', current_date + 1, 'p. 12, ex. 1 à 5', 'draft', 0.95),
    ('${familyId}', '${childId}', '${scanId}', 'Éveil', 'interro', 'Les fleuves de Belgique', current_date + 4, null, 'draft', 0.9),
    ('${familyId}', '${childId}', '${scanId}', 'Néerlandais', 'lecon', 'Étudier les jours de la semaine', current_date + 2, null, 'draft', 0.6)`);

  await shot('01-cockpit');
  await page.goto(`/scan/${scanId}`);
  await expect(page.getByText('Exercices sur les fractions')).toBeVisible();
  await shot('02-photo-analysee');
  await page.goto('/');

  await publishPlanning(page, 'Léo', childId);
  await shot('03-planning');
  await button(page, 'Éveil · Revoir les fleuves de Belgique').click();
  await expect(page.getByText('Les fleuves de Belgique', { exact: true })).toBeVisible();
  await shot('04-fiche');
  await page.goBack();
  await page.goBack();

  await button(page, 'Suivi et épreuves').click();
  await expect(page.getByText('Minutes de travail par semaine')).toBeVisible();
  await shot('05-suivi');
  await page.goBack();

  await enterChildMode(page, 'Léo');
  await dismissCelebration(page);
  await shot('06-mission-enfant');
  await openTraining(page);
  await page.getByRole('radio', { name: 'Quiz' }).click();
  await button(page, 'La Meuse').click();
  await expect(page.getByText('Bonne réponse !')).toBeVisible();
  await shot('07-quiz');
  await button(page, 'Question suivante').click();
  await button(page, "L'Escaut").click();
  await button(page, 'Voir le résultat').click();
  await button(page, 'Retour à la mission').click();
  await dismissCelebration(page);
  await button(page, /Cartes à revoir/).click();
  await page.getByRole('button', { name: /^Question :/ }).click();
  await shot('08-cartes');
});

/** Ferme l'écran de nouveau badge s'il s'affiche. */
async function dismissCelebration(page: Page) {
  const ok = button(page, 'Super !');
  if (await ok.isVisible({ timeout: 1500 }).catch(() => false)) await ok.click();
}
