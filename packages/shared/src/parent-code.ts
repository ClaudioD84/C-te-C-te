/**
 * Code parent : protège le retour de la console enfant vers le cockpit parent.
 * Le code est stocké haché sur l'appareil, jamais sur le serveur.
 */

export const PARENT_CODE_LENGTH = 4;

const TRIVIAL_CODES = new Set([
  '0000',
  '1111',
  '1234',
  '4321',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
]);

export type ParentCodeProblem = 'format' | 'trop_simple';

/** Vérifie qu'un nouveau code est acceptable ; renvoie le problème ou null. */
export function checkNewParentCode(code: string): ParentCodeProblem | null {
  if (!new RegExp(`^\\d{${PARENT_CODE_LENGTH}}$`).test(code)) return 'format';
  if (TRIVIAL_CODES.has(code)) return 'trop_simple';
  return null;
}

/** Nombre d'essais libres avant blocage temporaire. */
export const FREE_ATTEMPTS = 5;

/**
 * Durée de blocage (en secondes) après `failedAttempts` échecs consécutifs :
 * 30 s après 5 échecs, puis doublement à chaque échec, plafonné à 15 minutes.
 */
export function lockoutSeconds(failedAttempts: number): number {
  if (failedAttempts < FREE_ATTEMPTS) return 0;
  return Math.min(30 * 2 ** (failedAttempts - FREE_ATTEMPTS), 15 * 60);
}
