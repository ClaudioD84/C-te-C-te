import { currentHoliday, GRADE_LABELS, NEED_LABELS, schoolLevel, toIsoDate } from '@cote-a-cote/shared';
import { Link, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { hasParentCode } from '@/features/child-mode/parent-code-store';
import { useDaysOff } from '@/features/days-off/api';
import { useSessions } from '@/features/planning/api';
import { avatarWithAccessory } from '@/features/rewards/accessory-picker';
import { TableTalkCard } from '@/features/table/table-talk-card';
import { HelpRequestsCard } from '@/features/help/help-requests-card';
import { RewardEarnedCard } from '@/features/family-reward/reward-earned-card';
import { OfflineBanner } from '@/features/offline/offline-banner';
import { FirstSteps } from '@/features/onboarding/first-steps';
import { SubscriptionBanner } from '@/features/subscription/subscription-banner';
import { useChildProfiles, type StoredChildProfile } from '@/features/profiles/api';

function ChildCard({ child }: { child: StoredChildProfile }) {
  const { enter } = useChildMode();
  const daysOff = useDaysOff(child.id);
  const holiday = currentHoliday(daysOff.data ?? [], toIsoDate(new Date()));
  const todaySessions = useSessions(child.id, toIsoDate(new Date()), 1);
  const missionDone = todaySessions.data?.[0]?.status === 'done';

  async function launchMission() {
    // Le code parent est obligatoire avant de confier l'appareil à l'enfant.
    if (await hasParentCode()) {
      await enter(child.id);
    } else {
      router.push({ pathname: '/code-parent', params: { childId: child.id } });
    }
  }

  const needs = child.needs.map((n) => NEED_LABELS[n]).join(', ');
  const kindergarten = schoolLevel(child.grade) === 'maternelle';
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">
        {avatarWithAccessory(child)} {child.alias}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {GRADE_LABELS[child.grade]}
        {needs ? ` · ${needs}` : ''}
      </ThemedText>
      {missionDone ? (
        <ThemedText type="smallBold" themeColor="primary">
          ✅ Mission du jour accomplie
        </ThemedText>
      ) : null}
      <HelpRequestsCard childId={child.id} alias={child.alias} />
      <RewardEarnedCard childId={child.id} alias={child.alias} />
      {!kindergarten ? <TableTalkCard childId={child.id} alias={child.alias} /> : null}
      {holiday ? (
        <Button
          label="🏖️ Idées pour les vacances"
          onPress={() => router.push({ pathname: '/vacances/[childId]', params: { childId: child.id } })}
        />
      ) : null}
      {kindergarten ? (
        // Maternelle : pas de devoirs ni de journal de classe, des jeux à faire ensemble.
        <Button
          label="Activités de la semaine"
          onPress={() => router.push({ pathname: '/maternelle/[childId]', params: { childId: child.id } })}
        />
      ) : (
        <Button
          label="Photographier le journal de classe"
          onPress={() => router.push({ pathname: '/scan/nouveau', params: { childId: child.id } })}
        />
      )}
      {/* Actions secondaires sur deux colonnes : la carte reste courte. */}
      <View style={styles.grid}>
        <Button
          style={styles.half}
          variant="secondary"
          label={kindergarten ? 'Suivi' : 'Suivi et épreuves'}
          onPress={() => router.push({ pathname: '/suivi/[childId]', params: { childId: child.id } })}
        />
        {!kindergarten ? (
          <Button
            style={styles.half}
            variant="secondary"
            label="Planning de la semaine"
            onPress={() => router.push({ pathname: '/planning/[childId]', params: { childId: child.id } })}
          />
        ) : null}
        <Button
          style={styles.half}
          variant="secondary"
          label="Lancer la mission du jour"
          onPress={launchMission}
        />
        <Button
          style={styles.half}
          variant="secondary"
          label="Écrire un petit mot"
          accessibilityLabel={`Écrire un petit mot à ${child.alias}`}
          onPress={() => router.push({ pathname: '/mot/[childId]', params: { childId: child.id } })}
        />
        <Button
          style={styles.half}
          variant="secondary"
          label="🎒 Cartable"
          accessibilityLabel={`Cartable de ${child.alias}`}
          onPress={() => router.push({ pathname: '/cartable/[childId]', params: { childId: child.id } })}
        />
        <Button
          style={styles.half}
          variant="secondary"
          label="Modifier le profil"
          onPress={() => router.push({ pathname: '/profils/[childId]', params: { childId: child.id } })}
        />
      </View>
    </ThemedView>
  );
}

export default function CockpitScreen() {
  const { data: children, isLoading, error, refetch } = useChildProfiles();

  return (
    <Screen>
      <OfflineBanner audience="parent" />
      <SubscriptionBanner />
      <ThemedText type="subtitle">Vos enfants</ThemedText>
      {children ? <FirstSteps profiles={children} /> : null}

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

      <Link href="/compte" asChild>
        <Button label="Mon compte et réglages" variant="secondary" />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  half: { flexGrow: 1, flexBasis: '45%' },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  gap: { gap: Spacing.two },
});
