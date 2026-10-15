import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = createClient(url ?? 'http://127.0.0.1:54321', publishableKey ?? 'non-configure', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Sur mobile, le rafraîchissement du jeton ne tourne que lorsque l'application est au premier plan.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/**
 * Client éphémère pour « Mot de passe oublié » : la session obtenue avec le code n'est ni gardée ni partagée.
 * L'application ne bascule vers l'espace parent qu'après la connexion avec le nouveau mot de passe.
 */
export function createRecoveryClient() {
  return createClient(url ?? 'http://127.0.0.1:54321', publishableKey ?? 'non-configure', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'recuperation',
    },
  });
}
