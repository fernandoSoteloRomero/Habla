import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getUnit } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import { useAuthStore } from "@/stores/auth";
import LessonDeck from "./LessonDeck.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: { AddLessonPhrases: vi.fn() },
}));

enableAutoUnmount(afterEach);

const unit = getUnit("a2-junta");
const phrases = unit.frases_clave.slice(1, 3); // las dos traen nota
const speak = vi.fn();

function setup(): VueWrapper {
  vi.mocked(useSpeechOutput).mockReturnValue({ supported: true, speak });
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "trabajo",
    level: "A2",
    current_unit_id: "a2-junta",
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
  };
  return mount(LessonDeck, {
    props: { unit, phrases, today: "2026-10-22" },
    global: { plugins: [pinia] },
  });
}
const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

describe("LessonDeck", () => {
  beforeEach(() => vi.resetAllMocks());

  it("enseña la frase con su significado, audio y nota", async () => {
    const w = setup();
    expect(w.text()).toContain("Frase nueva 1 de 2");
    expect(w.find("use").attributes("href")).toBe("#i-hand");
    expect(w.text()).toContain(phrases[0].en);
    expect(w.text()).toContain(phrases[0].es);
    expect(w.text()).toContain(phrases[0].nota);
    await button(w, "Escuchar").trigger("click");
    expect(speak).toHaveBeenCalledWith(phrases[0].en, false);
    await button(w, "Más lento").trigger("click");
    expect(speak).toHaveBeenCalledWith(phrases[0].en, true);
  });
  it("'Siguiente frase' avanza y en la última el botón dice 'Terminar'", async () => {
    const w = setup();
    await button(w, "Siguiente frase").trigger("click");
    expect(w.text()).toContain("Frase nueva 2 de 2");
    expect(w.text()).toContain(phrases[1].en);
    expect(w.findAll("button").some((b) => b.text() === "Terminar")).toBe(true);
  });
  it("al terminar guarda las frases para repasar mañana y avisa", async () => {
    vi.mocked(PhrasesService.AddLessonPhrases).mockResolvedValue();
    const w = setup();
    await button(w, "Siguiente frase").trigger("click");
    await button(w, "Terminar").trigger("click");
    await flushPromises();
    expect(PhrasesService.AddLessonPhrases).toHaveBeenCalledWith(
      "u1",
      "a2-junta",
      phrases,
      "2026-10-23",
    );
    expect(w.emitted("done")).toHaveLength(1);
  });
  it("si no se guardaron, avisa y no termina", async () => {
    vi.mocked(PhrasesService.AddLessonPhrases).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const w = setup();
    await button(w, "Siguiente frase").trigger("click");
    await button(w, "Terminar").trigger("click");
    await flushPromises();
    expect(w.text()).toContain(
      "No se guardaron tus frases nuevas. Revisa tu conexión y vuelve a intentar.",
    );
    expect(w.emitted("done")).toBeUndefined();
  });
});
