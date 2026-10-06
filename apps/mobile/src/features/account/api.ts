import { FunctionsHttpError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { clearParentCode } from '@/features/child-mode/parent-code-store';
import { setSensitiveNames } from '@/features/scan/sensitive-names';
import { supabase } from '@/lib/supabase';

/** Tables exportées : toutes les données de la famille visibles par le parent (RLS). */
const EXPORTED_TABLES = [
  'family',
  'subscription',
  'child_profile',
  'scan',
  'task',
  'study_session',
  'study_session_task',
  'study_pack',
  'flashcard',
  'exam',
  'learning_event',
  'ai_usage',
  'kindergarten_week',
  'child_device',
  'day_off',
  'child_note',
  'spelling_list',
  'help_request',
  'explanation',
  'referral_code',
  'referral',
  'family_reward',
  'school_bag_item',
  'pride_entry',
  'sibling_challenge',
] as const;

/** Export RGPD : un fichier JSON partagé via la feuille de partage du téléphone (téléchargé sur le web). */
export async function exportMyData(): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  const result: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { email: user.user?.email, created_at: user.user?.created_at },
  };
  for (const table of EXPORTED_TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    result[table] = data;
  }

  const name = `cote-a-cote-export-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(result, null, 2);

  if (Platform.OS === 'web') {
    // Navigateur (démonstration sur ordinateur) : téléchargement classique du fichier.
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exporter mes données' });
}

/** Efface ce que l'application garde sur l'appareil. */
export async function clearDeviceData(): Promise<void> {
  await clearParentCode();
  await setSensitiveNames([]);
  await AsyncStorage.clear();
}

/** Suppression définitive du compte, après confirmation du mot de passe. */
export async function deleteMyAccount(password: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  const email = user.user?.email;
  if (!email) throw new Error('Session expirée. Reconnectez-vous.');

  const check = await supabase.auth.signInWithPassword({ email, password });
  if (check.error) throw new Error('Mot de passe incorrect.');

  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'La suppression a échoué.');
  }
  if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');

  await clearDeviceData();
  await supabase.auth.signOut({ scope: 'local' });
}
