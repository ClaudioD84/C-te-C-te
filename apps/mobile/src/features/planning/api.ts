import {
  isMockExam,
  addDays,
  toIsoDate,
  type Activity,
  type IsoDate,
  type PlannableTask,
  type PlannedDay,
  type TaskKind,
  type TaskPriority,
} from '@cote-a-cote/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from '@/lib/uuid';

import { OFFLINE_MUTATIONS, type CompleteItemVariables } from '@/features/offline/mutations';
import { syncReminders } from '@/features/reminders/sync';
import { supabase } from '@/lib/supabase';

export interface UpcomingTask extends PlannableTask {
  description: string;
  reference: string | null;
}

interface TaskWithItems {
  id: string;
  subject: string;
  kind: TaskKind;
  description: string;
  reference: string | null;
  due_date: string;
  priority: TaskPriority;
  study_session_task: { minutes: number; done_at: string | null }[];
}

/** Tâches validées à venir, avec le temps déjà travaillé (entrée de l'algorithme de planning). */
export function useUpcomingTasks(childId: string) {
  return useQuery({
    queryKey: ['tasks', childId, 'upcoming'],
    queryFn: async (): Promise<UpcomingTask[]> => {
      const today = toIsoDate(new Date());
      const { data, error } = await supabase
        .from('task')
        .select(
          'id, subject, kind, description, reference, due_date, priority, study_session_task(minutes, done_at)',
        )
        .eq('child_id', childId)
        .eq('status', 'validated')
        .gte('due_date', today)
        .order('due_date');
      if (error) throw error;
      return (data as TaskWithItems[]).map((task) => ({
        id: task.id,
        subject: task.subject,
        kind: task.kind,
        description: task.description,
        reference: task.reference,
        dueDate: task.due_date,
        priority: task.priority,
        mockExam: task.kind === 'examen' && isMockExam(task.description),
        doneMinutes: task.study_session_task
          .filter((item) => item.done_at !== null)
          .reduce((sum, item) => sum + item.minutes, 0),
      }));
    },
  });
}

export interface UndatedTask {
  id: string;
  subject: string;
  kind: TaskKind;
  description: string;
  priority: TaskPriority;
}

/** Tâches validées sans date : le parent leur en donne une pour qu'elles entrent dans le planning. */
export function useUndatedTasks(childId: string) {
  return useQuery({
    queryKey: ['tasks', childId, 'undated'],
    queryFn: async (): Promise<UndatedTask[]> => {
      const { data, error } = await supabase
        .from('task')
        .select('id, subject, kind, description, priority')
        .eq('child_id', childId)
        .eq('status', 'validated')
        .is('due_date', null)
        .order('created_at');
      if (error) throw error;
      return data as UndatedTask[];
    },
  });
}

/** Le parent change la priorité ou l'échéance d'une tâche depuis le planning. */
export function useUpdateTaskPlanning(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { priority?: TaskPriority; due_date?: IsoDate | null };
    }) => {
      const { error } = await supabase.from('task').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', childId] }),
  });
}

/**
 * Tâche retirée par le parent : « supprimer » (la tâche, sa fiche, ses cartes et ses activités) ou « fait » (déjà
 * faite : gardée dans l'historique, retirée des séances à venir). Voir remove_task.
 */
export function useRemoveTask(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: 'supprimer' | 'fait' }) => {
      const { error } = await supabase.rpc('remove_task', { p_task_id: id, p_mode: mode });
      if (error) throw new Error(error.code === 'P0001' ? error.message : 'Le retrait a échoué. Réessayez.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', childId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', childId] });
      queryClient.invalidateQueries({ queryKey: ['study_packs'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      void syncReminders();
    },
  });
}

export interface SessionItem {
  task_id: string;
  minutes: number;
  activity: Activity;
  done_at: string | null;
  task: {
    subject: string;
    kind: TaskKind;
    description: string;
    reference: string | null;
    due_date: string | null;
  };
}

export interface StudySession {
  id: string;
  scheduled_on: IsoDate;
  duration_minutes: number;
  status: 'draft' | 'planned' | 'done' | 'skipped';
  study_session_task: SessionItem[];
}

const SESSION_COLUMNS =
  'id, scheduled_on, duration_minutes, status, study_session_task(task_id, minutes, activity, done_at, task(subject, kind, description, reference, due_date))';

/** Sessions planifiées de `from` à `from + days - 1`. */
export function sessionsQuery(childId: string, from: IsoDate, days = 7) {
  return queryOptions({
    queryKey: ['sessions', childId, from, days],
    queryFn: async (): Promise<StudySession[]> => {
      const { data, error } = await supabase
        .from('study_session')
        .select(SESSION_COLUMNS)
        .eq('child_id', childId)
        .gte('scheduled_on', from)
        .lte('scheduled_on', addDays(from, days - 1))
        .order('scheduled_on');
      if (error) throw error;
      return data as unknown as StudySession[];
    },
  });
}

export function useSessions(childId: string, from: IsoDate, days = 7) {
  return useQuery(sessionsQuery(childId, from, days));
}

export function usePublishPlan(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, days }: { from: IsoDate; days: PlannedDay[] }) => {
      const { error } = await supabase.rpc('publish_plan', {
        p_child_id: childId,
        p_from: from,
        p_days: days,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', childId] });
      void syncReminders();
    },
  });
}

/** Variables d'une activité cochée : tout ce qu'il faut pour l'envoyer plus tard, hors connexion. */
export function completeItemVariables(
  childId: string,
  session: StudySession,
  taskId: string,
): CompleteItemVariables {
  const item = session.study_session_task.find((i) => i.task_id === taskId);
  const closesSession = session.study_session_task.every((i) => i.task_id === taskId || i.done_at !== null);
  return {
    childId,
    sessionId: session.id,
    taskId,
    doneAt: new Date().toISOString(),
    closesSession,
    events: [
      { id: randomUUID(), type: 'activite', meta: { task_id: taskId, minutes: item?.minutes ?? 0 } },
      ...(closesSession
        ? [{ id: randomUUID(), type: 'session' as const, meta: { session_id: session.id } }]
        : []),
    ],
  };
}

/**
 * L'enfant coche une activité ; la session est terminée quand tout est fait.
 * L'écran est mis à jour tout de suite ; l'envoi attend le réseau si nécessaire.
 */
export function useCompleteItem(childId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CompleteItemVariables>({
    mutationKey: OFFLINE_MUTATIONS.completeItem,
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ['sessions', childId] });
      queryClient.setQueriesData<StudySession[]>({ queryKey: ['sessions', childId] }, (sessions) =>
        sessions?.map((s) =>
          s.id !== v.sessionId
            ? s
            : {
                ...s,
                status: v.closesSession ? 'done' : s.status,
                study_session_task: s.study_session_task.map((i) =>
                  i.task_id === v.taskId ? { ...i, done_at: v.doneAt } : i,
                ),
              },
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', childId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', childId] });
      queryClient.invalidateQueries({ queryKey: ['effort', childId] });
    },
  });
}
