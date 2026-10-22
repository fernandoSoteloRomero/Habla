import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUnit } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import ProfileService from "@/Services/Profile/ProfileService";
import { useAuthStore } from "@/stores/auth";
import HoyPage from "./HoyPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: {
    GetReviewQueue: vi
      .fn()
      .mockResolvedValue({ phrases: [], reviewedToday: 0 }),
    GetLearnedEn: vi.fn().mockResolvedValue([]),
    CountLearnedToday: vi.fn().mockResolvedValue(0),
  },
}));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { AdvanceUnit: vi.fn() },
}));

describe("HoyPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 19, 15, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("saluda y muestra la estación anterior, la actual y la siguiente", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().profile = {
      user_id: "u1",
      name: "Fernando Sotelo",
      motive: "ambos",
      level: "A2",
      current_unit_id: "a2-restaurante",
      is_admin: false,
      placed_at: null,
    };
    const w = mount(HoyPage, { global: { plugins: [pinia] } });
    const movil = w.get('[data-testid="linea-movil"]');
    expect(w.text()).toContain("Buenas tardes, Fernando.");
    expect(movil.get('[data-estado="lograda"]').text()).toContain(
      "Hablar de tu trabajo",
    );
    expect(movil.get('[data-estado="aqui"]').text()).toContain(
      "Pedir comida en un restaurante",
    );
    expect(movil.get('[data-estado="aqui"]').text()).toContain("Estás aquí");
    expect(movil.get('[data-estado="proxima"]').text()).toContain(
      "Pedir direcciones",
    );
    expect(w.text()).toContain("Sesión de hoy");
  });
  it("al seguir a la próxima estación muestra la nueva meta", async () => {
    vi.mocked(PhrasesService.GetLearnedEn).mockImplementation(async (unitId) =>
      unitId === "a2-junta"
        ? getUnit("a2-junta").frases_clave.map((f) => f.en)
        : [],
    );
    vi.mocked(ProfileService.AdvanceUnit).mockResolvedValue(true);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().profile = {
      user_id: "u1",
      name: "Fernando Sotelo",
      motive: "ambos",
      level: "A2",
      current_unit_id: "a2-junta",
      is_admin: false,
      placed_at: null,
    };
    const w = mount(HoyPage, { global: { plugins: [pinia] } });
    await flushPromises();
    const movil = w.get('[data-testid="linea-movil"]');
    await movil.get('[data-testid="avance"]').trigger("click");
    await flushPromises();
    expect(movil.get('[data-estado="aqui"]').text()).toContain(
      "Hablar de tu trabajo",
    );
    expect(PhrasesService.GetLearnedEn).toHaveBeenLastCalledWith("a2-trabajo");
    expect(movil.text()).toContain("Aprender 4 frases nuevas");
  });
  it("si hoy ya aprendió 4 frases nuevas, no ofrece otra sesión", async () => {
    vi.mocked(PhrasesService.GetLearnedEn).mockResolvedValueOnce([]);
    vi.mocked(PhrasesService.CountLearnedToday).mockResolvedValueOnce(4);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().profile = {
      user_id: "u1",
      name: "Fernando Sotelo",
      motive: "ambos",
      level: "A2",
      current_unit_id: "a2-junta",
      is_admin: false,
      placed_at: null,
    };
    const w = mount(HoyPage, { global: { plugins: [pinia] } });
    await flushPromises();
    const movil = w.get('[data-testid="linea-movil"]');
    expect(PhrasesService.CountLearnedToday).toHaveBeenCalledWith("2026-10-19");
    expect(movil.text()).toContain(
      "Ya hiciste tu sesión de hoy. Vuelve mañana.",
    );
    expect(movil.text()).not.toContain("Empezar sesión");
  });
});
