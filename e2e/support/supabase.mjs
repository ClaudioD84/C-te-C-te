// Adresses et clés de la pile Supabase locale (`supabase start`), lues avec `supabase status`.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
/** Passerelle des tests : fonctions serveur (Deno) + reste de l'API Supabase. */
export const GATEWAY_URL = 'http://127.0.0.1:54320';
export const WEB_URL = 'http://127.0.0.1:8765';
/**
 * Démonstration sur iPhone (`pnpm demo --iphone`) : les serveurs écoutent sur le réseau local (DEMO_HOST=0.0.0.0)
 * et la version web, exportée dans un dossier à part (DEMO_WEB_DIR), appelle l'adresse du Mac (DEMO_API_URL).
 */
export const LISTEN_HOST = process.env.DEMO_HOST ?? '127.0.0.1';
export const WEB_DIR = process.env.DEMO_WEB_DIR ?? '.web';

let cached;
export function supabaseStatus() {
  cached ??= JSON.parse(
    execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      cwd: ROOT,
      shell: process.platform === 'win32',
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  );
  return cached;
}
