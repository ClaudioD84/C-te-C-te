import type { Session } from '@supabase/supabase-js';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/** Enfant auquel la tablette connectée est reliée ; null pour un compte parent. */
export function deviceChildId(session: Session | null): string | null {
  const meta = session?.user.app_metadata as { role?: string; child_id?: string } | undefined;
  return meta?.role === 'child_device' && typeof meta.child_id === 'string' ? meta.child_id : null;
}

export interface ChildDevice {
  user_id: string;
  name: string;
  created_at: string;
  last_seen_at: string;
}

/** Tablettes reliées à un enfant (vue parent). */
export function useChildDevices(childId: string) {
  return useQuery({
    queryKey: ['child_devices', childId],
    enabled: childId.length > 0,
    queryFn: async (): Promise<ChildDevice[]> => {
      const { data, error } = await supabase
        .from('child_device')
        .select('user_id, name, created_at, last_seen_at')
        .eq('child_id', childId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/** Code à usage unique, valable 15 minutes, pour relier une tablette à l'enfant. */
export function useCreatePairingCode(childId: string) {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('create_device_pairing', { p_child_id: childId });
      if (error)
        throw new Error(error.code === 'P0001' ? error.message : 'Code non créé. Vérifiez votre connexion.');
      return data as string;
    },
  });
}

/** Le parent retire une tablette : son accès est coupé et son compte supprimé. */
export function useRemoveDevice(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('child_device').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['child_devices', childId] }),
  });
}

/** Code affiché par groupes de 4 caractères (« ABCD-EF23 »). */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Sur la tablette : échange le code contre un compte d'appareil, puis s'y connecte. */
export async function pairThisDevice(code: string, name: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('pair-device', {
    body: { code, name: name.trim() || undefined },
  });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Liaison impossible. Réessayez dans un instant.');
  }
  if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
  const { email, password } = data as { email: string; password: string };
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error)
    throw new Error('Liaison faite, mais la connexion a échoué. Réessayez avec un nouveau code.');
}

/** Sur la tablette : la délier (son compte est supprimé), puis revenir à l'écran de connexion. */
export async function unlinkThisDevice(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { error } = await supabase.from('child_device').delete().eq('user_id', data.user.id);
    if (error) throw new Error('Impossible de délier la tablette. Vérifiez votre connexion.');
  }
  await supabase.auth.signOut({ scope: 'local' });
}

/**
 * Sur la tablette : vérifie qu'elle est toujours reliée (le parent a pu la retirer). Sinon, déconnexion
 * locale, ce qui efface aussi les données gardées sur l'appareil.
 */
export function useDeviceLinkCheck(enabled: boolean) {
  const check = useQuery({
    queryKey: ['this_device'],
    enabled,
    // Jamais gardé sur l'appareil : seule la réponse du serveur fait foi.
    gcTime: 0,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('child_device').select('user_id').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const unlinked = enabled && check.isSuccess && check.data === null;
  useEffect(() => {
    if (unlinked) void supabase.auth.signOut({ scope: 'local' });
  }, [unlinked]);
}
