import { mondayOfWeek, toIsoDate } from '@cote-a-cote/shared';
import { router } from 'expo-router';

import { Button } from '@/components/button';

import { usePrideEntries } from './api';

/** Sur la console, une fois la mission faite : rappel du carnet de fierté s'il est vide cette semaine. */
export function PridePrompt({ childId }: { childId: string }) {
  const entries = usePrideEntries(childId);
  const monday = mondayOfWeek(toIsoDate(new Date()));
  if (!entries.data || entries.data.some((e) => e.date >= monday)) return null;
  return (
    <Button
      variant="secondary"
      label="🌟 De quoi es-tu fier·e cette semaine ?"
      onPress={() => router.push('/enfant/fierte')}
    />
  );
}
