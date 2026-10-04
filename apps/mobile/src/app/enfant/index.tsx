import { deriveLearningSettings, toIsoDate, type LearningSettings } from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { PomodoroTimer } from '@/features/mission/pomodoro-timer';
import { useCompleteItem, useSessions, type SessionItem, type StudySession } from '@/features/planning/api';
import { CHILD_ACTIVITY_PREFIX } from '@/features/planning/labels';
import { useChildProfile } from '@/features/profiles/api';

/** Console enfant : uniquement la mission du jour, sans menu. */
export default function ChildConsoleScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const today = toIsoDate(new Date());
  const child = useChildProfile(childId);
  const sessions = useSessions(childId, today, 1);

  const parentButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Espace parent (code demandé)"
      onPress={() => router.push('/enfant/code')}
      style={styles.parentButton}>
      <ThemedText type="small" themeColor="textSecondary">
        Parent
      </ThemedText>
    </Pressable>
  );

  if (child.isLoading || sessions.isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!child.data || sessions.error) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>Impossible de charger la mission.</ThemedText>
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
  const remaining = session?.study_session_task.filter((item) => item.done_at === null) ?? [];
  const remainingMinutes = remaining.reduce((sum, item) => sum + item.minutes, 0);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Bonjour {child.data.alias} !</ThemedText>
        {parentButton}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Mission du jour
        </ThemedText>

        {!session ? (
          <MissionText settings={settings}>Pas de mission aujourd&apos;hui. Profite bien !</MissionText>
        ) : remaining.length === 0 ? (
          <MissionText settings={settings}>Mission accomplie, bravo !</MissionText>
        ) : (
          <>
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
        <Button
          label="C'est fait !"
          style={styles.flex}
          loading={complete.isPending}
          onPress={() => complete.mutate({ session, taskId: item.task_id })}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
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
  flex: { flex: 1 },
});
