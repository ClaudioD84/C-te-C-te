import { secureStorage } from '@/features/child-mode/device-storage';

const KEY = 'sensitive_names';

/**
 * Noms à masquer sur les photos (prénom de l'enfant, école, enseignants).
 * Ils restent sur l'appareil, dans le stockage chiffré, et ne sont jamais envoyés au serveur.
 */
export async function getSensitiveNames(): Promise<string[]> {
  const raw = await secureStorage.get(KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function setSensitiveNames(names: string[]): Promise<void> {
  await secureStorage.set(KEY, JSON.stringify(names));
}
