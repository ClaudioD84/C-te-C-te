import {
  ACCESSORIES,
  ACCESSORY_CODES,
  AVATAR_STAGES,
  avatarOf,
  isUnlocked,
  unlockHint,
  type AccessoryCode,
  type RewardSummary,
} from '@cote-a-cote/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useSetAccessory, type StoredChildProfile } from '@/features/profiles/api';
import { useTheme } from '@/hooks/use-theme';

const STAGE_NAMES = Object.fromEntries(AVATAR_STAGES.map((s) => [s.level, s.name]));

/** Avatar avec son accessoire (« 🦁🧢 »). */
export function avatarWithAccessory(child: Pick<StoredChildProfile, 'avatar' | 'accessory'>): string {
  return `${avatarOf(child.avatar).emoji}${child.accessory ? ACCESSORIES[child.accessory].emoji : ''}`;
}

/** L'enfant habille son avatar avec les accessoires gagnés par son effort. */
export function AccessoryPicker({ child, summary }: { child: StoredChildProfile; summary: RewardSummary }) {
  const theme = useTheme();
  const setAccessory = useSetAccessory(child.id);
  const current = child.accessory ?? null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">Mon avatar : {avatarWithAccessory(child)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Tes efforts débloquent des accessoires. Touche-en un pour le mettre, touche-le encore pour l’enlever.
      </ThemedText>
      <View style={styles.grid}>
        {ACCESSORY_CODES.map((code: AccessoryCode) => {
          const accessory = ACCESSORIES[code];
          const unlocked = isUnlocked(code, summary);
          const selected = current === code;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ disabled: !unlocked, selected }}
              accessibilityLabel={
                unlocked
                  ? `${accessory.label}${selected ? ', porté' : ''}`
                  : `${accessory.label}, à débloquer. ${unlockHint(code, STAGE_NAMES)}`
              }
              disabled={!unlocked || setAccessory.isPending}
              onPress={() => setAccessory.mutate(selected ? null : code)}
              style={[
                styles.item,
                { borderColor: selected ? theme.primary : theme.backgroundSelected },
                selected && styles.selected,
              ]}>
              <ThemedText style={[styles.emoji, !unlocked && styles.locked]}>
                {unlocked ? accessory.emoji : '🔒'}
              </ThemedText>
              <ThemedText type="small" style={styles.label}>
                {accessory.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  item: {
    width: 96,
    minHeight: MinTouchSize,
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  selected: { borderWidth: 3 },
  emoji: { fontSize: 32, lineHeight: 40 },
  locked: { opacity: 0.55 },
  label: { textAlign: 'center' },
});
