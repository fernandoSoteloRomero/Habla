import { describe, expect, it } from "vitest";
import type { Exercise, ExerciseSource } from "./Exercises";
import { buildExercises, checkAnswer } from "./Exercises";

const withGap = (en: string, es: string, hueco: string): ExerciseSource => ({
  en,
  es,
  hueco,
  trampas: [`${hueco}x`, `${hueco}y`],
  por_que: "Porque sí.",
});

const PHRASES: ExerciseSource[] = [
  withGap(
    "I'd like the chicken, please.",
    "Quisiera el pollo, por favor.",
    "I'd like",
  ),
  withGap(
    "Can I see the menu, please?",
    "¿Puedo ver el menú, por favor?",
    "see the menu",
  ),
  withGap(
    "A table for two, please.",
    "Una mesa para dos, por favor.",
    "for two",
  ),
  withGap("Could we have the check?", "¿Nos trae la cuenta?", "the check"),
];
const POOL: ExerciseSource[] = [
  ...PHRASES,
  { en: "Is breakfast included?", es: "¿Incluye el desayuno?" },
  { en: "Where is the bathroom?", es: "¿Dónde está el baño?" },
];
// Siempre el mismo orden "al azar", para que las pruebas no cambien
const fixed = (): number => 0.3;

function build(
  phrases: ExerciseSource[],
  level: "L0" | "A1" | "A2" | "B1" = "A2",
  canSpeak = true,
): Exercise[] {
  return buildExercises({
    phrases,
    pool: POOL,
    level,
    canSpeak,
    random: fixed,
  });
}

describe("ejercicios", () => {
  it("en A2 alterna completar, ordenar, escribir y elegir el significado", () => {
    expect(build(PHRASES).map((e) => e.kind)).toEqual([
      "completar",
      "ordenar",
      "escribir",
      "significado",
    ]);
  });
  it("en A1 no hay 'escribir' y empieza por el significado", () => {
    const kinds = build(PHRASES, "A1").map((e) => e.kind);
    expect(kinds).toEqual(["significado", "completar", "ordenar", "escuchar"]);
  });
  it("completar esconde el hueco y da la respuesta con sus 2 trampas", () => {
    const [first] = build(PHRASES);
    expect(first.prompt).toBe("___ the chicken, please.");
    expect(first.answer).toBe("I'd like");
    expect([...first.options].sort()).toEqual(
      ["I'd like", "I'd likex", "I'd likey"].sort(),
    );
  });
  it("sin hueco de la IA, la frase usa el siguiente tipo", () => {
    const [first] = build([
      {
        en: "I'd like the chicken, please.",
        es: "Quisiera el pollo, por favor.",
      },
    ]);
    expect(first.kind).toBe("ordenar");
  });
  it("ordenar baraja las palabras sin dejarlas en su orden", () => {
    const [, second] = build(PHRASES);
    const words = "Can I see the menu, please?".split(" ");
    expect([...second.options].sort()).toEqual([...words].sort());
    expect(second.options).not.toEqual(words);
    expect(second.answer).toBe("Can I see the menu, please?");
  });
  it("una frase de 2 palabras no se ordena", () => {
    const exercises = buildExercises({
      phrases: [{ en: "Thank you.", es: "Gracias." }],
      pool: POOL,
      level: "A1",
      canSpeak: true,
      random: fixed,
    });
    expect(exercises[0].kind).not.toBe("ordenar");
  });
  it("el significado da 3 opciones en español, sin repetir la buena", () => {
    const exercise = build(PHRASES, "A1")[0];
    expect(exercise.prompt).toBe("I'd like the chicken, please.");
    expect(exercise.answer).toBe("Quisiera el pollo, por favor.");
    expect(exercise.options).toHaveLength(3);
    expect(new Set(exercise.options).size).toBe(3);
    expect(exercise.options).toContain("Quisiera el pollo, por favor.");
  });
  it("si el navegador no puede leer en voz alta, no hay 'escuchar'", () => {
    const kinds = build(PHRASES, "A1", false).map((e) => e.kind);
    expect(kinds).not.toContain("escuchar");
  });
  it("revisa las respuestas: escribir acepta contracciones y puntuación distinta", () => {
    const [completar, ordenar, escribir] = build(PHRASES);
    expect(checkAnswer(completar, "I'd like")).toBe(true);
    expect(checkAnswer(completar, "I'd likex")).toBe(false);
    expect(checkAnswer(ordenar, "Can I see the menu, please?")).toBe(true);
    expect(checkAnswer(ordenar, "I can see the menu, please?")).toBe(false);
    expect(checkAnswer(escribir, "a table for two please")).toBe(true);
    expect(checkAnswer(escribir, "a table")).toBe(false);
  });
});
