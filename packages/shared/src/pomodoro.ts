/**
 * Minuteur Pomodoro (F9) : logique pure, sans dépendance à l'interface,
 * pour pouvoir la tester et la réutiliser.
 */
export type PomodoroPhase = 'travail' | 'pause' | 'termine';

export interface PomodoroConfig {
  workMinutes: number;
  breakMinutes: number;
  /** Nombre de périodes de travail dans la session. */
  cycles: number;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  /** Période de travail en cours, à partir de 1. */
  cycle: number;
  remainingSeconds: number;
}

export function startPomodoro(config: PomodoroConfig): PomodoroState {
  return { phase: 'travail', cycle: 1, remainingSeconds: config.workMinutes * 60 };
}

/** Fait avancer le minuteur de `elapsedSeconds` secondes, en enchaînant les phases si besoin. */
export function tickPomodoro(
  state: PomodoroState,
  config: PomodoroConfig,
  elapsedSeconds: number,
): PomodoroState {
  let next = { ...state };
  let left = elapsedSeconds;

  while (left > 0 && next.phase !== 'termine') {
    if (left < next.remainingSeconds) {
      next.remainingSeconds -= left;
      return next;
    }
    left -= next.remainingSeconds;
    next = advance(next, config);
  }
  return next;
}

function advance(state: PomodoroState, config: PomodoroConfig): PomodoroState {
  if (state.phase === 'travail') {
    // Pas de pause après la dernière période de travail.
    if (state.cycle >= config.cycles) {
      return { phase: 'termine', cycle: state.cycle, remainingSeconds: 0 };
    }
    return { phase: 'pause', cycle: state.cycle, remainingSeconds: config.breakMinutes * 60 };
  }
  return { phase: 'travail', cycle: state.cycle + 1, remainingSeconds: config.workMinutes * 60 };
}

/** Progression de la phase en cours, de 0 à 1 (pour un minuteur visuel). */
export function phaseProgress(state: PomodoroState, config: PomodoroConfig): number {
  if (state.phase === 'termine') return 1;
  const total = (state.phase === 'travail' ? config.workMinutes : config.breakMinutes) * 60;
  return total === 0 ? 1 : 1 - state.remainingSeconds / total;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
