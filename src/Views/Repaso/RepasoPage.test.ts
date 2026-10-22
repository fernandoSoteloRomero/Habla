import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import router from "@/router";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import { useAuthStore } from "@/stores/auth";
import RepasoPage from "./RepasoPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/composables/useSpeechOutput", () => ({ useSpeechOutput: vi.fn() }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: { GetReviewQueue: vi.fn(), GetStats: vi.fn() },
}));

enableAutoUnmount(afterEach);

const phrase = (id: number, en: string, es: string, lapses = 0): Phrase => ({
  id,
  en,
  es,
  unit_id: "a2-junta",
  due_on: "2026-10-22",
  interval_days: 1,
  ease: 2.5,
  reps: 1,
  lapses,
  reviewed_on: null,
});
const speak = vi.fn();

async function setup(
  pending: number,
  reviewedToday: number,
  hardest: Phrase[] = [],
): Promise<VueWrapper> {
  vi.mocked(useSpeechOutput).mockReturnValue({ supported: true, speak });
  vi.mocked(PhrasesService.GetReviewQueue).mockResolvedValue({
    phrases: Array.from({ length: pending }, (_, i) =>
      phrase(i + 1, `P${i}`, `F${i}`),
    ),
    reviewedToday,
  });
  vi.mocked(PhrasesService.GetStats).mockResolvedValue({
    tomorrow: 5,
    week: 23,
    total: 86,
    hardest,
  });
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "viajes",
    level: "A2",
    current_unit_id: "a2-junta",
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
  };
  await router.push({ path: "/repaso", force: true });
  const w = mount(RepasoPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}

describe("RepasoPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("dice cuántas tocan hoy y deja repasar", async () => {
    const w = await setup(8, 2, [
      phrase(9, "Could you repeat that?", "¿Podría repetir eso?", 3),
    ]);
    expect(w.text()).toContain("Hoy toca repasar 8 frases");
    expect(w.text()).toContain("Repasar ahora");
    expect(w.text()).toContain("5");
    expect(w.text()).toContain("mañana");
    expect(w.text()).toContain("23");
    expect(w.text()).toContain("esta semana");
    expect(w.text()).toContain("86");
    expect(w.text()).toContain("en total");
    expect(w.text()).toContain("Las que más te cuestan");
    expect(w.text()).toContain("Could you repeat that?");
    await w
      .get('[aria-label="Escuchar Could you repeat that?"]')
      .trigger("click");
    expect(speak).toHaveBeenCalledWith("Could you repeat that?", false);
  });
  it("deja practicar con ejercicios cuando ya hay frases en el repaso", async () => {
    const w = await setup(0, 3);
    const practice = w
      .findAll("button")
      .find((b) => b.text() === "Practicar con ejercicios");
    expect(practice?.classes()).not.toContain("bg-rosa");
    await practice?.trigger("click");
    await vi.waitFor(() =>
      expect(router.currentRoute.value.name).toBe("repaso-ejercicios"),
    );
  });
  it("sin frases pendientes no ofrece repasar", async () => {
    const w = await setup(0, 3);
    expect(w.text()).toContain("No tienes frases pendientes hoy");
    expect(w.text()).not.toContain("Repasar ahora");
    expect(w.text()).not.toContain("Las que más te cuestan");
  });
  it("después de 15 repasos dice que ya terminó por hoy", async () => {
    const w = await setup(0, 15);
    expect(w.text()).toContain("Ya repasaste 15 frases hoy");
    expect(w.text()).not.toContain("Repasar ahora");
  });
  it("si no se pudo cargar, avisa y deja reintentar", async () => {
    vi.mocked(useSpeechOutput).mockReturnValue({ supported: true, speak });
    vi.mocked(PhrasesService.GetReviewQueue).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    vi.mocked(PhrasesService.GetStats).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const pinia = createPinia();
    setActivePinia(pinia);
    const w = mount(RepasoPage, { global: { plugins: [pinia, router] } });
    await flushPromises();
    expect(w.text()).toContain("Sin conexión a internet");
    expect(w.text()).toContain("Reintentar");
  });
});
