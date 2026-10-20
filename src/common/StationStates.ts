import { getUnit, units } from "@/curriculum/units";

// lograda = antes de la estación actual, aqui = la actual, proxima = después
export type StationState = "lograda" | "aqui" | "proxima";

// Compara la posición de las dos metas en el camino completo (Nivel 0 → B1)
export function getStationState(
  unitId: string,
  currentUnitId: string,
): StationState {
  const position = units.indexOf(getUnit(unitId));
  const current = units.indexOf(getUnit(currentUnitId));
  if (position < current) return "lograda";
  if (position === current) return "aqui";
  return "proxima";
}
