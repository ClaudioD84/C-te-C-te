import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

test('bilan pour un professionnel : parties choisies par le parent, besoins jamais d’office', async ({
  page,
}) => {
  const email = await signUp(page, 'bilan-pro');
  const { childId, familyId } = await addChild(page, email, 'Hibou', {
    grade: '3e primaire',
    needs: ['Dyslexie'],
  });
  sql(`insert into learning_event (family_id, child_id, type, meta)
       values ('${familyId}', '${childId}', 'activite', '{"minutes": 20, "subject": "Français"}'),
              ('${familyId}', '${childId}', 'activite',
               '{"mode": "lecture_voix", "subject": "Français", "minutes": 1, "wpm": 64, "text_id": "herisson",
                 "hard_words": ["hérisson"]}')`);
  sql(`with t as (
         insert into task (family_id, child_id, subject, kind, description, status)
         values ('${familyId}', '${childId}', 'Mathématiques', 'devoir', 'Fractions', 'validated') returning id
       )
       insert into help_request (family_id, child_id, task_id) select '${familyId}', '${childId}', id from t`);

  await button(page, 'Suivi et épreuves').click();
  await button(page, '📄 Bilan pour un professionnel').click();
  await expect(page.getByRole('checkbox', { name: 'Besoins particuliers et adaptations' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await button(page, '🖨️ Imprimer le bilan').click();
  // Le document est imprimé depuis un cadre invisible : son contenu est vérifié sans être affiché.
  const report = page.frameLocator('iframe[title="Document à imprimer"]').last();
  await expect(report.getByText('Bilan du travail à la maison : Hibou')).toBeAttached();
  await expect(report.getByText('Mathématiques : 1 demande')).toBeAttached();
  await expect(report.getByText(/64 mots\/min/)).toBeAttached();
  await expect(report.getByText(/Mots difficiles relevés : hérisson/)).toBeAttached();
  await expect(report.getByText(/Dyslexie/)).toHaveCount(0);

  // Le parent ajoute les besoins et une remarque, retire la lecture.
  await page.getByRole('checkbox', { name: 'Besoins particuliers et adaptations' }).click();
  await expect(page.getByText(/une donnée de santé/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Lecture à voix haute' }).click();
  await page.getByLabel('Vos remarques (facultatif)').fill('Plus fatigué le jeudi.');
  await button(page, '🖨️ Imprimer le bilan').click();
  const second = page.frameLocator('iframe[title="Document à imprimer"]').last();
  await expect(second.getByText('Besoins signalés par le parent : Dyslexie')).toBeAttached();
  await expect(second.getByText('Police adaptée à la lecture, lettres et lignes espacées')).toBeAttached();
  await expect(second.getByText('Plus fatigué le jeudi.')).toBeAttached();
  await expect(second.getByText(/mots\/min/)).toHaveCount(0);
});
