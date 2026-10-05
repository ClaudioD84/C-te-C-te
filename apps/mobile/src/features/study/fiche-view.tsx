import { ficheSegments, type LearningSettings, type StudyPack } from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  // Morceau en cours de lecture : 0 = titre, puis les parties, puis les mots importants.
  const [reading, setReading] = useState<number | null>(null);
  const session = useRef(0);
  const segments = ficheSegments(fiche);

  function readFrom(index: number, id: number) {
    if (id !== session.current) return;
    if (index >= segments.length) {
      setReading(null);
      return;
    }
    setReading(index);
    Speech.speak(segments[index]!, {
      language: 'fr-BE',
      rate: settings.readAloud ? 0.85 : 0.95,
      onDone: () => readFrom(index + 1, id),
      onStopped: () => undefined,
    });
  }
  function start() {
    session.current += 1;
    void Speech.stop().then(() => readFrom(0, session.current));
  }
  function stop() {
    session.current += 1;
    setReading(null);
    void Speech.stop();
  }
  // Quitter la fiche arrête la lecture.
  useEffect(
    () => () => {
      session.current += 1;
      void Speech.stop();
    },
    [],
  );
  const highlight = (index: number) =>
    reading === index ? { borderWidth: 3, borderColor: theme.primary } : undefined;

  return (
    <View style={styles.container}>
      {reading === null ? (
        <Button variant="secondary" label="🔊 Écouter la fiche" onPress={start} />
      ) : (
        <Button variant="secondary" label="⏹️ Arrêter la lecture" onPress={stop} />
      )}
      <ThemedText type="subtitle" style={[{ fontFamily: text.fontFamily }, highlight(0)]}>
        {fiche.title}
      </ThemedText>
      {fiche.sections.map((section, i) => (
        <ThemedView key={section.heading} type="backgroundElement" style={[styles.card, highlight(i + 1)]}>
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
        <ThemedView type="backgroundElement" style={[styles.card, highlight(fiche.sections.length + 1)]}>
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
