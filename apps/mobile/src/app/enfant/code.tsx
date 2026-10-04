import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { PinPad } from '@/components/pin-pad';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { clearParentCode, remainingLockout, verifyParentCode } from '@/features/child-mode/parent-code-store';
import { supabase } from '@/lib/supabase';

/** Sortie de la console enfant : code parent, ou mot de passe du compte en cas d'oubli. */
export default function ExitChildModeScreen() {
  const { exit } = useChildMode();
  const { session } = useSession();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [forgotten, setForgotten] = useState(false);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    remainingLockout().then(setLockedSeconds);
  }, []);

  useEffect(() => {
    if (lockedSeconds <= 0) return;
    const id = setTimeout(() => setLockedSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [lockedSeconds]);

  async function submitCode(value: string) {
    setChecking(true);
    const result = await verifyParentCode(value);
    setChecking(false);
    setCode('');
    if (result.ok) {
      await exit();
      return;
    }
    setLockedSeconds(result.lockedSeconds);
    setMessage('Code incorrect.');
  }

  async function submitPassword() {
    const email = session?.user.email;
    if (!email) return;
    setChecking(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setChecking(false);
    if (error) {
      setMessage('Mot de passe incorrect.');
      return;
    }
    // Le parent devra choisir un nouveau code au prochain passage en mode enfant.
    await clearParentCode();
    await exit();
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Espace parent</ThemedText>

      {forgotten ? (
        <>
          <ThemedText>Saisissez le mot de passe de votre compte pour réinitialiser le code parent.</ThemedText>
          <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoFocus />
          {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
          <Button label="Valider" onPress={submitPassword} loading={checking} disabled={!password} />
        </>
      ) : (
        <>
          <ThemedText>Saisissez le code parent.</ThemedText>
          <PinPad value={code} onChange={setCode} onComplete={submitCode} disabled={checking || lockedSeconds > 0} />
          <View style={styles.feedback} accessibilityLiveRegion="polite">
            {lockedSeconds > 0 ? (
              <ThemedText themeColor="danger">Trop d&apos;essais. Réessayez dans {lockedSeconds} s.</ThemedText>
            ) : message ? (
              <ThemedText themeColor="danger">{message}</ThemedText>
            ) : null}
          </View>
          <Button
            variant="secondary"
            label="Code oublié ?"
            onPress={() => {
              setForgotten(true);
              setMessage(null);
            }}
          />
        </>
      )}

      <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedback: { minHeight: 24, alignItems: 'center', marginTop: Spacing.two },
});
