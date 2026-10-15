import { DOCUMENT_TYPE_LABELS } from '@cote-a-cote/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { processScan, usePendingScans, type PendingScan } from '@/features/scan/api';

/** Analyses lancées en même temps : assez rapide, sans dépasser les limites de débit de l'IA. */
const PARALLEL_ANALYSES = 2;

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * Documents d'un enfant envoyés mais pas encore validés (F3) : leur lecture se lance ici, deux à la fois, puis le
 * parent relit et valide chacun. Rien n'est planifié avant.
 */
export default function PendingScansScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const scans = usePendingScans(childId);
  const queryClient = useQueryClient();
  const started = useRef(new Set<string>());
  const [running, setRunning] = useState(0);
  // Lecture qui n'a pas pu démarrer (réseau coupé…) : le parent la relance quand il le souhaite.
  const [stalled, setStalled] = useState<Record<string, string>>({});

  useEffect(() => {
    const waiting = (scans.data ?? []).filter((s) => s.status === 'uploaded' && !started.current.has(s.id));
    for (const scan of waiting.slice(0, Math.max(0, PARALLEL_ANALYSES - running))) {
      started.current.add(scan.id);
      setRunning((n) => n + 1);
      // Le résultat (ou l'échec, avec son message) se lit sur la numérisation elle-même.
      void processScan(scan.id)
        .catch((error: Error) => setStalled((all) => ({ ...all, [scan.id]: error.message })))
        .finally(() => {
          setRunning((n) => n - 1);
          void queryClient.invalidateQueries({ queryKey: ['pending_scans', childId] });
        });
    }
  }, [scans.data, running, stalled, childId, queryClient]);

  if (scans.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const list = scans.data ?? [];
  const reading = list.filter((s) => s.status === 'uploaded' || s.status === 'processing').length;
  return (
    <Screen>
      {list.length === 0 ? (
        <ThemedText>
          ✅ Tous les documents ont été relus. Les tâches validées sont prêtes pour le planning.
        </ThemedText>
      ) : (
        <ThemedText>
          {reading > 0
            ? `Lecture de ${plural(reading, 'document')} en cours. Vous pouvez relire ceux qui sont prêts.`
            : 'Relisez chaque document puis validez-le : rien n’est planifié avant.'}
        </ThemedText>
      )}
      {list.map((scan, i) => (
        <ScanRow
          key={scan.id}
          scan={scan}
          number={i + 1}
          stalled={scan.status === 'uploaded' ? stalled[scan.id] : undefined}
          onRetry={() => {
            started.current.delete(scan.id);
            setStalled(({ [scan.id]: _, ...rest }) => rest);
          }}
        />
      ))}
      <Button
        variant="secondary"
        label="📷 Photographier d’autres documents"
        onPress={() => router.push({ pathname: '/scan/nouveau', params: { childId } })}
      />
      {list.length === 0 ? <Button label="Retour au cockpit" onPress={() => router.dismissTo('/')} /> : null}
    </Screen>
  );
}

function ScanRow({
  scan,
  number,
  stalled,
  onRetry,
}: {
  scan: PendingScan;
  number: number;
  stalled: string | undefined;
  onRetry: () => void;
}) {
  const title = `Document ${number} · ${scan.document_type ? DOCUMENT_TYPE_LABELS[scan.document_type] : 'Document'}`;
  const open = () => router.push({ pathname: '/scan/[scanId]', params: { scanId: scan.id, lot: '1' } });
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {title}
        {scan.pages > 1 ? ` · ${scan.pages} pages` : ''}
      </ThemedText>
      {stalled ? (
        <>
          <ThemedText themeColor="danger">{stalled}</ThemedText>
          <Button
            variant="secondary"
            label="Relancer la lecture"
            accessibilityLabel={`Relancer la lecture du document ${number}`}
            onPress={onRetry}
          />
        </>
      ) : scan.status === 'uploaded' || scan.status === 'processing' ? (
        <View style={styles.row}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            {scan.status === 'uploaded' ? 'En attente de lecture…' : 'Lecture en cours…'}
          </ThemedText>
        </View>
      ) : null}
      {scan.status === 'draft' ? (
        <>
          <ThemedText>
            Lu{scan.tasks > 0 ? ` : ${plural(scan.tasks, 'tâche')} à vérifier` : ' : à vérifier'}
          </ThemedText>
          <Button
            label="Relire et valider"
            accessibilityLabel={`Relire le document ${number}`}
            onPress={open}
          />
        </>
      ) : null}
      {scan.status === 'failed' ? (
        <>
          <ThemedText themeColor="danger">{scan.error ?? "L'analyse a échoué."}</ThemedText>
          <Button
            variant="secondary"
            label="Réessayer ou abandonner"
            accessibilityLabel={`Voir le document ${number}`}
            onPress={open}
          />
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
