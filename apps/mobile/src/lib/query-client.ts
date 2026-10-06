import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

import { registerOfflineMutations } from '@/features/offline/mutations';

/** Durée de conservation sur l'appareil des données utiles hors connexion. */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Données gardées sur l'appareil : celles de la console enfant (mission, fiches, cartes, récompenses).
 * Les données du parent (photos, référentiels, épreuves) restent en ligne.
 */
const OFFLINE_QUERIES = new Set([
  'child_profiles',
  'sessions',
  'tasks',
  'study_pack',
  'flashcards',
  'effort',
  'school_bag',
]);

export const queryClient = new QueryClient({
  defaultOptions: {
    // Les données gardées doivent rester en mémoire au moins aussi longtemps que sur l'appareil.
    queries: { gcTime: CACHE_MAX_AGE, staleTime: 30_000 },
  },
});
registerOfflineMutations(queryClient);

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cote-a-cote-cache',
  throttleTime: 1000,
});

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: CACHE_MAX_AGE,
  // À changer quand la forme des données gardées change : l'ancien cache est alors ignoré.
  buster: '1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && OFFLINE_QUERIES.has(String(query.queryKey[0])),
    shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
  },
};

/** Efface le cache et la file d'attente (déconnexion, suppression du compte). */
export async function clearOfflineCache() {
  queryClient.clear();
  await persister.removeClient();
}

// Sur téléphone, l'état du réseau vient du système ; sur le web, du navigateur (comportement par défaut).
if (Platform.OS !== 'web') {
  const isOnline = (state: Network.NetworkState) =>
    state.isConnected !== false && state.isInternetReachable !== false;
  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync().then((state) => setOnline(isOnline(state)));
    const subscription = Network.addNetworkStateListener((state) => setOnline(isOnline(state)));
    return () => subscription.remove();
  });
}
