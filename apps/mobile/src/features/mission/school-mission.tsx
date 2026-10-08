import type { LearningSettings } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MOODS, MoodPicker, type Mood } from '@/features/mood/mood';
import type { SessionItem, StudySession } from '@/features/planning/api';

import { BreathingExercise } from './breathing-exercise';
import { MissionCard, MissionText } from './mission-card';
import { MissionComplete } from './mission-complete';
import { PomodoroTimer } from './pomodoro-timer';

/**
 * Mission du jour (primaire et secondaire) : météo de l'enfant, activités (une à la fois selon le profil),
 * minuteur. Les activités affichées sont calculées par missionItems.
 */
export function SchoolMission({
  childId,
  session,
  allRemaining,
  remaining,
  settings,
  mood,
  onMood,
  relaxEnabled,
}: {
  childId: string;
  session: StudySession | undefined;
  allRemaining: readonly SessionItem[];
  remaining: readonly SessionItem[];
  settings: LearningSettings;
  mood: Mood | null | undefined;
  onMood: (mood: Mood) => void;
  /** Coin détente ouvert : un petit jeu est proposé pendant les pauses du minuteur. */
  relaxEnabled: boolean;
}) {
  const [breathing, setBreathing] = useState(false);
  const tired = mood && mood !== 'forme';
  const remainingMinutes = remaining.reduce((sum, item) => sum + item.minutes, 0);

  if (session && allRemaining.length > 0 && !mood)
    return <MoodPicker settings={settings} onChoose={onMood} />;
  if (!session)
    return <MissionText settings={settings}>Pas de mission aujourd&apos;hui. Profite bien !</MissionText>;
  if (remaining.length === 0 && allRemaining.length > 0) {
    return (
      <>
        <MissionText settings={settings}>
          Bravo, l&apos;essentiel est fait ! Le reste peut attendre.
        </MissionText>
        <Button
          variant="secondary"
          label="J'ai encore de l'énergie : continuer"
          onPress={() => onMood('forme')}
        />
      </>
    );
  }
  if (remaining.length === 0) return <MissionComplete childId={childId} settings={settings} />;

  const hidden = remaining.length - settings.maxItemsPerScreen;
  return (
    <>
      {tired ? (
        <>
          <MissionText settings={settings}>
            {MOODS[mood].emoji} {MOODS[mood].message}
          </MissionText>
          {breathing ? (
            <BreathingExercise onClose={() => setBreathing(false)} />
          ) : (
            <Button variant="secondary" label="Respirer un moment avant" onPress={() => setBreathing(true)} />
          )}
        </>
      ) : null}
      {remaining.slice(0, settings.maxItemsPerScreen).map((item) => (
        <MissionCard key={item.task_id} item={item} session={session} settings={settings} childId={childId} />
      ))}
      {hidden > 0 ? (
        <ThemedText themeColor="textSecondary">
          Ensuite : encore {hidden} activité{hidden > 1 ? 's' : ''}.
        </ThemedText>
      ) : null}
      <PomodoroTimer
        workMinutes={settings.workMinutes}
        breakMinutes={settings.breakMinutes}
        cycles={Math.min(4, Math.max(1, Math.ceil(remainingMinutes / settings.workMinutes)))}
        onRelax={relaxEnabled ? () => router.push('/enfant/detente') : undefined}
      />
    </>
  );
}
