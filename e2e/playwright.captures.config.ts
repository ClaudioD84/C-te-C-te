import { defineConfig } from '@playwright/test';

import base from './playwright.config';

/** Captures d'écran des stores, aux tailles demandées par Apple et Google. */
export default defineConfig({
  ...base,
  testDir: './captures',
  fullyParallel: true,
  workers: 3,
  projects: [
    // App Store : iPhone 6,9 pouces (1290 × 2796).
    {
      name: 'iphone',
      use: { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
    // App Store : iPad 13 pouces (2064 × 2752).
    {
      name: 'ipad',
      use: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    // Google Play : téléphone (1080 × 1920).
    {
      name: 'android',
      use: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
  ],
});
