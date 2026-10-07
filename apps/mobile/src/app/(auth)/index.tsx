import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Mode = 'connexion' | 'inscription';

/** Messages d'erreur de l'authentification, en clair. */
function authMessage(message: string, withCode: boolean): string {
  if (message.includes('code_invitation_invalide') || (withCode && /database error/i.test(message)))
    return 'Code d’invitation inconnu, expiré ou déjà utilisé.';
  if (/invalid login credentials/i.test(message)) return 'Adresse e-mail ou mot de passe incorrect.';
  if (/already registered/i.test(message)) return 'Un compte existe déjà avec cette adresse. Connectez-vous.';
  if (/email not confirmed/i.test(message))
    return 'Confirmez d’abord votre adresse e-mail (lien reçu par e-mail).';
  if (/fetch|network/i.test(message)) return 'Connexion impossible. Vérifiez votre réseau.';
  return message;
}

/** Bêta privée : l'inscription demande un code d'invitation tant que des codes existent. */
function useSignupRequiresCode(enabled: boolean) {
  return useQuery({
    queryKey: ['signup_requires_code'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('signup_requires_code');
      if (error) throw error;
      return data as boolean;
    },
  });
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const requiresCode = useSignupRequiresCode(mode === 'inscription').data === true;

  async function submit() {
    setLoading(true);
    setMessage(null);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'connexion'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: requiresCode ? { data: { invite_code: inviteCode.trim().toUpperCase() } } : undefined,
          });
    setLoading(false);

    if (error) {
      setMessage(authMessage(error.message, requiresCode));
    } else if (mode === 'inscription' && !data.session) {
      setMessage('Compte créé. Confirmez votre adresse e-mail pour vous connecter.');
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <Screen>
        <View style={styles.header}>
          <ThemedText type="title">Côte à Côte</ThemedText>
          <ThemedText themeColor="textSecondary">
            L&apos;assistant qui organise les devoirs avec vous.
          </ThemedText>
        </View>

        <TextField
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
          textContentType={mode === 'connexion' ? 'password' : 'newPassword'}
        />

        {mode === 'inscription' && requiresCode ? (
          <TextField
            label="Code d’invitation"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        ) : null}
        {mode === 'inscription' && requiresCode ? (
          <ThemedText type="small" themeColor="textSecondary">
            Côte à Côte est en test avec quelques familles : le code figure dans votre invitation.
          </ThemedText>
        ) : null}

        {message ? <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText> : null}

        <Button
          label={mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
          onPress={submit}
          loading={loading}
          disabled={
            !email || password.length < 8 || (mode === 'inscription' && requiresCode && !inviteCode.trim())
          }
        />
        <Button
          variant="secondary"
          label={mode === 'connexion' ? 'Pas encore de compte ? Inscription' : 'Déjà un compte ? Connexion'}
          onPress={() => {
            setMode(mode === 'connexion' ? 'inscription' : 'connexion');
            setMessage(null);
          }}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Mot de passe : 8 caractères minimum.
        </ThemedText>
        <Button
          variant="secondary"
          label="Relier la tablette de mon enfant"
          onPress={() => router.push('/appareil')}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.two, marginVertical: Spacing.five },
});
