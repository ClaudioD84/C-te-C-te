import type { BagItem, Weekday } from '@cote-a-cote/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

const key = (childId: string) => ['school_bag', childId] as const;

export function useSchoolBag(childId: string) {
  return useQuery({
    queryKey: key(childId),
    enabled: childId.length > 0,
    queryFn: async (): Promise<BagItem[]> => {
      const { data, error } = await supabase
        .from('school_bag_item')
        .select('id, label, days')
        .eq('child_id', childId)
        .order('created_at');
      if (error) throw error;
      return data.map((row) => ({
        id: String(row.id),
        label: String(row.label),
        days: row.days as Weekday[],
      }));
    },
  });
}

export function useAddBagItem(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: { label: string; days: Weekday[] }) => {
      const { error } = await supabase
        .from('school_bag_item')
        .insert({ child_id: childId, label: item.label.trim(), days: item.days });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}

export function useRemoveBagItem(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('school_bag_item').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(childId) }),
  });
}

/** Affaires cochées pour un jour, gardées sur l'appareil. */
export function useBagChecks(childId: string, date: string) {
  const storageKey = `cartable:${childId}:${date}`;
  const [checked, setChecked] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => setChecked(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => setChecked([]));
  }, [storageKey]);
  const toggle = useCallback(
    (id: string) =>
      setChecked((current) => {
        const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => undefined);
        return next;
      }),
    [storageKey],
  );
  return { checked, toggle };
}
