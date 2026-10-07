import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type FeedbackMood = 'content' | 'bof' | 'bloque';

export function useSendFeedback() {
  return useMutation({
    mutationFn: async (input: { message: string; mood: FeedbackMood | null; screen: string | null }) => {
      const { error } = await supabase.from('feedback').insert({
        message: input.message.trim(),
        mood: input.mood,
        screen: input.screen,
      });
      if (error) throw new Error('L’envoi a échoué. Vérifiez votre connexion et réessayez.');
    },
  });
}
