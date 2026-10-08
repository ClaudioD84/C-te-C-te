import { expect, test } from '@playwright/test';

import { addChild, button, enterChildMode, signUp, sql } from './helpers';

test('cartes de langues : lues avec la voix de la langue, « Écoute et choisis »', async ({ page }) => {
  // Synthèse vocale observée : texte et langue de chaque lecture.
  await page.addInitScript(() => {
    const spoken: [string, string][] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: (u: SpeechSynthesisUtterance) => spoken.push([u.text, u.lang]),
        cancel: () => undefined,
        pause: () => undefined,
        resume: () => undefined,
        getVoices: () => [],
        speaking: false,
        pending: false,
        paused: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  });
  const email = await signUp(page, 'langues');
  const { childId, familyId } = await addChild(page, email, 'Ours', { grade: '1re secondaire' });
  sql(`with t as (
         insert into task (family_id, child_id, subject, kind, description, status)
         values ('${familyId}', '${childId}', 'Néerlandais', 'lecon', 'Les animaux', 'validated') returning id
       ), p as (
         insert into study_pack (family_id, child_id, task_id, content, model)
         select '${familyId}', '${childId}', id, '{}', 'test' from t returning id
       )
       insert into flashcard (family_id, child_id, pack_id, front, back)
       select '${familyId}', '${childId}', p.id, v.front, v.back from p,
         (values ('le chien', 'de hond'), ('le chat', 'de kat'), ('la maison', 'het huis'),
                 ('le livre', 'het boek'), ('le vélo', 'de fiets')) as v(front, back)`);

  await enterChildMode(page, 'Ours');
  const spoken = () => page.evaluate(() => (window as unknown as { __spoken: [string, string][] }).__spoken);

  // Révision des cartes : la question en français, la réponse en néerlandais de Belgique.
  await button(page, 'Cartes à revoir (5)').click();
  await button(page, 'Écouter la question').click();
  await page.getByRole('button', { name: /^Question : / }).click();
  await button(page, 'Écouter la réponse').click();
  const [question, answer] = await spoken();
  expect(question![1]).toBe('fr-BE');
  expect(answer![1]).toBe('nl-BE');
  expect(['de hond', 'de kat', 'het huis', 'het boek', 'de fiets']).toContain(answer![0]);
  await button(page, "Arrêter pour aujourd'hui").click();

  // Écoute et choisis : 5 mots, 4 sens proposés à chaque fois.
  await button(page, '🎧 Écoute et choisis').click();
  for (let i = 1; i <= 5; i++) {
    await expect(page.getByText(`🎧 Écoute et choisis · ${i} sur 5`)).toBeVisible();
    await button(page, '🔊 Écouter').click();
    await page
      .getByRole('button', { name: /^(le|la) / })
      .first()
      .click();
    await expect(page.getByText(/^(Bravo, c’est ça !|Pas tout à fait)/)).toBeVisible();
    await button(page, i < 5 ? 'Mot suivant' : 'Terminer').click();
  }
  await expect(page.getByText(/Bravo, tu as bien écouté ! \d sur 5\./)).toBeVisible();
  expect((await spoken()).slice(2).every(([, lang]) => lang === 'nl-BE')).toBe(true);
  await expect
    .poll(() =>
      sql(
        `select meta->>'total' from learning_event where child_id = '${childId}' and meta->>'mode' = 'ecoute'`,
      ),
    )
    .toBe('5');
});
