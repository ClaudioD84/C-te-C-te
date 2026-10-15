import {
  foreignLanguage,
  needsStudyPack,
  type LanguageCard,
  addDays,
  reviewCard,
  studyPackSchema,
  toIsoDate,
  type ReviewRating,
  type StudyPack,
} from '@cote-a-cote/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from '@/lib/uuid';

import {
  OFFLINE_MUTATIONS,
  type LearningEventVariables,
  type ReviewCardVariables,
} from '@/features/offline/mutations';
import { supabase } from '@/lib/supabase';
import { useToday } from '@/hooks/use-today';

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
export function studyPackQuery(taskId: string) {
  return queryOptions({
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

export function useStudyPack(taskId: string) {
  return useQuery(studyPackQuery(taskId));
}

export function useGeneratePack(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (regenerate: boolean = false) => invokeGenerate(taskId, regenerate),
    onSuccess: (pack) => {
      queryClient.setQueryData(['study_pack', taskId], pack);
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['study_packs'] });
      // Le serveur a pu rattacher la tâche au programme (F2).
      queryClient.invalidateQueries({ queryKey: ['task_curriculum', taskId] });
      queryClient.invalidateQueries({ queryKey: ['curriculum_seen'] });
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

export type PackPart = 'quiz' | 'exercises' | 'flashcards';

/** Le parent retire une question, un exercice ou une carte d'une fiche (voir remove_pack_item). */
export function useRemovePackItem(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { packId: string; part: PackPart; index: number; expected: string }) => {
      const { error } = await supabase.rpc('remove_pack_item', {
        p_pack_id: input.packId,
        p_part: input.part,
        p_index: input.index,
        p_expected: input.expected,
      });
      if (error) throw new Error(error.code === 'P0001' ? error.message : 'Le retrait a échoué. Réessayez.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['study_pack', taskId] });
      queryClient.invalidateQueries({ queryKey: ['study_packs'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

/** Le parent supprime la fiche, le quiz et les cartes d'une tâche (une nouvelle sera préparée à la demande). */
export function useDeletePack(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (packId: string) => {
      const { error } = await supabase.from('study_pack').delete().eq('id', packId);
      if (error) throw new Error('La suppression a échoué. Réessayez.');
    },
    onSuccess: () => {
      queryClient.setQueryData(['study_pack', taskId], null);
      queryClient.invalidateQueries({ queryKey: ['study_packs'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
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

/** Jours d'avance chargés : les cartes restent disponibles hors connexion les jours suivants. */
const CARD_DAYS_AHEAD = 3;

/** Cartes à revoir aujourd'hui (ou en retard) pour un enfant. */
export function useDueFlashcards(childId: string) {
  const today = useToday();
  return useQuery({
    queryKey: ['flashcards', childId, 'due'],
    queryFn: async (): Promise<DueCard[]> => {
      const { data, error } = await supabase
        .from('flashcard')
        .select(
          'id, front, back, interval_days, ease, repetitions, due_on, study_pack(task(subject, due_date))',
        )
        .eq('child_id', childId)
        .lte('due_on', addDays(toIsoDate(new Date()), CARD_DAYS_AHEAD))
        .order('due_on')
        .limit(60);
      if (error) throw error;
      return data as unknown as DueCard[];
    },
    select: (cards) => cards.filter((card) => card.due_on <= today).slice(0, 30),
  });
}

export interface Explanation {
  explanation: string;
  example: string;
}

/** Explications « autrement » déjà préparées pour une fiche, par numéro de partie. */
export function useExplanations(packId: string | undefined) {
  return useQuery({
    queryKey: ['explanations', packId],
    enabled: Boolean(packId),
    queryFn: async (): Promise<Map<number, Explanation>> => {
      const { data, error } = await supabase
        .from('explanation')
        .select('section_index, content')
        .eq('pack_id', packId!);
      if (error) throw error;
      return new Map(data.map((row) => [row.section_index as number, row.content as Explanation]));
    },
  });
}

/** Demande une autre explication d'une partie de la fiche (IA, gardée ensuite). */
export function useExplainAgain(packId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section: number): Promise<Explanation> => {
      const { data, error } = await supabase.functions.invoke('explain-again', { body: { packId, section } });
      if (error instanceof FunctionsHttpError) {
        const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'L’explication n’a pas pu être préparée.');
      }
      if (error) throw new Error('Pas de connexion : réessaie quand le réseau revient.');
      return (data as { explanation: Explanation }).explanation;
    },
    onSuccess: (explanation, section) => {
      queryClient.setQueryData<Map<number, Explanation>>(['explanations', packId], (current) =>
        new Map(current ?? []).set(section, explanation),
      );
    },
  });
}

/** Toutes les cartes d'une tâche, pour la révision express la veille d'une évaluation. */
export function useTaskFlashcards(childId: string, taskId: string | undefined) {
  return useQuery({
    queryKey: ['flashcards', childId, 'tache', taskId],
    enabled: Boolean(taskId),
    queryFn: async (): Promise<DueCard[]> => {
      const { data, error } = await supabase
        .from('flashcard')
        .select(
          'id, front, back, interval_days, ease, repetitions, due_on, study_pack!inner(task_id, task(subject, due_date))',
        )
        .eq('child_id', childId)
        .eq('study_pack.task_id', taskId!)
        .limit(30);
      if (error) throw error;
      return data as unknown as DueCard[];
    },
  });
}

export function reviewCardVariables(
  childId: string,
  card: DueCard,
  rating: ReviewRating,
): ReviewCardVariables {
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
  return {
    childId,
    cardId: card.id,
    next,
    reviewedAt: new Date().toISOString(),
    event: { id: randomUUID(), type: 'carte', meta: { card_id: card.id, rating } },
  };
}

/** Révision d'une carte : la carte quitte la pile tout de suite, l'envoi attend le réseau si nécessaire. */
export function useReviewFlashcard(childId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, ReviewCardVariables>({
    mutationKey: OFFLINE_MUTATIONS.reviewCard,
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ['flashcards', childId] });
      queryClient.setQueriesData<DueCard[]>({ queryKey: ['flashcards', childId] }, (cards) =>
        cards?.map((card) =>
          card.id === v.cardId
            ? {
                ...card,
                interval_days: v.next.intervalDays,
                ease: v.next.ease,
                repetitions: v.next.repetitions,
                due_on: v.next.dueOn,
              }
            : card,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', childId] });
      queryClient.invalidateQueries({ queryKey: ['effort', childId] });
    },
  });
}

/** Résultat d'un quiz, envoyé au retour du réseau si nécessaire. */
export function useLogQuiz(childId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, LearningEventVariables>({
    mutationKey: OFFLINE_MUTATIONS.learningEvent,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['effort', childId] }),
  });
  return (taskId: string, score: number, total: number, mode?: 'ecoute') =>
    mutation.mutate({
      id: randomUUID(),
      childId,
      type: 'quiz',
      meta: { task_id: taskId, score, total, ...(mode ? { mode } : {}) },
      at: new Date().toISOString(),
    });
}

/** Entraînement libre (les tables…) : compté comme un quiz de la matière, sans tâche liée. */
export function useLogPractice(childId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, LearningEventVariables>({
    mutationKey: OFFLINE_MUTATIONS.learningEvent,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['effort', childId] }),
  });
  return (
    mode: string,
    subject: string | null,
    score: number,
    total: number,
    extra: Record<string, unknown> = {},
  ) =>
    mutation.mutate({
      id: randomUUID(),
      childId,
      type: 'quiz',
      // Sans matière (défi bonus mélangé) : compté dans l'effort, pas dans le suivi par matière.
      meta: { ...extra, mode, ...(subject ? { subject } : {}), score, total },
      at: new Date().toISOString(),
    });
}

/**
 * Garde sur l'appareil la mission des prochains jours et les fiches de ses tâches,
 * pour que l'enfant puisse travailler hors connexion.
 */
export async function prefetchForOffline(
  queryClient: ReturnType<typeof useQueryClient>,
  sessions: {
    study_session_task: {
      task_id: string;
      activity: string;
      done_at: string | null;
      task: { subject: string; description: string };
    }[];
  }[],
) {
  const items = sessions.flatMap((s) => s.study_session_task);
  const taskIds = [...new Set(items.map((i) => i.task_id))];
  const packs = new Map(
    await Promise.all(
      taskIds.map(
        async (id) => [id, await queryClient.fetchQuery(studyPackQuery(id)).catch(() => undefined)] as const,
      ),
    ),
  );
  // Fiches à la demande : celles des prochains jours qui manquent sont préparées maintenant, l'une après l'autre
  // (rien pour un devoir à faire, une activité déjà faite ni un chapitre de blocus sans nom).
  const missing = [
    ...new Set(
      items
        .filter((i) => i.activity !== 'faire' && i.done_at === null && needsStudyPack(i.task))
        .map((i) => i.task_id)
        .filter((id) => packs.get(id) === null),
    ),
  ];
  for (const taskId of missing) {
    try {
      queryClient.setQueryData(['study_pack', taskId], await invokeGenerate(taskId));
      void queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    } catch {
      // Quota atteint ou réseau coupé : la fiche sera préparée à l'ouverture de la leçon.
    }
  }
}

/** Fiches déjà préparées pour une liste de tâches (impression de la semaine). */
export function usePacksForTasks(taskIds: readonly string[]) {
  return useQuery({
    queryKey: ['study_packs', [...taskIds].sort()],
    enabled: taskIds.length > 0,
    queryFn: async (): Promise<StoredPack[]> => {
      const { data, error } = await supabase
        .from('study_pack')
        .select('id, task_id, content, created_at, reported_at')
        .in('task_id', [...taskIds]);
      if (error) throw error;
      return data.map((row) => ({ ...row, content: studyPackSchema.parse(row.content) }));
    },
  });
}

/** Cartes des matières de langue (néerlandais, anglais…), pour « Écoute et choisis ». */
export function useLanguageCards(childId: string) {
  return useQuery({
    queryKey: ['flashcards', childId, 'langues'],
    enabled: childId.length > 0,
    queryFn: async (): Promise<LanguageCard[]> => {
      const { data, error } = await supabase
        .from('flashcard')
        .select('id, front, back, study_pack(task(subject))')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (
        data as unknown as {
          id: string;
          front: string;
          back: string;
          study_pack: { task: { subject: string } };
        }[]
      )
        .map((c) => ({ id: c.id, front: c.front, back: c.back, subject: c.study_pack.task.subject }))
        .filter((c) => foreignLanguage(c.subject) !== null);
    },
  });
}
