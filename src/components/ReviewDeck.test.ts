import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rate } from "@/common/SpacedRepetition";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import ReviewDeck from "./ReviewDeck.vue";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: { SaveReview: vi.fn() },
}));

enableAutoUnmount(afterEach);

const today = "2026-10-22";
const phrase = (id: number, en: string, es: string): Phrase => ({
  id,
  en,
  es,
  unit_id: "a2-restaurante",
  due_on: today,
  interval_days: 1,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  reviewed_on: null,
});
const phrases = [
  phrase(1, "Can I see the menu, please?", "¿Puedo ver el menú, por favor?"),
  phrase(2, "What do you recommend?", "¿Qué me recomienda?"),
];
const speak = vi.fn();

function setup(): VueWrapper {
  vi.mocked(useSpeechOutput).mockReturnValue({ supported: true, speak });
  return mount(ReviewDeck, { props: { phrases, today } });
}
const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

describe("ReviewDeck", () => {
  beforeEach(() => vi.resetAllMocks());

  it("primero el inglés y el audio; el significado hasta tocar 'Ver significado'", async () => {
    const w = setup();
    expect(w.text()).toContain("Frase 1 de 2");
    expect(w.text()).toContain("¿Recuerdas qué significa?");
    expect(w.text()).toContain("Can I see the menu, please?");
    expect(w.text()).not.toContain("¿Puedo ver el menú, por favor?");
    await button(w, "Escuchar").trigger("click");
    expect(speak).toHaveBeenCalledWith("Can I see the menu, please?", false);
    await button(w, "Más lento").trigger("click");
    expect(speak).toHaveBeenCalledWith("Can I see the menu, please?", true);
    await button(w, "Ver significado").trigger("click");
    expect(w.text()).toContain("¿Puedo ver el menú, por favor?");
    expect(w.text()).toContain("¿Qué tan fácil fue?");
  });
  it("cada botón dice cuándo vuelve la frase", async () => {
    const w = setup();
    await button(w, "Ver significado").trigger("click");
    expect(button(w, "No me acordé").text()).toContain("Vuelve mañana");
    expect(button(w, "Me costó").text()).toContain("En 3 días");
    expect(button(w, "Fácil").text()).toContain("En 7 días");
  });
  it("calificar guarda lo que calcula el algoritmo y pasa a la siguiente", async () => {
    vi.mocked(PhrasesService.SaveReview).mockResolvedValue();
    const w = setup();
    await button(w, "Ver significado").trigger("click");
    await button(w, "Fácil").trigger("click");
    await flushPromises();
    expect(PhrasesService.SaveReview).toHaveBeenCalledWith(
      1,
      rate(phrases[0], "facil", today),
    );
    expect(vi.mocked(PhrasesService.SaveReview).mock.calls[0][1]).toMatchObject(
      {
        interval_days: 7,
        due_on: "2026-10-29",
      },
    );
    expect(w.text()).toContain("Frase 2 de 2");
    expect(w.text()).not.toContain("¿Qué me recomienda?");
  });
  it("al calificar la última avisa cuántas repasó", async () => {
    vi.mocked(PhrasesService.SaveReview).mockResolvedValue();
    const w = setup();
    for (let i = 0; i < 2; i++) {
      await button(w, "Ver significado").trigger("click");
      await button(w, "No me acordé").trigger("click");
      await flushPromises();
    }
    expect(w.emitted("done")).toEqual([[2]]);
  });
  it("si no se guardó, la tarjeta se queda y se puede volver a calificar", async () => {
    vi.mocked(PhrasesService.SaveReview)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce();
    const w = setup();
    await button(w, "Ver significado").trigger("click");
    await button(w, "Me costó").trigger("click");
    await flushPromises();
    expect(w.text()).toContain(
      "No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar.",
    );
    expect(w.text()).toContain("Frase 1 de 2");
    await button(w, "Me costó").trigger("click");
    await flushPromises();
    expect(PhrasesService.SaveReview).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain("Frase 2 de 2");
  });
});
