import {
  addDays,
  datesInRanges,
  deriveLearningSettings,
  planWeek,
  toIsoDate,
  type IsoDate,
  type WeekPlan,
} from '@cote-a-cote/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DaysOffCard } from '@/features/days-off/days-off-card';
import { SpellingCard } from '@/features/spelling/spelling-card';
import { TeacherNoteCard } from '@/features/teacher/teacher-note-card';
import { useDaysOff } from '@/features/days-off/api';
import { usePublishPlan, useSessions, useUpcomingTasks } from '@/features/planning/api';
import { alertText } from '@/features/planning/labels';
import { useChildProfile } from '@/features/profiles/api';
import { PaperWeekCard } from '@/features/print/paper-week-card';
import { preparePacks } from '@/features/study/api';
import { AlertBox, DayCard } from '@/features/planning/day-card';

/** Planning de la semaine (F4) avec régulation de la charge (F8). Le parent valide avant publication. */
export default function PlanningScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = toIsoDate(new Date());
  const child = useChildProfile(childId);
  const tasks = useUpcomingTasks(childId);
  const sessions = useSessions(childId, today);
  const publish = usePublishPlan(childId);
  const daysOff = useDaysOff(childId);
  const queryClient = useQueryClient();
  const [extraDates, setExtraDates] = useState<IsoDate[]>([]);
  const [lightWeek, setLightWeek] = useState(false);
  const [preview, setPreview] = useState<WeekPlan | null>(null);
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);

  if (child.isLoading || tasks.isLoading || sessions.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!child.data || !tasks.data || !sessions.data) {
    return (
      <Screen>
        <ThemedText themeColor="danger">Impossible de charger le planning.</ThemedText>
      </Screen>
    );
  }

  const profile = child.data;
  const taskById = new Map(tasks.data.map((t) => [t.id, t]));

  function compute(extra: IsoDate[], light = lightWeek) {
    const settings = deriveLearningSettings(profile);
    setExtraDates(extra);
    setLightWeek(light);
    setPreview(
      planWeek({
        tasks: tasks.data ?? [],
        today,
        grade: profile.grade,
        availableDays: profile.preferences.availableDays,
        workMinutes: settings.workMinutes,
        extraDates: extra,
        blockedDates: datesInRanges(daysOff.data ?? [], today, addDays(today, 6)),
        lightWeek: light,
      }),
    );
  }

  if (preview) {
    const weekendAlert = preview.alerts.find((a) => a.type === 'week_end_conseille');
    return (
      <Screen>
        <ThemedText type="subtitle">Proposition</ThemedText>
        <Button
          variant="secondary"
          label={lightWeek ? 'Revenir au planning complet' : 'Semaine chargée : l’essentiel seulement'}
          onPress={() => compute(extraDates, !lightWeek)}
        />
        {preview.alerts.map((alert, i) => (
          <AlertBox key={i} text={alertText(alert, today)} />
        ))}
        {weekendAlert ? (
          <Button
            variant="secondary"
            label="Ajouter le week-end au planning"
            onPress={() => compute([...extraDates, ...weekendAlert.dates])}
          />
        ) : null}
        {preview.days.length === 0 ? (
          <ThemedText themeColor="textSecondary">Rien à planifier cette semaine.</ThemedText>
        ) : null}
        {preview.days.map((day) => (
          <DayCard key={day.date} day={day} today={today} taskById={taskById} />
        ))}
        {publish.error ? (
          <ThemedText themeColor="danger">La publication a échoué. Réessayez.</ThemedText>
        ) : null}
        <Button
          label="Publier sur la console de l'enfant"
          loading={publish.isPending}
          onPress={() =>
            publish.mutate(
              { from: today, days: preview.days },
              {
                onSuccess: () => {
                  // Fiches et quiz préparés à l'avance pour les leçons et évaluations de la semaine.
                  const toStudy = [
                    ...new Set(
                      preview.days.flatMap((d) =>
                        d.items.filter((i) => i.activity !== 'faire').map((i) => i.taskId),
                      ),
                    ),
                  ];
                  setPreview(null);
                  if (toStudy.length > 0) {
                    setPreparing({ done: 0, total: toStudy.length });
                    preparePacks(toStudy, (done) => setPreparing({ done, total: toStudy.length })).finally(
                      () => {
                        setPreparing(null);
                        // Les fiches viennent d'être préparées : la carte « Version papier » peut les proposer.
                        void queryClient.invalidateQueries({ queryKey: ['study_packs'] });
                      },
                    );
                  }
                },
              },
            )
          }
        />
        <Button variant="secondary" label="Annuler" onPress={() => setPreview(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Semaine de {profile.alias}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {tasks.data.length === 0
          ? 'Aucune tâche validée à venir. Photographiez le journal de classe pour commencer.'
          : `${tasks.data.length} tâche${tasks.data.length > 1 ? 's' : ''} à venir.`}
      </ThemedText>

      {preparing ? (
        <ThemedText themeColor="warning" accessibilityLiveRegion="polite">
          Préparation des fiches et quiz : {preparing.done} sur {preparing.total}…
        </ThemedText>
      ) : null}

      {sessions.data.length === 0 ? (
        <ThemedText>Aucun planning publié pour les prochains jours.</ThemedText>
      ) : (
        sessions.data.map((session) => (
          <DayCard
            key={session.id}
            today={today}
            taskById={taskById}
            day={{
              date: session.scheduled_on,
              totalMinutes: session.study_session_task.reduce((s, i) => s + i.minutes, 0),
              items: session.study_session_task.map((item) => ({
                taskId: item.task_id,
                minutes: item.minutes,
                activity: item.activity,
                done: item.done_at !== null,
                label: `${item.task.subject} · ${item.task.description}`,
              })),
            }}
          />
        ))
      )}

      <PaperWeekCard profile={profile} tasks={tasks.data} sessions={sessions.data} />

      {tasks.data.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Fiches, quiz et impression</ThemedText>
          {tasks.data.map((task) => (
            <Button
              key={task.id}
              variant="secondary"
              label={`${task.subject} · ${task.description}`}
              onPress={() => router.push({ pathname: '/paquet/[taskId]', params: { taskId: task.id } })}
            />
          ))}
        </ThemedView>
      ) : null}

      <TeacherNoteCard childId={childId} />
      <SpellingCard childId={childId} alias={profile.alias} />
      <DaysOffCard childId={childId} />

      <Button
        variant="secondary"
        label="Voir le programme de l'année"
        onPress={() => router.push({ pathname: '/programme/[childId]', params: { childId } })}
      />
      <Button
        label={sessions.data.length === 0 ? 'Calculer le planning' : 'Recalculer le planning'}
        disabled={tasks.data.length === 0}
        onPress={() => compute([])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
