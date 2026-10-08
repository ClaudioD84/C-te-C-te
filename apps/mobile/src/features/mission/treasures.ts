import AsyncStorage from '@react-native-async-storage/async-storage';
import { TREASURES, type Treasure } from '@cote-a-cote/shared';
import { useCallback, useEffect, useState } from 'react';

interface Stored {
  owned: string[];
  /** Dernier jour où un coffre a été ouvert (un seul par jour). */
  openedOn: string | null;
  /** Dernier jour où un jeu du coin détente a rapporté un trésor (un par jour aussi). */
  relaxOn?: string | null;
}

const key = (childId: string) => `tresors:${childId}`;

/** Trésors trouvés dans les coffres-surprises, gardés sur l'appareil. */
export function useTreasures(childId: string) {
  const [stored, setStored] = useState<Stored | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(key(childId))
      .then((raw) => setStored(raw ? (JSON.parse(raw) as Stored) : { owned: [], openedOn: null }))
      .catch(() => setStored({ owned: [], openedOn: null }));
  }, [childId]);

  const keep = useCallback(
    (treasure: Treasure, date: string, from: 'coffre' | 'detente' = 'coffre') => {
      setStored((current) => {
        const next: Stored = {
          owned: [...new Set([...(current?.owned ?? []), treasure.id])],
          openedOn: from === 'coffre' ? date : (current?.openedOn ?? null),
          relaxOn: from === 'detente' ? date : (current?.relaxOn ?? null),
        };
        AsyncStorage.setItem(key(childId), JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [childId],
  );

  const owned = TREASURES.filter((t) => stored?.owned.includes(t.id));
  return {
    loaded: stored !== null,
    ownedIds: stored?.owned ?? [],
    owned,
    openedOn: stored?.openedOn ?? null,
    relaxOn: stored?.relaxOn ?? null,
    keep,
  };
}
