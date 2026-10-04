import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { ChildModeProvider, useChildMode } from '@/features/child-mode/child-mode-provider';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading: sessionLoading } = useSession();
  const { activeChildId, loading: childModeLoading } = useChildMode();
  const loading = sessionLoading || childModeLoading;

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
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ChildModeProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootNavigator />
          </ThemeProvider>
        </ChildModeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
