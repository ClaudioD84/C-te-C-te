import {
  gradeYear,
  LISTENING_MIN_CARDS,
  schoolLevel,
  type Grade,
  type LearningSettings,
} from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WeeklyChallenge } from '@/features/challenge/weekly-challenge';
import { useSpellingList } from '@/features/spelling/api';
import { useLanguageCards } from '@/features/study/api';

/** Sous la mission : défi de la semaine et entraînements libres (dictée, lecture, tables). */
export function PracticeLinks({
  childId,
  grade,
  effortDays,
  settings,
}: {
  childId: string;
  grade: Grade;
  /** Jours d'effort de la semaine ; undefined tant que les récompenses ne sont pas chargées. */
  effortDays: number | undefined;
  settings: LearningSettings;
}) {
  const spelling = useSpellingList(childId);
  const languageCards = useLanguageCards(childId);
  const level = schoolLevel(grade);
  return (
    <View style={styles.extras}>
      {effortDays !== undefined && level !== 'maternelle' ? (
        <WeeklyChallenge childId={childId} effortDays={effortDays} settings={settings} />
      ) : null}
      <ThemedText type="smallBold" themeColor="textSecondary">
        Pour t’entraîner
      </ThemedText>
      {spelling.data && spelling.data.length > 0 ? (
        <Button
          variant="secondary"
          label={`✏️ Ma dictée (${spelling.data.length} mots)`}
          onPress={() => router.push('/enfant/dictee')}
        />
      ) : null}
      {(languageCards.data?.length ?? 0) >= LISTENING_MIN_CARDS ? (
        <Button
          variant="secondary"
          label="🎧 Écoute et choisis"
          onPress={() => router.push('/enfant/ecoute')}
        />
      ) : null}
      {level !== 'maternelle' ? (
        <Button variant="secondary" label="📚 J’ai lu" onPress={() => router.push('/enfant/lecture')} />
      ) : null}
      {level === 'primaire' ? (
        <Button
          variant="secondary"
          label={gradeYear(grade) <= 2 ? '➕ Les additions' : '✖️ Les tables'}
          onPress={() => router.push('/enfant/tables')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  extras: { gap: Spacing.two, marginTop: Spacing.three },
});
