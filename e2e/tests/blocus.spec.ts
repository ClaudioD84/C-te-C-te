import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

test('plan de blocus : horaire des examens, révisions réparties, avancement dans le suivi', async ({
  page,
}) => {
  const email = await signUp(page, 'blocus');
  const { childId } = await addChild(page, email, 'Faucon', { grade: '3e secondaire' });

  await button(page, 'Suivi et épreuves').click();
  await button(page, '📅 Plan de blocus (examens)').click();
  await expect(button(page, 'Créer le plan de blocus')).toBeDisabled();

  const addExam = async (subject: string, day: string, chapters: string) => {
    await page.getByRole('radio', { name: subject, exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Mois' }).getByRole('radio').nth(1).click();
    await page
      .getByRole('radiogroup', { name: 'Jour' })
      .getByRole('radio', { name: day, exact: true })
      .click();
    await page.getByLabel('Chapitres à revoir (un par ligne, facultatif)').fill(chapters);
    await button(page, 'Ajouter cet examen').click();
  };
  await addExam('Mathématiques', '10', 'Fractions\nÉquations\nGéométrie');
  await addExam('Histoire', '14', '');
  await expect(page.getByText(/· Mathématiques \(3 chapitres\)/)).toBeVisible();
  await expect(page.getByText(/· Histoire \(3 chapitres\)/)).toBeVisible();
  await expect(page.getByText('Aperçu jour par jour')).toBeVisible();
  await expect(page.getByText('• Mathématiques : Revoir : Fractions')).toBeVisible();
  await expect(page.getByText('• Histoire : Revoir : Histoire, partie 1')).toBeVisible();
  await expect(page.getByText('• Mathématiques : examen blanc (veille d’examen)')).toBeVisible();

  await button(page, 'Créer le plan de blocus').click();
  await expect(page.getByText('Révisions faites : 0 sur 4').first()).toBeVisible();
  expect(sql(`select count(*) from exam where child_id = '${childId}'`)).toBe('2');
  expect(
    sql(`select count(*) from task t join exam e on e.id = t.exam_id
         where t.child_id = '${childId}' and t.due_date < e.exam_date and t.status = 'validated'`),
  ).toBe('8');
  // La veille de chaque examen : un examen blanc (une séance posée ce jour-là par le planning).
  expect(
    sql(`select count(*) from task t join exam e on e.id = t.exam_id
         where t.child_id = '${childId}' and t.kind = 'examen' and t.due_date = e.exam_date - 1
           and t.description like 'Examen blanc de %'`),
  ).toBe('2');
});
