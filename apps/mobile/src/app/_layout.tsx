import { Lexend_400Regular, Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { ChildModeProvider, useChildMode } from '@/features/child-mode/child-mode-provider';
import { logOutBilling } from '@/features/subscription/billing';
import { clearOfflineCache, persistOptions, queryClient } from '@/lib/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

/** À la déconnexion, les données gardées sur l'appareil et les actions en attente sont effacées. */
function useClearCacheOnSignOut(signedIn: boolean, loading: boolean) {
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (wasSignedIn.current && !signedIn) {
      clearOfflineCache();
      logOutBilling();
    }
    wasSignedIn.current = signedIn;
  }, [signedIn, loading]);
}

function RootNavigator() {
  const { session, loading: sessionLoading } = useSession();
  useClearCacheOnSignOut(Boolean(session), sessionLoading);
  const { activeChildId, loading: childModeLoading } = useChildMode();
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
        // Actions faites hors connexion lors d'une utilisation précédente : on les envoie.
        onSuccess={() => queryClient.resumePausedMutations()}>
        <SessionProvider>
          <ChildModeProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <RootNavigator />
            </ThemeProvider>
          </ChildModeProvider>
        </SessionProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
