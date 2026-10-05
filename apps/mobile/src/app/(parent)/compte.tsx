import { Link } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { deleteMyAccount, exportMyData } from '@/features/account/api';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { session } = useSession();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState<'ferme' | 'confirmation' | 'en_cours'>('ferme');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function runExport() {
    setExporting(true);
    setMessage(null);
    try {
      await exportMyData();
    } catch {
      setMessage("L'export a échoué. Réessayez.");
    } finally {
      setExporting(false);
    }
  }

  async function runDelete() {
    setDeleting('en_cours');
    setMessage(null);
    try {
      await deleteMyAccount(password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'La suppression a échoué.');
      setDeleting('confirmation');
    }
  }

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">Connecté avec {session?.user.email}</ThemedText>

      <ThemedText type="smallBold">Abonnement</ThemedText>
      <Link href="/abonnement" asChild>
        <Button variant="secondary" label="Mon abonnement" />
      </Link>

      <ThemedText type="smallBold">Réglages</ThemedText>
      <Link href="/rappels" asChild>
        <Button variant="secondary" label="Rappels" />
      </Link>
      <Link href="/noms-a-masquer" asChild>
        <Button variant="secondary" label="Noms à masquer sur les photos" />
      </Link>
      <Link href="/code-parent" asChild>
        <Button variant="secondary" label="Modifier le code parent" />
      </Link>

      <ThemedText type="smallBold">Mes données</ThemedText>
      <Button variant="secondary" label="Exporter mes données" loading={exporting} onPress={runExport} />

      {deleting === 'ferme' ? (
        <Button
          variant="secondary"
          label="Supprimer mon compte"
          onPress={() => setDeleting('confirmation')}
        />
      ) : (
        <ThemedView
          type="backgroundElement"
          style={{ padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two }}>
          <ThemedText>
            Tous les profils, tâches et plannings de la famille seront supprimés définitivement. Un abonnement
            en cours n’est pas résilié automatiquement : résiliez-le dans les réglages de votre compte App
            Store ou Google Play. Saisissez votre mot de passe pour confirmer.
          </ThemedText>
          <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
          <Button
            label="Supprimer définitivement"
            loading={deleting === 'en_cours'}
            disabled={!password}
            onPress={runDelete}
          />
          <Button variant="secondary" label="Annuler" onPress={() => setDeleting('ferme')} />
        </ThemedView>
      )}

      {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}

      <Button variant="secondary" label="Se déconnecter" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
