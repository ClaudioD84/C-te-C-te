import { Lexend_400Regular, Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  usePathname,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useActivityPing } from '@/features/account/use-activity-ping';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { ChildColorProvider } from '@/features/child-mode/child-color';
import { ChildModeProvider, useChildMode } from '@/features/child-mode/child-mode-provider';
import {
  installGlobalErrorHandlers,
  reportError,
  setCurrentScreen,
} from '@/features/monitoring/report-error';
import { cancelAllReminders } from '@/features/reminders/notifications';
import { useReminderSync } from '@/features/reminders/use-reminder-sync';
import { logOutBilling } from '@/features/subscription/billing';
import { clearOfflineCache, persistOptions, queryClient } from '@/lib/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();
installGlobalErrorHandlers();

/**
 * Écran affiché si un écran plante : message simple, nouvel essai possible, erreur enregistrée pour l'équipe.
 * Sans dépendre du thème ni des polices (ils peuvent être la cause du problème).
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void reportError(error);
  }, [error]);
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle} accessibilityRole="header">
        Oups, quelque chose s’est mal passé.
      </Text>
      <Text style={styles.errorText}>
        Le problème nous a été signalé automatiquement. Vous pouvez réessayer.
      </Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.errorButton}>
        <Text style={styles.errorButtonText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

/** À la déconnexion, les données gardées sur l'appareil et les actions en attente sont effacées. */
function useClearCacheOnSignOut(signedIn: boolean, loading: boolean) {
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (wasSignedIn.current && !signedIn) {
      clearOfflineCache();
      logOutBilling();
      cancelAllReminders();
    }
    wasSignedIn.current = signedIn;
  }, [signedIn, loading]);
}

function RootNavigator() {
  const { session, loading: sessionLoading } = useSession();
  useClearCacheOnSignOut(Boolean(session), sessionLoading);
  useReminderSync(Boolean(session));
  useActivityPing(Boolean(session));
  const { activeChildId, loading: childModeLoading } = useChildMode();
  const pathname = usePathname();
  useEffect(() => setCurrentScreen(pathname), [pathname]);
  // En cas d'échec de chargement de la police, on continue avec la police système.
  const [fontsLoaded, fontError] = useFonts({ Lexend_400Regular, Lexend_600SemiBold });
  const loading = sessionLoading || childModeLoading || (!fontsLoaded && !fontError);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  const signedIn = isSupabaseConfigured && Boolean(session);
  const childMode = signedIn && activeChildId !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSupabaseConfigured}>
        <Stack.Screen name="configuration" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !childMode}>
        <Stack.Screen name="(parent)" />
      </Stack.Protected>
      <Stack.Protected guard={childMode}>
        <Stack.Screen name="enfant" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isSupabaseConfigured && !signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={styles.root}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        // Actions faites hors connexion lors d'une utilisation précédente : on les envoie, puis les données
        // gardées sur l'appareil (affichées tout de suite) sont rafraîchies dès que le réseau le permet.
        onSuccess={() => {
          void queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries());
        }}>
        <SessionProvider>
          <ChildModeProvider>
            <ChildColorProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <RootNavigator />
              </ThemeProvider>
            </ChildColorProvider>
          </ChildModeProvider>
        </SessionProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FBF8F3' },
  errorTitle: { fontSize: 22, fontWeight: '600', color: '#1F2328' },
  errorText: { fontSize: 17, color: '#3D4248' },
  errorButton: { backgroundColor: '#1A6B60', borderRadius: 24, padding: 14, alignItems: 'center' },
  errorButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
