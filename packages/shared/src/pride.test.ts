/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import migration from '../../../supabase/migrations/20261107000000_pride_book.sql?raw';
import { buildPrideBookHtml, isPrideEmoji, PRIDE_EMOJIS } from './pride';

describe('carnet de fierté', () => {
  it('imprime les moments dans l’ordre, texte échappé', () => {
    const html = buildPrideBookHtml('Loutre', [
      { emoji: '🤝', text: 'J’ai aidé <Tom>', date: '2026-10-12' },
      { emoji: '⭐', text: null, date: '2026-10-05' },
    ]);
    expect(html).toContain('Le carnet de fierté de Loutre');
    expect(html).toContain('J’ai aidé &lt;Tom&gt;');
    expect(html.indexOf('⭐')).toBeLessThan(html.indexOf('🤝'));
  });

  it('n’accepte que les pictogrammes proposés', () => {
    expect(isPrideEmoji('🏆')).toBe(true);
    expect(isPrideEmoji('💩')).toBe(false);
  });
});

describe('carnet de fierté : base de données', () => {
  it('la contrainte SQL accepte les mêmes pictogrammes', () => {
    const list = /emoji in \(([^)]*)\)/
      .exec(migration)![1]!
      .match(/'([^']+)'/g)!
      .map((s) => s.slice(1, -1));
    expect(list).toEqual([...PRIDE_EMOJIS]);
  });
});
