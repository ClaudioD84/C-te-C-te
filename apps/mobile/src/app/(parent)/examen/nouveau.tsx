import {
  daysBetween,
  EXAM_DEFAULT_SUBJECTS,
  EXAM_LABELS,
  examTypesForGrade,
  formatShortDate,
  toIsoDate,
  addDays,
  weekdayKey,
  type ExamType,
  type IsoDate,
  type RevisionTheme,
} from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { DatePicker } from '@/components/date-picker';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { proposeThemes, useCreateExam } from '@/features/exams/api';
import { useChildProfile } from '@/features/profiles/api';

/** Création d'un dossier de révision (F5) : épreuve, date, matières, puis thèmes proposés par Claude. */
export default function NewExamScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const create = useCreateExam(childId);
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [examDate, setExamDate] = useState<IsoDate | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [themes, setThemes] = useState<RevisionTheme[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!child.data) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }
  const profile = child.data;
  const types = examTypesForGrade(profile.grade);

  function chooseType(type: ExamType) {
    setExamType(type);
    setSubjects(EXAM_DEFAULT_SUBJECTS[type]);
  }

  function revisionDays(date: IsoDate): number {
    const today = toIsoDate(new Date());
    let count = 0;
    for (let d = addDays(today, 1); d < date; d = addDays(d, 1)) {
      if (profile.preferences.availableDays.includes(weekdayKey(d))) count++;
    }
    return Math.max(1, Math.min(200, count));
  }

  async function propose() {
    if (!examType || !examDate) return;
    setLoading(true);
    setMessage(null);
    try {
      setThemes(
        await proposeThemes({ childId, examType, examDate, subjects, revisionDays: revisionDays(examDate) }),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'La préparation a échoué.');
    } finally {
      setLoading(false);
    }
  }

  if (themes && examType && examDate) {
    return (
      <Screen>
        <ThemedText type="subtitle">
          {EXAM_LABELS[examType]} · {formatShortDate(examDate)}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {themes.length} thèmes à revoir, répartis jusqu&apos;à l&apos;épreuve. Retirez ceux qui ne
          conviennent pas.
        </ThemedText>
        {themes.map((theme, i) => (
          <ThemedView key={`${theme.subject}-${i}`} type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              {theme.subject} · {theme.title}
            </ThemedText>
            <ThemedText type="small">{theme.description}</ThemedText>
            <Button
              variant="secondary"
              label="Retirer"
              onPress={() => setThemes(themes.filter((_, j) => j !== i))}
            />
          </ThemedView>
        ))}
        {create.error ? <ThemedText themeColor="danger">La création a échoué. Réessayez.</ThemedText> : null}
        <Button
          label="Créer le dossier de révision"
          disabled={themes.length === 0}
          loading={create.isPending}
          onPress={() =>
            create.mutate(
              { examType, examDate, subjects, themes, availableDays: profile.preferences.availableDays },
              { onSuccess: () => router.back() },
            )
          }
        />
        <Button variant="secondary" label="Modifier l'épreuve" onPress={() => setThemes(null)} />
      </Screen>
    );
  }

  const ready = examType && examDate && subjects.length > 0;

  return (
    <Screen>
      <ChoiceChips
        label="Épreuve"
        options={types}
        labels={EXAM_LABELS}
        selected={examType ? [examType] : []}
        onToggle={chooseType}
      />
      {examType ? (
        <>
          <DatePicker label="Date de l'épreuve" value={examDate} onChange={setExamDate} />
          {examDate ? (
            <ThemedText themeColor="textSecondary">
              Dans {daysBetween(toIsoDate(new Date()), examDate)} jours, dont {revisionDays(examDate)} jours
              de travail prévus.
            </ThemedText>
          ) : null}
          <ChoiceChips
            label="Matières"
            options={[...new Set([...EXAM_DEFAULT_SUBJECTS[examType], ...subjects])]}
            labels={Object.fromEntries([...EXAM_DEFAULT_SUBJECTS[examType], ...subjects].map((s) => [s, s]))}
            selected={subjects}
            onToggle={(s) =>
              setSubjects(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s])
            }
            multiple
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="Ajouter une matière" value={newSubject} onChangeText={setNewSubject} />
            </View>
            <Button
              variant="secondary"
              label="Ajouter"
              disabled={newSubject.trim().length < 2}
              onPress={() => {
                setSubjects([...new Set([...subjects, newSubject.trim()])]);
                setNewSubject('');
              }}
            />
          </View>
        </>
      ) : null}
      {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
      <Button label="Proposer les thèmes à revoir" disabled={!ready} loading={loading} onPress={propose} />
      {loading ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Préparation du plan de révision… (jusqu&apos;à une minute)
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
