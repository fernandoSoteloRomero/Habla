import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getUnit } from "@/curriculum/units";
import router from "@/router";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import { useAuthStore } from "@/stores/auth";
import SesionPage from "./SesionPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: {
    GetReviewQueue: vi.fn(),
    GetLearnedEn: vi.fn(),
    CountLearnedToday: vi.fn(),
    SaveReview: vi.fn(),
    AddLessonPhrases: vi.fn(),
  },
}));

enableAutoUnmount(afterEach);

const unit = getUnit("a2-junta");
const review = (n: number): Phrase[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    en: `Old ${i}`,
    es: `Vieja ${i}`,
    unit_id: "a2-junta",
    due_on: "2026-10-22",
    interval_days: 1,
    ease: 2.5,
    reps: 1,
    lapses: 0,
    reviewed_on: null,
  }));

async function setup(
  toReview: number,
  learnedEn: string[],
  learnedToday = 0,
): Promise<VueWrapper> {
  vi.mocked(useSpeechOutput).mockReturnValue({
    supported: true,
    speak: vi.fn(),
  });
  vi.mocked(PhrasesService.GetReviewQueue).mockResolvedValue({
    phrases: review(toReview),
    reviewedToday: 0,
  });
  vi.mocked(PhrasesService.GetLearnedEn).mockResolvedValue(learnedEn);
  vi.mocked(PhrasesService.CountLearnedToday).mockResolvedValue(learnedToday);
  vi.mocked(PhrasesService.SaveReview).mockResolvedValue();
  vi.mocked(PhrasesService.AddLessonPhrases).mockResolvedValue();
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
  await router.push({ path: "/sesion", force: true });
  const w = mount(SesionPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}
const click = async (w: VueWrapper, text: string): Promise<void> => {
  const found = w.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error(`No hay botón "${text}"`);
  await found.trigger("click");
  await flushPromises();
};
const stage = (w: VueWrapper): string | undefined =>
  w.get("[data-paso]").attributes("data-paso");

describe("SesionPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("repasa, aprende y termina con el resumen", async () => {
    const w = await setup(3, []);
    expect(stage(w)).toBe("repasar");
    expect(w.text()).toContain("Frase 1 de 3");
    for (let i = 0; i < 3; i++) {
      await click(w, "Ver significado");
      await click(w, "Fácil");
    }
    expect(stage(w)).toBe("aprender");
    expect(w.text()).toContain("Frase nueva 1 de 4");
    for (let i = 0; i < 3; i++) await click(w, "Siguiente frase");
    await click(w, "Terminar");
    expect(stage(w)).toBe("resumen");
    expect(w.text()).toContain("Sesión terminada");
    expect(w.text()).toContain("Repasaste 3 frases");
    expect(w.text()).toContain("Aprendiste 4 frases nuevas");
    expect(PhrasesService.AddLessonPhrases).toHaveBeenCalledWith(
      "u1",
      "a2-junta",
      unit.frases_clave.slice(0, 4),
      expect.any(String),
    );
    await click(w, "Terminar");
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("hoy"));
  });
  it("sin frases para repasar empieza en Aprender", async () => {
    const w = await setup(0, []);
    expect(stage(w)).toBe("aprender");
  });
  it("si ya aprendió todo, termina después del repaso", async () => {
    const w = await setup(
      2,
      unit.frases_clave.map((f) => f.en),
    );
    for (let i = 0; i < 2; i++) {
      await click(w, "Ver significado");
      await click(w, "Me costó");
    }
    expect(stage(w)).toBe("resumen");
    expect(w.text()).toContain("Repasaste 2 frases");
    expect(w.text()).not.toContain("Aprendiste");
  });
  it("el máximo de frases nuevas es por día: con 2 aprendidas hoy solo enseña 2", async () => {
    const w = await setup(0, [], 2);
    expect(w.text()).toContain("Frase nueva 1 de 2");
  });
  it("con 4 aprendidas hoy ya no enseña más: solo repasa", async () => {
    const w = await setup(
      1,
      unit.frases_clave.slice(0, 4).map((f) => f.en),
      4,
    );
    await click(w, "Ver significado");
    await click(w, "Fácil");
    expect(stage(w)).toBe("resumen");
    expect(w.text()).not.toContain("Aprendiste");
    expect(PhrasesService.AddLessonPhrases).not.toHaveBeenCalled();
  });
  it("si no se pudo cargar, avisa y deja reintentar", async () => {
    vi.mocked(useSpeechOutput).mockReturnValue({
      supported: true,
      speak: vi.fn(),
    });
    vi.mocked(PhrasesService.GetReviewQueue).mockRejectedValue(
      new TypeError("x"),
    );
    vi.mocked(PhrasesService.GetLearnedEn).mockRejectedValue(
      new TypeError("x"),
    );
    vi.mocked(PhrasesService.CountLearnedToday).mockRejectedValue(
      new TypeError("x"),
    );
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().profile = {
      user_id: "u1",
      name: "Ana",
      motive: "trabajo",
      level: "A2",
      current_unit_id: "a2-junta",
      is_admin: false,
      placed_at: "2026-10-21T15:00:00Z",
    };
    const w = mount(SesionPage, { global: { plugins: [pinia, router] } });
    await flushPromises();
    expect(w.text()).toContain("Sin conexión a internet");
    expect(w.text()).toContain("Reintentar");
  });
});
