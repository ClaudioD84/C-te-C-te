import { masterySummary, type Mastery } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/** Ce que l'enfant sait : cartes connues, tables maîtrisées, mots écrits, livres lus. */
export function useMastery(childId: string) {
  return useQuery({
    queryKey: ['mastery', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<Mastery> => {
      const since = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();
      const [cards, practice, reading] = await Promise.all([
        supabase
          .from('flashcard')
          .select('repetitions, interval_days, study_pack(task(subject))')
          .eq('child_id', childId),
        supabase
          .from('learning_event')
          .select('meta')
          .eq('child_id', childId)
          .eq('type', 'quiz')
          .in('meta->>mode', ['tables', 'dictee'])
          .gte('created_at', since),
        supabase
          .from('learning_event')
          .select('meta')
          .eq('child_id', childId)
          .eq('type', 'activite')
          .eq('meta->>mode', 'lecture'),
      ]);
      if (cards.error) throw cards.error;
      if (practice.error) throw practice.error;
      if (reading.error) throw reading.error;
      type Meta = {
        mode?: string;
        score?: number;
        operation?: string;
        perTable?: Record<string, [number, number]>;
      };
      const metas = practice.data.map((row) => row.meta as Meta);
      return masterySummary({
        cards: cards.data.map((c) => ({
          subject:
            (c.study_pack as unknown as { task: { subject: string } | null } | null)?.task?.subject ??
            'Autre',
          repetitions: c.repetitions as number,
          intervalDays: c.interval_days as number,
        })),
        tableSeries: metas
          .filter((m) => m.mode === 'tables' && m.operation !== 'addition' && m.perTable)
          .map((m) => m.perTable!),
        dictations: metas.filter((m) => m.mode === 'dictee').map((m) => ({ score: Number(m.score ?? 0) })),
        books: reading.data.map((row) => String((row.meta as { book?: string }).book ?? '')),
      });
    },
  });
}

export function MasteryCard({ childId }: { childId: string }) {
  const mastery = useMastery(childId);
  const m = mastery.data;
  if (!m) return null;
  const lines: string[] = [];
  if (m.knownCards > 0)
    lines.push(
      `🧠 ${m.knownCards} carte${m.knownCards > 1 ? 's' : ''} connue${m.knownCards > 1 ? 's' : ''} (${m.cardsBySubject
        .map((s) => `${s.subject} ${s.known}`)
        .join(', ')})`,
    );
  if (m.tablesMastered.length > 0)
    lines.push(
      `✖️ Table${m.tablesMastered.length > 1 ? 's' : ''} maîtrisée${m.tablesMastered.length > 1 ? 's' : ''} : ${m.tablesMastered.join(', ')} ⭐`,
    );
  if (m.wordsWritten > 0)
    lines.push(
      `✏️ ${m.wordsWritten} mot${m.wordsWritten > 1 ? 's' : ''} bien écrit${m.wordsWritten > 1 ? 's' : ''} en dictée`,
    );
  if (m.books > 0) lines.push(`📚 ${m.books} livre${m.books > 1 ? 's' : ''} lu${m.books > 1 ? 's' : ''}`);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">Ce que je sais</ThemedText>
      {lines.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Tes cartes revues, tes tables et tes dictées viendront remplir cette page.
        </ThemedText>
      ) : (
        lines.map((line) => <ThemedText key={line}>{line}</ThemedText>)
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
