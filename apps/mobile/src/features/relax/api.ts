import type { RelaxGame } from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { OFFLINE_MUTATIONS, type LearningEventVariables } from '@/features/offline/mutations';
import { supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/uuid';

const key = (childId: string, since: string) => ['detente', childId, since] as const;

/** Début du jour local (la limite par jour suit l'horloge de l'appareil). */
export function startOfToday(): string {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day.toISOString();
}

/** Minutes passées au coin détente depuis une date (tous appareils confondus). */
export function useRelaxMinutes(childId: string, since: string) {
  return useQuery({
    queryKey: key(childId, since),
    enabled: childId.length > 0,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('learning_event')
        .select('meta')
        .eq('child_id', childId)
        .eq('type', 'detente')
        .gte('created_at', since);
      if (error) throw error;
      return data.reduce((sum, row) => sum + Number((row.meta as { minutes?: number }).minutes ?? 0), 0);
    },
  });
}

/** Note le temps de jeu en quittant le coin détente (aussi hors connexion). */
export function useLogRelax(childId: string) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation<void, Error, LearningEventVariables>({
    mutationKey: OFFLINE_MUTATIONS.learningEvent,
    onMutate: (v) => {
      const minutes = Number((v.meta as { minutes: number }).minutes);
      for (const [queryKey] of queryClient.getQueriesData<number>({ queryKey: ['detente', childId] })) {
        const since = String(queryKey[2]);
        if (v.at >= since) queryClient.setQueryData<number>(queryKey, (m) => (m ?? 0) + minutes);
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['detente', childId] }),
  });
  return useCallback(
    (minutes: number, game: RelaxGame | null) =>
      mutate({
        id: randomUUID(),
        childId,
        type: 'detente',
        meta: { minutes, ...(game ? { game } : {}) },
        at: new Date().toISOString(),
      }),
    [mutate, childId],
  );
}
