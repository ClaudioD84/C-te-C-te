import { describe, expect, it } from 'vitest';

import { bagDay, bagItemsFor } from './school-bag';

describe('cartable du soir', () => {
  it('prépare demain le soir, aujourd’hui le matin, rien pour le week-end', () => {
    // Mardi 6 octobre 2026.
    expect(bagDay(new Date(2026, 9, 6, 19, 0))).toEqual({ date: '2026-10-07', when: 'demain' });
    expect(bagDay(new Date(2026, 9, 6, 7, 30))).toEqual({ date: '2026-10-06', when: 'aujourdhui' });
    // Vendredi soir : pas de cartable pour samedi ; dimanche soir : lundi.
    expect(bagDay(new Date(2026, 9, 9, 18, 0))).toBeNull();
    expect(bagDay(new Date(2026, 9, 11, 18, 0))).toEqual({ date: '2026-10-12', when: 'demain' });
  });

  it('ne garde que les affaires du jour', () => {
    const items = [
      { id: '1', label: 'Plumier', days: ['lun', 'mar', 'mer', 'jeu', 'ven'] as const },
      { id: '2', label: 'Sac de gym', days: ['mar'] as const },
    ];
    expect(bagItemsFor(items, '2026-10-06').map((i) => i.label)).toEqual(['Plumier', 'Sac de gym']);
    expect(bagItemsFor(items, '2026-10-07').map((i) => i.label)).toEqual(['Plumier']);
  });
});
