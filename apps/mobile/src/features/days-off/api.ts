import { toIsoDate, type DayOffKind, type IsoDate } from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface DayOff {
  id: string;
  start: IsoDate;
  end: IsoDate;
  kind: DayOffKind;
}

const key = (childId: string) => ['day_off', childId] as const;

/** Congés et absences en cours ou à venir. */
export function useDaysOff(childId: string) {
  return useQuery({
    queryKey: key(childId),
    enabled: childId.length > 0,
    queryFn: async (): Promise<DayOff[]> => {
      const { data, error } = await supabase
        .from('day_off')
        .select('id, start_date, end_date, kind')
        .eq('child_id', childId)
        .gte('end_date', toIsoDate(new Date()))
        .order('start_date');
      if (error) throw error;
      return data.map((row) => ({
        id: row.id as string,
        start: row.start_date as IsoDate,
        end: row.end_date as IsoDate,
        kind: row.kind as DayOffKind,
      }));
    },
  });
}

export function useAddDayOff(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { start: IsoDate; end: IsoDate; kind: DayOffKind }) => {
      const { error } = await supabase
        .from('day_off')
        .insert({ child_id: childId, start_date: v.start, end_date: v.end, kind: v.kind });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}

export function useRemoveDayOff(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('day_off').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}
