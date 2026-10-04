import {
  reviewCard,
  studyPackSchema,
  toIsoDate,
  type ReviewRating,
  type StudyPack,
} from '@cote-a-cote/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface StoredPack {
  id: string;
  task_id: string;
  content: StudyPack;
  created_at: string;
  reported_at: string | null;
}

async function invokeGenerate(taskId: string, regenerate = false): Promise<StoredPack> {
  const { data, error } = await supabase.functions.invoke('generate-pack', { body: { taskId, regenerate } });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'La préparation a échoué. Réessayez dans un instant.');
  }
  if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
  const pack = (data as { pack: StoredPack }).pack;
  return { ...pack, content: studyPackSchema.parse(pack.content) };
}

/** Paquet d'étude d'une tâche ; null s'il n'a pas encore été préparé. */
export function useStudyPack(taskId: string) {
  return useQuery({
    queryKey: ['study_pack', taskId],
    queryFn: async (): Promise<StoredPack | null> => {
      const { data, error } = await supabase
        .from('study_pack')
        .select('id, task_id, content, created_at, reported_at')
        .eq('task_id', taskId)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, content: studyPackSchema.parse(data.content) } : null;
    },
  });
}

export function useGeneratePack(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (regenerate: boolean = false) => invokeGenerate(taskId, regenerate),
    onSuccess: (pack) => {
      queryClient.setQueryData(['study_pack', taskId], pack);
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

/**
 * Prépare en arrière-plan les paquets des tâches à étudier ou réviser, l'un après l'autre.
 * Les échecs sont ignorés : l'enfant pourra relancer la préparation depuis sa console.
 */
export async function preparePacks(
  taskIds: readonly string[],
  onProgress: (done: number) => void,
): Promise<void> {
  let done = 0;
  for (const taskId of taskIds) {
    try {
      await invokeGenerate(taskId);
    } catch {
      // Quota atteint ou erreur passagère : on continue avec les autres tâches.
    }
    onProgress(++done);
  }
}

export function useReportPack(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ packId, reason }: { packId: string; reason: string }) => {
      const { error } = await supabase
        .from('study_pack')
        .update({ reported_at: new Date().toISOString(), report_reason: reason.slice(0, 500) })
        .eq('id', packId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study_pack', taskId] }),
  });
}

export interface DueCard {
  id: string;
  front: string;
  back: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  due_on: string;
  study_pack: { task: { subject: string; due_date: string | null } };
}

/** Cartes à revoir aujourd'hui (ou en retard) pour un enfant. */
export function useDueFlashcards(childId: string) {
  return useQuery({
    queryKey: ['flashcards', childId, 'due'],
    queryFn: async (): Promise<DueCard[]> => {
      const { data, error } = await supabase
        .from('flashcard')
        .select(
          'id, front, back, interval_days, ease, repetitions, due_on, study_pack(task(subject, due_date))',
        )
        .eq('child_id', childId)
        .lte('due_on', toIsoDate(new Date()))
        .order('due_on')
        .limit(30);
      if (error) throw error;
      return data as unknown as DueCard[];
    },
  });
}

export function useReviewFlashcard(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ card, rating }: { card: DueCard; rating: ReviewRating }) => {
      const today = toIsoDate(new Date());
      const deadline = card.study_pack.task.due_date ?? undefined;
      const next = reviewCard(
        {
          intervalDays: card.interval_days,
          ease: Number(card.ease),
          repetitions: card.repetitions,
          dueOn: card.due_on,
        },
        rating,
        today,
        deadline && deadline > today ? deadline : undefined,
      );
      const { error } = await supabase
        .from('flashcard')
        .update({
          interval_days: next.intervalDays,
          ease: next.ease,
          repetitions: next.repetitions,
          due_on: next.dueOn,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', card.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', childId] }),
  });
}
