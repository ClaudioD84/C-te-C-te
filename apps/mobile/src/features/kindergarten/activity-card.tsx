import {
  KINDERGARTEN_DOMAIN_LABELS,
  KINDERGARTEN_DOMAIN_PICTOGRAMS,
  type KindergartenActivity,
  type LearningSettings,
} from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

/** Texte lu à voix haute dans la console enfant. */
export function activitySpeech(activity: KindergartenActivity): string {
  return `${activity.title}. ${activity.steps.join(' ')}`;
}

/**
 * Carte d'une activité de maternelle. Vue parent : matériel, étapes et ce que l'activité travaille.
 * Vue enfant : grand pictogramme, titre et lecture à voix haute.
 */
export function KindergartenActivityCard({
  activity,
  audience,
  settings,
  done,
  expectation,
  children,
}: {
  activity: KindergartenActivity;
  audience: 'parent' | 'enfant';
  settings?: LearningSettings;
  done: boolean;
  /** Intitulé de l'attendu du référentiel (vue parent). */
  expectation?: string;
  children?: ReactNode;
}) {
  const pictogram = KINDERGARTEN_DOMAIN_PICTOGRAMS[activity.domain];
  if (audience === 'enfant') {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText
          style={styles.pictogram}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no">
          {pictogram}
        </ThemedText>
        <ThemedText style={settings ? learningTextStyle(settings, 24) : undefined}>
          {activity.title}
        </ThemedText>
        <Button
          variant="secondary"
          label="Écouter"
          onPress={() => Speech.speak(activitySpeech(activity), { language: 'fr-BE' })}
        />
        {children}
      </ThemedView>
    );
  }
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText
          style={styles.smallPictogram}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no">
          {pictogram}
        </ThemedText>
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor="primary">
            {KINDERGARTEN_DOMAIN_LABELS[activity.domain]} · {activity.minutes} min
          </ThemedText>
          <ThemedText type="subtitle">{activity.title}</ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Matériel : {activity.materials}
      </ThemedText>
      {activity.steps.map((step, i) => (
        <ThemedText key={i}>
          {i + 1}. {step}
        </ThemedText>
      ))}
      {expectation ? (
        <ThemedText type="small" themeColor="textSecondary">
          Ce que ça travaille ({activity.subject}) : {expectation}
        </ThemedText>
      ) : null}
      {done ? (
        <ThemedText themeColor="primary" accessibilityRole="text">
          ✓ Fait cette semaine
        </ThemedText>
      ) : null}
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  header: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  flex: { flex: 1 },
  pictogram: { fontSize: 64, lineHeight: 80, textAlign: 'center' },
  smallPictogram: { fontSize: 36, lineHeight: 44 },
});
