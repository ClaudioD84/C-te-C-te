import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useChildProfile } from '@/features/profiles/api';
import { useAddManualTask } from '@/features/scan/api';
import { TaskForm } from '@/features/scan/task-form';

/** Ajouter un devoir sans photo (journal oublié, consigne donnée oralement…). */
export default function ManualTaskScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const add = useAddManualTask(childId);
  const [added, setAdded] = useState<string[]>([]);
  // Nouveau formulaire vide après chaque ajout.
  const [formKey, setFormKey] = useState(0);

  return (
    <Screen>
      <ThemedText>
        Pas de journal sous la main ? Ajoutez le devoir de {child.data?.alias ?? 'votre enfant'} en quelques
        secondes : il rejoint le planning comme les autres.
      </ThemedText>
      {added.length > 0 ? (
        <ThemedText accessibilityLiveRegion="polite">
          ✓ Ajouté{added.length > 1 ? 's' : ''} : {added.join(' · ')}
        </ThemedText>
      ) : null}
      {add.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {add.error.message}
        </ThemedText>
      ) : null}
      <TaskForm
        key={formKey}
        saving={add.isPending}
        onCancel={() => router.back()}
        onSubmit={(draft) =>
          add.mutate(draft, {
            onSuccess: () => {
              setAdded((list) => [...list, `${draft.subject} : ${draft.description}`]);
              setFormKey((k) => k + 1);
            },
          })
        }
      />
      {added.length > 0 ? <Button variant="secondary" label="Terminé" onPress={() => router.back()} /> : null}
    </Screen>
  );
}
