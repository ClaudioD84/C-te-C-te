import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGiveSiblingReward, useSiblingChallenge, useStartSiblingChallenge } from '@/features/sibling/api';

const MISSIONS = ['6', '10', '15', '20'] as const;
const IDEAS = [
  'Une soirée pizza',
  'Une sortie au cinéma',
  'Un après-midi jeux de société',
  'Un pique-nique',
] as const;

/** Défi commun aux frères et sœurs : un total de missions à atteindre ensemble, une récompense partagée. */
export default function SiblingChallengeScreen() {
  const current = useSiblingChallenge();
  const start = useStartSiblingChallenge();
  const give = useGiveSiblingReward();
  const [label, setLabel] = useState('');
  const [missions, setMissions] = useState<(typeof MISSIONS)[number]>('10');
  const won = current.data ? current.data.done >= current.data.missionsNeeded : false;

  return (
    <Screen>
      <ThemedText type="subtitle">Défi des frères et sœurs</ThemedText>
      <ThemedText themeColor="textSecondary">
        Un objectif commun : les missions de tous les enfants s’additionnent. Chacun voit le total sur sa
        console, jamais qui en a fait le plus : on gagne ensemble.
      </ThemedText>
      {current.data ? (
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText>
            En cours : « {current.data.label} » · {current.data.done} mission
            {current.data.done > 1 ? 's' : ''} sur {current.data.missionsNeeded}
          </ThemedText>
          {won ? (
            <Button
              label="Récompense donnée"
              loading={give.isPending}
              onPress={() => give.mutate(current.data!.id)}
            />
          ) : null}
        </ThemedView>
      ) : null}
      <ChoiceChips
        label="Idées"
        options={IDEAS}
        labels={Object.fromEntries(IDEAS.map((r) => [r, r])) as Record<string, string>}
        selected={IDEAS.filter((r) => r === label)}
        onToggle={setLabel}
      />
      <TextField label="La récompense commune" value={label} onChangeText={setLabel} maxLength={60} />
      <ChoiceChips
        label="Combien de missions à eux tous ?"
        options={MISSIONS}
        labels={Object.fromEntries(MISSIONS.map((m) => [m, `${m} missions`])) as Record<string, string>}
        selected={[missions]}
        onToggle={setMissions}
      />
      <Button
        label={current.data ? 'Remplacer le défi' : 'Lancer le défi'}
        disabled={label.trim().length < 2}
        loading={start.isPending}
        onPress={() => start.mutate({ label, missions: Number(missions) }, { onSuccess: () => setLabel('') })}
      />
      {start.error || give.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’enregistrement a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
