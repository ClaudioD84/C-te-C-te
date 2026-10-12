import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createRecoveryClient, supabase } from '@/lib/supabase';

const CODE_LENGTH = 6;

function recoveryMessage(message: string): string {
  if (/expired|invalid|token/i.test(message)) return 'Code incorrect ou expiré. Demandez-en un nouveau.';
  if (/rate limit|security purposes/i.test(message))
    return 'Trop de demandes. Patientez une minute avant de réessayer.';
  if (/fetch|network/i.test(message)) return 'Connexion impossible. Vérifiez votre réseau.';
  if (/password/i.test(message)) return 'Ce mot de passe ne convient pas : 8 caractères au moins.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

/**
 * Mot de passe oublié : un code à 6 chiffres est envoyé par e-mail, puis saisi ici avec le nouveau mot de passe.
 * Aucun lien à ouvrir : le parcours marche de la même façon sur téléphone, tablette et ordinateur.
 */
export default function ForgottenPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recovery = useRef<ReturnType<typeof createRecoveryClient> | null>(null);

  async function sendCode() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      setMessage(recoveryMessage(error.message));
      return;
    }
    setCodeSent(true);
  }

  async function changePassword() {
    setLoading(true);
    setMessage(null);
    recovery.current ??= createRecoveryClient();
    const client = recovery.current;
    const verified = await client.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    const updated = verified.error ? null : await client.auth.updateUser({ password });
    const error = verified.error ?? updated?.error;
    if (error) {
      setLoading(false);
      setMessage(recoveryMessage(error.message));
      return;
    }
    await client.auth.signOut({ scope: 'local' });
    // Connexion de l'application avec le nouveau mot de passe : l'espace parent s'ouvre.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) setMessage('Mot de passe changé. Connectez-vous avec le nouveau mot de passe.');
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <Screen>
        <View style={styles.header}>
          <ThemedText type="subtitle">Mot de passe oublié</ThemedText>
          <ThemedText themeColor="textSecondary">
            {codeSent
              ? `Si un compte existe pour ${email.trim()}, un code à ${CODE_LENGTH} chiffres vient d’être envoyé. Pensez à regarder dans les courriers indésirables.`
              : 'Indiquez l’adresse de votre compte : nous vous envoyons un code pour choisir un nouveau mot de passe.'}
          </ThemedText>
        </View>

        {!codeSent ? (
          <>
            <TextField
              label="Adresse e-mail du compte"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {message ? (
              <ThemedText themeColor="danger" accessibilityRole="alert">
                {message}
              </ThemedText>
            ) : null}
            <Button
              label="Recevoir un code"
              onPress={sendCode}
              loading={loading}
              disabled={!email.includes('@')}
            />
          </>
        ) : (
          <>
            <TextField
              label="Code reçu par e-mail"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={CODE_LENGTH}
            />
            <TextField
              label="Nouveau mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <ThemedText type="small" themeColor="textSecondary">
              8 caractères minimum.
            </ThemedText>
            {message ? (
              <ThemedText themeColor="danger" accessibilityRole="alert">
                {message}
              </ThemedText>
            ) : null}
            <Button
              label="Changer le mot de passe"
              onPress={changePassword}
              loading={loading}
              disabled={code.length !== CODE_LENGTH || password.length < 8}
            />
            <Button variant="secondary" label="Renvoyer un code" onPress={sendCode} disabled={loading} />
          </>
        )}
        <Button variant="secondary" label="Retour à la connexion" onPress={() => router.back()} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.two, marginVertical: Spacing.four },
});
