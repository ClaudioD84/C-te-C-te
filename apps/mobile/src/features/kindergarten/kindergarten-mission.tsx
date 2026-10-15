import type { Grade, LearningSettings } from '@cote-a-cote/shared';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { learningTextStyle } from '@/constants/fonts';

import { KindergartenActivityCard } from './activity-card';
import { useKindergartenWeek, useLogKindergartenActivity } from './api';

/** Console enfant en maternelle : une activité de la semaine à la fois, à faire avec le parent. */
export function KindergartenMission({
  childId,
  grade,
  settings,
}: {
  childId: string;
  grade: Grade;
  settings: LearningSettings;
}) {
  const week = useKindergartenWeek(childId, grade);
  const logDone = useLogKindergartenActivity(childId);

  if (week.isLoading) return <ActivityIndicator />;
  if (!week.data) return null;

  const remaining = week.data.activities.filter((a) => !week.data.doneThisWeek.has(a.code));
  const next = remaining[0];
  if (!next) {
    return (
      <ThemedText style={learningTextStyle(settings)}>
        🎉 Bravo ! Toutes les activités de la semaine sont faites.
      </ThemedText>
    );
  }
  return (
    <>
      <ThemedText type="smallBold" themeColor="textSecondary">
        À faire ensemble
      </ThemedText>
      <KindergartenActivityCard activity={next} audience="enfant" settings={settings} done={false}>
        <Button label="On l'a fait !" onPress={() => logDone(next)} />
      </KindergartenActivityCard>
      {remaining.length > 1 ? (
        <ThemedText themeColor="textSecondary">
          Encore {remaining.length - 1} activité{remaining.length > 2 ? 's' : ''} cette semaine.
        </ThemedText>
      ) : null}
    </>
  );
}
