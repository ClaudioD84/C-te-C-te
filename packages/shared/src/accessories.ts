import type { BadgeCode, RewardSummary } from './rewards';

/**
 * Accessoires de l'avatar (F11) : débloqués par l'effort (stade de l'avatar ou badge), jamais par des
 * résultats ; on n'en perd jamais un. Purement décoratifs.
 */
export const ACCESSORIES = {
  casquette: { emoji: '🧢', label: 'Casquette', unlock: { level: 2 } },
  lunettes: { emoji: '🕶️', label: 'Lunettes de soleil', unlock: { badge: 'trois_jours_semaine' } },
  echarpe: { emoji: '🧣', label: 'Écharpe', unlock: { level: 3 } },
  chapeau: { emoji: '🎩', label: 'Chapeau magique', unlock: { badge: 'quiz_10' } },
  cape: { emoji: '🦸', label: 'Cape de héros', unlock: { badge: 'perseverance' } },
  medaille: { emoji: '🎖️', label: 'Médaille', unlock: { badge: 'missions_5' } },
  fusee: { emoji: '🚀', label: 'Fusée', unlock: { level: 4 } },
  arcenciel: { emoji: '🌈', label: 'Arc-en-ciel', unlock: { badge: 'de_retour' } },
  couronne: { emoji: '👑', label: 'Couronne', unlock: { level: 5 } },
  etoile: { emoji: '🌟', label: 'Étoile filante', unlock: { badge: 'serie_7' } },
} as const satisfies Record<
  string,
  { emoji: string; label: string; unlock: { level: number } | { badge: BadgeCode } }
>;
export type AccessoryCode = keyof typeof ACCESSORIES;
export const ACCESSORY_CODES = Object.keys(ACCESSORIES) as AccessoryCode[];

export function isAccessory(code: unknown): code is AccessoryCode {
  return typeof code === 'string' && code in ACCESSORIES;
}

export function isUnlocked(code: AccessoryCode, summary: Pick<RewardSummary, 'stage' | 'badges'>): boolean {
  const unlock: { level?: number; badge?: BadgeCode } = ACCESSORIES[code].unlock;
  if (unlock.level !== undefined) return summary.stage.level >= unlock.level;
  return summary.badges.some((b) => b.code === unlock.badge);
}

/** Comment débloquer un accessoire, dit simplement pour l'enfant. */
export function unlockHint(code: AccessoryCode, stageNames: Record<number, string>): string {
  const unlock: { level?: number; badge?: BadgeCode } = ACCESSORIES[code].unlock;
  if (unlock.level !== undefined)
    return `Quand ton avatar devient ${stageNames[unlock.level]?.toLowerCase()}`;
  return 'Avec un badge à gagner';
}
