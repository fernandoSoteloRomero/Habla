import { addDays } from "./Dates";

// Repaso con repetición espaciada (spec 5.4). Cada frase guarda su próxima fecha,
// su intervalo y su facilidad; la persona califica qué tan fácil fue.
//   No me acordé → vuelve mañana (1 día), cuenta como fallo, facilidad −0.2
//   Me costó     → intervalo × 1.2, mínimo 3 días, facilidad −0.15
//   Fácil        → intervalo × facilidad, mínimo 7 días, facilidad igual
// La facilidad nunca baja de 1.3.

export type Rating = "no-me-acorde" | "me-costo" | "facil";

export interface SrsState {
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface SrsUpdate extends SrsState {
  due_on: string;
  reviewed_on: string;
}

export const MAX_REVIEWS_PER_DAY = 15;
const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;

// Dos decimales, como la columna numeric(4,2) de la base
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function newPhraseState(today: string): SrsState & { due_on: string } {
  return {
    interval_days: 1,
    ease: INITIAL_EASE,
    reps: 0,
    lapses: 0,
    due_on: addDays(today, 1),
  };
}

export function nextIntervals(state: SrsState): Record<Rating, number> {
  return {
    "no-me-acorde": 1,
    "me-costo": Math.max(3, Math.round(state.interval_days * 1.2)),
    facil: Math.max(7, Math.round(state.interval_days * state.ease)),
  };
}

export function rate(
  state: SrsState,
  rating: Rating,
  today: string,
): SrsUpdate {
  const interval = nextIntervals(state)[rating];
  let ease = state.ease;
  if (rating === "no-me-acorde") ease = Math.max(MIN_EASE, round2(ease - 0.2));
  if (rating === "me-costo") ease = Math.max(MIN_EASE, round2(ease - 0.15));
  return {
    interval_days: interval,
    ease,
    reps: state.reps + 1,
    lapses: rating === "no-me-acorde" ? state.lapses + 1 : state.lapses,
    due_on: addDays(today, interval),
    reviewed_on: today,
  };
}

// Texto chico de cada botón: "Vuelve mañana", "En 3 días"
export function intervalLabel(days: number): string {
  return days === 1 ? "Vuelve mañana" : `En ${days} días`;
}
