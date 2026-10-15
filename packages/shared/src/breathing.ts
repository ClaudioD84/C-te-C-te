/**
 * Pause respiration guidée (F9, F12) : inspirer 4 secondes, souffler 6 secondes, 5 fois (moins d'une minute).
 * Une expiration plus longue que l'inspiration aide à se calmer.
 */
export const BREATH_IN_MS = 4000;
export const BREATH_OUT_MS = 6000;
export const BREATH_CYCLES = 5;
const CYCLE_MS = BREATH_IN_MS + BREATH_OUT_MS;

export interface BreathingState {
  phase: 'inspire' | 'souffle' | 'fini';
  /** Respiration en cours, de 1 à BREATH_CYCLES. */
  cycle: number;
  /** Taille du cercle, de 0 (poumons vides) à 1 (poumons pleins). */
  fullness: number;
}

export function breathingAt(elapsedMs: number): BreathingState {
  if (elapsedMs >= CYCLE_MS * BREATH_CYCLES) return { phase: 'fini', cycle: BREATH_CYCLES, fullness: 0 };
  const t = Math.max(0, elapsedMs);
  const cycle = Math.floor(t / CYCLE_MS) + 1;
  const inCycle = t % CYCLE_MS;
  if (inCycle < BREATH_IN_MS) return { phase: 'inspire', cycle, fullness: inCycle / BREATH_IN_MS };
  return { phase: 'souffle', cycle, fullness: 1 - (inCycle - BREATH_IN_MS) / BREATH_OUT_MS };
}
