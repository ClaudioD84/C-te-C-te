import { ACTIVITY_PICTOGRAMS, subjectPictogram, type LearningSettings } from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useAskHelp, useOpenHelpRequests } from '@/features/help/api';
import {
  completeItemVariables,
  useCompleteItem,
  type SessionItem,
  type StudySession,
} from '@/features/planning/api';
import { CHILD_ACTIVITY_PREFIX } from '@/features/planning/labels';

/** Texte de la mission, dans la police et la taille du profil. */
export function MissionText({
  settings,
  children,
}: {
  settings: LearningSettings;
  children: React.ReactNode;
}) {
  return <ThemedText style={learningTextStyle(settings)}>{children}</ThemedText>;
}

/** Une activité de la mission : consigne, aide, écoute, entraînement, « C'est fait ! ». */
export function MissionCard({
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
  const help = useOpenHelpRequests(childId);
  const askHelp = useAskHelp(childId);
  const asked = help.data?.some((r) => r.task_id === item.task_id) ?? false;
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
      {asked ? (
        <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
          🙋 Ton parent est prévenu : vous regarderez ensemble.
        </ThemedText>
      ) : (
        <Button
          variant="secondary"
          label="🙋 J’ai besoin d’aide"
          loading={askHelp.isPending}
          onPress={() => askHelp.mutate(item.task_id)}
        />
      )}
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
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two },
  pictograms: { flexDirection: 'row', gap: Spacing.three },
  pictogram: { fontSize: 44, lineHeight: 56 },
  flex: { flex: 1 },
});
