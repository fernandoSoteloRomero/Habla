// Texto del aviso de presupuesto: "Se terminó el presupuesto de IA de octubre. Vuelve el 1 de noviembre."
// El tope de la consola de Anthropic es por mes de calendario.
export function budgetMonthText(now: Date): { mes: string; siguiente: string } {
  const month = (date: Date): string =>
    new Intl.DateTimeFormat("es-MX", { month: "long" }).format(date);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { mes: month(now), siguiente: `1 de ${month(next)}` };
}
