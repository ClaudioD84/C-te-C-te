import { summarizeSubscription, type SubscriptionRow } from '@cote-a-cote/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useFamilyId } from '@/features/scan/api';
import { supabase } from '@/lib/supabase';

import { buyOffer, loadOffers, restorePurchases, type Offer } from './billing';

const subscriptionQuery = queryOptions({
  queryKey: ['subscription'],
  queryFn: async (): Promise<SubscriptionRow> => {
    const { data, error } = await supabase
      .from('subscription')
      .select('plan, status, current_period_end, will_renew, billing_issue, store')
      .single();
    if (error) throw error;
    return data as SubscriptionRow;
  },
});

export function useSubscription() {
  const query = useQuery(subscriptionQuery);
  return { ...query, summary: query.data ? summarizeSubscription(query.data, new Date()) : null };
}

export function useOffers() {
  const familyId = useFamilyId();
  return useQuery({
    queryKey: ['offers', familyId.data],
    enabled: Boolean(familyId.data),
    staleTime: 10 * 60 * 1000,
    queryFn: () => loadOffers(familyId.data!),
  });
}

/**
 * Le serveur apprend l'achat par RevenueCat, quelques secondes après le paiement :
 * on relit l'abonnement jusqu'à voir la nouvelle formule.
 */
async function waitForServer(queryClient: ReturnType<typeof useQueryClient>, plan: Offer['plan']) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const row = await queryClient.fetchQuery({ ...subscriptionQuery, staleTime: 0 });
    if (row.plan === plan && summarizeSubscription(row, new Date()).active) return true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

export function useBuyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offer: Offer) => {
      const result = await buyOffer(offer);
      if (result === 'annule') return { result, confirmed: false };
      return { result, confirmed: await waitForServer(queryClient, offer.plan) };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export function useRestorePurchases() {
  const queryClient = useQueryClient();
  const familyId = useFamilyId();
  return useMutation({
    mutationFn: () => restorePurchases(familyId.data!),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}
