import type { Session } from "@supabase/supabase-js";
import type { VueWrapper } from "@vue/test-utils";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import ProfileService from "@/Services/Profile/ProfileService";
import { useAuthStore } from "@/stores/auth";
import MotivoPage from "./MotivoPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { GetProfile: vi.fn(), SaveMotive: vi.fn() },
}));

// El router corre sus guards con la primera app donde se instaló:
// si una prueba deja su app montada, la siguiente usaría el store de la anterior.
enableAutoUnmount(afterEach);

async function setup(): Promise<VueWrapper> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive: null,
    level: "L0",
    current_unit_id: "l0-saludar",
    is_admin: false,
    placed_at: null,
  };
  await router.push({ path: "/motivo", force: true });
  return mount(MotivoPage, { global: { plugins: [pinia, router] } });
}

describe("MotivoPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("no deja continuar sin elegir", async () => {
    const w = await setup();
    expect(
      w.get('[data-testid="continuar"]').attributes("disabled"),
    ).toBeDefined();
  });
  it("guarda el motivo y lleva a hoy", async () => {
    vi.mocked(ProfileService.SaveMotive).mockResolvedValue();
    const w = await setup();
    await w.get('[data-motivo="viajes"]').trigger("click");
    await w.get('[data-testid="continuar"]').trigger("click");
    await flushPromises();
    expect(ProfileService.SaveMotive).toHaveBeenCalledWith("u1", "viajes");
    expect(useAuthStore().profile?.motive).toBe("viajes");
    // Hoy se carga con import(): se espera a que termine la navegación
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("hoy"));
  });
  it("si no se guarda, avisa y se queda", async () => {
    vi.mocked(ProfileService.SaveMotive).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const w = await setup();
    await w.get('[data-motivo="ambos"]').trigger("click");
    await w.get('[data-testid="continuar"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain(
      "No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar.",
    );
    expect(router.currentRoute.value.name).toBe("motivo");
  });
});
