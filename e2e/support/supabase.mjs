// Adresses et clés de la pile Supabase locale (`supabase start`), lues avec `supabase status`.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
/** Passerelle des tests : fonctions serveur (Deno) + reste de l'API Supabase. */
export const GATEWAY_URL = 'http://127.0.0.1:54320';
export const WEB_URL = 'http://127.0.0.1:8765';

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
