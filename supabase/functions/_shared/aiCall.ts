// Una llamada a Claude con reintentos, compartida por las Edge Functions `placement` y `session`.
// TS puro: sin `npm:` ni `Deno`, para que Vitest la pruebe. El cliente real lo inyecta index.ts.
import { classifyAnthropicError, isRetryable } from "./aiErrors.ts";
import type { UsageTokens } from "./pricing.ts";

export const MODEL = "claude-haiku-5-5";
// 1 intento + hasta 2 reintentos (spec 9). Con 25 s por intento y sin empezar uno nuevo
// después de 60 s, todo cabe en el límite de 150 s de la función.
const MAX_ATTEMPTS = 3;
const NO_NEW_ATTEMPT_AFTER_MS = 60_000;

// Lo mínimo que se usa de la respuesta del SDK
export interface AiMessage {
  stop_reason: string | null;
  content: { type: string; text?: string }[];
  usage: UsageTokens;
}

export interface MessageParams {
  model: string;
  max_tokens: number;
  thinking: { type: "disabled" };
  output_config: {
    effort: "low";
    format: { type: "json_schema"; schema: Record<string, unknown> };
  };
  system: string | { type: "text"; text: string }[];
  messages: { role: "user" | "assistant"; content: string }[];
  // Caché automática: la API la pone sola en el último bloque (para la conversación)
  cache_control?: { type: "ephemeral" };
}

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface AiCallDeps {
  createMessage(params: MessageParams): Promise<AiMessage>;
  now(): number;
}

// spent = ya se gastó algo (para saber si la reserva se registra o se libera)
export type AiCallResult<T> =
  | { ok: true; output: T; usage: UsageTotals }
  | {
      ok: false;
      error: "presupuesto" | "ia";
      usage: UsageTotals;
      spent: boolean;
    };

// Llama a la IA hasta que `parse` acepte la respuesta. Todos los intentos se suman en `usage`.
export async function callAi<T>(
  deps: AiCallDeps,
  params: MessageParams,
  parse: (text: string) => T | null,
): Promise<AiCallResult<T>> {
  const usage: UsageTotals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
  let spent = false;
  const start = deps.now();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0 && deps.now() - start > NO_NEW_ATTEMPT_AFTER_MS) break;

    let message: AiMessage;
    try {
      message = await deps.createMessage(params);
    } catch (error) {
      const apiError = error as {
        status?: number;
        message?: string;
        error?: unknown;
      };
      if (classifyAnthropicError(apiError) === "presupuesto") {
        return { ok: false, error: "presupuesto", usage, spent };
      }
      if (isRetryable(apiError)) continue;
      break;
    }

    spent = true;
    usage.input_tokens += message.usage.input_tokens;
    usage.output_tokens += message.usage.output_tokens;
    usage.cache_read_input_tokens += message.usage.cache_read_input_tokens ?? 0;
    usage.cache_creation_input_tokens +=
      message.usage.cache_creation_input_tokens ?? 0;

    // Si se niega, insistir no sirve; la salida parcial se descarta
    if (message.stop_reason === "refusal") break;
    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    const output = message.stop_reason === "end_turn" ? parse(text) : null;
    if (output !== null) return { ok: true, output, usage };
  }

  return { ok: false, error: "ia", usage, spent };
}
