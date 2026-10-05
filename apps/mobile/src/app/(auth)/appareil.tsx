import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { pairThisDevice } from '@/features/devices/api';

/**
 * Tablette de l'enfant : saisie du code affiché par l'application du parent (ou ouverture du lien du
 * QR code, qui remplit le code). Une fois reliée, la tablette n'affiche que la console de l'enfant.
 */
export default function PairDeviceScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(typeof params.code === 'string' ? params.code : '');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cleaned = code.toUpperCase().replace(/[\s-]/g, '');

  async function submit() {
    setLoading(true);
    setMessage(null);
    try {
      // La connexion réussie ouvre la console de l'enfant.
      await pairThisDevice(cleaned, name);
    } catch (error) {
      setMessage((error as Error).message);
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <Screen>
        <View style={styles.header}>
          <ThemedText type="title">Tablette de l’enfant</ThemedText>
          <ThemedText themeColor="textSecondary">
            Sur le téléphone du parent : profil de l’enfant {'>'} « Tablette de l’enfant » {'>'} « Relier une
            tablette ». Scannez le QR code avec l’appareil photo de cette tablette, ou recopiez le code.
          </ThemedText>
        </View>
        <TextField
          label="Code de liaison"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          placeholder="ABCD-EF23"
        />
        <TextField
          label="Nom de cette tablette (facultatif)"
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="Ex. Tablette du salon"
        />
        {message ? (
          <ThemedText themeColor="danger" accessibilityRole="alert">
            {message}
          </ThemedText>
        ) : null}
        <Button
          label="Relier cette tablette"
          loading={loading}
          disabled={cleaned.length !== 8}
          onPress={submit}
        />
        <Button
          variant="secondary"
          label="Retour"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          La tablette n’a accès qu’à la mission, aux fiches, aux cartes et aux badges de cet enfant. Le parent
          peut la délier à tout moment.
        </ThemedText>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.two, paddingTop: Spacing.four },
});
