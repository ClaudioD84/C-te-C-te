import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface SiblingChallenge {
  id: string;
  label: string;
  missionsNeeded: number;
  done: number;
}

const key = ['sibling_challenge'] as const;

/** Défi commun de la fratrie en cours et total des missions faites depuis son lancement. */
export function useSiblingChallenge(enabled = true) {
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<SiblingChallenge | null> => {
      const { data, error } = await supabase.rpc('sibling_challenge_progress');
      if (error) throw error;
      const row = (
        data as { id: string; label: string; missions_needed: number; missions_done: number }[]
      )[0];
      return row
        ? {
            id: row.id,
            label: row.label,
            missionsNeeded: row.missions_needed,
            done: Math.min(row.missions_done, row.missions_needed),
          }
        : null;
    },
  });
}

export function useStartSiblingChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, missions }: { label: string; missions: number }) => {
      // Un seul défi en cours : celui qui n'a pas été donné est remplacé.
      const old = await supabase.from('sibling_challenge').delete().is('given_at', null);
      if (old.error) throw old.error;
      const { error } = await supabase
        .from('sibling_challenge')
        .insert({ label: label.trim(), missions_needed: missions });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useGiveSiblingReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sibling_challenge')
        .update({ given_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
