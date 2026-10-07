import {
  blocusChapters,
  formatShortDate,
  planBlocus,
  toIsoDate,
  type BlocusExam,
  type IsoDate,
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
import { useCreateBlocus } from '@/features/exams/api';
import { useChildProfile } from '@/features/profiles/api';

const SUBJECT_IDEAS = [
  'Français',
  'Mathématiques',
  'Néerlandais',
  'Anglais',
  'Sciences',
  'Histoire',
  'Géographie',
  'Latin',
];

/**
 * Plan de blocus : le parent recopie l'horaire des examens (matière, date, chapitres) ; les révisions
 * sont réparties jusqu'à chaque examen et apparaissent dans le planning de l'enfant.
 */
export default function BlocusScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const create = useCreateBlocus(childId);
  const [exams, setExams] = useState<BlocusExam[]>([]);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState<IsoDate | null>(null);
  const [chapters, setChapters] = useState('');
  const [today] = useState(() => toIsoDate(new Date()));

  if (!child.data) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }
  const availableDays = child.data.preferences.availableDays;
  const plan = planBlocus({ exams, today, availableDays });
  const byDay = new Map<IsoDate, typeof plan.tasks>();
  for (const task of plan.tasks) byDay.set(task.day, [...(byDay.get(task.day) ?? []), task]);
  const canAdd = subject.trim().length >= 2 && date !== null && date > today;

  return (
    <Screen>
      <ThemedText type="subtitle">Plan de blocus de {child.data.alias}</ThemedText>
      <ThemedText themeColor="textSecondary">
        Recopiez l’horaire des examens. Les chapitres sont répartis jusqu’à chaque examen (le plus proche
        d’abord, deux par jour au plus, un seul le dimanche et les jours d’examen), avec un examen blanc la
        veille. Ils suivent les jours de travail du profil.
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ChoiceChips
          label="Matière"
          options={SUBJECT_IDEAS}
          labels={Object.fromEntries(SUBJECT_IDEAS.map((s) => [s, s]))}
          selected={SUBJECT_IDEAS.filter((s) => s === subject)}
          onToggle={setSubject}
        />
        <TextField label="Ou une autre matière" value={subject} onChangeText={setSubject} maxLength={40} />
        <DatePicker label="Date de l’examen" value={date} onChange={setDate} months={8} />
        <TextField
          label="Chapitres à revoir (un par ligne, facultatif)"
          value={chapters}
          onChangeText={setChapters}
          multiline
        />
        <Button
          label="Ajouter cet examen"
          disabled={!canAdd}
          onPress={() => {
            setExams([
              ...exams.filter((e) => !(e.subject === subject.trim() && e.date === date)),
              { subject: subject.trim(), date: date!, chapters: blocusChapters(chapters, subject.trim()) },
            ]);
            setSubject('');
            setDate(null);
            setChapters('');
          }}
        />
      </ThemedView>

      {exams.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Examens ({exams.length})</ThemedText>
          {[...exams]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((exam) => (
              <View key={`${exam.subject}-${exam.date}`} style={styles.row}>
                <ThemedText style={styles.flex}>
                  {formatShortDate(exam.date)} · {exam.subject} ({exam.chapters.length} chapitre
                  {exam.chapters.length > 1 ? 's' : ''})
                </ThemedText>
                <Button
                  variant="secondary"
                  label="Retirer"
                  accessibilityLabel={`Retirer l’examen de ${exam.subject}`}
                  onPress={() => setExams(exams.filter((e) => e !== exam))}
                />
              </View>
            ))}
        </ThemedView>
      ) : null}

      {plan.tasks.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Aperçu jour par jour</ThemedText>
          {plan.overloaded > 0 ? (
            <ThemedText themeColor="warning" accessibilityRole="alert">
              Plan serré : {plan.overloaded} chapitre{plan.overloaded > 1 ? 's' : ''} tombe
              {plan.overloaded > 1 ? 'nt' : ''} la veille de l’examen. Commencez plus tôt ou ajoutez des jours
              de travail dans le profil.
            </ThemedText>
          ) : null}
          {[...byDay.entries()].map(([day, tasks]) => (
            <View key={day}>
              <ThemedText type="small" themeColor="textSecondary">
                {formatShortDate(day)}
              </ThemedText>
              {tasks.map((t, i) => (
                <ThemedText key={i}>
                  • {t.subject} : {t.kind === 'examen' ? 'examen blanc (veille d’examen)' : t.description}
                </ThemedText>
              ))}
            </View>
          ))}
        </ThemedView>
      ) : null}

      {create.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          La création a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
      <Button
        label="Créer le plan de blocus"
        disabled={plan.tasks.length === 0}
        loading={create.isPending}
        onPress={() => create.mutate({ exams, tasks: plan.tasks }, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
