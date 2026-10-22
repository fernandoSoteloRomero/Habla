// Niveles de la ruta fija: cada nivel es una línea de color (spec 5.1).
// Ojo: los archivos del temario importan entre sí con ruta relativa y ".ts", sin "@/",
// porque la Edge Function `session` los importa desde Deno.

export type LevelId = "L0" | "A1" | "A2" | "B1";

export interface Level {
  id: LevelId;
  nombre: string;
  linea: string;
  color: "l0" | "l1" | "l2" | "l3";
  resumen: string;
}

export const levels: Level[] = [
  {
    id: "L0",
    nombre: "Nivel 0",
    linea: "Rosa",
    color: "l0",
    resumen: "Saludar, números y colores",
  },
  {
    id: "A1",
    nombre: "A1",
    linea: "Azul",
    color: "l1",
    resumen: "Hablar de ti, de tu familia y comprar",
  },
  {
    id: "A2",
    nombre: "A2",
    linea: "Verde",
    color: "l2",
    resumen: "Trabajo, restaurante, viajes y llamadas",
  },
  {
    id: "B1",
    nombre: "B1",
    linea: "Naranja",
    color: "l3",
    resumen: "Llamadas, juntas en inglés, resolver problemas",
  },
];

export function getLevel(id: LevelId): Level {
  return levels.find((l) => l.id === id) ?? levels[0];
}
