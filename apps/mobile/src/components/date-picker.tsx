import { toIsoDate, type IsoDate } from '@cote-a-cote/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Choix d'une date lointaine : d'abord le mois (sur les mois à venir), puis le jour. */
export function DatePicker({
  label,
  value,
  onChange,
  months = 10,
}: {
  label: string;
  value: IsoDate | null;
  onChange: (value: IsoDate) => void;
  months?: number;
}) {
  const today = new Date();
  const monthKeys = Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [month, setMonth] = useState(value ? value.slice(0, 7) : monthKeys[0]!);
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const todayIso = toIsoDate(today);
  const days = Array.from(
    { length: daysInMonth },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  ).filter((d) => d > todayIso);

  const monthLabels = Object.fromEntries(
    monthKeys.map((key) => {
      const [y, m] = key.split('-').map(Number) as [number, number];
      return [key, `${MONTHS[m - 1]} ${y}`];
    }),
  );
  const dayLabels = Object.fromEntries(days.map((d) => [d, String(Number(d.slice(8)))]));

  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ChoiceChips
        label="Mois"
        options={monthKeys}
        labels={monthLabels}
        selected={[month]}
        onToggle={setMonth}
      />
      <ChoiceChips
        label="Jour"
        options={days}
        labels={dayLabels}
        selected={value ? [value] : []}
        onToggle={onChange}
      />
    </View>
  );
}
