import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useCreateChildProfile } from '@/features/profiles/api';
import { ProfileFields, useProfileForm } from '@/features/profiles/profile-form';

export default function NewChildProfileScreen() {
  const form = useProfileForm({ alias: '', grade: 'P1', track: 'general', needs: [] });
  const createProfile = useCreateChildProfile();

  async function save() {
    try {
      await createProfile.mutateAsync(form.values);
      router.back();
    } catch {
      // Message affiché sous le formulaire.
    }
  }

  return (
    <Screen>
      <ProfileFields {...form} />

      {createProfile.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {createProfile.error.message.includes('formule')
            ? createProfile.error.message
            : 'L’enregistrement a échoué. Vérifiez votre connexion.'}
        </ThemedText>
      ) : null}

      <Button label="Enregistrer" onPress={save} loading={createProfile.isPending} disabled={!form.valid} />
    </Screen>
  );
}
