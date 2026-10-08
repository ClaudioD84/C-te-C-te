import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OFFLINE_MUTATIONS, type LearningEventVariables } from '@/features/offline/mutations';
import { supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/uuid';

export interface AloudReading {
  id: string;
  textId: string;
  wpm: number;
  hardWords: string[];
  date: string;
}

const key = (childId: string) => ['lecture_voix', childId] as const;

/** Lectures à voix haute enregistrées, de la plus ancienne à la plus récente (20 dernières). */
export function useAloudReadings(childId: string) {
  return useQuery({
    queryKey: key(childId),
    enabled: childId.length > 0,
    queryFn: async (): Promise<AloudReading[]> => {
      const { data, error } = await supabase
        .from('learning_event')
        .select('id, meta, created_at')
        .eq('child_id', childId)
        .eq('type', 'activite')
        .eq('meta->>mode', 'lecture_voix')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data
        .map((row) => {
          const meta = row.meta as { text_id?: string; wpm?: number; hard_words?: string[] };
          return {
            id: String(row.id),
            textId: String(meta.text_id ?? ''),
            wpm: Number(meta.wpm ?? 0),
            hardWords: meta.hard_words ?? [],
            date: String(row.created_at).slice(0, 10),
          };
        })
        .reverse();
    },
  });
}

/** Une lecture à voix haute compte comme une activité de français (effort, suivi par matière). */
export function useLogAloud(childId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, LearningEventVariables>({
    mutationKey: OFFLINE_MUTATIONS.learningEvent,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['effort', childId] });
      void queryClient.invalidateQueries({ queryKey: key(childId) });
    },
  });
  return (input: { textId: string; seconds: number; wpm: number; hardWords: string[] }) =>
    mutation.mutate({
      id: randomUUID(),
      childId,
      type: 'activite',
      meta: {
        mode: 'lecture_voix',
        subject: 'Français',
        minutes: Math.max(1, Math.round(input.seconds / 60)),
        text_id: input.textId,
        seconds: Math.round(input.seconds),
        wpm: input.wpm,
        hard_words: input.hardWords.slice(0, 30),
      },
      at: new Date().toISOString(),
    });
}
