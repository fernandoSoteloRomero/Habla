import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExerciseDeck from "@/components/ExerciseDeck.vue";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import router from "@/router";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import { useAuthStore } from "@/stores/auth";
import EjerciciosPage from "./EjerciciosPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: { GetRecent: vi.fn() },
}));

enableAutoUnmount(afterEach);

const phrase = (i: number): Phrase => ({
  id: i,
  en: `Phrase number ${i} here.`,
  es: `Frase ${i}.`,
  unit_id: "a2-junta",
  due_on: "2026-10-23",
  interval_days: 1,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  reviewed_on: null,
});

async function setup(count: number): Promise<VueWrapper> {
  vi.mocked(useSpeechOutput).mockReturnValue({
    supported: true,
    speak: vi.fn(),
  });
  vi.mocked(PhrasesService.GetRecent).mockResolvedValue(
    Array.from({ length: count }, (_, i) => phrase(i + 1)),
  );
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "viajes",
    level: "A1",
    current_unit_id: "a2-junta",
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
  };
  await router.push({ path: "/repaso/ejercicios", force: true });
  const w = mount(EjerciciosPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}

describe("EjerciciosPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("arma hasta 8 ejercicios con las frases recientes del repaso", async () => {
    const w = await setup(12);
    expect(PhrasesService.GetRecent).toHaveBeenCalledWith(20);
    expect(w.text()).toContain("Ejercicio 1 de 8");
  });
  it("al terminar dice cuántas salieron a la primera y deja practicar otra vez", async () => {
    const w = await setup(5);
    w.findComponent(ExerciseDeck).vm.$emit("done", { firstTry: 4, total: 5 });
    await flushPromises();
    expect(w.text()).toContain("Listo, acertaste 4 de 5 a la primera");
    await w
      .findAll("button")
      .find((b) => b.text() === "Practicar otra vez")
      ?.trigger("click");
    await flushPromises();
    expect(PhrasesService.GetRecent).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain("Ejercicio 1 de 5");
  });
  it("sin frases en el repaso lo dice", async () => {
    const w = await setup(0);
    expect(w.text()).toContain("Todavía no tienes frases para practicar");
  });
  it("si no se pudo cargar, avisa y deja reintentar", async () => {
    vi.mocked(useSpeechOutput).mockReturnValue({
      supported: true,
      speak: vi.fn(),
    });
    vi.mocked(PhrasesService.GetRecent).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const pinia = createPinia();
    setActivePinia(pinia);
    const w = mount(EjerciciosPage, { global: { plugins: [pinia, router] } });
    await flushPromises();
    expect(w.text()).toContain("Sin conexión a internet");
  });
});
