#!/usr/bin/env node
// Outils de la bêta privée, avec la clé de service du projet Supabase (jamais dans l'application) :
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/beta/beta.mjs <commande>
//
//   code <CODE> [utilisations] [note]   crée un code d'invitation (ex. : code ECOLE-2026 20 "école du quartier")
//   codes                               liste les codes et leurs utilisations
//   stats [jours]                       mesures par famille (30 derniers jours par défaut), sans contenu
//   avis [jours]                        avis des testeurs (14 derniers jours par défaut)
//   erreurs [jours]                     erreurs de l'application regroupées par message (7 jours par défaut)
//
// Dès qu'un code existe, l'inscription en demande un. Pour ouvrir l'inscription à tous : supprimer les codes
// (table invite_code).

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Renseignez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function call(path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const since = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
const day = (iso) => (iso ? iso.slice(0, 10) : '—');

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'code': {
    const [code, uses = '1', note = null] = args;
    if (!code) throw new Error('Indiquez le code, par exemple : code FAMILLE-01 1');
    await call('invite_code', {
      method: 'POST',
      body: JSON.stringify({ code: code.toUpperCase(), max_uses: Number(uses), note }),
    });
    console.log(`Code ${code.toUpperCase()} créé (${uses} inscription(s)).`);
    break;
  }
  case 'codes': {
    const codes = await call('invite_code?select=code,note,uses,max_uses,expires_at&order=created_at');
    console.table(codes);
    break;
  }
  case 'stats': {
    const days = Number(args[0] ?? 30);
    const rows = await call('rpc/beta_metrics', {
      method: 'POST',
      body: JSON.stringify({ p_since: since(days) }),
    });
    console.log(`Familles : ${rows.length} · ${days} derniers jours`);
    console.table(
      rows.map((r) => ({
        famille: r.family_id.slice(0, 8),
        inscrite: day(r.joined_at),
        'dernière visite': day(r.last_active_at),
        enfants: r.children,
        photos: r.photos,
        tâches: r.validated_tasks,
        missions: r.missions_done,
        'jours actifs': r.active_days,
        avis: r.feedbacks,
        'IA ($)': Number(r.ai_cost_usd).toFixed(2),
      })),
    );
    const active = rows.filter((r) => r.active_days >= 3).length;
    const cost = rows.reduce((sum, r) => sum + Number(r.ai_cost_usd), 0);
    console.log(
      `Familles actives (3 jours ou plus) : ${active}/${rows.length} · coût IA moyen : ${(cost / Math.max(rows.length, 1)).toFixed(2)} $`,
    );
    break;
  }
  case 'avis': {
    const days = Number(args[0] ?? 14);
    const rows = await call(
      `feedback?select=created_at,mood,screen,message&created_at=gte.${since(days)}&order=created_at.desc`,
    );
    for (const r of rows)
      console.log(`\n${day(r.created_at)} · ${r.mood ?? '—'} · ${r.screen ?? '—'}\n${r.message}`);
    console.log(`\n${rows.length} avis.`);
    break;
  }
  case 'erreurs': {
    const days = Number(args[0] ?? 7);
    const rows = await call(
      `app_error?select=message,screen,platform,app_version,created_at&created_at=gte.${since(days)}&order=created_at.desc&limit=1000`,
    );
    const groups = new Map();
    for (const r of rows) {
      const g = groups.get(r.message) ?? {
        message: r.message.slice(0, 80),
        fois: 0,
        écrans: new Set(),
        dernière: r.created_at,
      };
      g.fois += 1;
      if (r.screen) g.écrans.add(r.screen);
      groups.set(r.message, g);
    }
    console.table(
      [...groups.values()]
        .sort((a, b) => b.fois - a.fois)
        .map((g) => ({ ...g, écrans: [...g.écrans].join(', '), dernière: day(g.dernière) })),
    );
    break;
  }
  default:
    console.log('Commandes : code, codes, stats, avis, erreurs (voir l’en-tête du script).');
}
