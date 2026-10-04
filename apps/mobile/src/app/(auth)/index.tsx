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

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage(null);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'connexion'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setLoading(false);

    if (error) {
      setMessage(error.message);
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

        {message ? <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText> : null}

        <Button
          label={mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
          onPress={submit}
          loading={loading}
          disabled={!email || password.length < 8}
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
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.two, marginVertical: Spacing.five },
});
