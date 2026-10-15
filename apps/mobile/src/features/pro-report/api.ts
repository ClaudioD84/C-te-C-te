import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Demandes d'aide de l'enfant depuis une date, regroupées par matière. */
export function useHelpBySubject(childId: string, since: string) {
  return useQuery({
    queryKey: ['help_by_subject', childId, since],
    enabled: childId.length > 0,
    queryFn: async (): Promise<{ subject: string; count: number }[]> => {
      const { data, error } = await supabase
        .from('help_request')
        .select('task(subject)')
        .eq('child_id', childId)
        .gte('created_at', since);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data as unknown as { task: { subject: string } | null }[]) {
        const subject = row.task?.subject ?? 'Autre';
        counts.set(subject, (counts.get(subject) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
}
