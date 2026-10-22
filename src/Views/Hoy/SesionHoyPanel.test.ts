import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";
import SesionHoyPanel from "./SesionHoyPanel.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

enableAutoUnmount(afterEach);

function setup(props: {
  pending: number;
  newCount: number;
  unitDone: boolean;
  status?: "cargando" | "listo" | "error";
}): VueWrapper {
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
