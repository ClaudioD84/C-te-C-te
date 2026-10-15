import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Durée maximale d'un enregistrement, en secondes. */
const MAX_SECONDS = 180;

/**
 * « Je récite » : l'enfant s'enregistre en récitant (poésie, leçon, vocabulaire) puis se réécoute.
 * L'enregistrement reste sur l'appareil, pour cette séance : il n'est jamais envoyé ni gardé.
 */
export function RecitationRecorder() {
  const [uri, setUri] = useState<string | null>(null);
  const player = useAudioPlayer(null);
  const keep = (url: string) => {
    setUri(url);
    player.replace({ uri: url });
  };
  // Fin d'enregistrement (bouton ou durée maximale atteinte) : on garde le fichier pour la réécoute.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.isFinished && status.url) keep(status.url);
  });
  const state = useAudioRecorderState(recorder, 250);
  const [message, setMessage] = useState<string | null>(null);
  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);

  async function start() {
    setMessage(null);
    const permission = await requestRecordingPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      setMessage('Il faut autoriser le micro pour t’enregistrer. Demande à ton parent.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    // Au-delà de 3 minutes, l'enregistrement s'arrête tout seul.
    recorder.record({ forDuration: MAX_SECONDS });
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri) keep(recorder.uri);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">🎤 Je récite</ThemedText>
      <ThemedText themeColor="textSecondary">
        Récite ta leçon ou ta poésie, puis réécoute-toi. Ton enregistrement reste sur cet appareil et
        disparaît quand tu quittes l’écran.
      </ThemedText>
      {state.isRecording ? (
        <>
          <ThemedText accessibilityLiveRegion="polite">🔴 J’écoute… {seconds} s</ThemedText>
          <Button label="⏹️ J’ai fini" onPress={() => void stop()} />
        </>
      ) : (
        <Button
          variant={uri ? 'secondary' : 'primary'}
          label={uri ? '🎤 Recommencer' : '🎤 M’enregistrer'}
          onPress={() => void start().catch(() => setMessage('L’enregistrement n’a pas pu démarrer.'))}
        />
      )}
      {uri && !state.isRecording ? (
        <Button
          label="▶️ Me réécouter"
          onPress={() => {
            player.seekTo(0);
            player.play();
          }}
        />
      ) : null}
      {message ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
});
