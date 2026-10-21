import type { Session } from "@supabase/supabase-js";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import router from "./index";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

// placed: si ya hizo la evaluación inicial (fase 2)
function login(motive: "viajes" | null, placed = true): void {
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = {
    user_id: "u1",
    name: "Ana",
    motive,
    level: "L0",
    current_unit_id: "l0-saludar",
    is_admin: false,
    placed_at: placed ? "2026-10-21T15:00:00Z" : null,
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
  it("sin motivo manda a motivo, incluso desde bienvenida", async () => {
    login(null, false);
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("motivo");
    await go("/bienvenida");
    expect(router.currentRoute.value.name).toBe("motivo");
  });
  it("con motivo, motivo manda a hoy", async () => {
    login("viajes");
    await go("/motivo");
    expect(router.currentRoute.value.name).toBe("hoy");
  });
  it("con motivo pero sin evaluación, manda a la evaluación", async () => {
    login("viajes", false);
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("evaluacion");
    await go("/motivo");
    expect(router.currentRoute.value.name).toBe("evaluacion");
  });
  it("ya evaluado, la evaluación manda a hoy", async () => {
    login("viajes");
    await go("/evaluacion");
    expect(router.currentRoute.value.name).toBe("hoy");
  });
  it("el resultado solo se ve justo después de la evaluación", async () => {
    login("viajes");
    await go("/resultado");
    expect(router.currentRoute.value.name).toBe("hoy");
    useAuthStore().lastPlacement = {
      level: "L0",
      unitId: "l0-saludar",
      resumen: "Ya entiendes saludos.",
    };
    await go("/resultado");
    expect(router.currentRoute.value.name).toBe("resultado");
  });
});
