import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  useChildProfile,
  useDeleteChildProfile,
  useUpdateChildProfile,
  type StoredChildProfile,
} from '@/features/profiles/api';
import { ProfileFields, useProfileForm } from '@/features/profiles/profile-form';
import { syncReminders } from '@/features/reminders/sync';

export default function EditChildProfileScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data: child, error } = useChildProfile(childId ?? '');

  if (error) {
    return (
      <Screen>
        <ThemedText themeColor="danger">Impossible de charger ce profil.</ThemedText>
      </Screen>
    );
  }
  if (!child) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }
  return <EditForm child={child} />;
}

function EditForm({ child }: { child: StoredChildProfile }) {
  const form = useProfileForm({
    alias: child.alias,
    avatar: child.avatar,
    grade: child.grade,
    track: child.track,
    network: child.network,
    options: child.options,
    needs: child.needs,
    preferences: child.preferences,
  });
  const update = useUpdateChildProfile(child.id);
  const remove = useDeleteChildProfile(child.id);
  const [confirming, setConfirming] = useState(false);

  const withdrawn = child.needs.length > 0 && form.values.needs.length === 0;

  async function save() {
    try {
      await update.mutateAsync(form.values);
      // Le pseudonyme figure dans le texte des rappels.
      void syncReminders();
      router.back();
    } catch {
      // Message affiché sous le formulaire.
    }
  }

  async function runDelete() {
    try {
      await remove.mutateAsync();
      void syncReminders();
      router.dismissTo('/');
    } catch {
      // Message affiché sous le bouton.
    }
  }

  return (
    <Screen>
      <ProfileFields {...form} />

      {withdrawn ? (
        <ThemedText type="small" themeColor="textSecondary">
          En retirant tous les besoins particuliers, vous retirez votre consentement : ces informations sont
          effacées et les adaptations correspondantes cessent pour les prochains contenus.
        </ThemedText>
      ) : null}

      {update.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’enregistrement a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}

      <Button label="Enregistrer" onPress={save} loading={update.isPending} disabled={!form.valid} />

      {confirming ? (
        <ThemedView
          type="backgroundElement"
          style={{ padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two }}>
          <ThemedText>
            Le profil de {child.alias} et toutes ses données (tâches, plannings, fiches, cartes, suivi) seront
            supprimés définitivement.
          </ThemedText>
          <Button label="Supprimer définitivement" loading={remove.isPending} onPress={runDelete} />
          <Button variant="secondary" label="Annuler" onPress={() => setConfirming(false)} />
          {remove.error ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              La suppression a échoué. Vérifiez votre connexion.
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : (
        <Button variant="secondary" label="Supprimer ce profil" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}
