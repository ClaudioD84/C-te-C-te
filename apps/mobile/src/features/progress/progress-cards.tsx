import {
  describeDelta,
  formatShortDate,
  type Comparison,
  type SubjectProgress,
  type WeekEffort,
} from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const arrow = (delta: number) => (delta > 0 ? '↑' : delta < 0 ? '↓' : '=');

/** Cette semaine comparée aux mêmes jours de la semaine précédente (F7). */
export function ComparisonCard({ comparisons }: { comparisons: readonly Comparison[] }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Par rapport à la semaine dernière</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Du lundi à aujourd&apos;hui, comparé aux mêmes jours de la semaine précédente.
      </ThemedText>
      {comparisons.map((c) => (
        <View
          key={c.key}
          style={styles.line}
          accessible
          accessibilityLabel={`${c.label} : ${c.current}, ${describeDelta(c.delta)}`}>
          <ThemedText style={styles.flex}>{c.label}</ThemedText>
          <ThemedText type="smallBold">{c.current}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.delta}>
            {arrow(c.delta)} {c.delta === 0 ? 'stable' : `${c.delta > 0 ? '+' : '−'}${Math.abs(c.delta)}`}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

/** Effort et réussite aux quiz par matière, sur les dernières semaines (F7). */
export function SubjectsCard({ subjects, weeks }: { subjects: readonly SubjectProgress[]; weeks: number }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Par matière ({weeks} dernières semaines)</ThemedText>
      {subjects.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Pas encore d&apos;activité rattachée à une matière.
        </ThemedText>
      ) : null}
      {subjects.map((s) => {
        const parts = [
          `${s.minutes} min`,
          `${s.activities} activité${s.activities > 1 ? 's' : ''}`,
          `${s.cards} carte${s.cards > 1 ? 's' : ''}`,
        ];
        return (
          <View key={s.subject} style={styles.subject}>
            <ThemedText>{s.subject}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {parts.join(' · ')}
            </ThemedText>
            {s.quizRate !== null ? (
              <ThemedText type="small" themeColor="textSecondary">
                Quiz : {s.quizScore} bonne{s.quizScore > 1 ? 's' : ''} réponse{s.quizScore > 1 ? 's' : ''} sur{' '}
                {s.quizTotal} ({s.quizRate} %)
              </ThemedText>
            ) : null}
          </View>
        );
      })}
      <ThemedText type="small" themeColor="textSecondary">
        Un repère pour vous : à l&apos;enfant, l&apos;application ne montre que ses efforts, jamais ces
        résultats.
      </ThemedText>
    </ThemedView>
  );
}

/** Historique semaine par semaine, la plus récente en premier (F7). */
export function HistoryCard({ weeks }: { weeks: readonly WeekEffort[] }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Historique des semaines</ThemedText>
      {[...weeks].reverse().map((week, i) => (
        <View key={week.weekStart} style={styles.subject}>
          <ThemedText>
            {i === 0 ? 'Cette semaine' : `Semaine du ${formatShortDate(week.weekStart)}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {week.minutes} min · {week.effortDays} jour{week.effortDays > 1 ? 's' : ''} actif
            {week.effortDays > 1 ? 's' : ''} · {week.activities} activité{week.activities > 1 ? 's' : ''} ·{' '}
            {week.cards} carte{week.cards > 1 ? 's' : ''} · {week.quizzes} quiz
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  delta: { minWidth: 72, textAlign: 'right' },
  subject: { gap: Spacing.half },
});
