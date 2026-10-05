import { childProfileSchema, type ChildProfile, type ChildProfileInput } from '@cote-a-cote/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type StoredChildProfile = ChildProfile & { id: string };

const COLUMNS = 'id, alias, avatar, grade, track, network, options, needs, preferences';

function fromRow(row: Record<string, unknown>): StoredChildProfile {
  const profile = childProfileSchema.parse({ ...row, network: row.network ?? undefined });
  return { id: String(row.id), ...profile };
}

const profilesKey = ['child_profiles'] as const;

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
      const profile = childProfileSchema.parse(input);
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
