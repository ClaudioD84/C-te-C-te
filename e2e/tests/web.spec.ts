import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { addChild, button, signUp, sql } from './helpers';

// Parcours propres à la version web (démonstration sur ordinateur) : photo choisie sur le disque et masquée à la
// souris, export des données en téléchargement.

test('photo depuis l’ordinateur : la zone tracée à la souris est noircie dans l’image envoyée', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  const email = await signUp(page, 'web-photo');
  await addChild(page, email, 'Hérisson');

  await button(page, 'Photographier le journal de classe').click();
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choisir dans la galerie').click();
  await (await chooser).setFiles(new URL('../fixtures/journal.jpg', import.meta.url).pathname);
  await expect(button(page, 'Envoyer pour analyse')).toBeVisible();

  // Masque tracé sur la première ligne (en haut à gauche de la photo).
  const photo = page.getByLabel(/Photo avec \d+ zone/);
  const box = (await photo.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.05);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.13, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel('Photo avec 1 zone masquée')).toBeVisible();

  const upload = page.waitForRequest((r) => r.url().includes('/storage/v1/object/scans/'));
  await button(page, 'Envoyer pour analyse').click();
  const sent = (await upload).postDataBuffer()!;
  await expect(page.getByText(/Vérifiez ce que nous avons lu/)).toBeVisible();
  // Mots de dictée relevés sur la photo : un clic les met dans la dictée de la semaine.
  await expect(page.getByText('Mots de dictée trouvés (3)')).toBeVisible();
  await button(page, 'Utiliser pour la dictée de la semaine').click();
  await expect(page.getByText(/C’est la dictée de la semaine/)).toBeVisible();

  // L'image envoyée est un JPEG dont le coin masqué est noir, dans le navigateur lui-même.
  const darkness = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const at = (x: number, y: number) =>
      context.getImageData(x * image.width, y * image.height, 1, 1).data[0];
    return { masked: at(0.3, 0.09), blank: at(0.5, 0.7) };
  }, sent.toString('base64'));
  expect(darkness.masked).toBeLessThan(40);
  expect(darkness.blank).toBeGreaterThan(200);
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
