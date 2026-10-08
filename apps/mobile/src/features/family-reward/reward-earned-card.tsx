import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useFamilyReward, useGiveReward } from './api';

/** Cockpit : récompense gagnée, à donner (le parent confirme ensuite). */
export function RewardEarnedCard({ childId, alias }: { childId: string; alias: string }) {
  const reward = useFamilyReward(childId);
  const give = useGiveReward(childId);
  if (!reward.data || reward.data.done < reward.data.reward.missions_needed) return null;
  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <ThemedText type="smallBold">
        🎁 {alias} a gagné : {reward.data.reward.label}
      </ThemedText>
      <Button
        variant="secondary"
        label="C’est donné !"
        loading={give.isPending}
        onPress={() => give.mutate(reward.data!.reward.id)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
