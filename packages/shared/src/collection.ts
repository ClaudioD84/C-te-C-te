/**
 * Collection (F11) : l'album des animaux de Belgique se remplit avec les points d'effort ; un animal tous
 * les 25 points. On ne perd jamais un animal.
 */
export const POINTS_PER_ANIMAL = 25;

export const BELGIAN_ANIMALS = [
  { emoji: '🦔', name: 'Hérisson', home: 'les jardins' },
  { emoji: '🐿️', name: 'Écureuil roux', home: 'les bois' },
  { emoji: '🦊', name: 'Renard roux', home: 'la campagne' },
  { emoji: '🐞', name: 'Coccinelle', home: 'les jardins' },
  { emoji: '🐝', name: 'Abeille', home: 'les prairies fleuries' },
  { emoji: '🐌', name: 'Escargot de Bourgogne', home: 'les haies' },
  { emoji: '🐸', name: 'Grenouille rousse', home: 'les mares' },
  { emoji: '🦋', name: 'Paon-du-jour', home: 'les prairies' },
  { emoji: '🐇', name: 'Lièvre', home: 'les champs' },
  { emoji: '🦌', name: 'Chevreuil', home: 'les forêts' },
  { emoji: '🐗', name: 'Sanglier', home: 'les Ardennes' },
  { emoji: '🦡', name: 'Blaireau', home: 'les terriers des bois' },
  { emoji: '🦉', name: 'Chouette hulotte', home: 'les vieux arbres' },
  { emoji: '🐦', name: 'Mésange charbonnière', home: 'les jardins' },
  { emoji: '🪶', name: 'Pic épeiche', home: 'les forêts' },
  { emoji: '🐟', name: 'Truite', home: 'les rivières d’Ardenne' },
  { emoji: '🦎', name: 'Salamandre tachetée', home: 'les sous-bois humides' },
  { emoji: '🦦', name: 'Loutre', home: 'les rivières' },
  { emoji: '🦫', name: 'Castor', home: 'les rivières et étangs' },
  { emoji: '🪲', name: 'Lucane cerf-volant', home: 'les vieux chênes' },
  { emoji: '🦢', name: 'Cygne', home: 'les étangs' },
  { emoji: '🐦', name: 'Cigogne noire', home: 'les forêts d’Ardenne' },
  { emoji: '🦌', name: 'Cerf', home: 'les grandes forêts' },
  { emoji: '🦭', name: 'Phoque veau-marin', home: 'la côte belge' },
] as const;

export interface CollectionProgress {
  unlocked: number;
  total: number;
  /** Points encore nécessaires pour le prochain animal (0 si l'album est complet). */
  pointsToNext: number;
}

export function collectionProgress(points: number): CollectionProgress {
  const total = BELGIAN_ANIMALS.length;
  const unlocked = Math.min(total, Math.floor(Math.max(0, points) / POINTS_PER_ANIMAL));
  return {
    unlocked,
    total,
    pointsToNext: unlocked >= total ? 0 : (unlocked + 1) * POINTS_PER_ANIMAL - points,
  };
}
