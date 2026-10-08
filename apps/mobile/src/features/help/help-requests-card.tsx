import { formatRelativeDate, toIsoDate } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useOpenHelpRequests, useResolveHelp } from './api';

/** Cockpit : les activités pour lesquelles l'enfant a demandé de l'aide. */
export function HelpRequestsCard({ childId, alias }: { childId: string; alias: string }) {
  const theme = useTheme();
  const requests = useOpenHelpRequests(childId);
  const resolve = useResolveHelp(childId);
  if (!requests.data || requests.data.length === 0) return null;
  const today = toIsoDate(new Date());
  return (
    <ThemedView style={[styles.card, { borderColor: theme.accent }]}>
      <ThemedText type="smallBold">🙋 {alias} a besoin d’aide</ThemedText>
      {requests.data.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={styles.flex}>
            <ThemedText>
              {r.task.subject} · {r.task.description}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Demandé {formatRelativeDate(toIsoDate(new Date(r.created_at)), today)}
            </ThemedText>
          </View>
          <Button
            variant="secondary"
            label="C’est noté"
            accessibilityLabel={`C’est noté : ${r.task.description}`}
            onPress={() => resolve.mutate(r.id)}
          />
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
