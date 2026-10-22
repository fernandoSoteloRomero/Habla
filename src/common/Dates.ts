// Fechas del repaso como texto "AAAA-MM-DD" con la fecha LOCAL del teléfono (nunca UTC):
// una frase que vence "mañana" debe vencer mañana para la persona, no según la hora de Londres.

export function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// La medianoche local de "AAAA-MM-DD" como instante ISO, para comparar con columnas timestamptz
export function localDayStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

// El lunes de la semana de "AAAA-MM-DD" (para "Esta semana practicaste 4 días")
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

// Suma días a una fecha "AAAA-MM-DD". Usa UTC solo para contar días (sin horario de verano).
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}
