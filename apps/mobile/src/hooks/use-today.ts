import { toIsoDate, type IsoDate } from '@cote-a-cote/shared';
import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

/**
 * Date du jour (heure locale), réactive : elle change à minuit et quand l'application revient au premier plan.
 * Une tablette laissée sur la console pendant la nuit affiche ainsi la mission du nouveau jour au réveil.
 * À utiliser à la place de `toIsoDate(new Date())` pendant l'affichage, qui resterait figé (et que le
 * compilateur React peut ne calculer qu'une fois).
 */
let current: IsoDate = toIsoDate(new Date());
const listeners = new Set<() => void>();
let midnightTimer: ReturnType<typeof setTimeout> | null = null;
let appState: NativeEventSubscription | null = null;

function refresh() {
  const next = toIsoDate(new Date());
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/** Juste après minuit (les minuteurs sont suspendus en arrière-plan : le retour au premier plan rattrape). */
function armMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  midnightTimer = setTimeout(() => {
    refresh();
    armMidnight();
  }, next.getTime() - now.getTime());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    armMidnight();
    appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
  }
  refresh();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (midnightTimer) clearTimeout(midnightTimer);
      midnightTimer = null;
      appState?.remove();
      appState = null;
    }
  };
}

const snapshot = () => current;

export function useToday(): IsoDate {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
