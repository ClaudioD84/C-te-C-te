import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureNotificationPermission, remindersSupported } from '@/features/reminders/notifications';
import { supabase } from '@/lib/supabase';

/**
 * Notifications envoyées par le serveur au téléphone du parent : demande d'aide de l'enfant, mission terminée
 * (sur sa tablette ou le téléphone d'un autre parent). Choix gardés sur l'appareil ; le jeton du téléphone est
 * enregistré pour le parent connecté (fonction register_push_token).
 */
export interface ParentPushSettings {
  help: boolean;
  mission: boolean;
}

export const DEFAULT_PARENT_PUSH: ParentPushSettings = { help: false, mission: false };
const SETTINGS_KEY = 'notifications_parent';
const TOKEN_KEY = 'notifications_parent_jeton';

/** Identifiant du projet EAS (ajouté à app.json par `eas init`) : sans lui, pas de notification à distance. */
const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

export const parentPushSupported = remindersSupported && Boolean(projectId);

export async function loadParentPushSettings(): Promise<ParentPushSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw
      ? { ...DEFAULT_PARENT_PUSH, ...(JSON.parse(raw) as Partial<ParentPushSettings>) }
      : DEFAULT_PARENT_PUSH;
  } catch {
    return DEFAULT_PARENT_PUSH;
  }
}

/**
 * Enregistre (ou retire) ce téléphone selon les choix du parent. Renvoie false si les notifications sont
 * refusées dans les réglages du téléphone.
 */
export async function applyParentPushSettings(settings: ParentPushSettings): Promise<boolean> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (!parentPushSupported) return true;
  const wanted = settings.help || settings.mission;
  if (wanted && !(await ensureNotificationPermission())) return false;
  const token = wanted
    ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
    : await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return true;
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
    p_notify_help: settings.help,
    p_notify_mission: settings.mission,
  });
  if (error) throw error;
  if (wanted) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
  return true;
}

/** À la connexion et au retour dans l'app : le jeton du téléphone peut changer (réinstallation, mise à jour). */
export async function refreshParentPush(): Promise<void> {
  if (!parentPushSupported) return;
  const settings = await loadParentPushSettings();
  if (!settings.help && !settings.mission) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await applyParentPushSettings(settings).catch(() => undefined);
}

/** Avant la déconnexion : ce téléphone ne reçoit plus les notifications de cette famille. */
export async function unregisterParentPush(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await supabase.rpc('unregister_push_token', { p_token: token });
  await AsyncStorage.removeItem(TOKEN_KEY);
}
