import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import {
  applyParentPushSettings,
  loadParentPushSettings,
  parentPushSupported,
  type ParentPushSettings,
} from './push';

const ON_OFF = { oui: 'Activé', non: 'Désactivé' } as const;

/** Rappels : être prévenu sur ce téléphone quand l'enfant demande de l'aide ou termine sa mission. */
export function ParentPushCard({ onDenied }: { onDenied: () => void }) {
  const [settings, setSettings] = useState<ParentPushSettings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadParentPushSettings().then(setSettings);
  }, []);

  if (!parentPushSupported || !settings) return null;

  async function update(next: ParentPushSettings) {
    setFailed(false);
    try {
      if (!(await applyParentPushSettings(next))) {
        onDenied();
        return;
      }
      setSettings(next);
    } catch {
      setFailed(true);
    }
  }

  const toggle = (on: boolean) => (on ? ['oui'] : ['non']);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Me prévenir sur ce téléphone</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Quand votre enfant travaille sur sa tablette ou le téléphone d’un autre parent. Le message ne contient
        que son prénom.
      </ThemedText>
      <ChoiceChips
        label="Quand mon enfant demande de l’aide"
        options={['oui', 'non'] as const}
        labels={ON_OFF}
        selected={toggle(settings.help)}
        onToggle={(v) => update({ ...settings, help: v === 'oui' })}
      />
      <ChoiceChips
        label="Quand la mission du jour est terminée"
        options={['oui', 'non'] as const}
        labels={ON_OFF}
        selected={toggle(settings.mission)}
        onToggle={(v) => update({ ...settings, mission: v === 'oui' })}
      />
      {failed ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’enregistrement a échoué. Vérifiez votre connexion et réessayez.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
