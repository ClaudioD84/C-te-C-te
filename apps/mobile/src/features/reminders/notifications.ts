import type { Reminder } from '@cote-a-cote/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Notifications locales : sur téléphone et tablette uniquement (pas dans la version web). */
export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const CHANNEL = 'rappels';

if (remindersSupported) {
  // Application ouverte : le rappel s'affiche quand même, sans son.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Demande l'autorisation (une seule fois : ensuite, seuls les réglages du téléphone la changent). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Remplace tous les rappels programmés sur l'appareil. */
export async function replaceScheduledReminders(reminders: readonly Reminder[]): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (reminders.length === 0) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rappels',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      // Texte sobre : il peut s'afficher sur l'écran verrouillé (aucune donnée de santé, seulement le prénom).
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.at,
        channelId: CHANNEL,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
}
