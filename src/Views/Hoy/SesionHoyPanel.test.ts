import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import ProfileService from "@/Services/Profile/ProfileService";
import { useAuthStore } from "@/stores/auth";
import SesionHoyPanel from "./SesionHoyPanel.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { AdvanceUnit: vi.fn() },
}));

enableAutoUnmount(afterEach);
afterEach(() => vi.restoreAllMocks());

function setup(
  props: {
    pending: number;
    newCount: number;
    unitDone: boolean;
    status?: "cargando" | "listo" | "error";
    sessionStatus?: "ninguna" | "en_curso" | "terminada";
  },
  unitId = "a2-junta",
): VueWrapper {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "trabajo",
    level: unitId.startsWith("b1") ? "B1" : "A2",
    current_unit_id: unitId,
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
  };
  return mount(SesionHoyPanel, {
    props: {
      status: "listo",
      sessionStatus: "ninguna",
      personaje: "el mesero",
      ...props,
    },
    global: { plugins: [pinia, router] },
  });
}
const button = (w: VueWrapper, text: string): ReturnType<VueWrapper["get"]> => {
  const found = w.findAll("button").find((b) => b.text() === text);
  if (!found) throw new Error(`No hay botón "${text}"`);
  return found;
};

describe("SesionHoyPanel", () => {
  it("muestra los 5 pasos con los números de hoy y deja empezar", async () => {
    const w = setup({ pending: 8, newCount: 4, unitDone: false });
    expect(w.text()).toContain("Repasar 8 frases");
    expect(w.text()).toContain("Aprender 4 frases nuevas");
    expect(w.text()).toContain("Practicar con ejercicios");
    expect(w.text()).toContain("Conversar con el mesero");
    expect(w.text()).toContain("Ver tu resumen");
    // 8 × 0.6 + 4 × 1.5 + 3 de ejercicios + 10 de conversación y resumen
    expect(w.text()).toContain("24 minutos");
    await button(w, "Empezar sesión").trigger("click");
    await vi.waitFor(() =>
      expect(router.currentRoute.value.name).toBe("sesion"),
    );
  });
  it("aunque no haya repasos ni frases nuevas, se puede conversar", () => {
    const w = setup({ pending: 0, newCount: 0, unitDone: false });
    expect(w.text()).toContain("Ya aprendiste tus frases nuevas de hoy");
    expect(button(w, "Empezar sesión").classes()).toContain("bg-rosa");
  });
  it("si la dejó a medias dice 'Continuar sesión'", () => {
    const w = setup({
      pending: 2,
      newCount: 0,
      unitDone: false,
      sessionStatus: "en_curso",
    });
    expect(button(w, "Continuar sesión").classes()).toContain("bg-rosa");
  });
  it("con la sesión de hoy terminada dice que vuelva mañana", () => {
    const w = setup({
      pending: 0,
      newCount: 0,
      unitDone: false,
      sessionStatus: "terminada",
    });
    expect(w.text()).toContain("Ya hiciste tu sesión de hoy. Vuelve mañana.");
    expect(w.text()).not.toContain("Empezar sesión");
    expect(w.text()).not.toContain("minutos");
    expect(w.find('[data-testid="avance"]').exists()).toBe(false);
  });
  it("con la meta completa y la sesión terminada, la acción rosa es seguir a la próxima estación", async () => {
    vi.mocked(ProfileService.AdvanceUnit).mockResolvedValue(true);
    const w = setup({
      pending: 0,
      newCount: 0,
      unitDone: true,
      sessionStatus: "terminada",
    });
    expect(w.text()).toContain("Ya aprendiste las frases de esta meta");
    const advance = w.get('[data-testid="avance"]');
    expect(advance.text()).toBe("Seguir a la próxima estación");
    expect(advance.classes()).toContain("bg-rosa");
    await advance.trigger("click");
    await vi.waitFor(() =>
      expect(useAuthStore().profile?.current_unit_id).toBe("a2-trabajo"),
    );
    expect(ProfileService.AdvanceUnit).toHaveBeenCalledWith(
      "a2-trabajo",
      "A2",
      6,
    );
  });
  it("si la sesión de hoy no ha terminado, la acción rosa es la sesión y el avance es secundario", () => {
    const w = setup({ pending: 3, newCount: 0, unitDone: true });
    expect(button(w, "Empezar sesión").classes()).toContain("bg-rosa");
    expect(w.get('[data-testid="avance"]').classes()).not.toContain("bg-rosa");
  });
  it("en la última meta no hay avance: llegaste al final de la ruta", () => {
    const w = setup(
      { pending: 0, newCount: 0, unitDone: true, sessionStatus: "terminada" },
      "b1-viaje",
    );
    expect(w.find('[data-testid="avance"]').exists()).toBe(false);
    expect(w.text()).toContain("Llegaste al final de la ruta.");
  });
  it("si no se pudo avanzar, avisa y se queda en la misma meta", async () => {
    vi.mocked(ProfileService.AdvanceUnit).mockRejectedValue(
      new Error("sin red"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const w = setup({
      pending: 0,
      newCount: 0,
      unitDone: true,
      sessionStatus: "terminada",
    });
    await w.get('[data-testid="avance"]').trigger("click");
    await vi.waitFor(() =>
      expect(w.text()).toContain(
        "No pudimos pasarte a la próxima estación. Revisa tu conexión y vuelve a intentar.",
      ),
    );
    expect(useAuthStore().profile?.current_unit_id).toBe("a2-junta");
  });
  it("mientras carga no muestra números", () => {
    const w = setup({
      pending: 0,
      newCount: 0,
      unitDone: false,
      status: "cargando",
    });
    expect(w.text()).toContain("Cargando tu sesión");
    expect(w.text()).not.toContain("Empezar sesión");
  });
  it("si no se pudo cargar, deja reintentar", async () => {
    const w = setup({
      pending: 0,
      newCount: 0,
      unitDone: false,
      status: "error",
    });
    expect(w.text()).toContain("No pudimos cargar tu sesión");
    await button(w, "Reintentar").trigger("click");
    expect(w.emitted("retry")).toHaveLength(1);
  });
});
