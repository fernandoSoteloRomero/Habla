import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { MockInstance } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import BienvenidaPage from "./BienvenidaPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

function setup(loginError: "" | "sin-invitacion" = ""): {
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
});
