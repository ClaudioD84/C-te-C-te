import {
  daysBetween,
  EXAM_LABELS,
  formatRelativeDate,
  formatShortDate,
  toIsoDate,
  addDays,
  compareWithLastWeek,
  mondayOfWeek,
  schoolLevel,
  weeklyEffort,
} from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCultureSuggestions } from '@/features/culture/api';
import { CultureSuggestions } from '@/features/culture/culture-card';
import { useDeleteExam, useExamProgress, useExams } from '@/features/exams/api';
import { useSessions, useUpcomingTasks } from '@/features/planning/api';
import { useSubjectProgress } from '@/features/progress/api';
import { ComparisonCard, HistoryCard, SubjectsCard } from '@/features/progress/progress-cards';
import { WeeklyReportCard } from '@/features/progress/weekly-report-card';
import { useChildProfile } from '@/features/profiles/api';
import { useRewards } from '@/features/rewards/api';
import { useRelaxMinutes } from '@/features/relax/api';
import { AvatarProgress } from '@/features/rewards/avatar-progress';
import { WeeklyChart } from '@/features/rewards/weekly-chart';

/** Cockpit parent avancé (F7) : effort, régularité, épreuves à venir, activités à rattraper. */
export default function FollowUpScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = toIsoDate(new Date());
  const child = useChildProfile(childId);
  const rewards = useRewards(childId, child.data?.preferences.availableDays);
  const exams = useExams(childId);
  const examProgress = useExamProgress(childId);
  const deleteExam = useDeleteExam(childId);
  const pastSessions = useSessions(childId, addDays(today, -7), 7);
  const upcoming = useUpcomingTasks(childId);
  const SUBJECT_WEEKS = 4;
  const subjects = useSubjectProgress(childId, addDays(mondayOfWeek(today), -7 * (SUBJECT_WEEKS - 1)));
  const thisWeekSubjects = useSubjectProgress(childId, mondayOfWeek(today));
  // Temps de jeu (coin détente) depuis lundi, heure locale : à part du temps de travail.
  const relax = useRelaxMinutes(childId, new Date(`${mondayOfWeek(today)}T00:00:00`).toISOString());
  const culture = useCultureSuggestions(
    child.data?.grade,
    (upcoming.data ?? []).map((t) => t.subject),
  );

  if (!child.data || rewards.isLoading || !rewards.summary) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const weeks = weeklyEffort(rewards.data ?? [], today, 8);
  const kindergarten = schoolLevel(child.data.grade) === 'maternelle';
  const thisWeek = weeks.at(-1)!;
  const missed = (pastSessions.data ?? []).flatMap((session) =>
    session.study_session_task
      .filter((item) => item.done_at === null)
      .map((item) => ({
        date: session.scheduled_on,
        label: `${item.task.subject} · ${item.task.description}`,
      })),
  );

  return (
    <Screen>
      <ThemedText type="subtitle">Suivi de {child.data.alias}</ThemedText>

      <Button
        variant="secondary"
        label="🎁 Récompense en famille"
        onPress={() => router.push({ pathname: '/recompense/[childId]', params: { childId } })}
      />
      <WeeklyReportCard
        alias={child.data.alias}
        week={thisWeek}
        subjects={(thisWeekSubjects.data ?? [])
          .filter((s) => s.minutes + s.activities + s.cards + s.quizzes > 0)
          .map((s) => s.subject)}
        badges={rewards.summary.badges.filter((b) => b.earnedOn >= mondayOfWeek(today)).map((b) => b.code)}
        kindergarten={kindergarten}
      />

      <View style={styles.kpis}>
        <Kpi value={`${thisWeek.minutes} min`} label="de travail cette semaine" />
        <Kpi value={String(rewards.summary.effortDaysThisWeek)} label="jours actifs cette semaine" />
        <Kpi value={String(thisWeek.cards)} label="cartes revues" />
        <Kpi value={String(rewards.summary.badges.length)} label="badges gagnés" />
        {relax.data ? <Kpi value={`${relax.data} min`} label="au coin détente cette semaine" /> : null}
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Minutes de travail par semaine</ThemedText>
        <WeeklyChart weeks={weeks} />
      </ThemedView>

      <ComparisonCard comparisons={compareWithLastWeek(rewards.data ?? [], today)} />

      {subjects.data ? <SubjectsCard subjects={subjects.data} weeks={SUBJECT_WEEKS} /> : null}

      <AvatarProgress summary={rewards.summary} />

      {!kindergarten ? (
        <>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Épreuves à venir</ThemedText>
            {exams.data?.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Aucune épreuve. Créez un dossier de révision pour préparer un CEB, un CE1D ou un bilan.
              </ThemedText>
            ) : null}
            {exams.data?.map((exam) => (
              <View key={exam.id} style={styles.row}>
                <View style={styles.flex}>
                  <ThemedText>
                    {EXAM_LABELS[exam.type]} · {formatShortDate(exam.exam_date)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Dans {daysBetween(today, exam.exam_date)} jours · {exam.subjects.join(', ')}
                  </ThemedText>
                  {examProgress.data?.get(exam.id) ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Révisions faites : {examProgress.data.get(exam.id)!.done} sur{' '}
                      {examProgress.data.get(exam.id)!.total}
                    </ThemedText>
                  ) : null}
                </View>
                <Button
                  variant="secondary"
                  label="Supprimer"
                  accessibilityLabel={`Supprimer le dossier ${EXAM_LABELS[exam.type]}`}
                  onPress={() => deleteExam.mutate(exam.id)}
                />
              </View>
            ))}
            <Button
              label="Nouveau dossier de révision"
              onPress={() => router.push({ pathname: '/examen/nouveau', params: { childId } })}
            />
            {schoolLevel(child.data.grade) === 'secondaire' || child.data.grade === 'P6' ? (
              <Button
                variant="secondary"
                label="📅 Plan de blocus (examens)"
                onPress={() => router.push({ pathname: '/blocus/[childId]', params: { childId } })}
              />
            ) : null}
          </ThemedView>
        </>
      ) : null}

      <CultureSuggestions suggestions={culture.data} />

      <HistoryCard weeks={weeks} />

      {/* En maternelle, rien ne se rattrape : pas de liste « pas encore fait ». */}
      {!kindergarten ? (
        <>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Pas encore fait (7 derniers jours)</ThemedText>
            {missed.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Tout ce qui était prévu a été fait.
              </ThemedText>
            ) : (
              <>
                {missed.map((m, i) => (
                  <ThemedText key={i} type="small">
                    {formatRelativeDate(m.date, today)} : {m.label}
                  </ThemedText>
                ))}
                <ThemedText type="small" themeColor="textSecondary">
                  Recalculez le planning pour répartir ce travail sur les prochains jours.
                </ThemedText>
              </>
            )}
          </ThemedView>
        </>
      ) : null}
    </Screen>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <ThemedView
      type="backgroundElement"
      style={styles.kpi}
      accessible
      accessibilityLabel={`${value} ${label}`}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
