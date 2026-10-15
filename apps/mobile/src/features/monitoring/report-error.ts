import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Dernier écran affiché, joint aux erreurs (chemin de l'application, sans identifiant). */
let currentScreen: string | null = null;

/** Chemin sans identifiants : « /scan/3f2a… » devient « /scan/[id] ». */
export function screenName(pathname: string): string {
  return pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[id]').slice(0, 100);
}

export function setCurrentScreen(pathname: string) {
  currentScreen = screenName(pathname);
}

/**
 * Enregistre une erreur inattendue dans notre base (UE), sans outil tiers : message et pile d'appels
 * seulement. Sans connexion ou hors session, l'erreur est simplement ignorée.
 */
export async function reportError(error: unknown): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    await supabase.rpc('log_app_error', {
      p_message: err.message.slice(0, 1000),
      p_stack: err.stack?.slice(0, 4000) ?? null,
      p_screen: currentScreen,
      p_platform: Platform.OS,
      p_app_version: Constants.expoConfig?.version ?? null,
    });
  } catch {
    // Le signalement ne doit jamais provoquer d'autre erreur.
  }
}

let installed = false;

/** Erreurs non rattrapées : gestionnaire global (téléphone) ou événements de la page (web). */
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => void reportError(event.error ?? event.message));
    window.addEventListener('unhandledrejection', (event) => void reportError(event.reason));
    return;
  }
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    void reportError(error);
    previous(error, isFatal);
  });
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}
