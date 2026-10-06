import {
  type BlocusExam,
  type BlocusTask,
  spreadRevisionThemes,
  toIsoDate,
  type ExamType,
  type IsoDate,
  type RevisionTheme,
  type Weekday,
} from '@cote-a-cote/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncReminders } from '@/features/reminders/sync';
import { supabase } from '@/lib/supabase';

export interface Exam {
  id: string;
  type: ExamType;
  exam_date: IsoDate;
  subjects: string[];
}

export function useExams(childId: string) {
  return useQuery({
    queryKey: ['exams', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<Exam[]> => {
      const { data, error } = await supabase
        .from('exam')
        .select('id, type, exam_date, subjects')
        .eq('child_id', childId)
        .gte('exam_date', toIsoDate(new Date()))
        .order('exam_date');
      if (error) throw error;
      return data as Exam[];
    },
  });
}

export async function proposeThemes(input: {
  childId: string;
  examType: ExamType;
  examDate: IsoDate;
  subjects: string[];
  revisionDays: number;
}): Promise<RevisionTheme[]> {
  const { data, error } = await supabase.functions.invoke('revision-plan', { body: input });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'La préparation du dossier a échoué.');
  }
  if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
  return (data as { themes: RevisionTheme[] }).themes;
}

/** Crée l'épreuve et ses tâches de révision (déjà validées : le parent vient de relire les thèmes). */
export function useCreateExam(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      examType: ExamType;
      examDate: IsoDate;
      subjects: string[];
      themes: RevisionTheme[];
      availableDays: readonly Weekday[];
    }) => {
      const { data: exam, error } = await supabase
        .from('exam')
        .insert({
          child_id: childId,
          type: input.examType,
          exam_date: input.examDate,
          subjects: input.subjects,
        })
        .select('id')
        .single();
      if (error) throw error;

      const tasks = spreadRevisionThemes({
        themes: input.themes,
        today: toIsoDate(new Date()),
        examDate: input.examDate,
        availableDays: input.availableDays,
      });
      const insert = await supabase.from('task').insert(
        tasks.map((task) => ({
          child_id: childId,
          exam_id: exam.id,
          subject: task.subject,
          kind: task.kind,
          description: task.description,
          due_date: task.dueDate,
          status: 'validated',
          confidence: 1,
        })),
      );
      if (insert.error) {
        await supabase.from('exam').delete().eq('id', exam.id);
        throw insert.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', childId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', childId] });
      void syncReminders();
    },
  });
}

export function useDeleteExam(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examId: string) => {
      // Les tâches de révision liées sont supprimées en cascade.
      const { error } = await supabase.from('exam').delete().eq('id', examId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', childId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', childId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', childId] });
      void syncReminders();
    },
  });
}

/**
 * Plan de blocus : un examen (type « bilan ») par matière, avec ses révisions datées. En cas d'échec, rien
 * ne reste à moitié créé.
 */
export function useCreateBlocus(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { exams: readonly BlocusExam[]; tasks: readonly BlocusTask[] }) => {
      const { data: created, error } = await supabase
        .from('exam')
        .insert(
          input.exams.map((e) => ({
            child_id: childId,
            type: 'bilan',
            exam_date: e.date,
            subjects: [e.subject],
          })),
        )
        .select('id, exam_date, subjects');
      if (error) throw error;
      const idOf = (subject: string, date: string) =>
        created.find((e) => e.exam_date === date && (e.subjects as string[])[0] === subject)?.id;
      const insert = await supabase.from('task').insert(
        input.tasks.map((task) => ({
          child_id: childId,
          exam_id: idOf(task.subject, task.examDate),
          subject: task.subject,
          kind: task.kind,
          description: task.description,
          due_date: task.dueDate,
          status: 'validated',
          confidence: 1,
        })),
      );
      if (insert.error) {
        await supabase
          .from('exam')
          .delete()
          .in(
            'id',
            created.map((e) => e.id),
          );
        throw insert.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', childId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', childId] });
      queryClient.invalidateQueries({ queryKey: ['exam_progress', childId] });
      void syncReminders();
    },
  });
}

/** Avancement des révisions de chaque épreuve : tâches faites (cochées au moins une fois) sur le total. */
export function useExamProgress(childId: string) {
  return useQuery({
    queryKey: ['exam_progress', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<Map<string, { done: number; total: number }>> => {
      const { data, error } = await supabase
        .from('task')
        .select('exam_id, status, study_session_task(done_at)')
        .eq('child_id', childId)
        .not('exam_id', 'is', null);
      if (error) throw error;
      const progress = new Map<string, { done: number; total: number }>();
      for (const task of data) {
        const entry = progress.get(String(task.exam_id)) ?? { done: 0, total: 0 };
        entry.total++;
        const items = (task.study_session_task ?? []) as { done_at: string | null }[];
        if (task.status === 'done' || items.some((i) => i.done_at !== null)) entry.done++;
        progress.set(String(task.exam_id), entry);
      }
      return progress;
    },
  });
}
