import { breathingAt, BREATH_CYCLES, type BreathingState } from '@cote-a-cote/shared';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LABELS = { inspire: 'Inspire par le nez…', souffle: 'Souffle doucement…', fini: 'Bravo, tu es prêt !' };
const MIN = 70;
const MAX = 180;

/**
 * Respiration guidée : un cercle qui grandit à l'inspiration et rétrécit en soufflant.
 * Avec « Réduire les animations », le cercle garde sa taille : seules les consignes changent.
 */
export function BreathingExercise({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const start = useRef(0);
  const [state, setState] = useState<BreathingState>(breathingAt(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    start.current = Date.now();
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    const id = setInterval(() => setState(breathingAt(Date.now() - start.current)), 100);
    return () => clearInterval(id);
  }, []);

  const size = reduceMotion ? (MIN + MAX) / 2 : MIN + (MAX - MIN) * state.fullness;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle" accessibilityLiveRegion="polite">
        {LABELS[state.phase]}
      </ThemedText>
      <View
        style={styles.stage}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: state.phase === 'souffle' ? theme.accent : theme.primary,
            opacity: 0.85,
          }}
        />
      </View>
      {state.phase !== 'fini' ? (
        <ThemedText themeColor="textSecondary">
          Respiration {state.cycle} sur {BREATH_CYCLES}
        </ThemedText>
      ) : null}
      <Button
        variant={state.phase === 'fini' ? 'primary' : 'secondary'}
        label={state.phase === 'fini' ? 'Retour' : 'Arrêter'}
        onPress={onClose}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three, alignItems: 'center' },
  stage: { height: MAX + 8, width: MAX + 8, alignItems: 'center', justifyContent: 'center' },
});
