import type { LearningSettings, StudyPack } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

export function FicheView({
  fiche,
  settings,
}: {
  fiche: NonNullable<StudyPack['fiche']>;
  settings: LearningSettings;
}) {
  const text = learningTextStyle(settings, 18);
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={{ fontFamily: text.fontFamily }}>
        {fiche.title}
      </ThemedText>
      {fiche.sections.map((section) => (
        <ThemedView key={section.heading} type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" themeColor="primary">
            {section.heading}
          </ThemedText>
          {section.points.map((point) => (
            <ThemedText key={point} style={text}>
              • {point}
            </ThemedText>
          ))}
        </ThemedView>
      ))}
      {fiche.keyTerms.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" themeColor="primary">
            Mots importants
          </ThemedText>
          {fiche.keyTerms.map((term) => (
            <ThemedText key={term.term} style={text}>
              <ThemedText style={[text, styles.bold]}>{term.term}</ThemedText> : {term.definition}
            </ThemedText>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  bold: { fontWeight: 700 },
});
