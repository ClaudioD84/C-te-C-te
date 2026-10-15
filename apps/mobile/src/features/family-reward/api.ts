import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface FamilyReward {
  id: string;
  label: string;
  missions_needed: number;
  created_at: string;
}

export const REWARD_IDEAS = [
  '15 minutes de jeu ensemble',
  'Choisir le dessert',
  'Choisir le film du vendredi',
  'Une sortie au parc',
  'Une histoire de plus ce soir',
  'Cuisiner ensemble',
] as const;

const key = (childId: string) => ['family_reward', childId] as const;

/** Récompense en cours et missions accomplies depuis qu'elle a été choisie. */
export function useFamilyReward(childId: string) {
  return useQuery({
    queryKey: key(childId),
    enabled: childId.length > 0,
    queryFn: async (): Promise<{ reward: FamilyReward; done: number } | null> => {
      const { data, error } = await supabase
        .from('family_reward')
        .select('id, label, missions_needed, created_at')
        .eq('child_id', childId)
        .is('given_at', null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const count = await supabase.rpc('missions_done_since', {
        p_child_id: childId,
        p_since: data.created_at,
      });
      if (count.error) throw count.error;
      return { reward: data, done: Math.min(Number(count.data), data.missions_needed) };
    },
  });
}

export function useSetFamilyReward(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, missions }: { label: string; missions: number }) => {
      // Une seule récompense en cours : l'ancienne (non donnée) est remplacée.
      const old = await supabase.from('family_reward').delete().eq('child_id', childId).is('given_at', null);
      if (old.error) throw old.error;
      const { error } = await supabase
        .from('family_reward')
        .insert({ child_id: childId, label: label.trim(), missions_needed: missions });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}

/** Le parent a donné la récompense : elle disparaît et une nouvelle peut être choisie. */
export function useGiveReward(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_reward')
        .update({ given_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}
