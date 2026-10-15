import { subjectProgress, type SubjectStats } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Effort et résultats aux quiz par matière depuis une date (fonction SQL child_subject_stats). */
export function useSubjectProgress(childId: string, since: string) {
  return useQuery({
    queryKey: ['subject_stats', childId, since],
    enabled: childId.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('child_subject_stats', {
        p_child_id: childId,
        p_since: since,
      });
      if (error) throw error;
      const rows = (data ?? []) as {
        subject: string;
        minutes: number;
        activities: number;
        cards: number;
        quizzes: number;
        quiz_score: number;
        quiz_total: number;
      }[];
      return subjectProgress(
        rows.map((r): SubjectStats => ({
          subject: r.subject,
          minutes: r.minutes,
          activities: r.activities,
          cards: r.cards,
          quizzes: r.quizzes,
          quizScore: r.quiz_score,
          quizTotal: r.quiz_total,
        })),
      );
    },
  });
}
