import {
  AVATAR_STAGES,
  BACKGROUNDS,
  backgroundsFor,
  defaultBackground,
  isBackgroundUnlocked,
  type BackgroundCode,
  type BackgroundTheme,
  type RewardSummary,
} from '@cote-a-cote/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useSetBackground, type StoredChildProfile } from '@/features/profiles/api';
import { useTheme } from '@/hooks/use-theme';

import { BackgroundScene } from './background-scene';

const STAGE_NAMES = Object.fromEntries(AVATAR_STAGES.map((s) => [s.level, s.name]));

/** L'enfant choisit son fond d'écran : ceux de son âge, ses centres d'intérêt d'abord. */
export function BackgroundPicker({ child, summary }: { child: StoredChildProfile; summary: RewardSummary }) {
  const theme = useTheme();
  const setBackground = useSetBackground(child.id);
  const current =
    child.background ?? defaultBackground(child.grade, child.preferences.interests ?? [], child.needs);
  const codes = backgroundsFor(child.grade, child.preferences.interests ?? []);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">Mon fond d’écran</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Choisis le décor de ta console. Certains se débloquent avec tes efforts.
      </ThemedText>
      <View style={styles.grid}>
        {codes.map((code: BackgroundCode) => {
          const bg: BackgroundTheme = BACKGROUNDS[code];
          const unlocked = isBackgroundUnlocked(code, summary.stage.level);
          const selected = current === code;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ disabled: !unlocked, selected }}
              accessibilityLabel={
                unlocked
                  ? `Fond ${bg.label}${selected ? ', choisi' : ''}`
                  : `Fond ${bg.label}, à débloquer au stade ${STAGE_NAMES[bg.unlockLevel ?? 0] ?? ''}`
              }
              disabled={!unlocked || selected || setBackground.isPending}
              onPress={() => setBackground.mutate(code)}
              style={[
                styles.item,
                { borderColor: selected ? theme.primary : theme.backgroundSelected },
                selected && styles.selected,
              ]}>
              {/* Aperçu de la scène, avec un cadenas tant que le fond n'est pas débloqué. */}
              <View
                style={[styles.preview, { backgroundColor: theme.background, borderColor: theme.border }]}>
                {code !== 'uni' ? <BackgroundScene code={code} bands={8} /> : null}
                {!unlocked ? (
                  <ThemedText style={styles.lock} aria-hidden>
                    🔒
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="small" style={styles.label}>
                {bg.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {setBackground.isError ? (
        <ThemedText type="small" themeColor="textSecondary">
          Le fond n’a pas pu être changé. Réessaie plus tard.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  item: {
    width: 112,
    minHeight: MinTouchSize,
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  selected: { borderWidth: 3 },
  preview: {
    width: 96,
    height: 64,
    borderRadius: Spacing.two,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { fontSize: 24, lineHeight: 30 },
  label: { textAlign: 'center' },
});
