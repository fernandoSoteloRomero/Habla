import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import MiLineaPage from "./MiLineaPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

function mountAt(unitId: string): VueWrapper {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().profile = {
    user_id: "u1",
    name: "Ana",
    motive: "viajes",
    level: "A2",
    current_unit_id: unitId,
    is_admin: false,
  };
  return mount(MiLineaPage, { global: { plugins: [pinia] } });
}

describe("MiLineaPage", () => {
  it("resume cada nivel según la estación actual", () => {
    const w = mountAt("a2-restaurante");
    expect(w.get('[data-nivel="L0"]').text()).toContain("completo");
    expect(w.get('[data-nivel="A1"]').text()).toContain("completo");
    const a2 = w.get('[data-nivel="A2"]').text();
    expect(a2).toContain("2 de 8");
    expect(a2).toContain("Ya puedes hablar de tu trabajo");
    expect(a2).toContain("Pedir comida en un restaurante");
    expect(a2).toContain("Pedir direcciones y 4 metas más");
    expect(w.get('[data-nivel="B1"]').text()).toContain("después");
  });
  it("al empezar no hay nada logrado", () => {
    const l0 = mountAt("l0-saludar").get('[data-nivel="L0"]').text();
    expect(l0).toContain("0 de 4");
    expect(l0).toContain("Números, precios y la hora y 2 metas más");
  });
});
