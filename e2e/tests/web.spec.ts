import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

// Parcours propres à la version web (démonstration sur ordinateur) : photo choisie sur le disque, export des
// données en téléchargement.

test('photo depuis l’ordinateur : aperçu, envoi en JPEG, puis relecture', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  const email = await signUp(page, 'web-photo');
  await addChild(page, email, 'Hérisson');

  await button(page, 'Photographier le journal de classe').click();
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choisir dans la galerie').click();
  await (await chooser).setFiles(new URL('../fixtures/journal.jpg', import.meta.url).pathname);
  await expect(page.getByLabel('Photo à envoyer')).toBeVisible();
  // Plus de masquage : ni zones à tracer, ni liste de noms.
  await expect(button(page, 'Effacer les zones')).toHaveCount(0);

  const upload = page.waitForRequest((r) => r.url().includes('/storage/v1/object/scans/'));
  await button(page, 'Envoyer pour analyse').click();
  const sent = (await upload).postDataBuffer()!;
  await expect(page.getByText(/Vérifiez ce que nous avons lu/)).toBeVisible();
  // Mots de dictée relevés sur la photo : un clic les met dans la dictée de la semaine.
  await expect(page.getByText('Mots de dictée trouvés (3)')).toBeVisible();
  await button(page, 'Utiliser pour la dictée de la semaine').click();
  await expect(page.getByText(/C’est la dictée de la semaine/)).toBeVisible();

  // L'image envoyée est un JPEG lisible (la photo d'exemple est assez petite pour garder sa taille).
  const size = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    return { width: image.width, height: image.height };
  }, sent.toString('base64'));
  expect(sent.subarray(0, 2).toString('hex')).toBe('ffd8');
  expect(size).toEqual({ width: 600, height: 800 });
  expect(
    Number(
      sql(
        `select count(*) from scan s join parent p using (family_id) join auth.users u on u.id = p.user_id where u.email = '${email}'`,
      ),
    ),
  ).toBe(1);
});

test('export des données : un fichier JSON est téléchargé', async ({ page }) => {
  const email = await signUp(page, 'web-export');
  await button(page, 'Mon compte et réglages').click();
  const download = page.waitForEvent('download');
  await button(page, 'Exporter mes données').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^cote-a-cote-export-\d{4}-\d{2}-\d{2}\.json$/);
  const content = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(content.account.email).toBe(email);
  expect(content).toHaveProperty('child_profile');
});

test('analyse échouée : « Abandonner » supprime la numérisation', async ({ page }) => {
  const email = await signUp(page, 'abandon');
  const { childId, familyId } = await addChild(page, email, 'Merle');
  const scanId = sql(`insert into scan (family_id, child_id, document_type, status, error)
    values ('${familyId}', '${childId}', 'journal_de_classe', 'failed', 'Photo illisible.') returning id`).split(
    '\n',
  )[0];
  await page.goto(`/scan/${scanId}`);
  await expect(page.getByText('Photo illisible.')).toBeVisible();
  await button(page, 'Abandonner').click();
  await expect.poll(() => sql(`select count(*) from scan where id = '${scanId}'`)).toBe('0');
});
