// Lance ce dont les tests ont besoin en plus de `supabase start` :
// services factices, fonctions serveur (Deno) et une passerelle unique pour l'application.
// Les fonctions tournent avec le Deno du dépôt (celui des tests unitaires des fonctions).
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';

import { startMocks } from './mocks.mjs';
import { GATEWAY_URL, ROOT, supabaseStatus } from './supabase.mjs';

const status = supabaseStatus();
const functionsDir = join(ROOT, 'supabase/functions');
const names = readdirSync(functionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name);

const secrets = Object.fromEntries(
  readFileSync(new URL('./functions.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);

startMocks();

const ports = new Map(names.map((name, i) => [name, 8300 + i]));
const children = names.map((name) =>
  spawn(
    join(ROOT, 'node_modules/.bin/deno'),
    ['run', '--allow-net', '--allow-env', '--allow-read', '--config', 'deno.json', `${name}/index.ts`],
    {
      cwd: functionsDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: {
        ...process.env,
        ...secrets,
        SUPABASE_URL: status.API_URL,
        SUPABASE_ANON_KEY: status.ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
        DENO_SERVE_ADDRESS: `tcp:127.0.0.1:${ports.get(name)}`,
      },
    },
  ),
);
const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': '*',
};

function isUp(port) {
  return new Promise((resolve) => {
    const request = http.request({ host: '127.0.0.1', port, method: 'OPTIONS', path: '/' }, (res) => {
      res.resume();
      resolve(true);
    });
    request.on('error', () => resolve(false));
    request.end();
  });
}

const api = new URL(status.API_URL);
http
  .createServer(async (req, res) => {
    if (req.url === '/__ready') {
      const ready = (await Promise.all([...ports.values()].map(isUp))).every(Boolean);
      res.writeHead(ready ? 200 : 503);
      res.end(ready ? 'prêt' : 'démarrage');
      return;
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    const match = req.url.match(/^\/functions\/v1\/([^/?]+)(.*)$/);
    const target = match
      ? { host: '127.0.0.1', port: ports.get(match[1]), path: match[2] || '/' }
      : { host: api.hostname, port: Number(api.port), path: req.url };
    if (!target.port) {
      res.writeHead(404, cors);
      res.end('Fonction inconnue');
      return;
    }
    const upstream = http.request({ ...target, method: req.method, headers: req.headers }, (up) => {
      res.writeHead(up.statusCode, { ...up.headers, ...cors });
      up.pipe(res);
    });
    upstream.on('error', (error) => {
      res.writeHead(502, cors);
      res.end(String(error));
    });
    req.pipe(upstream);
  })
  .listen(Number(new URL(GATEWAY_URL).port), '127.0.0.1');
