import { weeklyReport, type BadgeCode, type WeekEffort } from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { Share, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Bilan positif de la semaine : à lire à l'enfant ou à partager avec l'autre parent. */
export function WeeklyReportCard(props: {
  alias: string;
  week: WeekEffort;
  subjects: readonly string[];
  badges: readonly BadgeCode[];
  kindergarten: boolean;
}) {
  const report = weeklyReport(props);
  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <ThemedText type="smallBold">Bilan de la semaine</ThemedText>
      {report.highlights.length === 0 ? (
        <ThemedText themeColor="textSecondary">Pas encore d’activité cette semaine.</ThemedText>
      ) : (
        report.highlights.map((line) => <ThemedText key={line}>• {line}</ThemedText>)
      )}
      <ThemedText type="small" themeColor="textSecondary">
        À dire à {props.alias} :
      </ThemedText>
      <ThemedText style={styles.message}>« {report.childMessage} »</ThemedText>
      <Button
        variant="secondary"
        label={`Lire à ${props.alias}`}
        onPress={() => Speech.speak(report.childMessage, { language: 'fr-BE' })}
      />
      <Button
        variant="secondary"
        label="Partager le bilan"
        onPress={() => Share.share({ message: report.shareText }).catch(() => undefined)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  message: { fontStyle: 'italic' },
});
