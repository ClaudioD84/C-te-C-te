import { Lexend_400Regular, Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { ChildModeProvider, useChildMode } from '@/features/child-mode/child-mode-provider';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading: sessionLoading } = useSession();
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
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ChildModeProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <RootNavigator />
            </ThemeProvider>
          </ChildModeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
