// Fechas del repaso como texto "AAAA-MM-DD" con la fecha LOCAL del teléfono (nunca UTC):
// una frase que vence "mañana" debe vencer mañana para la persona, no según la hora de Londres.

export function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Suma días a una fecha "AAAA-MM-DD". Usa UTC solo para contar días (sin horario de verano).
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}
