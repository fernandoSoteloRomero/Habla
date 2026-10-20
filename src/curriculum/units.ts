// Temario v1: cada meta (unidad) es una estación de su línea (spec 5.1 y 7.2).
// Las frases clave, la situación, el personaje y los criterios de aprobación
// se agregan en las fases 3 y 4.
import type { PictogramName } from "../common/PictogramTypes.ts";
import type { LevelId } from "./levels.ts";

export interface Unit {
  id: string;
  nivel: LevelId;
  orden: number;
  titulo_es: string;
  meta_puedes: string;
  pictograma: PictogramName;
}

// Ordenado por nivel y luego por orden: ese es el camino de cada persona
export const units: Unit[] = [
  // Nivel 0, línea rosa
  {
    id: "l0-saludar",
    nivel: "L0",
    orden: 1,
    titulo_es: "Saludar y despedirte",
    meta_puedes: "Ya puedes saludar y despedirte",
    pictograma: "hand",
  },
  {
    id: "l0-numeros",
    nivel: "L0",
    orden: 2,
    titulo_es: "Números, precios y la hora",
    meta_puedes: "Ya puedes decir números, precios y la hora",
    pictograma: "clock",
  },
  {
    id: "l0-dias",
    nivel: "L0",
    orden: 3,
    titulo_es: "Días, meses y colores",
    meta_puedes: "Ya puedes decir días, meses y colores",
    pictograma: "calendar",
  },
  {
    id: "l0-nombre",
    nivel: "L0",
    orden: 4,
    titulo_es: "Decir y deletrear tu nombre",
    meta_puedes: "Ya puedes decir y deletrear tu nombre",
    pictograma: "chat",
  },

  // A1, línea azul
  {
    id: "a1-quien-eres",
    nivel: "A1",
    orden: 1,
    titulo_es: "Decir quién eres y de dónde",
    meta_puedes: "Ya puedes decir quién eres y de dónde",
    pictograma: "hand",
  },
  {
    id: "a1-familia",
    nivel: "A1",
    orden: 2,
    titulo_es: "Hablar de tu familia",
    meta_puedes: "Ya puedes hablar de tu familia",
    pictograma: "group",
  },
  {
    id: "a1-tienda",
    nivel: "A1",
    orden: 3,
    titulo_es: "Comprar en una tienda",
    meta_puedes: "Ya puedes comprar en una tienda",
    pictograma: "wallet",
  },
  {
    id: "a1-rutina",
    nivel: "A1",
    orden: 4,
    titulo_es: "Tu rutina diaria",
    meta_puedes: "Ya puedes contar tu rutina diaria",
    pictograma: "clock",
  },
  {
    id: "a1-cafeteria",
    nivel: "A1",
    orden: 5,
    titulo_es: "Pedir algo en una cafetería",
    meta_puedes: "Ya puedes pedir algo en una cafetería",
    pictograma: "food",
  },

  // A2, línea verde
  {
    id: "a2-junta",
    nivel: "A2",
    orden: 1,
    titulo_es: "Presentarte en una junta",
    meta_puedes: "Ya puedes presentarte en una junta",
    pictograma: "hand",
  },
  {
    id: "a2-trabajo",
    nivel: "A2",
    orden: 2,
    titulo_es: "Hablar de tu trabajo",
    meta_puedes: "Ya puedes hablar de tu trabajo",
    pictograma: "work",
  },
  {
    id: "a2-restaurante",
    nivel: "A2",
    orden: 3,
    titulo_es: "Pedir comida en un restaurante",
    meta_puedes: "Ya puedes pedir comida en un restaurante",
    pictograma: "food",
  },
  {
    id: "a2-direcciones",
    nivel: "A2",
    orden: 4,
    titulo_es: "Pedir direcciones",
    meta_puedes: "Ya puedes pedir direcciones",
    pictograma: "sign",
  },
  {
    id: "a2-hotel",
    nivel: "A2",
    orden: 5,
    titulo_es: "Reservar un hotel",
    meta_puedes: "Ya puedes reservar un hotel",
    pictograma: "bed",
  },
  {
    id: "a2-aeropuerto",
    nivel: "A2",
    orden: 6,
    titulo_es: "En el aeropuerto",
    meta_puedes: "Ya puedes moverte en el aeropuerto",
    pictograma: "plane",
  },
  {
    id: "a2-llamada",
    nivel: "A2",
    orden: 7,
    titulo_es: "Una llamada corta",
    meta_puedes: "Ya puedes hacer una llamada corta",
    pictograma: "phone",
  },
  {
    id: "a2-fin-de-semana",
    nivel: "A2",
    orden: 8,
    titulo_es: "Contar qué hiciste el fin de semana",
    meta_puedes: "Ya puedes contar qué hiciste el fin de semana",
    pictograma: "calendar",
  },

  // B1, línea naranja
  {
    id: "b1-opinion",
    nivel: "B1",
    orden: 1,
    titulo_es: "Dar tu opinión en una junta",
    meta_puedes: "Ya puedes dar tu opinión en una junta",
    pictograma: "work",
  },
  {
    id: "b1-queja",
    nivel: "B1",
    orden: 2,
    titulo_es: "Resolver un problema (una queja)",
    meta_puedes: "Ya puedes resolver un problema o hacer una queja",
    pictograma: "chat",
  },
  {
    id: "b1-proceso",
    nivel: "B1",
    orden: 3,
    titulo_es: "Explicar un proceso de tu trabajo",
    meta_puedes: "Ya puedes explicar un proceso de tu trabajo",
    pictograma: "work",
  },
  {
    id: "b1-llamadas",
    nivel: "B1",
    orden: 4,
    titulo_es: "Llamadas de trabajo",
    meta_puedes: "Ya puedes atender llamadas de trabajo",
    pictograma: "phone",
  },
  {
    id: "b1-experiencia",
    nivel: "B1",
    orden: 5,
    titulo_es: "Contar una experiencia",
    meta_puedes: "Ya puedes contar una experiencia",
    pictograma: "chat",
  },
  {
    id: "b1-viaje",
    nivel: "B1",
    orden: 6,
    titulo_es: "Planear un viaje",
    meta_puedes: "Ya puedes planear un viaje",
    pictograma: "plane",
  },
];

// Si el id no existe (por ejemplo, una meta que se renombró), se regresa la primera
export function getUnit(id: string): Unit {
  return units.find((u) => u.id === id) ?? units[0];
}
