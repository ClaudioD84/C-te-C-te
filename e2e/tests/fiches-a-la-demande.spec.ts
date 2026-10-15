import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, publishPlanning, signUp, sql } from './helpers';

const MOCKS = 'http://127.0.0.1:5300';

test('fiches à la demande, au niveau des documents de l’enseignant', async ({ page, request }) => {
  const email = await signUp(page, 'a-la-demande');
  const { childId, familyId } = await addChild(page, email, 'Castor', { grade: '3e secondaire' });
  // Tous les jours disponibles : le test ne dépend pas du jour où il tourne.
  sql(`update child_profile set preferences = preferences || '{"availableDays":["lun","mar","mer","jeu","ven","sam","dim"]}'
    where id = '${childId}'`);
  const lesson = `Étudier les verbes forts ${Date.now()}`;
  // Interrogation annoncée, avec les questions de l'enseignant relevées sur la photo.
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, status, examples) values
    ('${familyId}', '${childId}', 'Néerlandais', 'interro', 'Interrogation : verbes forts', current_date + 3,
      'validated', array['Vertaal : Ik heb gisteren gezwommen.', 'Vul in : de of het … huis']),
    ('${familyId}', '${childId}', 'Néerlandais', 'lecon', '${lesson}', current_date + 2, 'validated', '{}')`);
  await page.reload();

  // Rien n'est préparé à la publication ; le parent peut préparer la semaine pour l'imprimer.
  await publishPlanning(page, 'Castor', childId);
  expect(sql(`select count(*) from study_pack where child_id = '${childId}'`)).toBe('0');
  await expect(button(page, 'Préparer les fiches à imprimer (2)')).toBeVisible();

  // La console de l'enfant prépare les fiches des prochains jours.
  await page.goBack();
  await enterChildMode(page, 'Castor');
  await expect
    .poll(() => Number(sql(`select count(*) from study_pack where child_id = '${childId}'`)), {
      timeout: 60_000,
    })
    .toBe(2);

  // La fiche de la leçon reprend le niveau des questions de l'interrogation, en 3e secondaire.
  const requests = (await (await request.get(`${MOCKS}/__packs`)).json()) as string[];
  const forLesson = requests.find((text) => text.includes(lesson));
  expect(forLesson).toContain('Questions posées par l’enseignant');
  expect(forLesson).toContain('Vertaal : Ik heb gisteren gezwommen.');
  expect(forLesson).toContain('2e degré du secondaire');
});
