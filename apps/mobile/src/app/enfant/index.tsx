import {
  ACTIVITY_PICTOGRAMS,
  BADGES,
  deriveLearningSettings,
  gradeYear,
  schoolLevel,
  subjectPictogram,
  toIsoDate,
  type LearningSettings,
} from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { KindergartenMission } from '@/features/kindergarten/kindergarten-mission';
import { MOODS, MoodPicker, useTodayMood } from '@/features/mood/mood';
import { ExpressReviewCard } from '@/features/express/express-review-card';
import { HolidayBanner } from '@/features/holidays/holiday-banner';
import { NoteCard } from '@/features/notes/note-card';
import { BreathingExercise } from '@/features/mission/breathing-exercise';
import { PomodoroTimer } from '@/features/mission/pomodoro-timer';
import { OfflineBanner, useIsOnline } from '@/features/offline/offline-banner';
import { usePrepareOffline } from '@/features/offline/use-prepare-offline';
import {
  completeItemVariables,
  useCompleteItem,
  useSessions,
  type SessionItem,
  type StudySession,
} from '@/features/planning/api';
import { CHILD_ACTIVITY_PREFIX } from '@/features/planning/labels';
import { useChildProfile } from '@/features/profiles/api';
import { useNewBadges, useRewards } from '@/features/rewards/api';
import { avatarWithAccessory } from '@/features/rewards/accessory-picker';
import { AvatarProgress } from '@/features/rewards/avatar-progress';
import { useDueFlashcards } from '@/features/study/api';

/** Console enfant : uniquement la mission du jour, sans menu. */
export default function ChildConsoleScreen() {
  const { activeChildId, isChildDevice } = useChildMode();
  const childId = activeChildId ?? '';
  const today = toIsoDate(new Date());
  const child = useChildProfile(childId);
  const sessions = useSessions(childId, today, 1);
  const dueCards = useDueFlashcards(childId);
  const { summary } = useRewards(childId, child.data?.preferences.availableDays);
  const { fresh, markSeen } = useNewBadges(
    childId,
    summary?.badges.map((b) => b.code),
  );
  const online = useIsOnline();
  usePrepareOffline(childId);
  const { mood, choose: chooseMood, loading: moodLoading } = useTodayMood(childId);
  const [breathing, setBreathing] = useState(false);

  // Sur la tablette de l'enfant, pas d'espace parent : seulement les réglages de l'appareil.
  const parentButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isChildDevice ? 'Réglages de la tablette' : 'Espace parent (code demandé)'}
      onPress={() => router.push(isChildDevice ? '/enfant/appareil' : '/enfant/code')}
      style={styles.parentButton}>
      <ThemedText type="small" themeColor="textSecondary">
        {isChildDevice ? 'Tablette' : 'Parent'}
      </ThemedText>
    </Pressable>
  );

  if (child.isLoading || sessions.isLoading || moodLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!child.data || sessions.error || (!sessions.data && sessions.fetchStatus === 'paused')) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.centerText}>
          {isChildDevice && child.error && 'code' in child.error && child.error.code === 'PGRST116'
            ? 'Cette tablette n’est plus reliée. Demandez à votre parent de la relier à nouveau.'
            : online
              ? 'Impossible de charger la mission.'
              : 'Pas de connexion, et la mission n’est pas encore sur cet appareil. Elle s’affichera dès le retour du réseau.'}
        </ThemedText>
        <Button
          label="Réessayer"
          onPress={() => {
            child.refetch();
            sessions.refetch();
          }}
        />
        {parentButton}
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child.data);
  const session = sessions.data?.[0];
  const items = session?.study_session_task ?? [];
  const allRemaining = items.filter((item) => item.done_at === null);
  // Fatigué : l'essentiel, c'est la première activité de la séance pas encore faite au moment du choix…
  // fixée pour la journée : une fois faite, la mission ne propose pas la suivante.
  const moodLimit = mood ? MOODS[mood].items : null;
  const firstOpen = items.findIndex((item) => item.done_at === null || item.done_at >= today);
  const remaining = moodLimit
    ? items
        .slice(Math.max(0, firstOpen), Math.max(0, firstOpen) + moodLimit)
        .filter((i) => i.done_at === null)
    : allRemaining;
  const remainingMinutes = remaining.reduce((sum, item) => sum + item.minutes, 0);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">
          {avatarWithAccessory(child.data)} Bonjour {child.data.alias} !
        </ThemedText>
        {parentButton}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <OfflineBanner audience="enfant" />
        <NoteCard childId={childId} settings={settings} />
        <HolidayBanner childId={childId} settings={settings} />
        {schoolLevel(child.data.grade) !== 'maternelle' ? (
          <ExpressReviewCard childId={childId} settings={settings} />
        ) : null}
        {fresh.length > 0 ? (
          <ThemedView type="backgroundSelected" style={styles.card} accessibilityLiveRegion="polite">
            <ThemedText type="subtitle">Nouveau badge !</ThemedText>
            {fresh.map((code) => (
              <ThemedText key={code} style={learningTextStyle(settings)}>
                {BADGES[code].emoji} {BADGES[code].title} : {BADGES[code].description}
              </ThemedText>
            ))}
            <Button label="Super !" onPress={markSeen} />
          </ThemedView>
        ) : null}
        {summary ? <AvatarProgress summary={summary} onPress={() => router.push('/enfant/badges')} /> : null}
        {schoolLevel(child.data.grade) === 'primaire' ? (
          <Button
            variant="secondary"
            label={gradeYear(child.data.grade) <= 2 ? '➕ Les additions' : '✖️ Les tables'}
            onPress={() => router.push('/enfant/tables')}
          />
        ) : null}
        {dueCards.data && dueCards.data.length > 0 ? (
          <Button
            variant="secondary"
            label={`Cartes à revoir (${dueCards.data.length})`}
            onPress={() => router.push('/enfant/cartes')}
          />
        ) : null}
        {schoolLevel(child.data.grade) === 'maternelle' ? (
          // Maternelle : pas de devoirs, des activités de la semaine à faire avec le parent.
          <KindergartenMission childId={childId} grade={child.data.grade} settings={settings} />
        ) : (
          <>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Mission du jour
            </ThemedText>

            {session && allRemaining.length > 0 && !mood ? (
              <MoodPicker settings={settings} onChoose={chooseMood} />
            ) : !session ? (
              <MissionText settings={settings}>Pas de mission aujourd&apos;hui. Profite bien !</MissionText>
            ) : remaining.length === 0 && allRemaining.length > 0 ? (
              <>
                <MissionText settings={settings}>
                  Bravo, l&apos;essentiel est fait ! Le reste peut attendre.
                </MissionText>
                <Button
                  variant="secondary"
                  label="J'ai encore de l'énergie : continuer"
                  onPress={() => chooseMood('forme')}
                />
              </>
            ) : remaining.length === 0 ? (
              <MissionText settings={settings}>Mission accomplie, bravo !</MissionText>
            ) : (
              <>
                {mood && mood !== 'forme' ? (
                  <MissionText settings={settings}>
                    {MOODS[mood].emoji} {MOODS[mood].message}
                  </MissionText>
                ) : null}
                {mood && mood !== 'forme' ? (
                  breathing ? (
                    <BreathingExercise onClose={() => setBreathing(false)} />
                  ) : (
                    <Button
                      variant="secondary"
                      label="Respirer un moment avant"
                      onPress={() => setBreathing(true)}
                    />
                  )
                ) : null}
                {remaining.slice(0, settings.maxItemsPerScreen).map((item) => (
                  <MissionCard
                    key={item.task_id}
                    item={item}
                    session={session}
                    settings={settings}
                    childId={childId}
                  />
                ))}
                {remaining.length > settings.maxItemsPerScreen ? (
                  <ThemedText themeColor="textSecondary">
                    Ensuite : encore {remaining.length - settings.maxItemsPerScreen} activité
                    {remaining.length - settings.maxItemsPerScreen > 1 ? 's' : ''}.
                  </ThemedText>
                ) : null}
                <PomodoroTimer
                  workMinutes={settings.workMinutes}
                  breakMinutes={settings.breakMinutes}
                  cycles={Math.min(4, Math.max(1, Math.ceil(remainingMinutes / settings.workMinutes)))}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function MissionText({ settings, children }: { settings: LearningSettings; children: React.ReactNode }) {
  return <ThemedText style={learningTextStyle(settings)}>{children}</ThemedText>;
}

function MissionCard({
  item,
  session,
  settings,
  childId,
}: {
  item: SessionItem;
  session: StudySession;
  settings: LearningSettings;
  childId: string;
}) {
  const complete = useCompleteItem(childId);
  const prefix = CHILD_ACTIVITY_PREFIX[item.activity];
  const reference = item.task.reference ? ` (${item.task.reference})` : '';
  const instruction = `${prefix ? `${prefix} : ` : ''}${item.task.description}${reference}`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {settings.pictograms ? (
        // Repères visuels pour les jeunes lecteurs ; décoratifs, le texte dit la même chose.
        <View
          style={styles.pictograms}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <ThemedText style={styles.pictogram}>{subjectPictogram(item.task.subject)}</ThemedText>
          <ThemedText style={styles.pictogram}>{ACTIVITY_PICTOGRAMS[item.activity]}</ThemedText>
        </View>
      ) : null}
      <ThemedText type="smallBold" themeColor="primary">
        {item.task.subject} · {item.minutes} min
      </ThemedText>
      <MissionText settings={settings}>{instruction}</MissionText>
      <View style={styles.actions}>
        {settings.readAloud ? (
          <Button
            variant="secondary"
            label="Écouter"
            style={styles.flex}
            onPress={() => Speech.speak(instruction, { language: 'fr-BE' })}
          />
        ) : null}
        {item.activity !== 'faire' ? (
          <Button
            variant="secondary"
            label="S'entraîner"
            style={styles.flex}
            onPress={() =>
              router.push({
                pathname: '/enfant/etude/[taskId]',
                params: {
                  taskId: item.task_id,
                  mode: item.activity === 'etudier' ? 'fiche' : 'quiz',
                  subject: item.task.subject,
                },
              })
            }
          />
        ) : null}
        <Button
          label="C'est fait !"
          style={styles.flex}
          onPress={() => complete.mutate(completeItemVariables(childId, session, item.task_id))}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  centerText: { textAlign: 'center' },
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six, gap: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parentButton: {
    minHeight: MinTouchSize,
    minWidth: MinTouchSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two },
  pictograms: { flexDirection: 'row', gap: Spacing.three },
  pictogram: { fontSize: 44, lineHeight: 56 },
  flex: { flex: 1 },
});
