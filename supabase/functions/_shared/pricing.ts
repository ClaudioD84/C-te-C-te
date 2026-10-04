/** Tarifs de l'API Claude en dollars par million de tokens (entrée, sortie, lecture de cache). */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
};

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Coût estimé d'un appel ; l'écriture en cache coûte 1,25 fois le prix d'entrée. */
export function estimateCostUsd(model: string, usage: Usage): number {
  const price = PRICES[model];
  if (!price) return 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const total =
    usage.input_tokens * price.input +
    cacheWrite * price.input * 1.25 +
    cacheRead * price.cacheRead +
    usage.output_tokens * price.output;
  return Math.round(total) / 1_000_000;
}
