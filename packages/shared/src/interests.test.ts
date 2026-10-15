/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { INTEREST_LABELS, INTEREST_PROMPT_LABELS, INTERESTS } from './profile';

import pack from '../../../supabase/functions/_shared/pack.ts?raw';

describe("centres d'intérêt", () => {
  it('chaque centre a un libellé affiché et un libellé pour l’IA', () => {
    for (const interest of INTERESTS) {
      expect(INTEREST_LABELS[interest]).toBeTruthy();
      expect(INTEREST_PROMPT_LABELS[interest]).toBeTruthy();
    }
  });

  it('la fonction serveur connaît la même liste', () => {
    for (const interest of INTERESTS) {
      const label = INTEREST_PROMPT_LABELS[interest];
      const quoted = label.includes("'") ? `"${label}"` : `'${label}'`;
      expect(pack).toContain(`${interest}: ${quoted}`);
    }
  });
});
