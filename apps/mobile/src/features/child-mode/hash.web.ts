import { sha256Hex } from '@cote-a-cote/shared';
import * as Crypto from 'expo-crypto';

/**
 * Empreinte SHA-256 (hexadécimal). Hors « contexte sécurisé » (page ouverte depuis un iPhone par l'adresse du Mac
 * sur le Wi-Fi), le navigateur n'offre pas `crypto.subtle` : calcul en JavaScript, au résultat identique.
 */
export function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
  }
  return Promise.resolve(sha256Hex(text));
}
