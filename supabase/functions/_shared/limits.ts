// Límites diarios por persona, para que nadie se coma el presupuesto del grupo.
// Se cuentan las llamadas en usage_log de las últimas 24 horas.

export const PLACEMENT_DAILY_MAX = 5;

// Sesión diaria (spec 10: 2 sesiones y 40 turnos al día). Preparar la sesión permite 3 para
// que un reintento por falla de la IA no deje a nadie sin conversación.
export const SESSION_START_DAILY_MAX = 3;
export const CONVERSATION_TURN_DAILY_MAX = 40;
export const SESSION_CLOSE_DAILY_MAX = 3;

// Por conversación: en el turno 10 el personaje se despide
export const MAX_USER_TURNS = 10;
// Por sesión: las correcciones que entran al repaso
export const MAX_SAVED_CORRECTIONS = 3;

export function isOverDailyLimit(callsLast24h: number, max: number): boolean {
  return callsLast24h >= max;
}
