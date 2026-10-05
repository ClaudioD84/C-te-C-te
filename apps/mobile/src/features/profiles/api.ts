import {
  childProfileSchema,
  nextNeedsConsentAt,
  schoolLevel,
  type ChildProfile,
  type ChildProfileInput,
} from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type StoredChildProfile = ChildProfile & { id: string };

const COLUMNS = 'id, alias, avatar, grade, track, network, options, needs, preferences';

function fromRow(row: Record<string, unknown>): StoredChildProfile {
  const profile = childProfileSchema.parse({ ...row, network: row.network ?? undefined });
  return { id: String(row.id), ...profile };
}

const profilesKey = ['child_profiles'] as const;

/** Options saisies au clavier : sans espaces superflus ni éléments vides. */
function cleanOptions<T extends { options?: string[] }>(input: T): T {
  return { ...input, options: (input.options ?? []).map((o) => o.trim()).filter(Boolean) };
}

export function useChildProfiles() {
  return useQuery({
    queryKey: profilesKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('child_profile').select(COLUMNS).order('created_at');
      if (error) throw error;
      return data.map(fromRow);
    },
  });
}

export function useChildProfile(id: string) {
  return useQuery({
    queryKey: [...profilesKey, id],
    // Pas de requête tant que l'identifiant n'est pas connu (évite une erreur 400).
    enabled: id.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('child_profile').select(COLUMNS).eq('id', id).single();
      if (error) throw error;
      return fromRow(data);
    },
  });
}

export function useCreateChildProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChildProfileInput) => {
      const profile = childProfileSchema.parse(cleanOptions(input));
      // family_id est rempli par la base à partir de l'utilisateur connecté.
      const { data, error } = await supabase
        .from('child_profile')
        .insert({
          ...profile,
          network: profile.network ?? null,
          // L'écran de création n'autorise l'envoi des besoins qu'après consentement explicite.
          needs_consent_at: profile.needs.length > 0 ? new Date().toISOString() : null,
        })
        .select(COLUMNS)
        .single();
      if (error?.message.includes('limite_enfants')) {
        throw new Error(
          'Votre formule Solo concerne un seul enfant. Passez à la formule Famille (jusqu’à 4 enfants) pour en ajouter un autre.',
        );
      }
      if (error) throw error;
      return fromRow(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profilesKey }),
  });
}

export function useUpdateChildProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChildProfileInput) => {
      const profile = childProfileSchema.parse(cleanOptions(input));
      const { data: current, error: readError } = await supabase
        .from('child_profile')
        .select('needs, needs_consent_at')
        .eq('id', id)
        .single();
      if (readError) throw readError;
      const { error } = await supabase
        .from('child_profile')
        .update({
          alias: profile.alias,
          avatar: profile.avatar,
          grade: profile.grade,
          track: profile.track,
          // Réseau et options n'ont de sens qu'au secondaire.
          network: schoolLevel(profile.grade) === 'secondaire' ? (profile.network ?? null) : null,
          options: schoolLevel(profile.grade) === 'secondaire' ? profile.options : [],
          needs: profile.needs,
          preferences: profile.preferences,
          needs_consent_at: nextNeedsConsentAt(
            current.needs as string[],
            profile.needs,
            current.needs_consent_at as string | null,
          ),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profilesKey }),
  });
}

export function useDeleteChildProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Les photos encore présentes sont effacées du stockage ; le reste suit par cascade.
      const { data: scans } = await supabase
        .from('scan')
        .select('storage_path')
        .eq('child_id', id)
        .not('storage_path', 'is', null);
      const paths = (scans ?? []).map((s) => String(s.storage_path));
      if (paths.length > 0) await supabase.storage.from('scans').remove(paths);
      const { error } = await supabase.from('child_profile').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
