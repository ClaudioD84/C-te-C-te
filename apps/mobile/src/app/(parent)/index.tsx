import { GRADE_LABELS, NEED_LABELS } from '@cote-a-cote/shared';
import { Link, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { hasParentCode } from '@/features/child-mode/parent-code-store';
import { useChildProfiles, type StoredChildProfile } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase';

function ChildCard({ child }: { child: StoredChildProfile }) {
  const { enter } = useChildMode();

  async function launchMission() {
    // Le code parent est obligatoire avant de confier l'appareil à l'enfant.
    if (await hasParentCode()) {
      await enter(child.id);
    } else {
      router.push({ pathname: '/code-parent', params: { childId: child.id } });
    }
  }

  const needs = child.needs.map((n) => NEED_LABELS[n]).join(', ');
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">{child.alias}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {GRADE_LABELS[child.grade]}
        {needs ? ` · ${needs}` : ''}
      </ThemedText>
      <Button
        label="Photographier le journal de classe"
        onPress={() => router.push({ pathname: '/scan/nouveau', params: { childId: child.id } })}
      />
      <Button variant="secondary" label="Lancer la mission du jour" onPress={launchMission} />
    </ThemedView>
  );
}

export default function CockpitScreen() {
  const { data: children, isLoading, error, refetch } = useChildProfiles();

  return (
    <Screen>
      <ThemedText type="subtitle">Vos enfants</ThemedText>

      {isLoading ? <ActivityIndicator /> : null}
      {error ? (
        <View style={styles.gap}>
          <ThemedText themeColor="danger">Impossible de charger les profils.</ThemedText>
          <Button variant="secondary" label="Réessayer" onPress={() => refetch()} />
        </View>
      ) : null}

      {children?.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Ajoutez un premier profil pour commencer. Seul un pseudonyme est demandé.
        </ThemedText>
      ) : null}
      {children?.map((child) => (
        <ChildCard key={child.id} child={child} />
      ))}

      <Link href="/profils/nouveau" asChild>
        <Button label="Ajouter un enfant" variant="secondary" />
      </Link>

      <Link href="/noms-a-masquer" asChild>
        <Button label="Noms à masquer sur les photos" variant="secondary" />
      </Link>
      <Link href="/code-parent" asChild>
        <Button label="Modifier le code parent" variant="secondary" />
      </Link>
      <Button variant="secondary" label="Se déconnecter" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  gap: { gap: Spacing.two },
});
