import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';

/** « Mon compte » : recevoir (ou non) le bilan positif de la semaine par e-mail, le dimanche soir. */
export function WeeklyEmailCard() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const setting = useQuery({
    queryKey: ['weekly_email', userId],
    enabled: userId.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent')
        .select('weekly_email')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return Boolean(data.weekly_email);
    },
  });
  const save = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from('parent').update({ weekly_email: enabled }).eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: (enabled) => queryClient.setQueryData(['weekly_email', userId], enabled),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['weekly_email', userId] }),
  });
  if (setting.data === undefined) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ChoiceChips
        label="Bilan de la semaine par e-mail"
        options={['oui', 'non'] as const}
        labels={{ oui: 'Le dimanche soir', non: 'Non merci' }}
        selected={[setting.data ? 'oui' : 'non']}
        onToggle={(choice) => save.mutate(choice === 'oui')}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Ce que vos enfants ont fait (jours, minutes, matières), avec un encouragement à leur lire. Envoyé à{' '}
        {session?.user.email}, jamais de comparaison ni de note.
      </ThemedText>
      {save.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          Le réglage n’a pas été enregistré. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
