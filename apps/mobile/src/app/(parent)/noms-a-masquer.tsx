import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getSensitiveNames, setSensitiveNames } from '@/features/scan/sensitive-names';

export default function SensitiveNamesScreen() {
  const [names, setNames] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    getSensitiveNames().then(setNames);
  }, []);

  async function save(next: string[]) {
    setNames(next);
    await setSensitiveNames(next);
  }

  async function add() {
    const name = input.trim();
    if (name.length < 2 || names.includes(name)) return;
    await save([...names, name]);
    setInput('');
  }

  return (
    <Screen>
      <ThemedText>
        Ces noms seront cachés automatiquement sur les photos avant leur envoi : prénom et nom de vos enfants,
        nom de l&apos;école, des enseignants…
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Ils restent uniquement sur ce téléphone et ne sont jamais envoyés.
      </ThemedText>

      <TextField label="Ajouter un nom" value={input} onChangeText={setInput} onSubmitEditing={add} />
      <Button label="Ajouter" onPress={add} disabled={input.trim().length < 2} />

      {names.map((name) => (
        <ThemedView key={name} type="backgroundElement" style={styles.item}>
          <ThemedText style={styles.flex}>{name}</ThemedText>
          <Button variant="secondary" label="Retirer" onPress={() => save(names.filter((n) => n !== name))} />
        </ThemedView>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  flex: { flex: 1 },
});
