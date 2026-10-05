import {
  decideFromEvent,
  stateFromSubscriber,
  toRow,
  type RcSubscriber,
  type RevenueCatEvent,
} from '../_shared/billing.ts';
import { json } from '../_shared/http.ts';
import { hasBearerSecret } from '../_shared/secret.ts';
import { adminClient } from '../_shared/supabase.ts';

/**
 * Avis de RevenueCat (achats, renouvellements, résiliations… sur l'App Store et Google Play).
 * Appelé par RevenueCat, pas par l'application : protégé par un secret partagé.
 *
 * Secrets : REVENUECAT_WEBHOOK_SECRET (en-tête « Authorization » configuré dans RevenueCat),
 * REVENUECAT_SECRET_API_KEY (facultatif mais recommandé : l'état est alors relu dans RevenueCat),
 * REVENUECAT_ALLOW_SANDBOX=true pour accepter les achats de test (bêta TestFlight / tests internes).
 */
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  if (!hasBearerSecret(request, Deno.env.get('REVENUECAT_WEBHOOK_SECRET')))
    return json({ error: 'Non autorisé' }, 401);

  const body = (await request.json().catch(() => null)) as { event?: RevenueCatEvent } | null;
  const event = body?.event;
  if (!event?.id || !event.type) return json({ error: 'Événement invalide' }, 400);

  const admin = adminClient();
  const now = new Date();
  const decision = decideFromEvent(event, now, {
    allowSandbox: Deno.env.get('REVENUECAT_ALLOW_SANDBOX') === 'true',
  });

  // Un même événement peut être renvoyé : on ne le traite qu'une fois.
  const { error: duplicate } = await admin.from('subscription_event').insert({
    id: event.id,
    family_id: decision.action === 'apply' ? decision.familyId : null,
    type: event.type,
    payload: event,
  });
  if (duplicate) {
    if (duplicate.code === '23505') return json({ received: true, duplicate: true });
    if (duplicate.code === '23503') {
      // Famille inconnue (compte supprimé, identifiant d'un autre environnement) : rien à mettre à jour.
      await admin
        .from('subscription_event')
        .insert({ id: event.id, family_id: null, type: event.type, payload: event });
      return json({ received: true, ignored: 'famille inconnue' });
    }
    // Famille inconnue (clé étrangère) ou autre : RevenueCat réessaiera plus tard.
    console.error('subscription_event', duplicate.message);
    return json({ error: 'Enregistrement impossible' }, 500);
  }

  try {
    if (decision.action === 'ignore') return json({ received: true, ignored: decision.reason });

    const apiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    const familyIds = decision.action === 'apply' ? [decision.familyId] : decision.familyIds;
    for (const familyId of familyIds) {
      // Source de vérité : l'état lu dans RevenueCat quand la clé est configurée.
      const state = apiKey
        ? await fetchState(familyId, apiKey, now)
        : decision.action === 'apply'
          ? decision.state
          : undefined;
      // Pas de droit connu (ex. famille encore en essai) ou transfert sans clé d'API : rien à appliquer.
      if (!state) continue;

      if (!apiKey) {
        // Sans relecture de RevenueCat, un événement plus ancien que le dernier appliqué est ignoré.
        const { data: current } = await admin
          .from('subscription')
          .select('last_event_at')
          .eq('family_id', familyId)
          .maybeSingle();
        if (current?.last_event_at && new Date(current.last_event_at) > new Date(decision.eventAt)) continue;
      }
      const { error } = await admin
        .from('subscription')
        .update(toRow(state, decision.eventAt))
        .eq('family_id', familyId);
      if (error) throw error;
    }
    return json({ received: true });
  } catch (error) {
    console.error('revenuecat-webhook', error);
    // L'événement sera renvoyé : on retire la trace pour pouvoir le traiter à nouveau.
    await admin.from('subscription_event').delete().eq('id', event.id);
    return json({ error: 'Traitement impossible' }, 500);
  }
});

async function fetchState(familyId: string, apiKey: string, now: Date) {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(familyId)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`RevenueCat ${response.status}`);
  return stateFromSubscriber((await response.json()) as RcSubscriber, now);
}
