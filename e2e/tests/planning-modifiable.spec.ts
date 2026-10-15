import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

const lesson = (n: string) => `Éveil · Leçon ${n} (Leçon à étudier)`;

test('planning : répartition régulière, retouches du parent, priorités et dates', async ({ page }) => {
  const email = await signUp(page, 'planning-parent');
  const { childId, familyId } = await addChild(page, email, 'Castor');
  // Tous les jours disponibles : le test ne dépend pas du jour où il tourne.
  sql(`update child_profile set preferences = preferences || '{"availableDays":["lun","mar","mer","jeu","ven","sam","dim"]}'
    where id = '${childId}'`);
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, status) values
    ('${familyId}', '${childId}', 'Éveil', 'lecon', 'Leçon un', current_date + 5, 'validated'),
    ('${familyId}', '${childId}', 'Éveil', 'lecon', 'Leçon deux', current_date + 6, 'validated'),
    ('${familyId}', '${childId}', 'Éveil', 'lecon', 'Leçon trois', current_date + 7, 'validated'),
    ('${familyId}', '${childId}', 'Éveil', 'lecon', 'Leçon sans date', null, 'validated')`);
  const day = (offset: number) =>
    sql(
      `select coalesce(string_agg(t.description || ':' || st.minutes, ',' order by t.description), '')
       from study_session s join study_session_task st on st.session_id = s.id join task t on t.id = st.task_id
       where s.child_id = '${childId}' and s.scheduled_on = current_date + ${offset}`,
    );
  await page.reload();
  await button(page, 'Planning de la semaine').click();

  // Par défaut, le travail commence dès aujourd'hui, sur les jours libres, au lieu de s'entasser avant l'échéance.
  await button(page, 'Calculer le planning').click();
  await expect(page.getByRole('radio', { name: 'Régulièrement, dès aujourd’hui' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(button(page, `Modifier : ${lesson('un')}, aujourd'hui`)).toBeVisible();
  await expect(button(page, `Modifier : ${lesson('deux')}, demain`)).toBeVisible();

  // Près de l'échéance : rien aujourd'hui ; le choix est gardé pour la prochaine fois.
  await page.getByRole('radio', { name: 'Juste avant l’échéance' }).click();
  await expect(button(page, `Modifier : ${lesson('un')}, aujourd'hui`)).toHaveCount(0);
  await expect
    .poll(() => sql(`select preferences ->> 'planningStrategy' from child_profile where id = '${childId}'`))
    .toBe('echeance');
  await page.getByRole('radio', { name: 'Régulièrement, dès aujourd’hui' }).click();

  // Retouches : déplacer, allonger, retirer, ajouter.
  await button(page, `Modifier : ${lesson('un')}, aujourd'hui`).click();
  await button(page, 'Déplacer vers demain').click();
  await button(page, `Modifier : ${lesson('deux')}, demain`).click();
  await button(page, 'Allonger de 5 minutes').click();
  await button(page, `Fermer : ${lesson('deux')}, demain`).click();
  await button(page, new RegExp(`^Modifier : ${lesson('trois').replace(/[()]/g, '\\$&')}`)).click();
  await button(page, 'Retirer de ce jour').click();
  await button(page, "Ajouter une tâche, aujourd'hui").click();
  await button(page, `Ajouter ${lesson('trois')}, aujourd'hui`).click();
  await button(page, "Publier sur la console de l'enfant").click();
  await expect(page.getByText('Semaine de Castor')).toBeVisible();
  expect(day(0)).toBe('Leçon trois:15');
  expect(day(1)).toBe('Leçon deux:20,Leçon un:15');

  // Le planning publié se retouche sans tout recalculer.
  await button(page, 'Modifier le planning').click();
  await expect(page.getByText('Modifier le planning')).toBeVisible();
  await button(page, `Modifier : ${lesson('trois')}, aujourd'hui`).click();
  await button(page, 'Retirer de ce jour').click();
  await button(page, "Publier sur la console de l'enfant").click();
  await expect(page.getByText('Semaine de Castor')).toBeVisible();
  await expect.poll(() => day(0)).toBe('');
  expect(day(1)).toBe('Leçon deux:20,Leçon un:15');

  // Priorités et échéances : une tâche sans date en reçoit une ; une priorité passe en premier.
  await expect(page.getByText('Sans date : pas encore dans le planning')).toBeVisible();
  await button(page, 'Choisir une date : Éveil · Leçon sans date').click();
  await page
    .getByRole('radiogroup', { name: 'Pour quand ? Éveil · Leçon sans date' })
    .getByRole('radio', { name: "Aujourd'hui" })
    .click();
  await expect
    .poll(() =>
      sql(
        `select due_date = current_date from task where description = 'Leçon sans date' and child_id = '${childId}'`,
      ),
    )
    .toBe('t');
  await page
    .getByRole('radiogroup', { name: 'Priorité : Éveil · Leçon trois' })
    .getByRole('radio', { name: 'Prioritaire' })
    .click();
  await expect
    .poll(() =>
      sql(`select priority from task where description = 'Leçon trois' and child_id = '${childId}'`),
    )
    .toBe('haute');
  await button(page, 'Recalculer le planning').click();
  await expect(button(page, `Modifier : ${lesson('trois')}, aujourd'hui`)).toBeVisible();
  await expect(button(page, `Modifier : ${lesson('sans date')}, aujourd'hui`)).toBeVisible();
});
