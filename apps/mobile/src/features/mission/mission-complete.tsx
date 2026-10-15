import {
  celebrationPhrase,
  hasChestToday,
  treasureOfTheDay,
  type LearningSettings,
  type Treasure,
} from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

import { useTreasures } from './treasures';
import { useToday } from '@/hooks/use-today';

/**
 * Mission accomplie : on le fête (phrase du jour, petite animation sauf si « Réduire les animations »),
 * parfois un coffre-surprise, et un défi bonus pour qui veut continuer.
 */
export function MissionComplete({ childId, settings }: { childId: string; settings: LearningSettings }) {
  const today = useToday();
  const [scale] = useState(() => new Animated.Value(0.6));
  const treasures = useTreasures(childId);
  const [found, setFound] = useState<Treasure | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce) scale.setValue(1);
        else Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
      })
      .catch(() => scale.setValue(1));
  }, [scale]);

  const chest = treasures.loaded && hasChestToday(childId, today) && treasures.openedOn !== today;
  // Console sobre (secondaire) : on constate, sans fête.
  const sober = settings.tone === 'ado';

  return (
    <ThemedView type="backgroundSelected" style={styles.card} accessibilityLiveRegion="polite">
      <Animated.Text style={[styles.party, { transform: [{ scale }] }]} aria-hidden>
        {sober ? '✓' : '🎉'}
      </Animated.Text>
      <ThemedText type="subtitle" style={styles.center}>
        {sober ? 'Mission du jour terminée' : 'Mission accomplie !'}
      </ThemedText>
      <ThemedText style={[learningTextStyle(settings), styles.center]}>
        {celebrationPhrase(childId, today, settings.tone)}
      </ThemedText>

      {found ? (
        <ThemedView type="backgroundElement" style={styles.treasure}>
          <ThemedText type="smallBold">
            {found.kind === 'blague' ? '😄 Une blague' : '💡 Le savais-tu ?'}
          </ThemedText>
          <ThemedText style={learningTextStyle(settings)}>{found.text}</ThemedText>
        </ThemedView>
      ) : chest ? (
        <Button
          label={sober ? '💡 Le savais-tu ?' : '🎁 Ouvrir le coffre-surprise'}
          onPress={() => {
            const treasure = treasureOfTheDay(childId, today, treasures.ownedIds, settings.tone);
            treasures.keep(treasure, today);
            setFound(treasure);
          }}
        />
      ) : null}

      <Button
        variant="secondary"
        label={sober ? 'Questions bonus' : '⭐ Défi bonus'}
        onPress={() => router.push('/enfant/bonus')}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three, alignItems: 'stretch' },
  party: { fontSize: 64, lineHeight: 80, textAlign: 'center' },
  center: { textAlign: 'center' },
  treasure: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
