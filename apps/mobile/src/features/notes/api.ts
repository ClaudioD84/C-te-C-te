import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface ChildNote {
  id: string;
  message: string;
  created_at: string;
  seen_at: string | null;
}

export const NOTE_SUGGESTIONS = [
  'Je suis fier·e de toi !',
  'Bon courage pour ton interro, tu es prêt·e !',
  'Merci pour tes efforts cette semaine.',
  'Tu progresses, continue comme ça !',
  'Ce soir, on fête ta belle semaine !',
] as const;

/** Mots déjà envoyés (vue parent), du plus récent au plus ancien. */
export function useChildNotes(childId: string) {
  return useQuery({
    queryKey: ['child_notes', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<ChildNote[]> => {
      const { data, error } = await supabase
        .from('child_note')
        .select('id, message, created_at, seen_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

/** Mot pas encore lu par l'enfant (le plus ancien d'abord, sur les 14 derniers jours). */
export function useUnreadNote(childId: string) {
  return useQuery({
    queryKey: ['child_notes', childId, 'non_lu'],
    enabled: childId.length > 0,
    queryFn: async (): Promise<ChildNote | null> => {
      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('child_note')
        .select('id, message, created_at, seen_at')
        .eq('child_id', childId)
        .is('seen_at', null)
        .gte('created_at', since)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSendNote(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from('child_note')
        .insert({ child_id: childId, message: message.trim() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['child_notes', childId] }),
  });
}

export function useMarkNoteSeen(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('child_note')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
    },
    onMutate: () => queryClient.setQueryData(['child_notes', childId, 'non_lu'], null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['child_notes', childId] }),
  });
}
