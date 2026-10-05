import { addDays, toIsoDate } from '@cote-a-cote/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { sessionsQuery } from '@/features/planning/api';
import { prefetchForOffline } from '@/features/study/api';

import { useIsOnline } from './offline-banner';

/** Jours de mission gardés d'avance sur l'appareil. */
const DAYS_AHEAD = 3;

/**
 * Quand le réseau est là, garde sur l'appareil la mission des prochains jours et les fiches
 * correspondantes : l'enfant peut ainsi travailler dans le train ou chez ses grands-parents.
 */
export function usePrepareOffline(childId: string) {
  const queryClient = useQueryClient();
  const online = useIsOnline();

  useEffect(() => {
    if (!online || !childId) return;
    const today = toIsoDate(new Date());
    const days = Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i));
    Promise.all(days.map((day) => queryClient.fetchQuery(sessionsQuery(childId, day, 1))))
      .then((sessions) => prefetchForOffline(queryClient, sessions.flat()))
      .catch(() => {
        // Préparation facultative : un échec n'empêche rien.
      });
  }, [online, childId, queryClient]);
}
