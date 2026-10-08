import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import {
  formatInvitationCode,
  useCreateInvitation,
  useFamilyMembers,
  useJoinFamily,
  useLeaveFamily,
} from './api';

/** Parents de la famille : inviter un autre adulte, rejoindre une famille, quitter ou retirer. */
export function FamilyCard() {
  const members = useFamilyMembers();
  const invite = useCreateInvitation();
  const join = useJoinFamily();
  const leave = useLeaveFamily();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const list = members.data ?? [];
  const several = list.length > 1;
  const invitation = invite.data;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Parents de la famille</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Chaque parent a son propre compte et voit les mêmes enfants, plannings et suivis. L’abonnement est
        partagé.
      </ThemedText>
      {list.map((member) => (
        <View key={member.user_id} style={styles.row}>
          <ThemedText style={styles.flex}>
            {member.email}
            {member.is_me ? ' (vous)' : ''}
          </ThemedText>
          {several ? (
            <Button
              variant="secondary"
              label={member.is_me ? 'Quitter' : 'Retirer'}
              accessibilityLabel={member.is_me ? 'Quitter la famille' : `Retirer ${member.email}`}
              onPress={() => setConfirm(member.user_id)}
            />
          ) : null}
        </View>
      ))}
      {confirm ? (
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText>
            {list.find((m) => m.user_id === confirm)?.is_me
              ? 'Vous n’aurez plus accès aux enfants de cette famille. Votre compte reste actif, sans enfant.'
              : 'Ce parent n’aura plus accès aux enfants de cette famille. Son compte reste actif, sans enfant.'}
          </ThemedText>
          <Button
            label="Confirmer"
            loading={leave.isPending}
            onPress={() => {
              const me = list.find((m) => m.user_id === confirm)?.is_me;
              leave.mutate(me ? undefined : confirm, { onSuccess: () => setConfirm(null) });
            }}
          />
          <Button variant="secondary" label="Annuler" onPress={() => setConfirm(null)} />
        </ThemedView>
      ) : null}
      {leave.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {leave.error.message}
        </ThemedText>
      ) : null}

      {invitation ? (
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText>
            Code d’invitation, valable 7 jours et une seule fois. L’autre parent crée son compte, puis « Mon
            compte »{' > '}« Rejoindre une famille ».
          </ThemedText>
          <ThemedText type="title" style={styles.code}>
            {formatInvitationCode(invitation)}
          </ThemedText>
          <Button
            variant="secondary"
            label="Envoyer le code"
            onPress={() =>
              Share.share({
                message: `Rejoins-moi sur Côte à Côte pour suivre les devoirs des enfants : dans « Mon compte », choisis « Rejoindre une famille » et saisis le code ${formatInvitationCode(invitation)} (valable 7 jours).`,
              }).catch(() => undefined)
            }
          />
        </ThemedView>
      ) : (
        <Button
          variant="secondary"
          label="Inviter un autre parent"
          loading={invite.isPending}
          onPress={() => invite.mutate()}
        />
      )}
      {invite.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {invite.error.message}
        </ThemedText>
      ) : null}

      {joined ? (
        <ThemedText accessibilityLiveRegion="polite">Vous avez rejoint la famille.</ThemedText>
      ) : joining ? (
        <>
          <TextField
            label="Code d’invitation reçu"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            placeholder="ABCD-EF23"
          />
          <Button
            label="Rejoindre cette famille"
            disabled={code.replace(/[\s-]/g, '').length !== 8}
            loading={join.isPending}
            onPress={() =>
              join.mutate(code, {
                onSuccess: () => {
                  setJoined(true);
                  setJoining(false);
                  setCode('');
                },
              })
            }
          />
          {join.error ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              {join.error.message}
            </ThemedText>
          ) : null}
        </>
      ) : (
        <Button variant="secondary" label="Rejoindre une famille" onPress={() => setJoining(true)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  code: { textAlign: 'center', letterSpacing: 4 },
});
