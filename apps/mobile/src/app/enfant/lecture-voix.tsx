import {
  deriveLearningSettings,
  nextReadingText,
  readingProgressMessage,
  textWords,
  wordsPerMinute,
} from '@cote-a-cote/shared';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useAloudReadings, useLogAloud } from '@/features/reading/aloud-api';
import { useTheme } from '@/hooks/use-theme';

type Step = 'pret' | 'lecture' | 'parent' | 'fini';

/**
 * Lecture à voix haute : l'enfant lit un court texte de son niveau (chronométré, enregistré s'il le
 * veut, pour se réécouter), puis le parent touche les mots difficiles. Seuls ses progrès sont montrés.
 */
export default function ReadingAloudScreen() {
  const theme = useTheme();
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const readings = useAloudReadings(childId);
  const logAloud = useLogAloud(childId);
  const player = useAudioPlayer(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [step, setStep] = useState<Step>('pret');
  const [startedAt, setStartedAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [recorded, setRecorded] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [hard, setHard] = useState<number[]>([]);

  if (!child.data || readings.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  const settings = deriveLearningSettings(child.data);
  const history = readings.data ?? [];
  const text = nextReadingText(
    child.data.grade,
    history.map((r) => r.textId),
  );
  if (!text) {
    return (
      <ChildScreen style={[styles.container, styles.center]}>
        <ThemedText>Pas de texte pour ton année.</ThemedText>
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ChildScreen>
    );
  }
  const words = textWords(text.text);
  const wpm = wordsPerMinute(text.text, seconds);
  const previous = history.at(-1)?.wpm ?? null;

  async function start() {
    setStartedAt(Date.now());
    setStep('lecture');
    // L'enregistrement est un plus : sans micro, la lecture continue.
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 300 });
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  async function stop() {
    setSeconds((Date.now() - startedAt) / 1000);
    setStep('parent');
    if (!recording) return;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) {
        setRecorded(recorder.uri);
        player.replace({ uri: recorder.uri });
      }
    } catch {
      // Pas d'enregistrement à réécouter : rien de grave.
    }
    setRecording(false);
  }

  return (
    <ChildScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">🗣️ Je lis à voix haute</ThemedText>
        {step === 'pret' ? (
          <ThemedText themeColor="textSecondary">
            Lis le texte à voix haute, à ton rythme. Quand tu as fini, ton parent t’écoute ou te réécoute.
          </ThemedText>
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{text.title}</ThemedText>
          {step === 'parent' ? (
            <View
              style={styles.words}
              accessibilityLabel="Mots du texte : touchez ceux qui étaient difficiles">
              {words.map((word, i) => {
                const selected = hard.includes(i);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="checkbox"
                    aria-checked={selected}
                    accessibilityLabel={word}
                    onPress={() => setHard(selected ? hard.filter((h) => h !== i) : [...hard, i])}
                    style={[
                      styles.word,
                      {
                        backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                        borderColor: selected ? theme.accent : 'transparent',
                      },
                    ]}>
                    <ThemedText style={learningTextStyle(settings)}>{word}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ThemedText style={learningTextStyle(settings, 22)}>{text.text}</ThemedText>
          )}
        </ThemedView>

        {step === 'pret' ? (
          <Button size="large" label="▶️ Je commence à lire" onPress={() => void start()} />
        ) : null}
        {step === 'lecture' ? (
          <>
            <ThemedText accessibilityLiveRegion="polite">
              {recording ? '🔴 Je t’écoute…' : 'Je lis…'}
            </ThemedText>
            <Button size="large" label="⏹️ J’ai fini de lire" onPress={() => void stop()} />
          </>
        ) : null}
        {step === 'parent' ? (
          <>
            <ThemedText type="smallBold">Avec ton parent</ThemedText>
            <ThemedText themeColor="textSecondary">
              Touchez les mots qui ont posé problème (vous pouvez n’en toucher aucun).
            </ThemedText>
            {recorded ? (
              <Button
                variant="secondary"
                label="▶️ Réécouter la lecture"
                onPress={() => {
                  player.seekTo(0);
                  player.play();
                }}
              />
            ) : null}
            <Button
              label="Enregistrer ma lecture"
              onPress={() => {
                logAloud({
                  textId: text.id,
                  seconds,
                  wpm,
                  hardWords: hard.map((i) => words[i]!.replace(/[^\p{L}\d'’-]/gu, '')),
                });
                setStep('fini');
              }}
            />
          </>
        ) : null}
        {step === 'fini' ? (
          <ThemedView type="backgroundSelected" style={styles.card} accessibilityLiveRegion="polite">
            <ThemedText type="subtitle">Bravo !</ThemedText>
            <ThemedText style={learningTextStyle(settings)}>
              Tu as lu {Math.round(seconds)} secondes, à {wpm} mots par minute.
            </ThemedText>
            <ThemedText style={learningTextStyle(settings)}>
              {readingProgressMessage(wpm, previous)}
            </ThemedText>
          </ThemedView>
        ) : null}
        <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  content: { padding: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  word: { borderRadius: 6, borderWidth: 2, paddingHorizontal: 2 },
});
