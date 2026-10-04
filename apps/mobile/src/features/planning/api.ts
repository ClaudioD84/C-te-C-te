import {
  addDays,
  toIsoDate,
  type Activity,
  type IsoDate,
  type PlannableTask,
  type PlannedDay,
  type TaskKind,
} from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
        .select('id, subject, kind, description, reference, due_date, study_session_task(minutes, done_at)')
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
        doneMinutes: task.study_session_task
          .filter((item) => item.done_at !== null)
          .reduce((sum, item) => sum + item.minutes, 0),
      }));
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
export function useSessions(childId: string, from: IsoDate, days = 7) {
  return useQuery({
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', childId] }),
  });
}

/** L'enfant coche une activité ; la session est terminée quand tout est fait. */
export function useCompleteItem(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ session, taskId }: { session: StudySession; taskId: string }) => {
      const { error } = await supabase
        .from('study_session_task')
        .update({ done_at: new Date().toISOString() })
        .eq('session_id', session.id)
        .eq('task_id', taskId);
      if (error) throw error;

      const allDone = session.study_session_task.every(
        (item) => item.task_id === taskId || item.done_at !== null,
      );
      if (allDone) {
        const update = await supabase.from('study_session').update({ status: 'done' }).eq('id', session.id);
        if (update.error) throw update.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', childId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', childId] });
    },
  });
}
