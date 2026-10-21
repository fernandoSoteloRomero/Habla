// Límites diarios por persona, para que nadie se coma el presupuesto del grupo.
// Se cuentan las llamadas en usage_log de las últimas 24 horas.

export const PLACEMENT_DAILY_MAX = 5;

export function isOverDailyLimit(callsLast24h: number, max: number): boolean {
  return callsLast24h >= max;
}
