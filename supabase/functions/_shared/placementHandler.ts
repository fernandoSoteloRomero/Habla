// Flujo completo de la Edge Function `placement`, con la base y la IA inyectadas para que
// Vitest lo pruebe sin gastar. index.ts solo conecta las dependencias reales.
// Orden pensado para el costo: validar → ¿ya evaluado? → reservar en el límite → IA → registrar → guardar.
import { classifyAnthropicError, isRetryable } from "./aiErrors.ts";
import {
  buildPlacementPrompt,
  clampLevel,
  firstUnitOf,
  highestLevel,
  parsePlacementOutput,
  PLACEMENT_SCHEMA,
  PLACEMENT_SYSTEM,
  validatePlacementRequest,
} from "./placementLogic.ts";
import type {
  AiErrorCode,
  LevelId,
  PlacementResult,
} from "./placementTypes.ts";
import type { UsageTokens } from "./pricing.ts";

export const MODEL = "claude-haiku-5-5";
// 1 intento + hasta 2 reintentos (spec 9). Con 25 s por intento y sin empezar uno nuevo
// después de 60 s, todo cabe en el límite de 150 s de la función.
const MAX_ATTEMPTS = 3;
const NO_NEW_ATTEMPT_AFTER_MS = 60_000;

export const FALLBACK_RESUMEN =
  "Empiezas desde el principio, con saludos y frases básicas. En tu revisión mensual podrás subir de línea.";

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
  system: string;
  messages: { role: "user"; content: string }[];
}

export interface PlacementDeps {
  isPlaced(): Promise<boolean>;
  // id de la fila reservada en usage_log, o null si ya llegó al límite
  reserveCall(): Promise<number | null>;
  finishCall(id: number, usage: UsageTokens): Promise<void>;
  releaseCall(id: number): Promise<void>;
  createMessage(params: MessageParams): Promise<AiMessage>;
  // "ok" si guardó; "ya-evaluado" si otra petición ganó. Lanza si falla la base.
  savePlacement(
    level: LevelId,
    unitId: string,
    details: unknown,
  ): Promise<"ok" | "ya-evaluado">;
  now(): number;
}

export interface HandlerResponse {
  status: number;
  body: PlacementResult | { error: AiErrorCode };
}

const STATUS: Record<AiErrorCode, number> = {
  datos: 400,
  "ya-evaluado": 409,
  limite: 429,
  presupuesto: 402,
  ia: 502,
  servidor: 500,
};

function fail(error: AiErrorCode): HandlerResponse {
  return { status: STATUS[error], body: { error } };
}

function isFallbackRequest(body: unknown): boolean {
  return (
    !!body &&
    typeof body === "object" &&
    (body as Record<string, unknown>).fallback === true
  );
}

export async function handlePlacement(
  body: unknown,
  deps: PlacementDeps,
): Promise<HandlerResponse> {
  // "Empezar en Nivel 0 por ahora": sin IA y sin gastar (cuando la IA no está disponible)
  if (isFallbackRequest(body)) {
    try {
      const saved = await deps.savePlacement("L0", firstUnitOf("L0"), {
        fallback: true,
      });
      if (saved === "ya-evaluado") return fail("ya-evaluado");
    } catch {
      return fail("servidor");
    }
    return {
      status: 200,
      body: {
        level: "L0",
        unitId: firstUnitOf("L0"),
        resumen: FALLBACK_RESUMEN,
      },
    };
  }

  const request = validatePlacementRequest(body);
  if (!request) return fail("datos");

  let reservation: number | null;
  try {
    if (await deps.isPlaced()) return fail("ya-evaluado");
    reservation = await deps.reserveCall();
  } catch {
    return fail("servidor");
  }
  if (reservation === null) return fail("limite");

  const params: MessageParams = {
    model: MODEL,
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: PLACEMENT_SCHEMA },
    },
    system: PLACEMENT_SYSTEM,
    messages: [
      { role: "user", content: buildPlacementPrompt(request.answers) },
    ],
  };

  // Todos los intentos se suman en la misma fila reservada
  const total: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  } = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
  let spent = false;
  let output: ReturnType<typeof parsePlacementOutput> = null;
  const start = deps.now();

  for (let attempt = 0; attempt < MAX_ATTEMPTS && !output; attempt++) {
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
        // Si no se gastó nada, la reserva se libera: reintentar mañana no debe toparse con el límite
        if (spent) await deps.finishCall(reservation, total);
        else await deps.releaseCall(reservation);
        return fail("presupuesto");
      }
      if (isRetryable(apiError)) continue;
      break;
    }

    spent = true;
    total.input_tokens += message.usage.input_tokens;
    total.output_tokens += message.usage.output_tokens;
    total.cache_read_input_tokens += message.usage.cache_read_input_tokens ?? 0;
    total.cache_creation_input_tokens +=
      message.usage.cache_creation_input_tokens ?? 0;

    // Si se niega, insistir no sirve
    if (message.stop_reason === "refusal") break;
    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    output =
      message.stop_reason === "end_turn" ? parsePlacementOutput(text) : null;
  }

  await deps.finishCall(reservation, total);
  if (!output) return fail("ia");

  // La IA no puede subir a alguien más allá del nivel al que llegó la evaluación
  const level = clampLevel(output.level, highestLevel(request.answers));
  const unitId = firstUnitOf(level);

  try {
    const saved = await deps.savePlacement(level, unitId, {
      answers: request.answers,
      ai: output,
    });
    if (saved === "ya-evaluado") return fail("ya-evaluado");
  } catch {
    return fail("servidor");
  }

  return { status: 200, body: { level, unitId, resumen: output.resumen } };
}
