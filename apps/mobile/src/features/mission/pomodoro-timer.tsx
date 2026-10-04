import {
  formatDuration,
  phaseProgress,
  startPomodoro,
  tickPomodoro,
  type PomodoroConfig,
  type PomodoroState,
} from '@cote-a-cote/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PHASE_LABELS = {
  travail: 'Au travail !',
  pause: 'Pause : bouge, bois un verre d’eau',
  termine: 'Bravo, session terminée !',
} as const;

export function PomodoroTimer({ workMinutes, breakMinutes, cycles }: PomodoroConfig) {
  const theme = useTheme();
  const config = useMemo(() => ({ workMinutes, breakMinutes, cycles }), [workMinutes, breakMinutes, cycles]);
  const [state, setState] = useState<PomodoroState | null>(null);
  const [running, setRunning] = useState(false);
  const lastTick = useRef(0);
  const active = running && state !== null && state.phase !== 'termine';

  useEffect(() => {
    if (!active) return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      // Calcul à partir de l'heure réelle : reste juste si l'application passe en arrière-plan.
      const now = Date.now();
      const elapsed = Math.floor((now - lastTick.current) / 1000);
      if (elapsed < 1) return;
      lastTick.current += elapsed * 1000;
      setState((s) => (s ? tickPomodoro(s, config, elapsed) : s));
    }, 250);
    return () => clearInterval(id);
  }, [active, config]);

  if (!state) {
    return (
      <Button
        size="large"
        label={`Commencer (${config.workMinutes} min)`}
        onPress={() => {
          setState(startPomodoro(config));
          setRunning(true);
        }}
      />
    );
  }

  const progress = phaseProgress(state, config);
  const barColor = state.phase === 'pause' ? theme.accent : theme.primary;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle" accessibilityLiveRegion="polite">
        {PHASE_LABELS[state.phase]}
      </ThemedText>
      {state.phase !== 'termine' ? (
        <>
          <ThemedText type="title" accessibilityLabel={`Temps restant ${formatDuration(state.remainingSeconds)}`}>
            {formatDuration(state.remainingSeconds)}
          </ThemedText>
          <View
            style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
            <View style={[styles.bar, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
          </View>
          <ThemedText themeColor="textSecondary">
            Étape {state.cycle} sur {config.cycles}
          </ThemedText>
          <Button
            variant="secondary"
            label={running ? 'Mettre en pause' : 'Reprendre'}
            onPress={() => setRunning(!running)}
          />
        </>
      ) : (
        <Button label="Recommencer" onPress={() => setState(null)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three, alignItems: 'stretch' },
  track: { height: 16, borderRadius: 8, overflow: 'hidden' },
  bar: { height: '100%' },
});
