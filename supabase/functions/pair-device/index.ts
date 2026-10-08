import { z } from '../_shared/deps.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import { normalizePairingCode, randomSecret, sha256Hex } from '../_shared/pairing.ts';
import { adminClient } from '../_shared/supabase.ts';

const bodySchema = z.object({
  code: z.string().max(40),
  name: z.string().trim().min(1).max(40).optional(),
});

const INVALID = 'Code inconnu ou expiré. Demandez un nouveau code dans l’application du parent.';
const MAX_FAILURES = 10;
/** Plafond tous appelants confondus : l'adresse IP transmise par le client peut être falsifiée. */
const MAX_GLOBAL_FAILURES = 500;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Relie une tablette à un profil enfant (cahier des charges, section 4).
 * Échange un code à usage unique (créé par le parent, valable 15 minutes) contre un compte d'appareil
 * dont les droits se limitent à la console de cet enfant. Appelée sans être connecté.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  try {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');

    // Contre l'essai de codes au hasard : 10 codes erronés par adresse et 500 au total par quart d'heure.
    // Avec 31^8 codes possibles, valables 15 minutes, deviner un code en cours reste hors de portée.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
    const ipHash = await sha256Hex(`pair-device:${ip}`);
    const since = new Date(Date.now() - FAILURE_WINDOW_MS).toISOString();
    const [{ count }, { count: globalCount }] = await Promise.all([
      admin
        .from('device_pairing_failure')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', since),
      admin
        .from('device_pairing_failure')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
    ]);
    if ((count ?? 0) >= MAX_FAILURES || (globalCount ?? 0) >= MAX_GLOBAL_FAILURES)
      throw new UserFacingError('Trop d’essais. Patientez un quart d’heure avant de réessayer.', 429);
    const fail = async () => {
      await admin.from('device_pairing_failure').insert({ ip_hash: ipHash });
      return new UserFacingError(INVALID, 404);
    };

    const code = normalizePairingCode(body.data.code);
    if (!code) throw await fail();

    // Usage unique : le code est retiré au moment où il est lu, même si la suite échoue.
    const { data: pairing, error } = await admin
      .from('device_pairing')
      .delete()
      .eq('code_hash', await sha256Hex(code))
      .gt('expires_at', new Date().toISOString())
      .select('family_id, child_id')
      .maybeSingle();
    if (error) throw error;
    if (!pairing) throw await fail();

    const email = `appareil-${crypto.randomUUID()}@appareils.coteacote.invalid`;
    const password = randomSecret();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'child_device', child_id: pairing.child_id },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error('Compte non créé');

    const { error: insertError } = await admin.from('child_device').insert({
      user_id: created.data.user.id,
      family_id: pairing.family_id,
      child_id: pairing.child_id,
      name: body.data.name ?? 'Tablette',
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      throw insertError;
    }

    return json({ email, password, childId: pairing.child_id });
  } catch (error) {
    if (error instanceof UserFacingError) return json({ error: error.message }, error.status);
    console.error('pair-device', error);
    return json({ error: 'Liaison impossible. Réessayez dans un instant.' }, 500);
  }
});
