import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

/** Affiché en développement quand les variables Supabase sont absentes. */
export default function ConfigurationScreen() {
  return (
    <Screen>
      <ThemedText type="subtitle">Configuration manquante</ThemedText>
      <ThemedText>
        Copiez <ThemedText type="code">apps/mobile/.env.example</ThemedText> vers{' '}
        <ThemedText type="code">apps/mobile/.env.local</ThemedText> et renseignez l&apos;adresse et la clé
        publique de votre projet Supabase, puis relancez l&apos;application.
      </ThemedText>
    </Screen>
  );
}
