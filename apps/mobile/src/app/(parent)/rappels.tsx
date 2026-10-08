import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings, type Weekday } from '@cote-a-cote/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildProfiles } from '@/features/profiles/api';
import { ensureNotificationPermission, remindersSupported } from '@/features/reminders/notifications';
import {
  anyReminderEnabled,
  loadReminderSettings,
  saveReminderSettings,
} from '@/features/reminders/settings-store';
import { syncReminders } from '@/features/reminders/sync';

const AFTERNOON = ['15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'] as const;
const QUIET_START = ['19:30', '20:00', '20:30', '21:00'] as const;
const QUIET_END = ['06:30', '07:00', '07:30', '08:00'] as const;
const PLANNING_DAYS = ['ven', 'sam', 'dim'] as const;
const DAY_LABELS: Record<(typeof PLANNING_DAYS)[number], string> = {
  ven: 'Vendredi',
  sam: 'Samedi',
  dim: 'Dimanche',
};
const ON_OFF = { oui: 'Activé', non: 'Désactivé' } as const;
const labelsOf = <T extends string>(values: readonly T[]) =>
  Object.fromEntries(values.map((v) => [v, v.replace(':', ' h ')])) as Record<T, string>;

/** Rappels sur cet appareil : mission du jour, évaluations, planning, photos à vérifier. */
export default function RemindersScreen() {
  const children = useChildProfiles();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    loadReminderSettings().then(setSettings);
  }, []);

  if (!remindersSupported) {
    return (
      <Screen>
        <ThemedText>
          Les rappels se règlent dans l’application installée sur le téléphone ou la tablette.
        </ThemedText>
      </Screen>
    );
  }
  if (!settings) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  async function update(next: ReminderSettings) {
    // L'autorisation n'est demandée qu'au moment où un rappel est activé.
    if (anyReminderEnabled(next) && !anyReminderEnabled(settings!)) {
      const granted = await ensureNotificationPermission();
      setDenied(!granted);
      if (!granted) return;
    }
    setSettings(next);
    await saveReminderSettings(next);
    void syncReminders();
  }

  const toggle = (on: boolean) => (on ? ['oui'] : ['non']);
  const kids = children.data ?? [];

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        Les rappels sont propres à cet appareil. Sur le téléphone de l’enfant, activez la mission du jour ;
        sur le vôtre, les évaluations, le planning et les photos.
      </ThemedText>
      {denied ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText themeColor="warning" accessibilityRole="alert">
            Les notifications sont refusées pour Côte à Côte. Autorisez-les dans les réglages du téléphone.
          </ThemedText>
          <Button variant="secondary" label="Ouvrir les réglages" onPress={() => Linking.openSettings()} />
        </ThemedView>
      ) : null}

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Mission du jour</ThemedText>
        <ChoiceChips
          label="Rappel à l’enfant les jours de mission"
          options={['oui', 'non'] as const}
          labels={ON_OFF}
          selected={toggle(settings.mission.enabled)}
          onToggle={(v) =>
            update({
              ...settings,
              mission: {
                ...settings.mission,
                enabled: v === 'oui',
                // Par défaut : tous les enfants.
                childIds:
                  settings.mission.childIds.length > 0 ? settings.mission.childIds : kids.map((k) => k.id),
              },
            })
          }
        />
        {settings.mission.enabled ? (
          <>
            <ChoiceChips
              label="Heure"
              options={AFTERNOON}
              labels={labelsOf(AFTERNOON)}
              selected={[settings.mission.time as (typeof AFTERNOON)[number]]}
              onToggle={(time) => update({ ...settings, mission: { ...settings.mission, time } })}
            />
            {kids.length > 1 ? (
              <ChoiceChips
                label="Pour"
                multiple
                options={kids.map((k) => k.id)}
                labels={Object.fromEntries(kids.map((k) => [k.id, k.alias]))}
                selected={settings.mission.childIds}
                onToggle={(id) => {
                  const ids = settings.mission.childIds.includes(id)
                    ? settings.mission.childIds.filter((x) => x !== id)
                    : [...settings.mission.childIds, id];
                  void update({ ...settings, mission: { ...settings.mission, childIds: ids } });
                }}
              />
            ) : null}
          </>
        ) : null}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Interrogations et examens</ThemedText>
        <ChoiceChips
          label="Rappel la veille (et une semaine avant le CEB, le CE1D, le CESS ou un bilan)"
          options={['oui', 'non'] as const}
          labels={ON_OFF}
          selected={toggle(settings.evaluations.enabled)}
          onToggle={(v) =>
            update({ ...settings, evaluations: { ...settings.evaluations, enabled: v === 'oui' } })
          }
        />
        {settings.evaluations.enabled ? (
          <ChoiceChips
            label="Heure"
            options={AFTERNOON}
            labels={labelsOf(AFTERNOON)}
            selected={[settings.evaluations.time as (typeof AFTERNOON)[number]]}
            onToggle={(time) => update({ ...settings, evaluations: { ...settings.evaluations, time } })}
          />
        ) : null}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Planning de la semaine</ThemedText>
        <ChoiceChips
          label="Rappel si la semaine suivante n’est pas planifiée"
          options={['oui', 'non'] as const}
          labels={ON_OFF}
          selected={toggle(settings.planning.enabled)}
          onToggle={(v) => update({ ...settings, planning: { ...settings.planning, enabled: v === 'oui' } })}
        />
        {settings.planning.enabled ? (
          <>
            <ChoiceChips
              label="Jour"
              options={PLANNING_DAYS}
              labels={DAY_LABELS}
              selected={[settings.planning.weekday as (typeof PLANNING_DAYS)[number]]}
              onToggle={(weekday: Weekday) =>
                update({ ...settings, planning: { ...settings.planning, weekday } })
              }
            />
            <ChoiceChips
              label="Heure"
              options={AFTERNOON}
              labels={labelsOf(AFTERNOON)}
              selected={[settings.planning.time as (typeof AFTERNOON)[number]]}
              onToggle={(time) => update({ ...settings, planning: { ...settings.planning, time } })}
            />
          </>
        ) : null}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Photos à vérifier</ThemedText>
        <ChoiceChips
          label="Rappel quand une photo analysée attend votre validation"
          options={['oui', 'non'] as const}
          labels={ON_OFF}
          selected={toggle(settings.scans.enabled)}
          onToggle={(v) => update({ ...settings, scans: { enabled: v === 'oui' } })}
        />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Heures calmes</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Aucun rappel pendant ces heures : ils sont reportés au matin (sauf la mission du jour, qui est alors
          omise).
        </ThemedText>
        <ChoiceChips
          label="À partir de"
          options={QUIET_START}
          labels={labelsOf(QUIET_START)}
          selected={[settings.quiet.start as (typeof QUIET_START)[number]]}
          onToggle={(start) => update({ ...settings, quiet: { ...settings.quiet, start } })}
        />
        <ChoiceChips
          label="Jusqu’à"
          options={QUIET_END}
          labels={labelsOf(QUIET_END)}
          selected={[settings.quiet.end as (typeof QUIET_END)[number]]}
          onToggle={(end) => update({ ...settings, quiet: { ...settings.quiet, end } })}
        />
      </ThemedView>

      {anyReminderEnabled(settings) ? (
        <Button
          variant="secondary"
          label="Tout désactiver"
          onPress={() => update(DEFAULT_REMINDER_SETTINGS)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
