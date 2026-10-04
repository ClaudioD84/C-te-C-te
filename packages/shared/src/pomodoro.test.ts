import { describe, expect, it } from 'vitest';

import { formatDuration, phaseProgress, startPomodoro, tickPomodoro } from './pomodoro';

const config = { workMinutes: 10, breakMinutes: 3, cycles: 2 };

describe('pomodoro', () => {
  it('commence par une période de travail', () => {
    expect(startPomodoro(config)).toEqual({ phase: 'travail', cycle: 1, remainingSeconds: 600 });
  });

  it('décompte le temps', () => {
    const s = tickPomodoro(startPomodoro(config), config, 90);
    expect(s.remainingSeconds).toBe(510);
    expect(phaseProgress(s, config)).toBeCloseTo(0.15);
  });

  it('enchaîne travail, pause, travail puis termine sans pause finale', () => {
    let s = tickPomodoro(startPomodoro(config), config, 600);
    expect(s).toEqual({ phase: 'pause', cycle: 1, remainingSeconds: 180 });
    s = tickPomodoro(s, config, 180);
    expect(s).toEqual({ phase: 'travail', cycle: 2, remainingSeconds: 600 });
    s = tickPomodoro(s, config, 600);
    expect(s.phase).toBe('termine');
  });

  it('gère un grand saut de temps (application en arrière-plan)', () => {
    const s = tickPomodoro(startPomodoro(config), config, 600 + 180 + 30);
    expect(s).toEqual({ phase: 'travail', cycle: 2, remainingSeconds: 570 });
  });

  it('formate une durée', () => {
    expect(formatDuration(125)).toBe('2:05');
  });
});
