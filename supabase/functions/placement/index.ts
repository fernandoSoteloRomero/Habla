// Edge Function `placement`: evaluación inicial con IA (spec 5.2 y 7.1).
// Todo el flujo vive en ../_shared/placementHandler.ts (probado con Vitest); aquí solo se
// conectan la base (llave de admin) y la API de Anthropic. La key solo vive aquí (secreto
// ANTHROPIC_API_KEY de Supabase).
import { withSupabase } from "npm:@supabase/server@1";
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { PLACEMENT_DAILY_MAX } from "../_shared/limits.ts";
import { handlePlacement, MODEL } from "../_shared/placementHandler.ts";
import type { AiMessage, PlacementDeps } from "../_shared/placementHandler.ts";
import { costUsd } from "../_shared/pricing.ts";

// Sin reintentos del SDK: los hace placementHandler (cuenta cada intento y no reintenta el
// presupuesto agotado). 25 s por intento para quedar dentro del límite de 150 s.
const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  maxRetries: 0,
  timeout: 25_000,
});

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: "datos" }, { status: 400 });

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const admin = ctx.supabaseAdmin;
    const deps: PlacementDeps = {
      async isPlaced() {
        const { data, error } = await admin
          .from("profiles")
          .select("placed_at")
          .eq("user_id", userId)
          .single();
        if (error) throw error;
        return !!data?.placed_at;
      },
      async reserveCall() {
        const { data, error } = await admin.rpc("reserve_ai_call", {
          p_user: userId,
          p_function: "placement",
          p_model: MODEL,
          p_max: PLACEMENT_DAILY_MAX,
        });
        if (error) throw error;
        return (data as number | null) ?? null;
      },
      async finishCall(id, usage) {
        const { error } = await admin
          .from("usage_log")
          .update({
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cache_read_tokens: usage.cache_read_input_tokens ?? 0,
            cost_usd: costUsd(usage),
          })
          .eq("id", id);
        // La reserva ya cuenta en el límite; si falla esto, solo se pierde el detalle del costo
        if (error) console.error("placement: no se registró el costo", error);
      },
      async releaseCall(id) {
        const { error } = await admin.from("usage_log").delete().eq("id", id);
        if (error) console.error("placement: no se liberó la reserva", error);
      },
      async createMessage(params) {
        return (await anthropic.messages.create(params)) as unknown as AiMessage;
      },
      async savePlacement(level, unitId, details) {
        const { data, error } = await admin.rpc("save_placement", {
          p_user: userId,
          p_level: level,
          p_unit: unitId,
          p_details: details,
        });
        if (error) throw error;
        return data === true ? "ok" : "ya-evaluado";
      },
      now: () => Date.now(),
    };

    const { status, body: responseBody } = await handlePlacement(body, deps);
    return Response.json(responseBody, { status });
  }),
};
