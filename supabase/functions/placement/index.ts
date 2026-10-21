// Edge Function `placement`: evaluación inicial con IA (spec 5.2 y 7.1).
// Recibe las respuestas, revisa el límite diario, le pide a Claude Haiku 5.5 el nivel y el
// resumen, guarda el resultado con la llave de admin y registra el costo en usage_log.
// La API key solo vive aquí (secreto ANTHROPIC_API_KEY de Supabase).
import { withSupabase } from "npm:@supabase/server@1";
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { classifyAnthropicError } from "../_shared/aiErrors.ts";
import { isOverDailyLimit, PLACEMENT_DAILY_MAX } from "../_shared/limits.ts";
import {
  buildPlacementPrompt,
  clampLevel,
  firstUnitOf,
  highestLevel,
  parsePlacementOutput,
  PLACEMENT_SCHEMA,
  PLACEMENT_SYSTEM,
  validatePlacementRequest,
} from "../_shared/placementLogic.ts";
import type {
  AiErrorCode,
  PlacementResult,
} from "../_shared/placementTypes.ts";
import { costUsd } from "../_shared/pricing.ts";
import type { UsageTokens } from "../_shared/pricing.ts";

const MODEL = "claude-haiku-5-5";
// Hasta 2 reintentos (spec 9) y 30 s por intento: queda dentro del límite de 150 s de la función
const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  maxRetries: 2,
  timeout: 30_000,
});

function fail(status: number, error: AiErrorCode): Response {
  return Response.json({ error }, { status });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const userId = ctx.userClaims?.id;
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const request = validatePlacementRequest(body);
    if (!request || !userId) return fail(400, "datos");

    // Límite diario: llamadas a `placement` de esta persona en las últimas 24 horas
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await ctx.supabaseAdmin
      .from("usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("function", "placement")
      .gte("created_at", since);
    if (countError) return fail(502, "ia");
    if (isOverDailyLimit(count ?? 0, PLACEMENT_DAILY_MAX)) {
      return fail(429, "limite");
    }

    // Cada intento queda registrado (aunque falle) para que cuente en el límite y en el gasto
    const logUsage = (usage: UsageTokens | null) =>
      ctx.supabaseAdmin.from("usage_log").insert({
        user_id: userId,
        function: "placement",
        model: MODEL,
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        cache_read_tokens: usage?.cache_read_input_tokens ?? 0,
        cost_usd: usage ? costUsd(usage) : 0,
      });

    // Si la respuesta no cumple el esquema se repite una vez (spec 9); si vuelve a fallar, es "ia"
    let output: ReturnType<typeof parsePlacementOutput> = null;
    for (let attempt = 0; attempt < 2 && !output; attempt++) {
      let message: Anthropic.Message;
      try {
        message = await anthropic.messages.create({
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
        });
      } catch (error) {
        console.error("placement: error de la API", error);
        await logUsage(null);
        const code = classifyAnthropicError(
          error as { status?: number; message?: string; error?: unknown },
        );
        return fail(code === "presupuesto" ? 402 : 502, code);
      }
      await logUsage(message.usage);
      const text = message.content.find((b) => b.type === "text");
      output =
        message.stop_reason === "end_turn" && text?.type === "text"
          ? parsePlacementOutput(text.text)
          : null;
    }
    if (!output) return fail(502, "ia");

    // La IA no puede subir a alguien más allá del nivel al que llegó la evaluación
    const level = clampLevel(output.level, highestLevel(request.answers));
    const unitId = firstUnitOf(level);

    const { error: placementError } = await ctx.supabaseAdmin
      .from("placements")
      .insert({
        user_id: userId,
        kind: "inicial",
        result_level: level,
        details: { answers: request.answers, ai: output },
      });
    const { error: profileError } = await ctx.supabaseAdmin
      .from("profiles")
      .update({
        level,
        current_unit_id: unitId,
        placed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (placementError || profileError) {
      console.error("placement: no se guardó", placementError, profileError);
      return fail(502, "ia");
    }

    const result: PlacementResult = { level, unitId, resumen: output.resumen };
    return Response.json(result);
  }),
};
