import {
  checkSpelling,
  speechLanguage,
  type LearningSettings,
  type SpellingResult,
} from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

const FEEDBACK: Record<SpellingResult, string> = {
  juste: 'Bravo, c’est bien écrit !',
  accents: 'Presque ! Attention aux accents :',
  a_revoir: 'Le mot s’écrit :',
};

/** « Écoute et écris » : un mot à la fois, réécoutable, sans chronomètre. */
export function DictationPlayer({
  words,
  subject,
  settings,
  onFinish,
}: {
  words: readonly string[];
  subject: string;
  settings: LearningSettings;
  onFinish?: (correct: number, total: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<SpellingResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const text = learningTextStyle(settings, 20);
  const language = speechLanguage(subject);
  const word = words[index];

  const say = (slow = false) => {
    if (word) Speech.speak(word, { language, rate: slow ? 0.6 : 0.9 });
  };
  // Chaque nouveau mot est dit automatiquement.
  useEffect(() => {
    if (word) Speech.speak(word, { language, rate: 0.9 });
  }, [word, language]);

  if (!word) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="subtitle">Bien joué !</ThemedText>
        <ThemedText style={text}>
          Tu as écrit {words.length} mot{words.length > 1 ? 's' : ''}. Bravo pour ton effort !
        </ThemedText>
        <Button
          variant="secondary"
          label="Recommencer"
          onPress={() => {
            setIndex(0);
            setCorrect(0);
          }}
        />
      </ThemedView>
    );
  }

  function check() {
    const outcome = checkSpelling(word!, typed);
    setResult(outcome);
    if (outcome !== 'a_revoir') setCorrect((c) => c + 1);
  }

  function next() {
    const last = index + 1 >= words.length;
    if (last) onFinish?.(correct, words.length);
    setIndex(index + 1);
    setTyped('');
    setResult(null);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        Mot {index + 1} sur {words.length}
      </ThemedText>
      <View style={styles.row}>
        <Button label="Écouter" style={styles.flex} onPress={() => say()} />
        <Button variant="secondary" label="Plus lentement" style={styles.flex} onPress={() => say(true)} />
      </View>
      <TextField
        label="Écris le mot que tu entends"
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        editable={result === null}
        style={text}
      />
      {result === null ? (
        <Button label="Vérifier" disabled={typed.trim().length === 0} onPress={check} />
      ) : (
        <>
          <ThemedText style={text} accessibilityLiveRegion="polite">
            {FEEDBACK[result]}
          </ThemedText>
          {result !== 'juste' ? (
            <ThemedText
              style={[text, styles.word]}
              accessibilityLabel={`${word}, épelé : ${word.split('').join(' ')}`}>
              {word}
            </ThemedText>
          ) : null}
          <Button label={index + 1 < words.length ? 'Mot suivant' : 'Terminer'} onPress={next} />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  word: { letterSpacing: 3, fontWeight: '600' },
});
