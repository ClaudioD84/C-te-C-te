import { describe, expect, it } from 'vitest';

import { newCardState, reviewCard } from './spaced-repetition';

const today = '2026-10-05';

describe('répétition espacée', () => {
  it('espace de plus en plus une carte facile', () => {
    let state = reviewCard(newCardState(today), 'facile', today);
    expect(state.dueOn).toBe('2026-10-06');
    state = reviewCard(state, 'facile', state.dueOn);
    expect(state.intervalDays).toBe(3);
    state = reviewCard(state, 'facile', state.dueOn);
    expect(state.intervalDays).toBeGreaterThan(3);
  });

  it('fait revenir une carte oubliée le lendemain et baisse sa facilité', () => {
    const learned = { intervalDays: 10, ease: 2.5, repetitions: 4, dueOn: today };
    const state = reviewCard(learned, 'oublie', today);
    expect(state).toMatchObject({ intervalDays: 1, repetitions: 0, dueOn: '2026-10-06' });
    expect(state.ease).toBeLessThan(2.5);
  });

  it('ne descend jamais sous la facilité minimale', () => {
    let state = newCardState(today);
    for (let i = 0; i < 20; i++) state = reviewCard(state, 'oublie', today);
    expect(state.ease).toBe(1.3);
  });

  it("ramène la carte avant l'évaluation", () => {
    const learned = { intervalDays: 10, ease: 2.5, repetitions: 4, dueOn: today };
    const state = reviewCard(learned, 'facile', today, '2026-10-09');
    expect(state.dueOn).toBe('2026-10-08');
  });
});
