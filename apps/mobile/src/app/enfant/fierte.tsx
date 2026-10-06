import {
  deriveLearningSettings,
  formatShortDate,
  PRIDE_EMOJIS,
  PRIDE_MAX_LENGTH,
  PRIDE_PROMPTS,
} from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useAddPride, usePrideEntries } from '@/features/pride/api';
import { useChildProfile } from '@/features/profiles/api';
import { useTheme } from '@/hooks/use-theme';

/** Carnet de fierté : l'enfant note un moment dont il est fier (un pictogramme, quelques mots s'il veut). */
export default function PrideScreen() {
  const theme = useTheme();
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const entries = usePrideEntries(childId);
  const add = useAddPride(childId);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  if (!child.data || entries.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  const settings = deriveLearningSettings(child.data);

  return (
    <ChildScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">🌟 Mon carnet de fierté</ThemedText>
        <ThemedText style={learningTextStyle(settings)}>
          De quoi es-tu fier ou fière cette semaine ? À l’école ou ailleurs, tout compte.
        </ThemedText>
        <View style={styles.emojis} accessibilityRole="radiogroup" accessibilityLabel="Choisis une image">
          {PRIDE_EMOJIS.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="radio"
              aria-checked={emoji === e}
              accessibilityLabel={e}
              onPress={() => {
                setEmoji(e);
                setSaved(false);
              }}
              style={[
                styles.emoji,
                { borderColor: emoji === e ? theme.primary : theme.border },
                emoji === e && styles.selected,
              ]}>
              <ThemedText style={styles.emojiText}>{e}</ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.prompts}>
          {PRIDE_PROMPTS.map((p) => (
            <Button key={p} variant="secondary" label={p} onPress={() => setText(p)} />
          ))}
        </View>
        <TextField
          label="En quelques mots (si tu veux)"
          value={text}
          onChangeText={(t) => {
            setText(t);
            setSaved(false);
          }}
          maxLength={PRIDE_MAX_LENGTH}
        />
        {saved ? (
          <ThemedText accessibilityLiveRegion="polite" style={learningTextStyle(settings)}>
            C’est noté dans ton carnet. Bravo !
          </ThemedText>
        ) : null}
        {add.error ? (
          <ThemedText themeColor="danger" accessibilityRole="alert">
            Ça n’a pas marché. Réessaie plus tard.
          </ThemedText>
        ) : null}
        <Button
          label="Ajouter à mon carnet"
          disabled={!emoji}
          loading={add.isPending}
          onPress={() =>
            add.mutate(
              { emoji: emoji!, text },
              {
                onSuccess: () => {
                  setEmoji(null);
                  setText('');
                  setSaved(true);
                },
              },
            )
          }
        />
        {(entries.data ?? []).length > 0 ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            {entries.data!.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <ThemedText style={styles.emojiText}>{entry.emoji}</ThemedText>
                <View style={styles.flex}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatShortDate(entry.date)}
                  </ThemedText>
                  {entry.text ? (
                    <ThemedText style={learningTextStyle(settings)}>{entry.text}</ThemedText>
                  ) : null}
                </View>
              </View>
            ))}
          </ThemedView>
        ) : null}
        <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  emoji: {
    width: MinTouchSize + 8,
    height: MinTouchSize + 8,
    borderRadius: Spacing.three,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderWidth: 4 },
  emojiText: { fontSize: 28, lineHeight: 36 },
  prompts: { gap: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  entry: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
