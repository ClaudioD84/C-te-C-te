import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('maternelle : activités de la semaine, thème de la classe, console enfant, programme', async ({
  page,
}) => {
  const email = await signUp(page, 'maternelle');
  const { childId } = await addChild(page, email, 'Poussin', { grade: '2e maternelle' });

  // Pas de journal de classe ni de planning des devoirs en maternelle.
  await expect(button(page, 'Photographier le journal de classe')).toHaveCount(0);
  await expect(button(page, 'Planning de la semaine')).toHaveCount(0);
  await button(page, 'Activités de la semaine').click();
  await expect(page.getByText(/sans devoirs ni évaluation/)).toBeVisible();
  const done = page.getByRole('button', { name: "On l'a fait !", exact: true });
  await expect(done).toHaveCount(4);

  // Le thème de la classe est enregistré et les activités sont recalculées.
  await page.getByLabel('Thème de la classe cette semaine (facultatif)').fill("L'automne");
  await button(page, 'Adapter les activités au thème').click();
  await expect
    .poll(() => sql(`select theme from kindergarten_week where child_id = '${childId}'`))
    .toBe("L'automne");

  // Échanger une activité fige la sélection de la semaine.
  const first = await page
    .getByRole('button', { name: /^Proposer une autre activité à la place de / })
    .first();
  const replaced = (await first.getAttribute('aria-label'))!.replace(
    'Proposer une autre activité à la place de ',
    '',
  );
  await first.click();
  await expect(
    page.getByRole('button', { name: `Proposer une autre activité à la place de ${replaced}` }),
  ).toHaveCount(0);
  expect(
    Number(sql(`select cardinality(activity_codes) from kindergarten_week where child_id = '${childId}'`)),
  ).toBe(4);

  // Une activité faite est enregistrée, sans score.
  await done.first().click();
  await expect(done).toHaveCount(3);
  await expect
    .poll(() =>
      Number(sql(`select count(*) from learning_event where child_id = '${childId}' and type = 'activite'`)),
    )
    .toBe(1);
  const event = JSON.parse(
    sql(`select meta from learning_event where child_id = '${childId}' and type = 'activite'`),
  ) as { kindergarten: string; subject: string; curriculum_code: string; score?: number };
  expect(event.kindergarten).toMatch(/^[a-z-]+$/);
  expect(event.score).toBeUndefined();

  // Le programme de l'année coche l'attendu lié à l'activité.
  const label = sql(`select label from curriculum_item where code = '${event.curriculum_code}' limit 1`);
  await button(page, "Voir le programme de l'année").click();
  await page.getByRole('radio', { name: event.subject, exact: true }).click();
  await expect(page.getByLabel(`${label}, déjà travaillé`)).toBeVisible();

  // Console enfant : une activité à la fois, à faire avec le parent.
  await page.goBack();
  await page.goBack();
  await enterChildMode(page, 'Poussin');
  await expect(page.getByText('À faire ensemble')).toBeVisible();
  await expect(page.getByText('Encore 2 activités cette semaine.')).toBeVisible();
  await button(page, "On l'a fait !").click();
  await expect(page.getByText('Encore 1 activité cette semaine.')).toBeVisible();
  await expect
    .poll(() =>
      Number(sql(`select count(*) from learning_event where child_id = '${childId}' and type = 'activite'`)),
    )
    .toBe(2);
});
