import {
  addDays,
  alternativeKindergartenActivity,
  kindergartenActivity,
  mondayOfWeek,
  suggestKindergartenWeek,
  toIsoDate,
  type ChildPreferences,
  type Grade,
  type IsoDate,
  type KindergartenActivity,
} from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OFFLINE_MUTATIONS, type LearningEventVariables } from '@/features/offline/mutations';
import { supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/uuid';

/** Fenêtre lue pour éviter de reproposer une activité récente (voir suggestKindergartenWeek). */
const HISTORY_DAYS = 28;

export interface KindergartenWeek {
  weekStart: IsoDate;
  theme: string | null;
  activities: KindergartenActivity[];
  /** Codes des activités faites cette semaine. */
  doneThisWeek: Set<string>;
  /** Choix enregistrés par le parent (sinon proposition calculée). */
  customized: boolean;
}

const weekKey = (childId: string, weekStart: IsoDate) => ['kindergarten_week', childId, weekStart] as const;

/** Activités de la semaine d'un enfant de maternelle : choix du parent, ou proposition stable. */
export function useKindergartenWeek(childId: string, grade: Grade | undefined, date = toIsoDate(new Date())) {
  const weekStart = mondayOfWeek(date);
  return useQuery({
    queryKey: weekKey(childId, weekStart),
    enabled: childId.length > 0 && Boolean(grade),
    queryFn: async (): Promise<KindergartenWeek> => {
      const since = addDays(weekStart, -HISTORY_DAYS);
      const [row, events, profile] = await Promise.all([
        supabase
          .from('kindergarten_week')
          .select('theme, activity_codes')
          .eq('child_id', childId)
          .eq('week_start', weekStart)
          .maybeSingle(),
        supabase
          .from('learning_event')
          .select('meta, created_at')
          .eq('child_id', childId)
          .eq('type', 'activite')
          .gte('created_at', `${since}T00:00:00`)
          .not('meta->>kindergarten', 'is', null),
        supabase.from('child_profile').select('preferences').eq('id', childId).single(),
      ]);
      if (row.error) throw row.error;
      if (events.error) throw events.error;
      if (profile.error) throw profile.error;
      const interests = (profile.data.preferences as ChildPreferences).interests ?? [];

      const done = events.data.map((e) => ({
        code: String((e.meta as { kindergarten: string }).kindergarten),
        date: toIsoDate(new Date(e.created_at as string)),
      }));
      const theme = (row.data?.theme as string | null) ?? null;
      const codes = row.data?.activity_codes as string[] | null | undefined;
      const activities = codes
        ? codes.map(kindergartenActivity).filter((a): a is KindergartenActivity => Boolean(a))
        : suggestKindergartenWeek({ childId, grade: grade!, weekStart, theme, interests, done });
      return {
        weekStart,
        theme,
        activities,
        doneThisWeek: new Set(done.filter((d) => d.date >= weekStart).map((d) => d.code)),
        customized: Boolean(codes),
      };
    },
  });
}

/** Thème de la classe : la proposition est recalculée (les remplacements faits sont oubliés). */
export function useSetKindergartenTheme(childId: string, weekStart: IsoDate) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (theme: string) => {
      const { error } = await supabase
        .from('kindergarten_week')
        .upsert(
          { child_id: childId, week_start: weekStart, theme: theme.trim() || null, activity_codes: null },
          { onConflict: 'child_id,week_start' },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weekKey(childId, weekStart) }),
  });
}

/** Remplace une activité de la semaine par une autre du même domaine (ou par celle choisie). */
export function useReplaceKindergartenActivity(
  childId: string,
  grade: Grade,
  week: KindergartenWeek | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, replacement }: { code: string; replacement?: string }) => {
      if (!week) return;
      const current = week.activities.map((a) => a.code);
      const next = replacement ?? alternativeKindergartenActivity(grade, code, current)?.code;
      if (!next) return;
      const codes = current.includes(code) ? current.map((c) => (c === code ? next : c)) : [...current, next];
      const { error } = await supabase
        .from('kindergarten_week')
        .upsert(
          { child_id: childId, week_start: week.weekStart, theme: week.theme, activity_codes: codes },
          { onConflict: 'child_id,week_start' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      if (week) void queryClient.invalidateQueries({ queryKey: weekKey(childId, week.weekStart) });
    },
  });
}

/**
 * « On l'a fait ! » : inscrit l'activité dans le journal de l'effort (avatar, badges, suivi).
 * Passe par la file d'attente hors connexion, comme les autres actions de l'enfant.
 */
export function useLogKindergartenActivity(childId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, LearningEventVariables>({
    mutationKey: OFFLINE_MUTATIONS.learningEvent,
    onMutate: async (variables) => {
      // Affichage immédiat, même hors connexion.
      const code = String(variables.meta.kindergarten);
      queryClient.setQueriesData<KindergartenWeek>({ queryKey: ['kindergarten_week', childId] }, (week) =>
        week ? { ...week, doneThisWeek: new Set([...week.doneThisWeek, code]) } : week,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['effort', childId] });
      void queryClient.invalidateQueries({ queryKey: ['curriculum_seen', childId] });
    },
  });
  return (activity: KindergartenActivity) =>
    mutation.mutate({
      id: randomUUID(),
      childId,
      type: 'activite',
      meta: {
        kindergarten: activity.code,
        minutes: activity.minutes,
        subject: activity.subject,
        curriculum_code: activity.curriculumCode,
      },
      at: new Date().toISOString(),
    });
}
