// La sesión usa los mismos tipos que la Edge Function `session` (supabase/functions/_shared)
import type { Ayuda } from "@shared/ayuda";
import type { SessionErrorCode, SessionSummary } from "@shared/sessionTypes";

export type {
  Correction,
  LessonExtra,
  PersonajeTurn,
  SessionContent,
  SessionKind,
  SessionStatus,
  SessionSummary,
  SessionView,
  Sugerencia,
  Turn,
} from "@shared/sessionTypes";
export type { Ayuda };

// Errores que ve la pantalla: los de la función, "sin-conexion" (no llegó a la función)
// y "sesion" (la sesión de Google venció: 401)
export type SessionClientError = SessionErrorCode | "sin-conexion" | "sesion";

// Estado de la sesión de hoy para Hoy: "ninguna" si todavía no se empieza
export type TodayStatus = "ninguna" | "en_curso" | "terminada";

// Al cerrar: el resumen, la ayuda de la próxima conversación y qué le conviene practicar ahora
export interface CloseResult {
  summary: SessionSummary;
  minutes: number;
  ayuda: Ayuda;
  siguiente: "conversar" | "ejercicios";
}
