import { describe, expect, it } from "vitest";
import { getGreeting, practiceDaysText } from "./Greeting";

const at = (h: number): Date => new Date(2026, 9, 19, h, 30);

describe("getGreeting", () => {
  it("usa la hora y solo el primer nombre", () => {
    expect(getGreeting(at(9), "Fernando Sotelo")).toBe(
      "Buenos días, Fernando.",
    );
    expect(getGreeting(at(15), "Fernando Sotelo")).toBe(
      "Buenas tardes, Fernando.",
    );
    expect(getGreeting(at(21), "Fernando Sotelo")).toBe(
      "Buenas noches, Fernando.",
    );
    expect(getGreeting(at(3), "Ana")).toBe("Buenas noches, Ana.");
  });
  it("pone mayúscula aunque Google guarde el nombre en minúsculas", () => {
    expect(getGreeting(at(9), "fernando Sotelo romero")).toBe(
      "Buenos días, Fernando.",
    );
  });
  it("sin nombre solo saluda", () => {
    expect(getGreeting(at(15), "")).toBe("Buenas tardes.");
  });
});

describe("practiceDaysText", () => {
  it("cuenta los días de práctica de la semana, sin castigar si es 0", () => {
    expect(practiceDaysText(0)).toBe("");
    expect(practiceDaysText(1)).toBe("Esta semana practicaste 1 día.");
    expect(practiceDaysText(4)).toBe("Esta semana practicaste 4 días.");
  });
});
