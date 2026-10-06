import { BADGES, buildCertificateHtml, formatShortDate, type BadgeCode } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackgroundPicker } from '@/features/backgrounds/background-picker';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useRewards } from '@/features/rewards/api';
import { ChoiceChips } from '@/components/choice-chips';
import { CHILD_PALETTES, type ChildPaletteCode } from '@/constants/colors';
import { useChildColor } from '@/features/child-mode/child-color';
import { MasteryCard } from '@/features/mastery/mastery-card';
import { useTreasures } from '@/features/mission/treasures';
import { printCertificate } from '@/features/print/print-pack';
import { AccessoryPicker, avatarWithAccessory } from '@/features/rewards/accessory-picker';
import { AnimalAlbum } from '@/features/rewards/animal-album';
import { AvatarProgress } from '@/features/rewards/avatar-progress';

/** Badges de l'enfant : ceux gagnés, et ceux à découvrir (jamais perdus). */
export default function BadgesScreen() {
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const { summary } = useRewards(activeChildId ?? '', child.data?.preferences.availableDays);
  const { color, setColor } = useChildColor();
  const treasures = useTreasures(activeChildId ?? '');
  const paletteCodes = Object.keys(CHILD_PALETTES) as ChildPaletteCode[];

  if (!summary) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const earned = new Map(summary.badges.map((b) => [b.code, b.earnedOn]));

  return (
    <ChildScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AvatarProgress summary={summary} />
        <ThemedText themeColor="textSecondary">
          {summary.effortDaysThisWeek} jour{summary.effortDaysThisWeek > 1 ? 's' : ''} de travail cette
          semaine
          {summary.currentStreak > 1 ? ` · série de ${summary.currentStreak} jours` : ''}
        </ThemedText>
        <MasteryCard childId={activeChildId ?? ''} />
        <AnimalAlbum points={summary.points} />
        {treasures.owned.length > 0 ? (
          <ThemedView type="backgroundElement" style={styles.treasures}>
            <ThemedText type="subtitle">Mes trésors ({treasures.owned.length})</ThemedText>
            {treasures.owned.map((t) => (
              <ThemedText key={t.id}>
                {t.kind === 'blague' ? '😄' : '💡'} {t.text}
              </ThemedText>
            ))}
          </ThemedView>
        ) : null}
        {child.data ? <AccessoryPicker child={child.data} summary={summary} /> : null}
        {child.data ? <BackgroundPicker child={child.data} summary={summary} /> : null}
        <ChoiceChips
          label="Ma couleur préférée"
          options={paletteCodes}
          labels={
            Object.fromEntries(paletteCodes.map((c) => [c, CHILD_PALETTES[c].label])) as Record<
              ChildPaletteCode,
              string
            >
          }
          selected={[color ?? 'vert']}
          onToggle={setColor}
        />
        {(Object.keys(BADGES) as BadgeCode[]).map((code) => {
          const badge = BADGES[code];
          const date = earned.get(code);
          return (
            <ThemedView
              key={code}
              type="backgroundElement"
              // Badge à découvrir : seul le pictogramme est estompé, le texte reste bien lisible.
              style={styles.badge}>
              <ThemedText style={[styles.emoji, !date && styles.locked]} aria-hidden>
                {date ? badge.emoji : '🔒'}
              </ThemedText>
              <View style={styles.text}>
                <ThemedText type="smallBold">{badge.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {badge.description}
                  {date ? ` Gagné le ${formatShortDate(date)}.` : ' À découvrir.'}
                </ThemedText>
                {date && child.data ? (
                  <Button
                    variant="secondary"
                    label="🖨️ Imprimer mon diplôme"
                    accessibilityLabel={`Imprimer le diplôme ${badge.title}`}
                    onPress={() =>
                      void printCertificate(
                        buildCertificateHtml({
                          alias: child.data!.alias,
                          avatar: avatarWithAccessory(child.data!),
                          badge: code,
                          earnedOn: date,
                        }),
                      ).catch(() => undefined)
                    }
                  />
                ) : null}
              </View>
            </ThemedView>
          );
        })}
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  locked: { opacity: 0.55 },
  treasures: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  emoji: { fontSize: 32, lineHeight: 40 },
  text: { flex: 1, gap: Spacing.half },
});
