import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const MESSAGES: Record<string, string> = {
  invalide: 'Code inconnu. Vérifiez-le auprès de la famille qui vous l’a donné.',
  trop_essais: 'Trop d’essais. Patientez un quart d’heure avant de réessayer.',
  propre_code: 'C’est votre propre code : partagez-le plutôt avec une autre famille.',
  deja_parraine: 'Votre famille a déjà utilisé un code de parrainage.',
  trop_tard: 'Le code de parrainage s’utilise dans les 30 jours qui suivent l’inscription.',
};

const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** Parrainage : un mois offert à la famille invitée et à la marraine. */
export function ReferralCard() {
  const queryClient = useQueryClient();
  const code = useQuery({
    queryKey: ['referral_code'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_referral_code');
      if (error) throw error;
      return data as string;
    },
  });
  const count = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const { data: family } = await supabase.rpc('current_family_id');
      const { count: n, error } = await supabase
        .from('referral')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_family_id', family as string);
      if (error) throw error;
      return n ?? 0;
    },
  });
  const redeem = useMutation({
    mutationFn: async (value: string) => {
      const { data, error } = await supabase.rpc('redeem_referral', { p_code: value });
      if (error) throw new Error('Connexion impossible. Réessayez.');
      if (data !== 'ok') throw new Error(MESSAGES[data as string] ?? 'Ce code n’a pas pu être utilisé.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
  const [entered, setEntered] = useState('');

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">Parrainage</ThemedText>
      <ThemedText>
        Recommandez Côte à Côte : la famille qui utilise votre code gagne un mois, et vous aussi.
      </ThemedText>
      {code.data ? (
        <>
          <ThemedText
            type="title"
            style={styles.code}
            accessibilityLabel={`Votre code ${code.data.split('').join(' ')}`}>
            {formatCode(code.data)}
          </ThemedText>
          <Button
            variant="secondary"
            label="Partager mon code"
            onPress={() =>
              Share.share({
                message: `J’utilise Côte à Côte pour organiser les devoirs. Avec mon code ${formatCode(code.data!)}, tu gagnes un mois d’essai en plus (Mon compte > Mon abonnement > Parrainage).`,
              }).catch(() => undefined)
            }
          />
        </>
      ) : null}
      {count.data ? (
        <ThemedText type="small" themeColor="textSecondary">
          {count.data} famille{count.data > 1 ? 's' : ''} parrainée{count.data > 1 ? 's' : ''}. Merci !
        </ThemedText>
      ) : null}

      {redeem.isSuccess ? (
        <ThemedText accessibilityLiveRegion="polite">
          ✓ Code accepté : un mois de plus pour votre famille.
        </ThemedText>
      ) : (
        <>
          <TextField
            label="Vous avez reçu un code ?"
            value={entered}
            onChangeText={setEntered}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            placeholder="ABCD-EF23"
          />
          <Button
            variant="secondary"
            label="Utiliser ce code"
            disabled={entered.replace(/[\s-]/g, '').length !== 8}
            loading={redeem.isPending}
            onPress={() => redeem.mutate(entered)}
          />
          {redeem.error ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              {redeem.error.message}
            </ThemedText>
          ) : null}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  code: { textAlign: 'center', letterSpacing: 4 },
});
