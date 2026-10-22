// Límites diarios por persona, para que nadie se coma el presupuesto del grupo.
// Se cuentan las llamadas en usage_log de las últimas 24 horas.

export const PLACEMENT_DAILY_MAX = 5;

// Sesión diaria (spec 10: 40 turnos al día). Preparar y cerrar permiten 6: la sesión del día,
// unas conversaciones extra ("Seguir practicando") y algún reintento por falla de la IA.
// Los 40 turnos son el tope real del gasto.
export const SESSION_START_DAILY_MAX = 6;
export const CONVERSATION_TURN_DAILY_MAX = 40;
export const SESSION_CLOSE_DAILY_MAX = 6;

// Por conversación: en el turno 10 el personaje se despide
export const MAX_USER_TURNS = 10;
// Por sesión: las correcciones que entran al repaso
export const MAX_SAVED_CORRECTIONS = 3;

export function isOverDailyLimit(callsLast24h: number, max: number): boolean {
  return callsLast24h >= max;
}
