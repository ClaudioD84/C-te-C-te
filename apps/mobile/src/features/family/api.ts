import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface FamilyMember {
  user_id: string;
  email: string;
  joined_at: string;
  is_me: boolean;
}

export function useFamilyMembers() {
  return useQuery({
    queryKey: ['family_members'],
    queryFn: async (): Promise<FamilyMember[]> => {
      const { data, error } = await supabase.rpc('family_members');
      if (error) throw error;
      return data as FamilyMember[];
    },
  });
}

/** Code à transmettre à l'autre parent (valable 7 jours, une seule fois). */
export function useCreateInvitation() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('create_family_invitation');
      if (error)
        throw new Error(
          error.code === 'P0001' ? error.message : 'Invitation non créée. Vérifiez votre connexion.',
        );
      return data as string;
    },
  });
}

const JOIN_MESSAGES: Record<string, string> = {
  invalide: 'Code inconnu ou expiré. Demandez une nouvelle invitation.',
  trop_essais: 'Trop d’essais. Patientez un quart d’heure avant de réessayer.',
  deja_membre: 'Vous faites déjà partie de cette famille.',
  enfants:
    'Votre compte contient déjà des profils d’enfants. Supprimez-les (ou demandez à l’autre parent de vous inviter avant d’en créer) pour rejoindre cette famille.',
  abonnement:
    'Votre compte a un abonnement en cours. Résiliez-le dans les réglages de votre téléphone, puis rejoignez la famille à la fin de la période.',
  complet: 'Cette famille compte déjà 4 parents.',
};

/** Rejoindre la famille d'un autre parent : toutes les données sont rechargées. */
export function useJoinFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('join_family', { p_code: code });
      if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
      if (data !== 'ok')
        throw new Error(JOIN_MESSAGES[data as string] ?? 'Impossible de rejoindre cette famille.');
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Quitter la famille (sans argument) ou en retirer un autre parent. */
export function useLeaveFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId?: string) => {
      const { error } = await supabase.rpc('leave_family', userId ? { p_user_id: userId } : {});
      if (error) throw new Error(error.code === 'P0001' ? error.message : 'L’opération a échoué. Réessayez.');
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function formatInvitationCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
