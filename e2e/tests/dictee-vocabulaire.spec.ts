import { expect, test, type Page } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

const PHOTO = new URL('../fixtures/journal.jpg', import.meta.url).pathname;

async function sendPhoto(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choisir dans la galerie').click();
  await (await chooser).setFiles(PHOTO);
  await button(page, 'Envoyer pour analyse').click();
}

test('dictée corrigée : les mots à revoir rejoignent la dictée de la semaine', async ({ page }) => {
  const email = await signUp(page, 'dictee');
  const { childId } = await addChild(page, email, 'Castor');
  sql(
    `insert into spelling_list (child_id, family_id, week_start, words)
     select id, family_id, date_trunc('week', current_date)::date, array['une forêt', 'la promenade']
     from child_profile where id = '${childId}'`,
  );

  // Depuis le planning : le type « Dictée corrigée » est déjà choisi.
  await button(page, 'Planning de la semaine').click();
  await button(page, '📷 Photographier une dictée corrigée').click();
  await expect(page.getByRole('radio', { name: 'Dictée corrigée' })).toHaveAttribute('aria-checked', 'true');
  await sendPhoto(page);

  await expect(page.getByText('Mots à revoir (2)')).toBeVisible();
  await button(page, 'Ajouter à la dictée de la semaine').click();
  await expect(page.getByText(/Ajoutés à la dictée de la semaine/)).toBeVisible();
  // Ajoutés sans doublon, après les mots déjà prévus.
  expect(sql(`select array_to_string(words, '|') from spelling_list where child_id = '${childId}'`)).toBe(
    'une forêt|la promenade|ils marchaient',
  );
});

test('liste de vocabulaire : des cartes de révision, le français au recto', async ({ page }) => {
  const email = await signUp(page, 'vocabulaire');
  const { childId } = await addChild(page, email, 'Loutre', { grade: '1re secondaire' });

  await button(page, 'Photographier le journal de classe').click();
  await page.getByRole('radio', { name: 'Liste de vocabulaire' }).click();
  await sendPhoto(page);

  await expect(page.getByText('Vocabulaire trouvé (4)')).toBeVisible();
  await expect(page.getByText('de hond → le chien')).toBeVisible();
  await expect(page.getByLabel('Matière')).toHaveValue('Néerlandais');
  await expect(page.getByText(/1 mot sans traduction/)).toBeVisible();
  await button(page, 'Créer 3 cartes de révision').click();
  await expect(page.getByText(/Cartes créées/)).toBeVisible();
  await expect(page.getByText('Étudier le vocabulaire (3 mots)')).toBeVisible();

  expect(
    sql(
      `select string_agg(front || '=' || back, '|' order by front) from flashcard where child_id = '${childId}'`,
    ),
  ).toBe('la maison=het huis|le chat=de kat|le chien=de hond');

  // La tâche suit la validation de la liste, comme les autres.
  await button(page, 'Valider la liste').click();
  await expect(page.getByText('Vos enfants')).toBeVisible();
  expect(
    sql(
      `select status from task where child_id = '${childId}' and description like 'Étudier le vocabulaire%'`,
    ),
  ).toBe('validated');
});
