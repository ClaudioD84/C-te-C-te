import { expect, test, type Page } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

const PHOTO = new URL('../fixtures/journal.jpg', import.meta.url).pathname;
const MOCKS = 'http://127.0.0.1:5300';

async function choosePhotos(page: Page, label: string, count: number) {
  const chooser = page.waitForEvent('filechooser');
  await button(page, label).click();
  await (await chooser).setFiles(Array.from({ length: count }, () => PHOTO));
}

test('plusieurs documents en un envoi : les pages d’un document sont lues ensemble, chaque document est relu à part', async ({
  page,
  request,
}) => {
  const email = await signUp(page, 'documents');
  const { familyId } = await addChild(page, email, 'Loutre');

  // Deux photos choisies ensemble dans la galerie : deux documents différents.
  await button(page, 'Photographier le journal de classe').click();
  await choosePhotos(page, 'Choisir dans la galerie', 2);
  await expect(page.getByText('Vous avez choisi 2 photos. Ce sont :')).toBeVisible();
  await button(page, '2 documents différents').click();
  await expect(page.getByText('Document 1 · Journal de classe · 1 page')).toBeVisible();

  // Le second devient une interrogation de deux pages ; une troisième, ajoutée par erreur, est retirée.
  await page.getByRole('radio', { name: 'Interrogation' }).click();
  await choosePhotos(page, 'Ajouter des pages depuis la galerie', 2);
  await button(page, 'Les 2 pages d’un même document').click();
  await expect(page.getByLabel('Document 2, page 3')).toBeVisible();
  await button(page, 'Retirer la page 3 du document 2').click();
  await expect(page.getByLabel('Document 2, page 3')).toHaveCount(0);
  await expect(page.getByLabel('Document 2, page 2')).toBeVisible();

  await button(page, 'Envoyer les 2 documents pour analyse').click();
  await expect(page.getByText('Document 2 · Interrogation', { exact: false })).toBeVisible();
  await expect(button(page, 'Relire le document 1')).toBeVisible({ timeout: 30_000 });
  await expect(button(page, 'Relire le document 2')).toBeVisible({ timeout: 30_000 });

  // Une seule lecture pour les deux pages de l'interrogation, puis toutes les photos sont effacées.
  const reads = (await (await request.get(`${MOCKS}/__scans`)).json()) as {
    pages: number;
    context: string;
  }[];
  expect(
    reads.some(
      (read) =>
        read.pages === 2 &&
        read.context.includes("il s'agit de : interrogation") &&
        read.context.includes('Le document compte 2 pages'),
    ),
  ).toBe(true);
  expect(
    sql(`select count(*) from storage.objects where bucket_id = 'scans' and name like '${familyId}/%'`),
  ).toBe('0');
  expect(
    sql(
      `select count(*) from scan where family_id = '${familyId}' and status = 'draft' and storage_path is null and extra_storage_paths = '{}'`,
    ),
  ).toBe('2');

  // Le cockpit signale les documents à relire.
  await page.goto('/');
  await button(page, 'Documents à relire pour Loutre').click();
  await expect(
    page.getByText('Relisez chaque document puis validez-le : rien n’est planifié avant.'),
  ).toBeVisible();

  // Chaque document est relu et validé, puis on revient à la liste.
  await button(page, 'Relire le document 2').click();
  await expect(page.getByText("Retravailler : l'accord du participe passé")).toBeVisible();
  await button(page, 'Valider la liste').click();
  await expect(button(page, 'Relire le document 2')).toHaveCount(0);
  await button(page, 'Relire le document 1').click();
  await expect(page.getByText(/Vérifiez ce que nous avons lu/)).toBeVisible();
  await button(page, 'Valider la liste').click();
  await expect(page.getByText(/Tous les documents ont été relus/)).toBeVisible();
  expect(sql(`select count(*) from scan where family_id = '${familyId}' and status = 'validated'`)).toBe('2');

  await button(page, 'Retour au cockpit').click();
  await expect(button(page, 'Documents à relire pour Loutre')).toHaveCount(0);
});
