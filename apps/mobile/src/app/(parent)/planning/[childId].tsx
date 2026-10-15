import {
  addDays,
  addItem,
  blocusWeekendDates,
  datesInRanges,
  defaultDailyCapacity,
  deriveLearningSettings,
  estimateTaskMinutes,
  moveItem,
  needsStudyPack,
  planWeek,
  refreshLoadAlerts,
  relabelEvaluations,
  removeItem,
  setItemMinutes,
  TASK_KIND_LABELS,
  type Activity,
  type IsoDate,
  type TaskKind,
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
import { useExams } from '@/features/exams/api';
import { usePublishPlan, useSessions, useUpcomingTasks } from '@/features/planning/api';
import { EditableDayCard } from '@/features/planning/editable-day-card';
import { alertText } from '@/features/planning/labels';
import { PlanSettingsCard, type PlanSettings } from '@/features/planning/plan-settings-card';
import { TaskPrioritiesCard } from '@/features/planning/task-priorities-card';
import { useChildProfile, useSavePlanningPreferences } from '@/features/profiles/api';
import { PaperWeekCard } from '@/features/print/paper-week-card';
import { preparePacks } from '@/features/study/api';
import { AlertBox, DayCard } from '@/features/planning/day-card';
import { useToday } from '@/hooks/use-today';

const FIRST_ACTIVITY: Record<TaskKind, Activity> = {
  devoir: 'faire',
  lecon: 'etudier',
  interro: 'reviser',
  examen: 'reviser',
};

/** Planning (F4) avec régulation de la charge (F8). Le parent règle, retouche et valide avant publication. */
export default function PlanningScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = useToday();
  const child = useChildProfile(childId);
  const tasks = useUpcomingTasks(childId);
  // Deux semaines : un planning publié sur deux semaines reste visible en entier.
  const sessions = useSessions(childId, today, 14);
  const publish = usePublishPlan(childId);
  const daysOff = useDaysOff(childId);
  const exams = useExams(childId);
  const savePreferences = useSavePlanningPreferences(childId);
  const queryClient = useQueryClient();
  const [extraDates, setExtraDates] = useState<IsoDate[]>([]);
  const [lightWeek, setLightWeek] = useState(false);
  const [preview, setPreview] = useState<WeekPlan | null>(null);
  // Retouche du planning déjà publié (sans nouveau calcul).
  const [editingPublished, setEditingPublished] = useState(false);
  const [chosenSettings, setChosenSettings] = useState<PlanSettings | null>(null);
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);

  if (child.isLoading || tasks.isLoading || sessions.isLoading || exams.isLoading) {
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
  const learning = deriveLearningSettings(profile);
  const autoMinutes = defaultDailyCapacity(profile.grade);
  const settings: PlanSettings = chosenSettings ?? {
    strategy: profile.preferences.planningStrategy ?? 'reguliere',
    dailyMinutes: profile.preferences.dailyMinutes,
    days: profile.preferences.planningDays ?? 7,
  };
  const capacity = settings.dailyMinutes ?? autoMinutes;
  const evaluationIds = new Set(
    tasks.data.filter((t) => t.kind === 'interro' || t.kind === 'examen').map((t) => t.id),
  );
  // Libellés : tâches à venir, et celles d'un planning publié dont l'échéance est passée.
  const sessionTasks = new Map(
    sessions.data.flatMap((s) => s.study_session_task.map((i) => [i.task_id, i.task] as const)),
  );
  const labelOf = (taskId: string) => {
    const task = taskById.get(taskId) ?? sessionTasks.get(taskId);
    return task ? `${task.subject} · ${task.description} (${TASK_KIND_LABELS[task.kind]})` : 'Tâche';
  };

  function compute(extra: IsoDate[], light = lightWeek, chosen = settings) {
    const horizon = chosen.days;
    setExtraDates(extra);
    setLightWeek(light);
    setEditingPublished(false);
    setPreview(
      planWeek({
        tasks: tasks.data ?? [],
        today,
        grade: profile.grade,
        availableDays: profile.preferences.availableDays,
        workMinutes: learning.workMinutes,
        dailyCapacityMinutes: chosen.dailyMinutes,
        horizonDays: horizon,
        strategy: chosen.strategy,
        // Plan de blocus « avec week-end » : samedi et dimanche s'ajoutent jusqu'au dernier examen.
        extraDates: [
          ...new Set([
            ...extra,
            ...blocusWeekendDates(exams.data ?? [], today, profile.preferences.availableDays),
          ]),
        ],
        blockedDates: datesInRanges(daysOff.data ?? [], today, addDays(today, horizon - 1)),
        lightWeek: light,
      }),
    );
  }

  /** Les réglages sont gardés pour la prochaine fois, et la proposition est recalculée. */
  function changeSettings(next: PlanSettings) {
    setChosenSettings(next);
    savePreferences.mutate({
      planningStrategy: next.strategy,
      dailyMinutes: next.dailyMinutes,
      planningDays: next.days,
    });
    compute(extraDates, lightWeek, next);
  }

  /** Le planning publié devient une proposition retouchable (les activités déjà faites restent faites). */
  function editPublished() {
    const days = (sessions.data ?? [])
      .map((session) => {
        const items = session.study_session_task
          .filter((item) => item.done_at === null)
          .map((item) => ({ taskId: item.task_id, minutes: item.minutes, activity: item.activity }));
        return {
          date: session.scheduled_on,
          items,
          totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
        };
      })
      .filter((day) => day.items.length > 0);
    setEditingPublished(true);
    setPreview(refreshLoadAlerts({ days, alerts: [] }, capacity));
  }

  function edit(change: (plan: WeekPlan) => WeekPlan) {
    setPreview(
      (plan) => plan && refreshLoadAlerts(relabelEvaluations(change(plan), evaluationIds), capacity),
    );
  }

  if (preview) {
    const weekendAlert = preview.alerts.find((a) => a.type === 'week_end_conseille');
    const blocked = new Set(datesInRanges(daysOff.data ?? [], today, addDays(today, settings.days - 1)));
    // Tous les jours de la période, et ceux d'un planning publié plus long.
    const dates = [
      ...new Set([
        ...Array.from({ length: settings.days }, (_, i) => addDays(today, i)),
        ...preview.days.map((day) => day.date),
      ]),
    ].sort();
    const open = dates.filter((date) => !blocked.has(date));
    return (
      <Screen>
        <ThemedText type="subtitle">{editingPublished ? 'Modifier le planning' : 'Proposition'}</ThemedText>
        <PlanSettingsCard settings={settings} autoMinutes={autoMinutes} onChange={changeSettings} />
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
          <ThemedText themeColor="textSecondary">
            Rien à planifier sur cette période : ajoutez une tâche à un jour si besoin.
          </ThemedText>
        ) : null}
        {dates.map((date) => (
          <EditableDayCard
            key={date}
            date={date}
            day={preview.days.find((day) => day.date === date)}
            today={today}
            capacity={capacity}
            blocked={blocked.has(date)}
            otherDates={open.filter((other) => other !== date)}
            tasks={tasks.data ?? []}
            labelOf={labelOf}
            edits={{
              onMinutes: (taskId, minutes) => edit((plan) => setItemMinutes(plan, date, taskId, minutes)),
              onMove: (taskId, to) => edit((plan) => moveItem(plan, date, taskId, to)),
              onRemove: (taskId) => edit((plan) => removeItem(plan, date, taskId)),
              onAdd: (taskId) => {
                const task = taskById.get(taskId);
                if (!task) return;
                const left = estimateTaskMinutes(task.kind, profile.grade) - (task.doneMinutes ?? 0);
                edit((plan) =>
                  addItem(plan, date, {
                    taskId,
                    minutes: Math.min(Math.max(left, 10), learning.workMinutes),
                    activity: task.mockExam ? 'se_tester' : FIRST_ACTIVITY[task.kind],
                  }),
                );
              },
            }}
          />
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
                  setPreview(null);
                  setEditingPublished(false);
                  // Fiches préparées à la demande (console de l'enfant, 3 jours d'avance) ; seulement pour
                  // l'impression d'avance quand l'enfant préfère le papier.
                  if (!profile.preferences.prefersPaper) return;
                  const toStudy = [
                    ...new Set(
                      preview.days.flatMap((d) =>
                        d.items
                          .filter((i) => i.activity !== 'faire')
                          .map((i) => i.taskId)
                          // Pas de fiche IA pour un chapitre de blocus sans nom.
                          .filter((id) => {
                            const task = taskById.get(id);
                            return !task || needsStudyPack(task);
                          }),
                      ),
                    ),
                  ];
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
        <Button
          variant="secondary"
          label="Annuler"
          onPress={() => {
            setPreview(null);
            setEditingPublished(false);
          }}
        />
      </Screen>
    );
  }

  // La version papier reste celle de la semaine.
  const weekSessions = sessions.data.filter((s) => s.scheduled_on <= addDays(today, 6));

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

      {sessions.data.length > 0 ? (
        <Button variant="secondary" label="Modifier le planning" onPress={editPublished} />
      ) : null}

      <PaperWeekCard profile={profile} tasks={tasks.data} sessions={weekSessions} />

      <TaskPrioritiesCard childId={childId} tasks={tasks.data} />

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
