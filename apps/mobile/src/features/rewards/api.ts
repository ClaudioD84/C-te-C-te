import { computeRewards, toIsoDate, type BadgeCode, type EffortDay, type Weekday } from '@cote-a-cote/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type LearningEventType = 'activite' | 'carte' | 'quiz' | 'session' | 'detente';

export interface EffortDayWithMinutes extends EffortDay {
  minutes: number;
}

export function useEffortDays(childId: string) {
  return useQuery({
    queryKey: ['effort', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<EffortDayWithMinutes[]> => {
      const { data, error } = await supabase.rpc('child_effort_days', { p_child_id: childId });
      if (error) throw error;
      return data as EffortDayWithMinutes[];
    },
  });
}

export function useRewards(childId: string, availableDays: readonly Weekday[] | undefined) {
  const effort = useEffortDays(childId);
  const summary =
    effort.data && availableDays ? computeRewards(effort.data, availableDays, toIsoDate(new Date())) : null;
  return { ...effort, summary };
}

const seenKey = (childId: string) => `badges_vus_${childId}`;

/** Badges gagnés que l'enfant n'a pas encore vus (pour les fêter une fois). */
export function useNewBadges(childId: string, earned: readonly BadgeCode[] | undefined) {
  const [seen, setSeen] = useState<BadgeCode[] | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(seenKey(childId)).then((raw) =>
      setSeen(raw ? (JSON.parse(raw) as BadgeCode[]) : []),
    );
  }, [childId]);

  const fresh = seen && earned ? earned.filter((code) => !seen.includes(code)) : [];

  const markSeen = useCallback(async () => {
    if (!earned) return;
    await AsyncStorage.setItem(seenKey(childId), JSON.stringify(earned));
    setSeen([...earned]);
  }, [childId, earned]);

  return { fresh, markSeen };
}
