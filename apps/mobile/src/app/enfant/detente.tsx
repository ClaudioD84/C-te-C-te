import {
  RELAX_GAMES,
  relaxGameOfTheDay,
  relaxGamesFor,
  relaxMinutesLimit,
  toIsoDate,
  treasureOfTheDay,
  type RelaxGame,
  type Treasure,
} from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useTreasures } from '@/features/mission/treasures';
import { useChildProfile } from '@/features/profiles/api';
import { BubblesGame } from '@/features/relax/bubbles-game';
import { ColoringGame } from '@/features/relax/coloring-game';
import { startOfToday, useLogRelax, useRelaxMinutes } from '@/features/relax/api';
import { MemoryGame } from '@/features/relax/memory-game';
import { SudokuGame } from '@/features/relax/sudoku-game';
import { TaquinGame } from '@/features/relax/taquin-game';
import { WordSearchGame } from '@/features/relax/word-search-game';
import { useSpellingList } from '@/features/spelling/api';

/**
 * Coin détente : de petits jeux calmes, limités par jour (réglage du parent). Pas de chrono affiché en
 * secondes ni de score : seulement les minutes qui restent, et une fin douce.
 */
export default function RelaxScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const [since] = useState(startOfToday);
  const used = useRelaxMinutes(childId, since);
  const spelling = useSpellingList(childId);
  const logRelax = useLogRelax(childId);
  const treasures = useTreasures(childId);
  const today = toIsoDate(new Date());

  const [game, setGame] = useState<RelaxGame | null>(null);
  const [round, setRound] = useState(0);
  const [offset, setOffset] = useState(0);
  const [won, setWon] = useState(false);
  const [treasure, setTreasure] = useState<Treasure | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const limit = child.data ? relaxMinutesLimit(child.data.preferences) : 0;
  const remaining = limit * 60 - (used.data ?? 0) * 60 - elapsed;
  const running = used.data !== undefined && limit > 0 && remaining > 0;

  // Temps de jeu de cette visite, noté quand elle se termine (fin du temps ou sortie de l'écran).
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(id);
      const seconds = (Date.now() - start) / 1000;
      if (seconds >= 20) logRelax(Math.max(1, Math.round(seconds / 60)), null);
    };
  }, [running, logRelax]);

  if (!child.data || used.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const tdah = child.data.needs.includes('tdah');
  const back = <Button label="Retour à la mission" onPress={() => router.back()} />;

  if (limit === 0) {
    return (
      <ChildScreen style={[styles.container, styles.center]}>
        <ThemedText style={styles.centerText}>Le coin détente est fermé. Demande à ton parent.</ThemedText>
        {back}
      </ChildScreen>
    );
  }

  if (!running) {
    return (
      <ChildScreen style={[styles.container, styles.center]}>
        <ThemedText type="subtitle" style={styles.centerText} accessibilityLiveRegion="polite">
          {tdah ? 'Fini pour aujourd’hui !' : 'Ta pause est finie, à demain ! 🌙'}
        </ThemedText>
        {back}
      </ChildScreen>
    );
  }

  const games = relaxGamesFor(child.data.grade);
  const shown = tdah
    ? [
        games[
          (games.indexOf(relaxGameOfTheDay(child.data.grade, `${childId}|${today}`)) + offset) % games.length
        ]!,
      ]
    : games;
  const seed = `${childId}|${today}|${game}|${round}`;
  const minutesLeft = Math.ceil(remaining / 60);

  const win = () => {
    setWon(true);
    if (treasures.loaded && treasures.relaxOn !== today) {
      const found = treasureOfTheDay(childId, `${today}|detente`, treasures.ownedIds);
      treasures.keep(found, today, 'detente');
      setTreasure(found);
    }
  };

  return (
    <ChildScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">🎈 Coin détente</ThemedText>
        <ThemedText themeColor="textSecondary">
          Encore {minutesLeft} minute{minutesLeft > 1 ? 's' : ''} de jeu aujourd’hui.
        </ThemedText>

        {game === null ? (
          <View style={styles.list}>
            {shown.map((g) => (
              <Button
                key={g}
                variant="secondary"
                size="large"
                label={`${RELAX_GAMES[g].emoji} ${RELAX_GAMES[g].label}`}
                onPress={() => {
                  setGame(g);
                  setWon(false);
                }}
              />
            ))}
            {tdah ? (
              <Button variant="secondary" label="Un autre jeu" onPress={() => setOffset((o) => o + 1)} />
            ) : null}
          </View>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              {RELAX_GAMES[game].emoji} {RELAX_GAMES[game].label}
            </ThemedText>
            <View key={seed}>
              {game === 'memory' ? (
                <MemoryGame
                  grade={child.data.grade}
                  interests={child.data.preferences.interests ?? []}
                  seed={seed}
                  onWin={win}
                />
              ) : game === 'taquin' ? (
                <TaquinGame grade={child.data.grade} seed={seed} onWin={win} />
              ) : game === 'sudoku' ? (
                <SudokuGame grade={child.data.grade} seed={seed} onWin={win} />
              ) : game === 'mots_meles' ? (
                <WordSearchGame
                  grade={child.data.grade}
                  words={spelling.data ?? []}
                  seed={seed}
                  onWin={win}
                />
              ) : game === 'coloriage' ? (
                <ColoringGame grade={child.data.grade} variant={round} onWin={win} />
              ) : (
                <BubblesGame onWin={win} />
              )}
            </View>
            {won && game !== 'bulles' ? (
              <ThemedText type="subtitle" accessibilityLiveRegion="polite">
                Bravo, c’est réussi !
              </ThemedText>
            ) : null}
            {treasure ? (
              <ThemedView type="backgroundSelected" style={styles.treasure}>
                <ThemedText type="smallBold">
                  {treasure.kind === 'blague' ? '😄 Un trésor : une blague' : '💡 Un trésor : le savais-tu ?'}
                </ThemedText>
                <ThemedText>{treasure.text}</ThemedText>
              </ThemedView>
            ) : null}
            {game !== 'bulles' ? (
              <Button
                variant="secondary"
                label="Nouvelle partie"
                onPress={() => {
                  setRound((r) => r + 1);
                  setWon(false);
                }}
              />
            ) : null}
            <Button
              variant="secondary"
              label="Changer de jeu"
              onPress={() => {
                setGame(null);
                setTreasure(null);
              }}
            />
          </ThemedView>
        )}
        {back}
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  list: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  treasure: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
