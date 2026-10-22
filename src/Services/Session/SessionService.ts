import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  PersonajeTurn,
  SessionClientError,
  SessionSummary,
  SessionView,
  TodayStatus,
  Turn,
} from "@/Services/interfaces/Session/SessionInterface";

// Códigos que puede mandar la Edge Function `session` en { error }
const FUNCTION_CODES: SessionClientError[] = [
  "datos",
  "limite",
  "presupuesto",
  "ia",
  "servidor",
  "conflicto",
  "terminada",
];

// Error con el código que la pantalla convierte en aviso
export class SessionError extends Error {
  code: SessionClientError;
  constructor(code: SessionClientError) {
    super(code);
    this.name = "SessionError";
    this.code = code;
  }
}

async function callSession<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("session", {
    body,
  });
  if (!error) return data as T;

  // La función respondió con un error
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    // 401: la sesión de Google venció (lo responde withSupabase antes de llegar a la función)
    if (response.status === 401) throw new SessionError("sesion");
    let code: SessionClientError = "ia";
    try {
      const json = await response.json();
      if (FUNCTION_CODES.includes(json?.error)) code = json.error;
    } catch {
      // la respuesta no era JSON: se queda como "ia"
    }
    throw new SessionError(code);
  }
  // No llegó a la función
  if (error instanceof FunctionsFetchError || !navigator.onLine) {
    throw new SessionError("sin-conexion");
  }
  throw new SessionError("ia");
}

export default {
  // Prepara la sesión de hoy con la IA; si ya existe, la regresa sin gastar
  async Start(date: string, newEn: string[]): Promise<SessionView> {
    const data = await callSession<{ session: SessionView }>({
      action: "start",
      date,
      newEn,
    });
    return data.session;
  },

  // Un turno de la conversación: el historial lo guarda la función
  Turn(
    sessionId: string,
    text: string,
  ): Promise<{ persona: Turn; personaje: PersonajeTurn }> {
    return callSession({ action: "turn", sessionId, text });
  },

  // Termina la sesión; sin IA disponible, el resumen llega sin "Lo que hiciste bien"
  Close(
    sessionId: string,
  ): Promise<{ summary: SessionSummary; minutes: number }> {
    return callSession({ action: "close", sessionId });
  },

  // El RLS solo deja ver las sesiones propias
  async GetTodayStatus(date: string): Promise<TodayStatus> {
    const { data, error } = await supabase
      .from("sessions")
      .select("status")
      .eq("date", date)
      .maybeSingle();
    if (error) throw error;
    return (data as { status: TodayStatus } | null)?.status ?? "ninguna";
  },

  // Días con la sesión terminada entre dos fechas (para "Esta semana practicaste 4 días")
  async CountPracticeDays(from: string, to: string): Promise<number> {
    const { count, error } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "terminada")
      .gte("date", from)
      .lte("date", to);
    if (error) throw error;
    return count ?? 0;
  },
};
