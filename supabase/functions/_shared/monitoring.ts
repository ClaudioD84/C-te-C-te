import { adminClient } from './supabase.ts';

/**
 * Erreur inattendue d'une fonction serveur : écrite dans les journaux de Supabase et dans la table app_error
 * (plateforme « serveur »), lue avec `pnpm beta erreurs` à côté des erreurs de l'application. Sans contenu de
 * l'utilisateur : le message et la pile d'appels seulement.
 */
export async function reportServerError(fn: string, error: unknown): Promise<void> {
  console.error(fn, error);
  try {
    const err =
      error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
    await adminClient()
      .from('app_error')
      .insert({
        message: (err.message || 'Erreur sans message').slice(0, 1000),
        stack: err.stack?.slice(0, 4000) ?? null,
        screen: fn.slice(0, 100),
        platform: 'serveur',
      });
  } catch {
    // Le signalement ne doit jamais masquer l'erreur d'origine.
  }
}
