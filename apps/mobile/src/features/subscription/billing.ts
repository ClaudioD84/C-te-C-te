import { PLAN_OFFERS, type PlanOffer } from '@cote-a-cote/shared';
import { Platform } from 'react-native';
import Purchases, { type PurchasesError, type PurchasesPackage } from 'react-native-purchases';

import { supabase } from '@/lib/supabase';

/**
 * Achats in-app (F13) via RevenueCat, qui regroupe l'App Store et Google Play.
 *
 * Configuration dans RevenueCat :
 * - droits (« entitlements ») `solo` et `famille` ;
 * - abonnements renouvelables `cac_solo_mois`, `cac_famille_mois` (mensuels) et `cac_solo_annee`,
 *   `cac_famille_annee` (annuels) ;
 * - une offre courante (« current offering ») qui contient ces quatre produits.
 *
 * L'acheteur RevenueCat est la famille (son identifiant) : les achats suivent la famille d'un appareil à l'autre.
 * L'accès est décidé par le serveur (table `subscription`, tenue à jour par la fonction revenuecat-webhook).
 */

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/**
 * - `store` : vrais achats (application installée, clé RevenueCat configurée) ;
 * - `simulation` : parcours testable sans store (web, Expo Go, pile locale), via la fonction simulate-purchase ;
 * - `indisponible` : ni l'un ni l'autre.
 */
export const billingMode: 'store' | 'simulation' | 'indisponible' =
  Platform.OS !== 'web' && apiKey
    ? 'store'
    : process.env.EXPO_PUBLIC_PAYMENTS_SIMULATION === 'true'
      ? 'simulation'
      : 'indisponible';

export const MANAGE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

let configuredFor: string | null = null;

/** Relie RevenueCat à la famille (à appeler avant toute lecture ou tout achat). */
export async function ensureBilling(familyId: string) {
  if (billingMode !== 'store' || configuredFor === familyId) return;
  if (configuredFor === null) Purchases.configure({ apiKey: apiKey!, appUserID: familyId });
  else await Purchases.logIn(familyId);
  configuredFor = familyId;
}

/** À la déconnexion : l'appareil ne doit plus acheter pour l'ancienne famille. */
export async function logOutBilling() {
  if (billingMode !== 'store' || configuredFor === null) return;
  configuredFor = null;
  await Purchases.logOut().catch(() => undefined);
}

export interface Offer extends PlanOffer {
  key: string;
  priceLabel: string;
  pkg?: PurchasesPackage;
}

const offerKey = (o: PlanOffer) => `${o.plan}_${o.period}`;

/** Formules proposées, avec le prix du store (taxes et devise du pays de l'acheteur). */
export async function loadOffers(familyId: string): Promise<Offer[]> {
  if (billingMode !== 'store')
    return PLAN_OFFERS.map((o) => ({ ...o, key: offerKey(o), priceLabel: o.price }));

  await ensureBilling(familyId);
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return PLAN_OFFERS.flatMap((o) => {
    const pkg = packages.find((p) => p.product.identifier.includes(`${o.plan}_${o.period}`));
    if (!pkg) return [];
    const suffix = o.period === 'mois' ? ' par mois' : ' par an';
    return [{ ...o, key: offerKey(o), priceLabel: `${pkg.product.priceString}${suffix}`, pkg }];
  });
}

/** Achat d'une formule ; « annule » si le parent ferme la fenêtre de paiement. */
export async function buyOffer(offer: Offer): Promise<'ok' | 'annule'> {
  if (billingMode === 'simulation') {
    const { error } = await supabase.functions.invoke('simulate-purchase', {
      body: { plan: offer.plan, period: offer.period },
    });
    if (error) throw new Error('Achat simulé impossible (fonction simulate-purchase désactivée ?).');
    return 'ok';
  }
  if (billingMode !== 'store' || !offer.pkg)
    throw new Error('Les achats ne sont pas disponibles sur cet appareil.');
  try {
    await Purchases.purchasePackage(offer.pkg);
    return 'ok';
  } catch (error) {
    if ((error as PurchasesError).userCancelled) return 'annule';
    throw new Error((error as PurchasesError).message || 'Le paiement n’a pas abouti.');
  }
}

/** Restaure les achats faits avec ce compte App Store ou Google Play (nouvel appareil, réinstallation). */
export async function restorePurchases(familyId: string): Promise<boolean> {
  if (billingMode !== 'store') return false;
  await ensureBilling(familyId);
  const info = await Purchases.restorePurchases();
  return Object.keys(info.entitlements.active).length > 0;
}
