import { describe, expect, it } from "vitest";
import {
  intervalLabel,
  MAX_REVIEWS_PER_DAY,
  newPhraseState,
  nextIntervals,
  rate,
} from "./SpacedRepetition";

const today = "2026-10-22";
const fresh = { interval_days: 1, ease: 2.5, reps: 0, lapses: 0 };

describe("repetición espaciada (spec 5.4)", () => {
  it("una frase nueva vuelve mañana con intervalo 1 y facilidad 2.5", () => {
    expect(newPhraseState(today)).toEqual({
      interval_days: 1,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      due_on: "2026-10-23",
    });
  });
  it("'No me acordé' vuelve mañana, cuenta como fallo y baja la facilidad", () => {
    expect(
      rate(
        { interval_days: 10, ease: 2.5, reps: 4, lapses: 0 },
        "no-me-acorde",
        today,
      ),
    ).toEqual({
      interval_days: 1,
      ease: 2.3,
      reps: 5,
      lapses: 1,
      due_on: "2026-10-23",
      reviewed_on: today,
    });
  });
  it("'Me costó' multiplica por 1.2 con mínimo de 3 días y baja un poco la facilidad", () => {
    const first = rate(fresh, "me-costo", today);
    expect(first.interval_days).toBe(3);
    expect(first.ease).toBe(2.35);
    expect(first.due_on).toBe("2026-10-25");
    expect(
      rate({ ...fresh, interval_days: 10 }, "me-costo", today).interval_days,
    ).toBe(12);
  });
  it("'Fácil' multiplica por la facilidad con mínimo de 7 días y no la cambia", () => {
    const first = rate(fresh, "facil", today);
    expect(first.interval_days).toBe(7);
    expect(first.ease).toBe(2.5);
    expect(first.due_on).toBe("2026-10-29");
    expect(
      rate({ ...fresh, interval_days: 10 }, "facil", today).interval_days,
    ).toBe(25);
  });
  it("la facilidad nunca baja de 1.3", () => {
    let state = { ...fresh };
    for (let i = 0; i < 10; i++) state = rate(state, "no-me-acorde", today);
    expect(state.ease).toBe(1.3);
    expect(rate(state, "me-costo", today).ease).toBe(1.3);
  });
  it("cada calificación suma un repaso y marca la fecha", () => {
    const r = rate(fresh, "facil", today);
    expect(r.reps).toBe(1);
    expect(r.reviewed_on).toBe(today);
    expect(r.lapses).toBe(0);
  });
  it("muestra cuándo vuelve con cada botón", () => {
    expect(nextIntervals(fresh)).toEqual({
      "no-me-acorde": 1,
      "me-costo": 3,
      facil: 7,
    });
    expect(intervalLabel(1)).toBe("Vuelve mañana");
    expect(intervalLabel(3)).toBe("En 3 días");
  });
  it("el máximo es 15 repasos al día", () => {
    expect(MAX_REVIEWS_PER_DAY).toBe(15);
  });
});
