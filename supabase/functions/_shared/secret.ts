/** Comparaison en temps constant (évite de deviner un secret à partir du temps de réponse). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/**
 * Vrai si l'en-tête « Authorization: Bearer … » porte le secret attendu. Faux si le secret n'est pas configuré :
 * une fonction protégée reste fermée tant qu'on ne lui a pas donné de secret.
 */
export function hasBearerSecret(request: Request, expected: string | undefined): boolean {
  const given = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(expected && given && timingSafeEqual(given, expected));
}

/** Vrai pour une pile Supabase locale (développement, tests) ; faux pour un projet hébergé. */
export function isLocalStack(supabaseUrl: string | undefined): boolean {
  if (!supabaseUrl) return false;
  const host = new URL(supabaseUrl).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === 'kong' || host === 'host.docker.internal';
}
