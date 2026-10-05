// Exporte la version web de l'application, reliée à la passerelle des tests.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { GATEWAY_URL, ROOT, supabaseStatus } from './supabase.mjs';

execFileSync(
  'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', join(ROOT, 'e2e/.web'), '--clear'],
  {
    cwd: join(ROOT, 'apps/mobile'),
    stdio: 'inherit',
    env: {
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: GATEWAY_URL,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseStatus().ANON_KEY,
      EXPO_PUBLIC_PAYMENTS_SIMULATION: 'true',
      EXPO_NO_TELEMETRY: '1',
    },
  },
);
