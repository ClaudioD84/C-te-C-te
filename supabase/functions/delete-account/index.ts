import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import { adminClient, authenticate } from '../_shared/supabase.ts';

/**
 * Suppression du compte (RGPD) : photos restantes, utilisateur, puis — par cascade —
 * la famille et toutes ses données si c'était le dernier parent.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  try {
    const { userId, familyId } = await authenticate(request, admin);

    const { count } = await admin
      .from('parent')
      .select('user_id', { count: 'exact', head: true })
      .eq('family_id', familyId);
    if ((count ?? 0) <= 1) {
      // Dernier parent : on efface aussi les photos encore stockées pour la famille.
      const { data: files } = await admin.storage.from('scans').list(familyId, { limit: 1000 });
      if (files && files.length > 0) {
        await admin.storage.from('scans').remove(files.map((f) => `${familyId}/${f.name}`));
      }
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return json({ deleted: true });
  } catch (error) {
    if (error instanceof UserFacingError) return json({ error: error.message }, error.status);
    console.error('delete-account', error);
    return json({ error: 'La suppression a échoué. Réessayez ou contactez-nous.' }, 500);
  }
});
