import { PLANNING_STRATEGIES, PLANNING_STRATEGY_LABELS, type PlanningStrategy } from '@cote-a-cote/shared';
import { StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface PlanSettings {
  strategy: PlanningStrategy;
  /** Temps de travail par jour choisi par le parent ; sinon selon l'âge. */
  dailyMinutes: number | undefined;
  days: 7 | 14;
}

const DAILY_OPTIONS = ['auto', '20', '30', '45', '60', '90'] as const;
type DailyOption = (typeof DAILY_OPTIONS)[number];
const HORIZON_OPTIONS = ['7', '14'] as const;

/** Réglages du calcul : quand travailler, combien de temps par jour, sur combien de jours. */
export function PlanSettingsCard({
  settings,
  autoMinutes,
  onChange,
}: {
  settings: PlanSettings;
  /** Temps quotidien conseillé selon l'âge. */
  autoMinutes: number;
  onChange: (settings: PlanSettings) => void;
}) {
  const dailyLabels: Record<DailyOption, string> = {
    auto: `Selon l’âge (${autoMinutes} min)`,
    '20': '20 min',
    '30': '30 min',
    '45': '45 min',
    '60': '1 h',
    '90': '1 h 30',
  };
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Selon votre semaine</ThemedText>
      <ChoiceChips
        label="Quand travailler ?"
        options={PLANNING_STRATEGIES}
        labels={PLANNING_STRATEGY_LABELS}
        selected={[settings.strategy]}
        onToggle={(strategy) => onChange({ ...settings, strategy })}
      />
      <ChoiceChips
        label="Temps de travail par jour"
        options={DAILY_OPTIONS}
        labels={dailyLabels}
        selected={[settings.dailyMinutes ? (String(settings.dailyMinutes) as DailyOption) : 'auto']}
        onToggle={(option) =>
          onChange({ ...settings, dailyMinutes: option === 'auto' ? undefined : Number(option) })
        }
      />
      <ChoiceChips
        label="Planifier sur"
        options={HORIZON_OPTIONS}
        labels={{ '7': '1 semaine', '14': '2 semaines' }}
        selected={[String(settings.days) as '7' | '14']}
        onToggle={(option) => onChange({ ...settings, days: option === '14' ? 14 : 7 })}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Une tâche « Prioritaire » commence toujours au plus tôt ; une tâche qui « Peut attendre » se fait près
        de son échéance et passe en dernier. Chaque activité reste modifiable ci-dessous avant publication.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
});
