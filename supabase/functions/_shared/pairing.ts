/** Codes de liaison d'un appareil enfant : 8 caractères sans 0/O ni 1/I/L (voir create_device_pairing). */
const CODE_RE = /^[A-HJKMNP-Z2-9]{8}$/;

/** Code tel que saisi (minuscules, espaces, tirets) → forme canonique, ou null s'il est mal formé. */
export function normalizePairingCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(code) ? code : null;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Mot de passe du compte d'appareil : 32 octets aléatoires, jamais montrés à personne. */
export function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
