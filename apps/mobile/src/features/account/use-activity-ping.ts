import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

function ping() {
  // Au plus une écriture par heure côté serveur ; un échec (hors connexion) est sans conséquence.
  void supabase.rpc('touch_family_activity').then(() => undefined);
}

/**
 * Signale que la famille utilise l'application (connexion et retour au premier plan) : un compte
 * n'est considéré comme inactif qu'après 24 mois sans ouverture, et toute ouverture annule
 * l'avertissement de suppression.
 */
export function useActivityPing(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    ping();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });
    return () => subscription.remove();
  }, [signedIn]);
}
