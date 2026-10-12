import { useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshParentPush } from '@/features/parent-push/push';

import { syncReminders } from './sync';

/** Reprogramme les rappels à la connexion et à chaque retour dans l'application. */
export function useReminderSync(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    void syncReminders();
    void refreshParentPush();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncReminders();
    });
    return () => subscription.remove();
  }, [signedIn]);
}
