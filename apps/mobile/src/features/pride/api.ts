import type { PrideEntry } from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface StoredPrideEntry extends PrideEntry {
  id: string;
}

const key = (childId: string) => ['pride', childId] as const;

/** Moments du carnet de fierté, du plus récent au plus ancien. */
export function usePrideEntries(childId: string) {
  return useQuery({
    queryKey: key(childId),
    enabled: childId.length > 0,
    queryFn: async (): Promise<StoredPrideEntry[]> => {
      const { data, error } = await supabase
        .from('pride_entry')
        .select('id, emoji, text, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data.map((row) => ({
        id: String(row.id),
        emoji: String(row.emoji),
        text: (row.text as string | null) ?? null,
        date: String(row.created_at).slice(0, 10),
      }));
    },
  });
}

export function useAddPride(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { emoji: string; text: string }) => {
      const { error } = await supabase
        .from('pride_entry')
        .insert({ child_id: childId, emoji: entry.emoji, text: entry.text.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}
