import * as Crypto from 'expo-crypto';

/** Empreinte SHA-256 (hexadécimal) du code parent salé. */
export function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}
