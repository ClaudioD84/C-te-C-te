import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface HelpRequest {
  id: string;
  task_id: string;
  created_at: string;
  task: { subject: string; description: string };
}

/** Demandes d'aide ouvertes d'un enfant (vue parent et console). */
export function useOpenHelpRequests(childId: string) {
  return useQuery({
    queryKey: ['help_requests', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<HelpRequest[]> => {
      const { data, error } = await supabase
        .from('help_request')
        .select('id, task_id, created_at, task(subject, description)')
        .eq('child_id', childId)
        .is('resolved_at', null)
        .order('created_at');
      if (error) throw error;
      return data as unknown as HelpRequest[];
    },
  });
}

/** L'enfant signale une activité difficile (une seule demande ouverte par activité). */
export function useAskHelp(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('help_request').insert({ child_id: childId, task_id: taskId });
      // Déjà demandé : rien à faire.
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['help_requests', childId] }),
  });
}

export function useResolveHelp(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('help_request')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['help_requests', childId] }),
  });
}
