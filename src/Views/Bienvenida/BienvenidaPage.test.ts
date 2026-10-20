import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { MockInstance } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import BienvenidaPage from "./BienvenidaPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

function setup(
  loginError:
    | ""
    | "sin-invitacion"
    | "sin-perfil"
    | "sin-conexion"
    | "login-fallido" = "",
): {
  w: VueWrapper;
  signIn: MockInstance;
} {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.loginError = loginError;
  const signIn = vi.spyOn(auth, "signInWithGoogle").mockResolvedValue();
  return {
    w: mount(BienvenidaPage, { global: { plugins: [pinia] } }),
    signIn,
  };
}

describe("BienvenidaPage", () => {
  it("entra con Google y explica la invitación", async () => {
    const { w, signIn } = setup();
    expect(w.text()).toContain(
      "Inglés para moverte en la vida real, 20 minutos al día.",
    );
    expect(w.text()).toContain(
      "Solo pueden entrar personas invitadas. Si no tienes invitación, pídesela a quien te recomendó la app.",
    );
    expect(w.text()).not.toContain("enlace por correo");
    await w.get("button").trigger("click");
    expect(signIn).toHaveBeenCalled();
  });
  it("avisa cuando el correo no tiene invitación", () => {
    expect(setup("sin-invitacion").w.text()).toContain(
      "No pudimos dejarte entrar",
    );
  });
  it("avisa cuando falta el perfil", () => {
    expect(setup("sin-perfil").w.text()).toContain(
      "Entraste, pero falta tu perfil",
    );
  });
  it("avisa sin conexión y deja reintentar", () => {
    const text = setup("sin-conexion").w.text();
    expect(text).toContain("Sin conexión a internet");
    expect(text).toContain("Reintentar");
  });
  it("para otros errores de Google dice qué hacer", () => {
    const text = setup("login-fallido").w.text();
    expect(text).toContain("No se pudo completar el inicio de sesión");
    expect(text).not.toContain("No pudimos dejarte entrar");
  });
});
