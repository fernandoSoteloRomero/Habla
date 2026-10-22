// Flujo completo de la Edge Function `placement`, con la base y la IA inyectadas para que
// Vitest lo pruebe sin gastar. index.ts solo conecta las dependencias reales.
// Orden pensado para el costo: validar → ¿ya evaluado? → reservar en el límite → IA → registrar → guardar.
import { callAi, MODEL } from "./aiCall.ts";
import type { AiMessage, MessageParams } from "./aiCall.ts";
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

// placement/index.ts las sigue tomando de aquí
export { MODEL };
export type { AiMessage, MessageParams };

export const FALLBACK_RESUMEN =
  "Empiezas desde el principio, con saludos y frases básicas. En tu revisión mensual podrás subir de línea.";

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
  const result = await callAi(deps, params, parsePlacementOutput);
  if (!result.ok && result.error === "presupuesto") {
    // Si no se gastó nada, la reserva se libera: reintentar mañana no debe toparse con el límite
    if (result.spent) await deps.finishCall(reservation, result.usage);
    else await deps.releaseCall(reservation);
    return fail("presupuesto");
  }
  await deps.finishCall(reservation, result.usage);
  if (!result.ok) return fail("ia");
  const output = result.output;

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
