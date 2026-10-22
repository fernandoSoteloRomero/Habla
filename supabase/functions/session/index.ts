// Edge Function `session`: la sesión diaria con IA (spec 5.3 y 7.1), con las acciones
// start (preparar), turn (conversar) y close (resumen).
// Todo el flujo vive en ../_shared/sessionHandler.ts (probado con Vitest); aquí solo se
// conectan la base (llave de admin, siempre filtrando por la persona) y la API de Anthropic.
import { withSupabase } from "npm:@supabase/server@1";
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { MODEL } from "../_shared/aiCall.ts";
import type { AiMessage } from "../_shared/aiCall.ts";
import { costUsd } from "../_shared/pricing.ts";
import { handleSession } from "../_shared/sessionHandler.ts";
import type { SessionDeps, SessionRow } from "../_shared/sessionHandler.ts";

// Sin reintentos del SDK: los hace aiCall (cuenta cada intento y no reintenta el presupuesto
// agotado). 25 s por intento para quedar dentro del límite de 150 s de la función.
const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  maxRetries: 0,
  timeout: 25_000,
});

const COLUMNS =
  "id, kind, unit_id, date, content, transcript, turns, summary, status, minutes, created_at";

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
    const deps: SessionDeps = {
      async getProfile() {
        const { data, error } = await admin
          .from("profiles")
          .select("level, motive, current_unit_id, ayuda")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      async saveAyuda(ayuda) {
        const { error } = await admin
          .from("profiles")
          .update({ ayuda })
          .eq("user_id", userId);
        if (error) throw error;
      },
      async findSessionByDate(date) {
        const { data, error } = await admin
          .from("sessions")
          .select(COLUMNS)
          .eq("user_id", userId)
          .eq("date", date)
          .eq("kind", "diaria")
          .maybeSingle();
        if (error) throw error;
        return data as SessionRow | null;
      },
      async countPracticeSessions(date) {
        const { count, error } = await admin
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("date", date)
          .eq("kind", "practica");
        if (error) throw error;
        return count ?? 0;
      },
      async getSession(id) {
        const { data, error } = await admin
          .from("sessions")
          .select(COLUMNS)
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        return data as SessionRow | null;
      },
      async insertSession(row) {
        const { data, error } = await admin
          .from("sessions")
          .insert({ user_id: userId, ...row })
          .select(COLUMNS)
          .single();
        // 23505: ya existe la sesión de ese día (otra pestaña ganó); solo pasa con la diaria
        if (error?.code === "23505") return "existe";
        if (error) throw error;
        return data as SessionRow;
      },
      async saveTurns(id, expectedTurns, transcript) {
        const { data, error } = await admin
          .from("sessions")
          .update({
            transcript,
            turns: expectedTurns + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId)
          .eq("turns", expectedTurns)
          .select("id");
        if (error) throw error;
        return (data ?? []).length > 0;
      },
      async closeSession(id, summary, minutes) {
        const { error } = await admin
          .from("sessions")
          .update({
            status: "terminada",
            summary,
            minutes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      },
      async addCorrectionPhrase(unitId, en, es, dueOn) {
        const { error } = await admin.from("phrases").upsert(
          {
            user_id: userId,
            en,
            es,
            source: "correccion",
            unit_id: unitId,
            due_on: dueOn,
          },
          { onConflict: "user_id,en", ignoreDuplicates: true },
        );
        if (error) throw error;
      },
      async reserveCall(fn, max) {
        const { data, error } = await admin.rpc("reserve_ai_call", {
          p_user: userId,
          p_function: fn,
          p_model: MODEL,
          p_max: max,
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
            cache_read_tokens: usage.cache_read_input_tokens,
            cost_usd: costUsd(usage),
          })
          .eq("id", id);
        // La reserva ya cuenta en el límite; si falla esto, solo se pierde el detalle del costo
        if (error) console.error("session: no se registró el costo", error);
      },
      async releaseCall(id) {
        const { error } = await admin.from("usage_log").delete().eq("id", id);
        if (error) console.error("session: no se liberó la reserva", error);
      },
      async createMessage(params) {
        return (await anthropic.messages.create(
          params as never,
        )) as unknown as AiMessage;
      },
      now: () => Date.now(),
    };

    const { status, body: responseBody } = await handleSession(body, deps);
    return Response.json(responseBody, { status });
  }),
};
