import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface CurriculumLink {
  id: string;
  code: string;
  subject: string;
  label: string;
}

/** Attendu du programme auquel une tâche est rattachée (F2), ou null. */
export function useTaskCurriculum(taskId: string) {
  return useQuery({
    queryKey: ['task_curriculum', taskId],
    enabled: taskId.length > 0,
    queryFn: async (): Promise<CurriculumLink | null> => {
      const { data, error } = await supabase
        .from('task')
        .select('curriculum_item(id, code, subject, label)')
        .eq('id', taskId)
        .single();
      if (error) throw error;
      return (data.curriculum_item as unknown as CurriculumLink | null) ?? null;
    },
  });
}

/** Attendus d'une matière pour l'année et la filière de l'enfant (choix d'un rattachement). */
export function useCurriculumExpectations(
  grade: string | undefined,
  track: string | undefined,
  subject: string,
) {
  return useQuery({
    queryKey: ['curriculum_expectations', grade, track, subject],
    enabled: Boolean(grade && track),
    staleTime: Infinity,
    queryFn: async (): Promise<CurriculumLink[]> => {
      const { data, error } = await supabase
        .from('curriculum_item')
        .select('id, code, subject, label')
        .contains('grades', [grade])
        .contains('tracks', [track])
        .eq('subject', subject)
        .eq('kind', 'attendu')
        .order('created_at')
        .limit(1000);
      if (error) throw error;
      return data as CurriculumLink[];
    },
  });
}

/** Le parent corrige (ou retire) le rattachement proposé par l'IA. */
export function useSetTaskCurriculum(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (curriculumItemId: string | null) => {
      const { error } = await supabase
        .from('task')
        .update({ curriculum_item_id: curriculumItemId })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_curriculum', taskId] });
      queryClient.invalidateQueries({ queryKey: ['curriculum_seen'] });
    },
  });
}

/** Attendus déjà travaillés par l'enfant (tâches rattachées, activités de maternelle), pour la vue « Programme de l'année ». */
export function useSeenExpectations(childId: string) {
  return useQuery({
    queryKey: ['curriculum_seen', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('task')
        .select('curriculum_item_id')
        .eq('child_id', childId)
        .not('curriculum_item_id', 'is', null);
      if (error) throw error;
      const seen = new Set(data.map((row) => String(row.curriculum_item_id)));

      // Maternelle : les activités faites portent le code de l'attendu travaillé.
      const events = await supabase
        .from('learning_event')
        .select('meta')
        .eq('child_id', childId)
        .eq('type', 'activite')
        .not('meta->>curriculum_code', 'is', null)
        .limit(1000);
      if (events.error) throw events.error;
      const codes = [
        ...new Set(
          events.data.map((row) => String((row.meta as { curriculum_code: string }).curriculum_code)),
        ),
      ];
      if (codes.length > 0) {
        const items = await supabase.from('curriculum_item').select('id').in('code', codes);
        if (items.error) throw items.error;
        for (const item of items.data) seen.add(String(item.id));
      }
      return seen;
    },
  });
}
