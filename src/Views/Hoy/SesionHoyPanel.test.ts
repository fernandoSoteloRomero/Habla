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
    props: { status: "listo", ...props },
    global: { plugins: [pinia, router] },
  });
}

describe("SesionHoyPanel", () => {
  it("muestra los pasos con los números de hoy y deja empezar", async () => {
    const w = setup({ pending: 8, newCount: 4, unitDone: false });
    expect(w.text()).toContain("Repasar 8 frases");
    expect(w.text()).toContain("Aprender 4 frases nuevas");
    expect(w.text()).toContain("Conversar (llega pronto)");
    expect(w.text()).toContain("Ver tu resumen");
    expect(w.text()).toContain("11 minutos");
    const start = w
      .findAll("button")
      .find((b) => b.text() === "Empezar sesión");
    await start?.trigger("click");
    await vi.waitFor(() =>
      expect(router.currentRoute.value.name).toBe("sesion"),
    );
  });
  it("sin nada pendiente y la meta completa no ofrece empezar", () => {
    const w = setup({ pending: 0, newCount: 0, unitDone: true });
    expect(w.text()).not.toContain("Empezar sesión");
    expect(w.text()).toContain("Ya aprendiste las frases de esta meta");
  });
  it("con la meta completa y nada que repasar, la acción rosa es seguir a la próxima estación", async () => {
    vi.mocked(ProfileService.AdvanceUnit).mockResolvedValue(true);
    const w = setup({ pending: 0, newCount: 0, unitDone: true });
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
  it("si además hay repasos, la acción rosa es empezar y el avance es secundario", () => {
    const w = setup({ pending: 3, newCount: 0, unitDone: true });
    const start = w
      .findAll("button")
      .find((b) => b.text() === "Empezar sesión");
    expect(start?.classes()).toContain("bg-rosa");
    expect(w.get('[data-testid="avance"]').classes()).not.toContain("bg-rosa");
  });
  it("en la última meta no hay avance: llegaste al final de la ruta", () => {
    const w = setup({ pending: 0, newCount: 0, unitDone: true }, "b1-viaje");
    expect(w.find('[data-testid="avance"]').exists()).toBe(false);
    expect(w.text()).toContain("Llegaste al final de la ruta.");
  });
  it("si no se pudo avanzar, avisa y se queda en la misma meta", async () => {
    vi.mocked(ProfileService.AdvanceUnit).mockRejectedValue(
      new Error("sin red"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const w = setup({ pending: 0, newCount: 0, unitDone: true });
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
    const retry = w.findAll("button").find((b) => b.text() === "Reintentar");
    await retry?.trigger("click");
    expect(w.emitted("retry")).toHaveLength(1);
  });
});
