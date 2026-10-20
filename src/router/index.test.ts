import type { Session } from "@supabase/supabase-js";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import router from "./index";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

function login(motive: "viajes" | null): void {
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive,
    level: "L0",
    current_unit_id: "l0-saludar",
    is_admin: false,
  };
}

// force: el router es el mismo en todas las pruebas; sin force, ir a la ruta actual no corre el guard
const go = (path: string): ReturnType<typeof router.push> =>
  router.push({ path, force: true });

describe("guard del router", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("sin sesión manda a bienvenida", async () => {
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("bienvenida");
  });
  it("con sesión, bienvenida manda a hoy", async () => {
    login("viajes");
    await go("/bienvenida");
    expect(router.currentRoute.value.name).toBe("hoy");
  });
  it("con sesión entra a mi línea", async () => {
    login("viajes");
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("mi-linea");
  });
});
