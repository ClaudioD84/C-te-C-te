#!/usr/bin/env node
// Outils de la bêta privée, avec la clé de service du projet Supabase (jamais dans l'application) :
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/beta/beta.mjs <commande>
//
//   code <CODE> [utilisations] [jours d'essai] [note]
//                                       crée un code d'invitation (ex. : code ECOLE-2026 20 90 "école")
//   codes                               liste les codes et leurs utilisations
//   stats [jours]                       mesures par famille (30 derniers jours par défaut), sans contenu
//   avis [jours]                        avis des testeurs (14 derniers jours par défaut)
//   erreurs [jours]                     erreurs de l'application regroupées par message (7 jours par défaut)
//   compte-revue <e-mail> <mot de passe> compte de démonstration pour la revue d'Apple et de Google : confirmé,
//                                       avec « Léo » (5e primaire), quelques devoirs validés et un an d'accès
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
    const [code, uses = '1', trialDays = '90', note = null] = args;
    if (!code) throw new Error('Indiquez le code, par exemple : code FAMILLE-01 1');
    await call('invite_code', {
      method: 'POST',
      body: JSON.stringify({
        code: code.toUpperCase(),
        max_uses: Number(uses),
        trial_days: Number(trialDays),
        note,
      }),
    });
    console.log(`Code ${code.toUpperCase()} créé : ${uses} inscription(s), ${trialDays} jours d'essai.`);
    break;
  }
  case 'codes': {
    const codes = await call(
      'invite_code?select=code,note,uses,max_uses,trial_days,expires_at&order=created_at',
    );
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
  case 'compte-revue': {
    const [email, password] = args;
    if (!email || !password || password.length < 8)
      throw new Error('Indiquez l’adresse et un mot de passe de 8 caractères au moins.');
    // Si l'inscription demande un code, un code à usage unique est créé pour ce compte.
    const codes = await call('invite_code?select=code&limit=1');
    let inviteCode = null;
    if (codes.length > 0) {
      inviteCode = `REVUE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await call('invite_code', {
        method: 'POST',
        body: JSON.stringify({ code: inviteCode, max_uses: 1, trial_days: 365, note: 'revue des stores' }),
      });
    }
    const created = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: inviteCode ? { invite_code: inviteCode } : {},
      }),
    });
    if (!created.ok) throw new Error(`${created.status} ${await created.text()}`);
    const user = await created.json();
    const [{ family_id: familyId }] = await call(`parent?select=family_id&user_id=eq.${user.id}`);
    const until = new Date(Date.now() + 365 * 86_400_000).toISOString();
    await call(`subscription?family_id=eq.${familyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ current_period_end: until }),
    });
    const [child] = await call('child_profile', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ family_id: familyId, alias: 'Léo', grade: 'P5', avatar: 'lion' }),
    });
    const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const task = (subject, kind, description, due, reference = null) => ({
      family_id: familyId,
      child_id: child.id,
      subject,
      kind,
      description,
      due_date: due,
      reference,
      confidence: 1,
      status: 'validated',
    });
    await call('task', {
      method: 'POST',
      body: JSON.stringify([
        task('Mathématiques', 'devoir', 'Faire les exercices de division', inDays(2), 'p. 34, ex. 1 à 4'),
        task('Éveil', 'interro', 'Les fleuves de Belgique', inDays(5)),
        task('Français', 'lecon', 'Étudier les mots de la dictée', inDays(4)),
      ]),
    });
    console.log(`Compte de revue prêt : ${email} (Léo, 3 devoirs, accès jusqu'au ${until.slice(0, 10)}).`);
    console.log('À reporter dans docs/publication/notes-de-revue.md et dans App Store Connect.');
    break;
  }
  default:
    console.log('Commandes : code, codes, stats, avis, erreurs, compte-revue (voir l’en-tête du script).');
}
