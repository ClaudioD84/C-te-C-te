import { createClient, type SupabaseClient } from './deps.ts';
import { UserFacingError } from './http.ts';

/** Client « service » : contourne RLS. À n'utiliser qu'après avoir vérifié l'appartenance des données. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Identifie le parent à partir de son jeton et renvoie sa famille. */
export async function authenticate(
  request: Request,
  admin: SupabaseClient,
): Promise<{ userId: string; familyId: string }> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new UserFacingError('Non connecté.', 401);

  const { data: user, error } = await admin.auth.getUser(token);
  if (error || !user.user) throw new UserFacingError('Session expirée. Reconnectez-vous.', 401);

  const { data: parent, error: parentError } = await admin
    .from('parent')
    .select('family_id')
    .eq('user_id', user.user.id)
    .single();
  if (parentError || !parent) throw new UserFacingError('Compte incomplet.', 403);

  return { userId: user.user.id, familyId: parent.family_id as string };
}
