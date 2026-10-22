import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUnit } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import ProfileService from "@/Services/Profile/ProfileService";
import SessionService from "@/Services/Session/SessionService";
import type { Profile } from "@/Services/interfaces/Profile/ProfileInterface";
import { useAuthStore } from "@/stores/auth";
import HoyPage from "./HoyPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/Services/Phrases/PhrasesService", () => ({
  default: {
    GetReviewQueue: vi.fn(),
    GetLearnedEn: vi.fn(),
    CountLearnedToday: vi.fn(),
  },
}));
vi.mock("@/Services/Session/SessionService", () => ({
  default: { GetTodayStatus: vi.fn(), CountPracticeDays: vi.fn() },
}));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { AdvanceUnit: vi.fn() },
}));

function setup(over: Partial<Profile> = {}): ReturnType<typeof mount> {
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
    ...over,
  };
  return mount(HoyPage, { global: { plugins: [pinia] } });
}

describe("HoyPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    // Lunes 19 de octubre, en la tarde
    vi.setSystemTime(new Date(2026, 9, 19, 15, 0));
    vi.mocked(PhrasesService.GetReviewQueue).mockResolvedValue({
      phrases: [],
      reviewedToday: 0,
    });
    vi.mocked(PhrasesService.GetLearnedEn).mockResolvedValue([]);
    vi.mocked(PhrasesService.CountLearnedToday).mockResolvedValue(0);
    vi.mocked(SessionService.GetTodayStatus).mockResolvedValue("ninguna");
    vi.mocked(SessionService.CountPracticeDays).mockResolvedValue(0);
  });
  afterEach(() => vi.useRealTimers());

  it("saluda y muestra la estación anterior, la actual y la siguiente", () => {
    const w = setup({ current_unit_id: "a2-restaurante" });
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
  it("carga una sola vez el estado de hoy y los días de práctica de la semana", async () => {
    vi.mocked(SessionService.CountPracticeDays).mockResolvedValue(3);
    const w = setup({ current_unit_id: "a2-restaurante" });
    await flushPromises();
    expect(SessionService.GetTodayStatus).toHaveBeenCalledTimes(1);
    expect(SessionService.GetTodayStatus).toHaveBeenCalledWith("2026-10-19");
    expect(SessionService.CountPracticeDays).toHaveBeenCalledWith(
      "2026-10-19",
      "2026-10-19",
    );
    expect(w.text()).toContain(
      "Buenas tardes, Fernando. Esta semana practicaste 3 días.",
    );
    // Con "ambos", el 19 (impar) toca la escena de viajes
    expect(w.text()).toContain(
      `Conversar con ${getUnit("a2-restaurante").escenas.viajes.personaje_es}`,
    );
  });
  it("con la sesión de hoy terminada no ofrece otra", async () => {
    vi.mocked(SessionService.GetTodayStatus).mockResolvedValue("terminada");
    const w = setup();
    await flushPromises();
    const movil = w.get('[data-testid="linea-movil"]');
    expect(movil.text()).toContain(
      "Ya hiciste tu sesión de hoy. Vuelve mañana.",
    );
    expect(movil.text()).not.toContain("Empezar sesión");
  });
  it("al seguir a la próxima estación muestra la nueva meta", async () => {
    vi.mocked(PhrasesService.GetLearnedEn).mockImplementation(async (unitId) =>
      unitId === "a2-junta"
        ? getUnit("a2-junta").frases_clave.map((f) => f.en)
        : [],
    );
    vi.mocked(ProfileService.AdvanceUnit).mockResolvedValue(true);
    const w = setup();
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
});
