import { CURRICULUM_SUBJECTS, GRADE_LABELS } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildProfile } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase';

interface CurriculumRow {
  id: string;
  parent_id: string | null;
  subject: string;
  kind: 'domaine' | 'competence' | 'attendu';
  code: string;
  label: string;
}

const PAGE = 1000; // limite de lignes d'une requête
const COLLAPSE_AFTER = 150;

/** Programme de l'année (F2) : attendus du référentiel pour l'année et la filière de l'enfant, par matière. */
export default function ProgrammeScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const grade = child.data?.grade;
  const track = child.data?.track;
  const [selected, setSelected] = useState<string>(CURRICULUM_SUBJECTS[0]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  // Une matière à la fois, par pages : en fin de secondaire, une matière peut dépasser la limite d'une requête.
  const items = useQuery({
    queryKey: ['curriculum', grade, track, selected],
    enabled: Boolean(grade && track),
    staleTime: Infinity,
    queryFn: async () => {
      const rows: CurriculumRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('curriculum_item')
          .select('id, parent_id, subject, kind, code, label')
          .contains('grades', [grade])
          .contains('tracks', [track])
          .eq('subject', selected)
          .order('created_at')
          .order('id')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data as CurriculumRow[]));
        if (data.length < PAGE) return rows;
      }
    },
  });

  if (child.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const rows = items.data ?? [];
  const subjects = [...CURRICULUM_SUBJECTS];
  const current = selected;
  // Les longues listes (fin du secondaire) s'affichent repliées : on ouvre une compétence d'un toucher.
  const collapsed = rows.length > COLLAPSE_AFTER;
  const grouped = groups(rows);
  const children = new Map<string, CurriculumRow[]>();
  for (const row of rows) {
    if (row.kind !== 'attendu' || !row.parent_id) continue;
    const list = children.get(row.parent_id);
    if (list) list.push(row);
    else children.set(row.parent_id, [row]);
  }
  const toggle = (id: string) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Screen>
      <ThemedText type="subtitle">{grade ? GRADE_LABELS[grade] : 'Programme'}</ThemedText>
      <ChoiceChips
        label="Matière"
        options={subjects}
        labels={Object.fromEntries(subjects.map((x) => [x, x]))}
        selected={[current]}
        onToggle={setSelected}
      />
      {items.isLoading ? <ActivityIndicator /> : null}
      {!items.isLoading && rows.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Pas d&apos;attendus pour cette matière cette année.
        </ThemedText>
      ) : null}
      {grouped.map((group) => (
        <ThemedView key={group.key} type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{group.title ?? current}</ThemedText>
          {group.competences.map((competence) => {
            const expanded = !collapsed || open.has(competence.id);
            return (
              <View key={competence.id} style={styles.group}>
                <Pressable
                  disabled={!collapsed}
                  onPress={() => toggle(competence.id)}
                  accessibilityRole={collapsed ? 'button' : undefined}
                  accessibilityState={collapsed ? { expanded } : undefined}>
                  <ThemedText type="smallBold">
                    {collapsed ? (expanded ? '▾ ' : '▸ ') : ''}
                    {competence.label}
                  </ThemedText>
                </Pressable>
                {expanded
                  ? (children.get(competence.id) ?? []).map((attendu) => (
                      <ThemedText
                        key={attendu.id}
                        type="small"
                        themeColor="textSecondary"
                        style={styles.indent}>
                        • {attendu.label}
                      </ThemedText>
                    ))
                  : null}
              </View>
            );
          })}
        </ThemedView>
      ))}
    </Screen>
  );
}

/**
 * Compétences regroupées par référentiel : les compétences terminales du secondaire en comptent parfois
 * plusieurs pour une même matière (ex. sciences de base, sciences générales). Le tronc commun n'a qu'un bloc.
 */
function groups(rows: CurriculumRow[]) {
  const domains = new Map(rows.filter((r) => r.kind === 'domaine').map((r) => [r.id, r]));
  const out: { key: string; title: string | null; competences: CurriculumRow[] }[] = [];
  for (const competence of rows.filter((r) => r.kind === 'competence')) {
    const domain = competence.parent_id ? domains.get(competence.parent_id) : undefined;
    const key = domain?.id ?? 'tronc-commun';
    let group = out.find((g) => g.key === key);
    if (!group) {
      group = { key, title: domain?.label ?? null, competences: [] };
      out.push(group);
    }
    group.competences.push(competence);
  }
  return out;
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  indent: { paddingLeft: Spacing.three },
  group: { gap: Spacing.one, marginBottom: Spacing.two },
});
