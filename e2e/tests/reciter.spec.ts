import { expect, test } from '@playwright/test';

import {
  addChild,
  button,
  enterChildMode,
  insertValidatedTasks,
  openTraining,
  publishPlanning,
  signUp,
} from './helpers';

// Micro factice de Chromium : aucune vraie voix n'est enregistrée.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

test('je récite : s’enregistrer puis se réécouter, sans rien envoyer', async ({ page }) => {
  const email = await signUp(page, 'reciter');
  const { childId, familyId } = await addChild(page, email, 'Pinson');
  insertValidatedTasks(familyId, childId);
  await publishPlanning(page, 'Pinson', childId);
  await page.goBack();
  await enterChildMode(page, 'Pinson');
  await openTraining(page);

  const uploads: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /storage|audio|record/i.test(r.url())) uploads.push(r.url());
  });
  await page.getByRole('radio', { name: 'Je récite' }).click();
  await button(page, '🎤 M’enregistrer').click();
  await expect(page.getByText(/^🔴 J’écoute…/)).toBeVisible();
  await page.waitForTimeout(1500);
  await button(page, '⏹️ J’ai fini').click();
  await expect(button(page, '▶️ Me réécouter')).toBeVisible();
  await expect(button(page, '🎤 Recommencer')).toBeVisible();
  await button(page, '▶️ Me réécouter').click();
  expect(uploads).toEqual([]);
});
