import {
  DEFAULT_REMINDER_SETTINGS,
  reminderSettingsSchema,
  type ReminderSettings,
} from '@cote-a-cote/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Réglages des rappels, propres à cet appareil. */
const KEY = 'rappels';

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? reminderSettingsSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : DEFAULT_REMINDER_SETTINGS;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(reminderSettingsSchema.parse(settings)));
}

export function anyReminderEnabled(s: ReminderSettings): boolean {
  return s.mission.enabled || s.evaluations.enabled || s.planning.enabled || s.scans.enabled;
}
