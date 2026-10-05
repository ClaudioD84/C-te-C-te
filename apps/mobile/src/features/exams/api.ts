import {
  spreadRevisionThemes,
  toIsoDate,
  type ExamType,
  type IsoDate,
  type RevisionTheme,
  type Weekday,
} from '@cote-a-cote/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
    },
  });
}
