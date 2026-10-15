import type { CultureKind, Grade } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface CultureSuggestion {
  id: string;
  kind: CultureKind;
  title: string;
  description: string;
  url: string | null;
  place: string | null;
  subjects: string[];
}

/** Suggestions vérifiées pour l'année de l'enfant et les matières du moment. */
export function useCultureSuggestions(grade: Grade | undefined, subjects: string[]) {
  const key = [...new Set(subjects)].sort();
  return useQuery({
    queryKey: ['culture', grade, key],
    enabled: Boolean(grade) && key.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<CultureSuggestion[]> => {
      const { data, error } = await supabase
        .from('cultural_resource')
        .select('id, kind, title, description, url, place, subjects')
        .contains('grades', [grade])
        .overlaps('subjects', key)
        .limit(6);
      if (error) throw error;
      return data as CultureSuggestion[];
    },
  });
}
