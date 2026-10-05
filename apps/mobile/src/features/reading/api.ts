import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OFFLINE_MUTATIONS, type LearningEventVariables } from '@/features/offline/mutations';
import { supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/uuid';

export interface ReadingEntry {
  id: string;
  minutes: number;
  book: string | null;
  date: string;
}

const key = (childId: string) => ['reading', childId] as const;

/** Lectures notées (90 derniers jours), de la plus récente à la plus ancienne. */
export function useReadingLog(childId: string) {
  return useQuery({
    queryKey: key(childId),
    enabled: childId.length > 0,
    queryFn: async (): Promise<ReadingEntry[]> => {
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('learning_event')
        .select('id, meta, created_at')
        .eq('child_id', childId)
        .eq('type', 'activite')
        .eq('meta->>mode', 'lecture')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((row) => {
        const meta = row.meta as { minutes?: number; book?: string };
        return {
          id: String(row.id),
          minutes: Number(meta.minutes ?? 0),
          book: meta.book ?? null,
          date: String(row.created_at).slice(0, 10),
        };
      });
    },
  });
}

/** Une lecture compte comme une activité de français (effort, avatar, suivi par matière). */
export function useLogReading(childId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, LearningEventVariables>({
    mutationKey: OFFLINE_MUTATIONS.learningEvent,
    onMutate: (v) => {
      const meta = v.meta as { minutes: number; book?: string };
      queryClient.setQueryData<ReadingEntry[]>(key(childId), (entries) => [
        { id: v.id, minutes: meta.minutes, book: meta.book ?? null, date: v.at.slice(0, 10) },
        ...(entries ?? []),
      ]);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['effort', childId] });
      void queryClient.invalidateQueries({ queryKey: key(childId) });
    },
  });
  return (minutes: number, book: string) =>
    mutation.mutate({
      id: randomUUID(),
      childId,
      type: 'activite',
      meta: {
        mode: 'lecture',
        subject: 'Français',
        minutes,
        ...(book.trim() ? { book: book.trim().slice(0, 60) } : {}),
      },
      at: new Date().toISOString(),
    });
}
