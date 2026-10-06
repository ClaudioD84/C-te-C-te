import {
  defaultOperation,
  deriveLearningSettings,
  gradeYear,
  questionSpeech,
  questionText,
  schoolLevel,
  tableSeries,
  type TableQuestionItem,
} from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useLogPractice } from '@/features/study/api';
import { useTheme } from '@/hooks/use-theme';

const TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

/** Les tables : 10 questions sans chronomètre ; une erreur revient en fin de série, une fois. */
export default function TablesScreen() {
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const logPractice = useLogPractice(activeChildId ?? '');
  const [tables, setTables] = useState<string[]>(['2']);
  const [series, setSeries] = useState<TableQuestionItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<'juste' | 'faux' | null>(null);
  const [correct, setCorrect] = useState(0);
  const [retried, setRetried] = useState<Set<number>>(new Set());
  // Réponses du premier coup, par table (maîtrise visible).
  const [perTable, setPerTable] = useState<Record<string, [number, number]>>({});

  if (!child.data) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  const settings = deriveLearningSettings(child.data);
  const text = learningTextStyle(settings, 22);
  const operation = defaultOperation(
    gradeYear(child.data.grade),
    schoolLevel(child.data.grade) === 'primaire',
  );
  const sign = operation === 'multiplication' ? '×' : '+';
  const back = <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />;

  if (!series) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">
            {operation === 'multiplication' ? 'Les tables' : 'Les additions'}
          </ThemedText>
          <ChoiceChips
            label={`Quelles tables ? (${sign})`}
            options={TABLES}
            labels={Object.fromEntries(TABLES.map((t) => [t, `${sign} ${t}`])) as Record<string, string>}
            selected={tables}
            multiple
            onToggle={(t) =>
              setTables((current) => (current.includes(t) ? current.filter((x) => x !== t) : [...current, t]))
            }
          />
          <Button
            label="C'est parti !"
            disabled={tables.length === 0}
            onPress={() => {
              setSeries(tableSeries(tables.map(Number), operation, `${Date.now()}`));
              setIndex(0);
              setCorrect(0);
              setRetried(new Set());
              setPerTable({});
            }}
          />
          {back}
        </ScrollView>
      </ThemedView>
    );
  }

  const question = series[index];
  if (!question) {
    const total = series.length - retried.size;
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText type="subtitle">Série terminée !</ThemedText>
        <ThemedText style={[text, styles.centerText]}>
          {correct} réponse{correct > 1 ? 's' : ''} juste{correct > 1 ? 's' : ''} du premier coup sur {total}.
          Bravo pour ton effort !
        </ThemedText>
        <Button label="Une autre série" onPress={() => setSeries(null)} />
        {back}
      </ThemedView>
    );
  }

  function check() {
    const ok = Number(typed.trim()) === question!.answer;
    setFeedback(ok ? 'juste' : 'faux');
    const firstTry = !retried.has(index);
    if (ok && firstTry) setCorrect((c) => c + 1);
    if (firstTry) {
      const table = String(question!.a);
      setPerTable((t) => {
        const [good, total] = t[table] ?? [0, 0];
        return { ...t, [table]: [good + (ok ? 1 : 0), total + 1] };
      });
    }
    // Une erreur : la même question revient une fois en fin de série.
    if (!ok && firstTry) {
      setSeries((s) => (s ? [...s, question!] : s));
      setRetried((r) => new Set(r).add(series!.length));
    }
  }

  function next() {
    const last = index + 1 >= series!.length;
    if (last)
      logPractice('tables', 'Mathématiques', correct, series!.length - retried.size, {
        operation,
        perTable,
      });
    setIndex(index + 1);
    setTyped('');
    setFeedback(null);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Question {index + 1} sur {series.length}
        </ThemedText>
        <ThemedText type="title" style={styles.centerText} accessibilityLabel={questionSpeech(question)}>
          {questionText(question)} = ?
        </ThemedText>
        {settings.visualMath ? <Dots question={question} /> : null}
        {settings.readAloud ? (
          <Button
            variant="secondary"
            label="Écouter"
            onPress={() => Speech.speak(questionSpeech(question), { language: 'fr-BE' })}
          />
        ) : null}
        <TextField
          label="Ta réponse"
          value={typed}
          onChangeText={(t) => setTyped(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          editable={feedback === null}
          maxLength={3}
          style={text}
        />
        {feedback === null ? (
          <Button label="Vérifier" disabled={typed.length === 0} onPress={check} />
        ) : (
          <>
            <ThemedText style={text} accessibilityLiveRegion="polite">
              {feedback === 'juste'
                ? 'Bravo !'
                : `Pas tout à fait : ${questionText(question)} = ${question.answer}. Elle reviendra à la fin.`}
            </ThemedText>
            <Button label={index + 1 < series.length ? 'Suivante' : 'Terminer'} onPress={next} />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/** Support visuel : a rangées de b points (×), ou deux groupes de points (+). */
function Dots({ question }: { question: TableQuestionItem }) {
  const theme = useTheme();
  const dot = (key: string, color: string) => (
    <View key={key} style={[styles.dot, { backgroundColor: color }]} />
  );
  const label =
    question.operation === 'multiplication'
      ? `${question.a} rangées de ${question.b} points`
      : `${question.a} points et ${question.b} points`;
  return (
    <View style={styles.dots} accessible accessibilityLabel={label}>
      {question.operation === 'multiplication' ? (
        Array.from({ length: question.a }, (_, r) => (
          <View key={r} style={styles.dotRow}>
            {Array.from({ length: question.b }, (_, c) => dot(`${r}-${c}`, theme.primary))}
          </View>
        ))
      ) : (
        <View style={styles.dotRow}>
          {Array.from({ length: question.a }, (_, i) => dot(`a${i}`, theme.primary))}
          <View style={styles.gapDot} />
          {Array.from({ length: question.b }, (_, i) => dot(`b${i}`, theme.accent))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  dots: { alignItems: 'center', gap: 4 },
  dotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  gapDot: { width: 16 },
});
