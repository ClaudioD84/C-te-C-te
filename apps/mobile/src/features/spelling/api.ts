import { mondayOfWeek, toIsoDate } from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Mots de la dictée préparée de la semaine en cours (null s'il n'y en a pas). */
export function useSpellingList(childId: string) {
  const weekStart = mondayOfWeek(toIsoDate(new Date()));
  return useQuery({
    queryKey: ['spelling_list', childId, weekStart],
    enabled: childId.length > 0,
    queryFn: async (): Promise<string[] | null> => {
      const { data, error } = await supabase
        .from('spelling_list')
        .select('words')
        .eq('child_id', childId)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data?.words as string[] | undefined) ?? null;
    },
  });
}

export function useSaveSpellingList(childId: string) {
  const queryClient = useQueryClient();
  const weekStart = mondayOfWeek(toIsoDate(new Date()));
  return useMutation({
    mutationFn: async (words: string[]) => {
      const { error } =
        words.length === 0
          ? await supabase.from('spelling_list').delete().eq('child_id', childId).eq('week_start', weekStart)
          : await supabase.from('spelling_list').upsert({
              child_id: childId,
              week_start: weekStart,
              words,
              updated_at: new Date().toISOString(),
            });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spelling_list', childId] }),
  });
}
