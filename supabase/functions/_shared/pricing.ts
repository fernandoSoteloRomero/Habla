// Costo de una llamada a Claude Haiku 5.5, en dólares (precios verificados el 2026-10-19).
// Por millón de tokens, para prompts de hasta 100k: entrada $0.10, salida $0.50,
// escritura de caché (5 min) $0.125 y lectura de caché $0.01. Arriba de 100k, todo cuesta 5×.

const PER_MILLION = {
  input: 0.1,
  output: 0.5,
  cacheWrite: 0.125,
  cacheRead: 0.01,
};
const LONG_PROMPT_TOKENS = 100_000;
const LONG_PROMPT_MULTIPLIER = 5;

export interface UsageTokens {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function costUsd(usage: UsageTokens): number {
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const base =
    (usage.input_tokens * PER_MILLION.input +
      cacheWrite * PER_MILLION.cacheWrite +
      cacheRead * PER_MILLION.cacheRead +
      usage.output_tokens * PER_MILLION.output) /
    1_000_000;
  const totalInput = usage.input_tokens + cacheWrite + cacheRead;
  return totalInput > LONG_PROMPT_TOKENS ? base * LONG_PROMPT_MULTIPLIER : base;
}
