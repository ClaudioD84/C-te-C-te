import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { REWARD_IDEAS, useFamilyReward, useSetFamilyReward } from '@/features/family-reward/api';
import { useChildProfile } from '@/features/profiles/api';

const MISSIONS = ['3', '5', '7', '10'] as const;

/** Le parent choisit une récompense réelle, gagnée après quelques missions accomplies. */
export default function FamilyRewardScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const current = useFamilyReward(childId);
  const save = useSetFamilyReward(childId);
  const [label, setLabel] = useState('');
  const [missions, setMissions] = useState<(typeof MISSIONS)[number]>('5');
  const alias = child.data?.alias ?? 'votre enfant';

  return (
    <Screen>
      <ThemedText type="subtitle">Une récompense en famille</ThemedText>
      <ThemedText themeColor="textSecondary">
        Un moment ensemble ou un petit privilège plutôt qu’un objet : {alias} voit sur sa console combien de
        missions il reste. Quand c’est gagné, vous le verrez dans le cockpit.
      </ThemedText>
      {current.data ? (
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText>
            En cours : « {current.data.reward.label} » · {current.data.done} mission
            {current.data.done > 1 ? 's' : ''} sur {current.data.reward.missions_needed}
          </ThemedText>
        </ThemedView>
      ) : null}
      <ChoiceChips
        label="Idées"
        options={REWARD_IDEAS}
        labels={Object.fromEntries(REWARD_IDEAS.map((r) => [r, r])) as Record<string, string>}
        selected={REWARD_IDEAS.filter((r) => r === label)}
        onToggle={setLabel}
      />
      <TextField label="La récompense" value={label} onChangeText={setLabel} maxLength={60} />
      <ChoiceChips
        label="Après combien de missions accomplies ?"
        options={MISSIONS}
        labels={Object.fromEntries(MISSIONS.map((m) => [m, `${m} missions`])) as Record<string, string>}
        selected={[missions]}
        onToggle={setMissions}
      />
      <Button
        label={current.data ? 'Remplacer la récompense' : 'Choisir cette récompense'}
        disabled={label.trim().length < 2}
        loading={save.isPending}
        onPress={() => save.mutate({ label, missions: Number(missions) }, { onSuccess: () => setLabel('') })}
      />
      {save.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’enregistrement a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three },
});
