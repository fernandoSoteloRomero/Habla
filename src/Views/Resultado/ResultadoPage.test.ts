import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import type { LevelId } from "@shared/placementTypes";
import { useAuthStore } from "@/stores/auth";
import ResultadoPage from "./ResultadoPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

enableAutoUnmount(afterEach);

async function setup(level: LevelId, unitId: string): Promise<VueWrapper> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: "viajes",
    level,
    current_unit_id: unitId,
    is_admin: false,
    placed_at: "2026-10-21T15:00:00Z",
  };
  auth.lastPlacement = {
    level,
    unitId,
    resumen:
      "Ya entiendes frases de trabajo. Primero vas a practicar cómo presentarte.",
  };
  await router.push({ path: "/resultado", force: true });
  return mount(ResultadoPage, { global: { plugins: [pinia, router] } });
}

describe("ResultadoPage", () => {
  it("anuncia la línea y la primera estación", async () => {
    const w = await setup("A2", "a2-junta");
    expect(w.text()).toContain("Tu línea es la verde");
    expect(w.text()).toContain("Empiezas en A2");
    expect(w.text()).toContain("Primero vas a practicar cómo presentarte.");
    const here = w.get('[data-estado="aqui"]');
    expect(here.text()).toContain("Presentarte en una junta");
    expect(here.text()).toContain("Primera estación");
    expect(here.text()).not.toContain("Estás aquí");
  });
  it("Nivel 0 se dice completo", async () => {
    const w = await setup("L0", "l0-saludar");
    expect(w.text()).toContain("Tu línea es la rosa");
    expect(w.text()).toContain("Empiezas en Nivel 0");
  });
  it("Continuar lleva a Hoy", async () => {
    const w = await setup("A1", "a1-quien-eres");
    const next = w.findAll("button").find((b) => b.text() === "Continuar");
    await next?.trigger("click");
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("hoy"));
  });
});
