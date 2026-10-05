// Démonstration de l'application sur un ordinateur : `pnpm demo`.
// Lance la pile Supabase locale (Docker), les fonctions serveur avec l'IA simulée et la version web, crée un
// compte de démonstration puis ouvre le navigateur. Ctrl+C pour arrêter. Voir docs/demo.md.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

import qrcode from 'qrcode-terminal';

import { GATEWAY_URL, ROOT, WEB_URL, supabaseStatus } from './supabase.mjs';

const isWindows = process.platform === 'win32';
const DEMO_EMAIL = 'demo@coteacote.be';
const DEMO_PASSWORD = 'demo-cote-a-cote';
const here = (file) => join(ROOT, 'e2e/support', file);

// Mode iPhone : l'application est ouverte depuis un téléphone sur le même Wi-Fi que l'ordinateur.
const iphone = process.argv.includes('--iphone');
const lanAddress = () =>
  Object.entries(networkInterfaces())
    .sort(([a], [b]) => (a === 'en0' ? -1 : b === 'en0' ? 1 : 0))
    .flatMap(([, addresses]) => addresses ?? [])
    .find((a) => a.family === 'IPv4' && !a.internal)?.address;
const lanIp = iphone ? lanAddress() : null;
if (iphone) {
  if (!lanIp) {
    console.error(
      '\n✖ Aucun réseau Wi-Fi détecté : connectez le Mac au même Wi-Fi que l’iPhone, puis relancez.',
    );
    process.exit(1);
  }
  // Lus par les scripts lancés ensuite (serveurs et préparation de la version web).
  process.env.DEMO_HOST = '0.0.0.0';
  process.env.DEMO_WEB_DIR = '.web-reseau';
  process.env.DEMO_API_URL = `http://${lanIp}:${new URL(GATEWAY_URL).port}`;
}
const webDir = join(ROOT, 'e2e', process.env.DEMO_WEB_DIR ?? '.web');
const expectedApi = process.env.DEMO_API_URL ?? GATEWAY_URL;
const phoneUrl = lanIp ? `http://${lanIp}:${new URL(WEB_URL).port}` : null;

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: isWindows, ...options });
}

/** Arrêt avec un message clair (sans trace technique). */
function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▶ ${message}`);
}

// 1. Docker et Supabase.
step('Vérification de Docker');
try {
  execFileSync('docker', ['info'], { stdio: 'ignore', shell: isWindows });
} catch {
  console.error(
    'Docker ne répond pas. Lancez Docker Desktop, attendez qu’il soit prêt, puis relancez `pnpm demo`.',
  );
  process.exit(1);
}

step('Démarrage de Supabase (la première fois, le téléchargement prend 5 à 10 minutes)');
function supabaseReady() {
  try {
    execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      cwd: ROOT,
      stdio: 'ignore',
      shell: isWindows,
    });
    return true;
  } catch {
    return false;
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Après un redémarrage de Docker, la base peut mettre une minute à repartir : on patiente puis on réessaie.
for (let attempt = 1; !supabaseReady(); attempt++) {
  try {
    run('pnpm', [
      'exec',
      'supabase',
      'start',
      '-x',
      'studio,imgproxy,logflare,vector,supavisor,postgres-meta,edge-runtime,mailpit,realtime',
    ]);
  } catch {
    if (attempt >= 3) {
      fail('Supabase n’a pas pu démarrer. Redémarrez Docker Desktop, puis relancez `pnpm demo`.');
    }
    console.log('  Supabase n’est pas encore prêt, nouvel essai dans 30 secondes…');
    await sleep(30_000);
  }
}
const status = supabaseStatus();

// 2. Version web.
async function responds(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}
// Une démonstration déjà lancée (autre fenêtre de terminal) est réutilisée plutôt que dupliquée.
const apiRunning = await responds(`${GATEWAY_URL}/__ready`);
const webRunning = await responds(WEB_URL);
const servesPhoneVersion = async () =>
  (await responds(`${expectedApi}/__ready`)) &&
  (await fetch(`${phoneUrl}/__version-web`)
    .then((r) => r.text())
    .catch(() => '')) === '.web-reseau';
if (iphone && (apiRunning || webRunning) && !(await servesPhoneVersion())) {
  fail(
    'Une démonstration est déjà lancée sans le mode iPhone. Arrêtez-la (Ctrl+C dans son Terminal), puis relancez `pnpm demo --iphone`.',
  );
}

// La version iPhone contient l'adresse du Mac : elle est refaite si cette adresse change (autre Wi-Fi).
const builtFor = join(webDir, '.adresse-api');
const builtApi = existsSync(builtFor) ? readFileSync(builtFor, 'utf8') : null;
if (
  process.argv.includes('--rebuild') ||
  !existsSync(join(webDir, 'index.html')) ||
  (iphone && builtApi !== expectedApi)
) {
  step('Préparation de la version web (1 à 3 minutes)');
  try {
    run(process.execPath, [here('build-web.mjs')]);
    writeFileSync(builtFor, expectedApi);
  } catch {
    fail('La préparation de la version web a échoué (voir les messages ci-dessus).');
  }
}

// 3. Fonctions serveur, services simulés et serveur web.
step('Démarrage des fonctions serveur et du site');
const scripts = [];
if (!apiRunning) scripts.push(here('stack.mjs'));
if (!webRunning) scripts.push(here('static.mjs'));
const children = scripts.map((script) =>
  spawn(process.execPath, [script], { cwd: join(ROOT, 'e2e'), stdio: ['ignore', 'ignore', 'inherit'] }),
);
const stopChildren = () => {
  for (const child of children) child.kill();
};
// Quoi qu'il arrive (erreur, Ctrl+C), les processus lancés ici sont arrêtés avec la démonstration.
process.on('exit', stopChildren);
const stop = () => {
  stopChildren();
  console.log('\nDémonstration arrêtée. Supabase tourne encore : `pnpm exec supabase stop` pour l’arrêter.');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${url} ne répond pas.`);
}
try {
  await waitFor(`${GATEWAY_URL}/__ready`);
  await waitFor(WEB_URL);
} catch {
  fail(
    'Les fonctions serveur ou le site n’ont pas démarré. Un autre programme utilise peut-être les ports 54320 ou 8765.',
  );
}

// 4. Compte de démonstration (créé une seule fois).
step('Compte de démonstration');
const service = { apikey: status.SERVICE_ROLE_KEY, Authorization: `Bearer ${status.SERVICE_ROLE_KEY}` };

async function rest(path, init = {}) {
  const response = await fetch(`${GATEWAY_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...service,
      'content-type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`${path} : ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const signup = await fetch(`${GATEWAY_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: status.ANON_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
});
const users = await fetch(`${GATEWAY_URL}/auth/v1/admin/users?per_page=1000`, { headers: service }).then(
  (r) => r.json(),
);
const user = users.users.find((u) => u.email === DEMO_EMAIL);
const [{ family_id: familyId }] = await rest(`parent?user_id=eq.${user.id}&select=family_id`);

const existing = await rest(`child_profile?family_id=eq.${familyId}&select=id`);
if (existing.length === 0) {
  const [child] = await rest('child_profile', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      alias: 'Petit Lion',
      grade: 'P5',
      needs: ['dyslexie'],
      needs_consent_at: new Date().toISOString(),
    }),
  });
  const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const task = (subject, kind, description, offset, extra = {}) => ({
    family_id: familyId,
    child_id: child.id,
    subject,
    kind,
    description,
    due_date: day(offset),
    status: 'validated',
    reference: null,
    ...extra,
  });
  await rest('task', {
    method: 'POST',
    body: JSON.stringify([
      task('Mathématiques', 'devoir', 'Faire les exercices de division', 1, { reference: 'p. 34' }),
      task('Éveil', 'interro', 'Les fleuves de Belgique', 4),
      task('Éveil', 'lecon', "Étudier la Meuse et l'Escaut", 2),
      task('Néerlandais', 'interro', 'Vocabulaire : les animaux', 3),
      task('Français', 'devoir', 'Lire le chapitre 3 du roman', 2),
    ]),
  });
  // Deux semaines d'efforts, pour le suivi et l'avatar.
  const events = [];
  for (let d = 1; d <= 13; d++) {
    const at = new Date(Date.now() - d * 86_400_000).toISOString();
    const base = { family_id: familyId, child_id: child.id, created_at: at };
    events.push({ ...base, type: 'activite', meta: { minutes: 20 } });
    events.push({ ...base, type: 'carte', meta: {} }, { ...base, type: 'carte', meta: {} });
    if (d % 3 === 0) events.push({ ...base, type: 'quiz', meta: { score: 4, total: 5 } });
  }
  await rest('learning_event', { method: 'POST', body: JSON.stringify(events) });
  console.log(
    '  Compte créé avec l’enfant « Petit Lion » (5e primaire, dyslexie), 5 tâches et deux semaines de suivi.',
  );
} else {
  console.log('  Compte déjà présent : vos essais précédents sont conservés.');
  if (!signup.ok) console.log('  (Pour repartir de zéro : `pnpm exec supabase db reset`, puis `pnpm demo`.)');
}

console.log(`
──────────────────────────────────────────────────────────────
  Côte à Côte est prêt : ${WEB_URL}${phoneUrl ? `\n  Sur l'iPhone (même Wi-Fi) : ${phoneUrl}` : ''}

  Adresse e-mail : ${DEMO_EMAIL}
  Mot de passe   : ${DEMO_PASSWORD}
  (ou créez un nouveau compte depuis l'écran de connexion)

  L'IA est simulée : l'analyse d'une photo et les fiches renvoient
  toujours les mêmes exemples. Les achats sont simulés.
  Ctrl+C pour arrêter.
──────────────────────────────────────────────────────────────`);

if (phoneUrl) {
  console.log('\nScannez ce code avec l’appareil photo de l’iPhone :\n');
  qrcode.generate(phoneUrl, { small: true });
  console.log(
    'Si le Mac demande d’autoriser les connexions entrantes pour « node », cliquez sur « Autoriser ».',
  );
}

const opener = isWindows
  ? ['cmd', ['/c', 'start', '', WEB_URL]]
  : process.platform === 'darwin'
    ? ['open', [WEB_URL]]
    : ['xdg-open', [WEB_URL]];
try {
  spawn(opener[0], opener[1], { stdio: 'ignore', detached: true })
    .on('error', () => {})
    .unref();
} catch {
  // Pas de navigateur : l'adresse est affichée ci-dessus.
}
