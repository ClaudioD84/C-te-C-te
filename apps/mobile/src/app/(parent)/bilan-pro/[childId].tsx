import {
  adaptationLines,
  buildProReportHtml,
  DEFAULT_PRO_REPORT_SECTIONS,
  deriveLearningSettings,
  effortSummary,
  formatShortDate,
  GRADE_LABELS,
  NEED_LABELS,
  PRO_REPORT_SECTION_LABELS,
  PRO_REPORT_SECTIONS,
  proReportStart,
  schoolLevel,
  toIsoDate,
  type ProReportSection,
} from '@cote-a-cote/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { printCertificate, shareHtmlPdf } from '@/features/print/print-pack';
import { useHelpBySubject } from '@/features/pro-report/api';
import { useSubjectProgress } from '@/features/progress/api';
import { useChildProfile } from '@/features/profiles/api';
import { useAloudReadings } from '@/features/reading/aloud-api';
import { useEffortDays } from '@/features/rewards/api';

type Period = 'trimestre' | 'annee';

/**
 * Bilan pour un professionnel (logopède, PMS, enseignant) : le parent choisit la période et chaque partie
 * du document, puis l'imprime ou le partage en PDF. Prénom seulement, pas de nom de famille.
 */
export default function ProReportScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const [today] = useState(() => toIsoDate(new Date()));
  const [period, setPeriod] = useState<Period>('trimestre');
  const [sections, setSections] = useState<ProReportSection[]>([...DEFAULT_PRO_REPORT_SECTIONS]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(false);
  const from = proReportStart(today, period);
  const effort = useEffortDays(childId);
  const subjects = useSubjectProgress(childId, from);
  const help = useHelpBySubject(childId, from);
  const readings = useAloudReadings(childId);

  if (!child.data || effort.isLoading || subjects.isLoading || help.isLoading || readings.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }
  const profile = child.data;
  const primary = schoolLevel(profile.grade) === 'primaire';
  const available = PRO_REPORT_SECTIONS.filter((s) => s !== 'lecture' || primary);

  const html = () =>
    buildProReportHtml({
      alias: profile.alias,
      gradeLabel: GRADE_LABELS[profile.grade],
      from,
      to: today,
      sections,
      effort: effortSummary(effort.data ?? [], from, today),
      subjects: subjects.data ?? [],
      help: help.data ?? [],
      reading: (readings.data ?? []).filter((r) => r.date >= from),
      needs: profile.needs.map((n) => NEED_LABELS[n]),
      adaptations: adaptationLines(deriveLearningSettings(profile)),
      comment,
    });
  const run = (action: () => Promise<void>) => {
    setError(false);
    action().catch(() => setError(true));
  };

  return (
    <Screen>
      <ThemedText type="subtitle">Bilan pour un professionnel</ThemedText>
      <ThemedText themeColor="textSecondary">
        Pour un logopède, le centre PMS ou l’enseignant de {profile.alias} : un document des faits observés à
        la maison. Vous choisissez ce qu’il contient ; seul son prénom y figure.
      </ThemedText>
      <ChoiceChips
        label="Période"
        options={['trimestre', 'annee'] as const}
        labels={{ trimestre: '3 derniers mois', annee: 'Depuis la rentrée' }}
        selected={[period]}
        onToggle={setPeriod}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Du {formatShortDate(from)} au {formatShortDate(today)}
      </ThemedText>
      <ChoiceChips
        label="Parties du document"
        options={available}
        labels={PRO_REPORT_SECTION_LABELS}
        selected={sections}
        onToggle={(s) =>
          setSections(sections.includes(s) ? sections.filter((x) => x !== s) : [...sections, s])
        }
        multiple
      />
      {sections.includes('besoins') ? (
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText type="small">
            Les besoins particuliers sont une donnée de santé : ne les ajoutez que si le destinataire doit les
            connaître.
          </ThemedText>
        </ThemedView>
      ) : null}
      <TextField
        label="Vos remarques (facultatif)"
        value={comment}
        onChangeText={setComment}
        maxLength={600}
        multiline
      />
      {error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          Le document n’a pas pu être créé.
        </ThemedText>
      ) : null}
      <Button
        label="🖨️ Imprimer le bilan"
        disabled={sections.length === 0}
        onPress={() => run(() => printCertificate(html()))}
      />
      {Platform.OS !== 'web' ? (
        <Button
          variant="secondary"
          label="📄 Partager en PDF"
          disabled={sections.length === 0}
          onPress={() => run(() => shareHtmlPdf(html(), `Bilan de ${profile.alias}`))}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three },
});
