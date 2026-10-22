import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Exercise } from "@/common/Exercises";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import ExerciseDeck from "./ExerciseDeck.vue";

vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));

enableAutoUnmount(afterEach);

const speak = vi.fn();
const source = {
  en: "I'd like the chicken, please.",
  es: "Quisiera el pollo, por favor.",
  hueco: "I'd like",
  trampas: ["I want", "I like"],
  por_que: "“I'd like” es la forma amable de pedir.",
};
const completar: Exercise = {
  kind: "completar",
  source,
  prompt: "___ the chicken, please.",
  options: ["I want", "I'd like", "I like"],
  answer: "I'd like",
};
const ordenar: Exercise = {
  kind: "ordenar",
  source: { en: "A table for two.", es: "Una mesa para dos." },
  prompt: "Una mesa para dos.",
  options: ["two.", "A", "for", "table"],
  answer: "A table for two.",
};
const escribir: Exercise = {
  kind: "escribir",
  source: { en: "Where is the bathroom?", es: "¿Dónde está el baño?" },
  prompt: "¿Dónde está el baño?",
  options: [],
  answer: "Where is the bathroom?",
};
const escuchar: Exercise = {
  kind: "escuchar",
  source: { en: "Is breakfast included?", es: "¿Incluye el desayuno?" },
  prompt: "",
  options: ["Where is the bathroom?", "Is breakfast included?", "Hello."],
  answer: "Is breakfast included?",
};

function setup(exercises: Exercise[]): VueWrapper {
  vi.mocked(useSpeechOutput).mockReturnValue({ supported: true, speak });
  return mount(ExerciseDeck, { props: { exercises } });
}
const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text() === text);
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

describe("ExerciseDeck", () => {
  beforeEach(() => vi.resetAllMocks());

  it("completar: se marca una opción, se revisa y explica por qué", async () => {
    const w = setup([completar]);
    expect(w.text()).toContain("Ejercicio 1 de 1");
    expect(w.text()).toContain("Completa la frase");
    expect(w.text()).toContain("___ the chicken, please.");
    expect(button(w, "Revisar").attributes()).toHaveProperty("disabled");
    await button(w, "I'd like").trigger("click");
    // Marcar no brinca solo: hay que tocar Revisar
    expect(w.text()).not.toContain("Correcto.");
    await button(w, "Revisar").trigger("click");
    expect(w.text()).toContain("Correcto.");
    expect(w.text()).toContain("“I'd like” es la forma amable de pedir.");
    await button(w, "Terminar").trigger("click");
    expect(w.emitted("done")).toEqual([[{ firstTry: 1, total: 1 }]]);
  });
  it("si falla dice cuál era y se la vuelve a preguntar al final", async () => {
    const w = setup([completar, escribir]);
    await button(w, "I want").trigger("click");
    await button(w, "Revisar").trigger("click");
    expect(w.text()).toContain("Era: “I'd like the chicken, please.”");
    expect(w.text()).toContain("La vas a ver otra vez al final.");
    await button(w, "Siguiente").trigger("click");
    expect(w.text()).toContain("Ejercicio 2 de 3");

    // Escribir acepta otra puntuación
    expect(w.text()).toContain("Escríbela en inglés");
    await w.get("textarea").setValue("where is the bathroom");
    await button(w, "Revisar").trigger("click");
    expect(w.text()).toContain("Correcto.");
    await button(w, "Siguiente").trigger("click");

    // Regresa la que falló
    expect(w.text()).toContain("Ejercicio 3 de 3");
    expect(w.text()).toContain("Otra vez");
    await button(w, "I'd like").trigger("click");
    await button(w, "Revisar").trigger("click");
    await button(w, "Terminar").trigger("click");
    expect(w.emitted("done")).toEqual([[{ firstTry: 1, total: 2 }]]);
  });
  it("ordenar: se arma la frase tocando las palabras y se pueden quitar", async () => {
    const w = setup([ordenar]);
    expect(w.text()).toContain("Ordena las palabras");
    expect(w.text()).toContain("Una mesa para dos.");
    for (const word of ["A", "for"]) await button(w, word).trigger("click");
    // Quitar "for" (ya colocada) la regresa a las opciones
    await w
      .get('[data-testid="colocadas"]')
      .findAll("button")[1]
      .trigger("click");
    for (const word of ["table", "for", "two."]) {
      await button(w, word).trigger("click");
    }
    await button(w, "Revisar").trigger("click");
    expect(w.text()).toContain("Correcto.");
  });
  it("escuchar: se oye la frase y se elige cuál fue", async () => {
    const w = setup([escuchar]);
    expect(w.text()).toContain("¿Qué frase escuchaste?");
    await button(w, "Escuchar").trigger("click");
    expect(speak).toHaveBeenCalledWith("Is breakfast included?", false);
    await button(w, "Más lento").trigger("click");
    expect(speak).toHaveBeenCalledWith("Is breakfast included?", true);
    await button(w, "Is breakfast included?").trigger("click");
    await button(w, "Revisar").trigger("click");
    expect(w.text()).toContain("Correcto.");
  });
  it("después de 3 intentos ya no la repite", async () => {
    const w = setup([completar]);
    for (let i = 0; i < 3; i++) {
      await button(w, "I want").trigger("click");
      await button(w, "Revisar").trigger("click");
      await button(w, i < 2 ? "Siguiente" : "Terminar").trigger("click");
    }
    expect(w.emitted("done")).toEqual([[{ firstTry: 0, total: 1 }]]);
  });
});
