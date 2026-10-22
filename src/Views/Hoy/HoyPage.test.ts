import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import HoyPage from "./HoyPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: {
    GetReviewQueue: vi
      .fn()
      .mockResolvedValue({ phrases: [], reviewedToday: 0 }),
    GetLearnedEn: vi.fn().mockResolvedValue([]),
  },
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
});
