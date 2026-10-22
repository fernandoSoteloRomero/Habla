// La sesión usa los mismos tipos que la Edge Function `session` (supabase/functions/_shared)
import type { SessionErrorCode } from "@shared/sessionTypes";

export type {
  Correction,
  LessonExtra,
  PersonajeTurn,
  SessionContent,
  SessionStatus,
  SessionSummary,
  SessionView,
  Turn,
} from "@shared/sessionTypes";

// Errores que ve la pantalla: los de la función, "sin-conexion" (no llegó a la función)
// y "sesion" (la sesión de Google venció: 401)
export type SessionClientError = SessionErrorCode | "sin-conexion" | "sesion";

// Estado de la sesión de hoy para Hoy: "ninguna" si todavía no se empieza
export type TodayStatus = "ninguna" | "en_curso" | "terminada";
