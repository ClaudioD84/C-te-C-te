import { z } from '../_shared/deps.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import { adminClient, authenticate } from '../_shared/supabase.ts';

const bodySchema = z.object({ plan: z.enum(['solo', 'famille']), period: z.enum(['mois', 'annee']) });

/**
 * Achat simulé, pour tester le parcours d'abonnement sans App Store ni Google Play
 * (version web, Expo Go, pile locale). Désactivé partout où ALLOW_SIMULATED_PURCHASES n'est pas « true » :
 * ne jamais l'activer en production.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (Deno.env.get('ALLOW_SIMULATED_PURCHASES') !== 'true')
    return json({ error: 'Achats simulés désactivés.' }, 403);

  const admin = adminClient();
  try {
    const { familyId } = await authenticate(request, admin);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');
    const days = body.data.period === 'mois' ? 30 : 365;
    const { error } = await admin
      .from('subscription')
      .update({
        plan: body.data.plan,
        status: 'active',
        current_period_end: new Date(Date.now() + days * 24 * 3600 * 1000).toISOString(),
        will_renew: body.data.period === 'mois',
        billing_issue: false,
        store: 'simulation',
        product_id: `simulation_${body.data.plan}_${body.data.period}`,
        updated_at: new Date().toISOString(),
      })
      .eq('family_id', familyId);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) return json({ error: error.message }, error.status);
    console.error('simulate-purchase', error);
    return json({ error: 'Achat simulé impossible.' }, 500);
  }
});
