import {
  BADGES,
  deriveLearningSettings,
  relaxMinutesLimit,
  schoolLevel,
  toIsoDate,
} from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { ExpressReviewCard } from '@/features/express/express-review-card';
import { HolidayBanner } from '@/features/holidays/holiday-banner';
import { KindergartenMission } from '@/features/kindergarten/kindergarten-mission';
import { missionItems } from '@/features/mission/mission-items';
import { PracticeLinks } from '@/features/mission/practice-links';
import { SchoolMission } from '@/features/mission/school-mission';
import { useTodayMood } from '@/features/mood/mood';
import { NoteCard } from '@/features/notes/note-card';
import { RewardProgress } from '@/features/family-reward/reward-progress';
import { OfflineBanner, useIsOnline } from '@/features/offline/offline-banner';
import { usePrepareOffline } from '@/features/offline/use-prepare-offline';
import { useSessions } from '@/features/planning/api';
import { useChildProfile } from '@/features/profiles/api';
import { SchoolBagCard } from '@/features/school-bag/school-bag-card';
import { avatarWithAccessory } from '@/features/rewards/accessory-picker';
import { useNewBadges, useRewards } from '@/features/rewards/api';
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
  const kindergarten = schoolLevel(child.data.grade) === 'maternelle';
  const session = sessions.data?.[0];
  const relaxEnabled = relaxMinutesLimit(child.data.preferences) > 0;
  const { allRemaining, remaining } = missionItems(session?.study_session_task ?? [], mood, today);

  return (
    <ChildScreen style={styles.container}>
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
        <SchoolBagCard childId={childId} settings={settings} />
        {!kindergarten ? <ExpressReviewCard childId={childId} settings={settings} /> : null}
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
        {summary && summary.currentStreak >= 2 ? (
          <ThemedText themeColor="textSecondary">
            🔥 Série : {summary.currentStreak} jours · 🃏 {summary.jokersLeftThisWeek} joker
            {summary.jokersLeftThisWeek > 1 ? 's' : ''} cette semaine
          </ThemedText>
        ) : null}
        <RewardProgress childId={childId} settings={settings} />
        {dueCards.data && dueCards.data.length > 0 ? (
          <Button
            variant="secondary"
            label={`Cartes à revoir (${dueCards.data.length})`}
            onPress={() => router.push('/enfant/cartes')}
          />
        ) : null}
        {kindergarten ? (
          // Maternelle : pas de devoirs, des activités de la semaine à faire avec le parent.
          <KindergartenMission childId={childId} grade={child.data.grade} settings={settings} />
        ) : (
          <>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Mission du jour
            </ThemedText>
            <SchoolMission
              childId={childId}
              session={session}
              allRemaining={allRemaining}
              remaining={remaining}
              settings={settings}
              mood={mood}
              onMood={chooseMood}
              relaxEnabled={relaxEnabled}
            />
          </>
        )}
        {remaining.length === 0 && relaxEnabled ? (
          <Button
            variant="secondary"
            label="🎈 Coin détente"
            onPress={() => router.push('/enfant/detente')}
          />
        ) : null}
        {/* Entraînements libres, après la mission ; avec le TDAH, seulement une fois la mission faite. */}
        {settings.maxItemsPerScreen > 1 || remaining.length === 0 ? (
          <PracticeLinks
            childId={childId}
            grade={child.data.grade}
            effortDays={summary?.effortDaysThisWeek}
            settings={settings}
          />
        ) : null}
      </ScrollView>
    </ChildScreen>
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
});
