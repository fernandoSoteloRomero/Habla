import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import ProfileService from "@/Services/Profile/ProfileService";
import { useAuthStore } from "./auth";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn() },
  },
}));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { GetProfile: vi.fn(), SaveMotive: vi.fn() },
}));

const session = { user: { id: "u1" } };
const profile = {
  user_id: "u1",
  name: "Ana",
  motive: null,
  level: "L0",
  current_unit_id: "l0-saludar",
  is_admin: false,
};

describe("auth store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    vi.resetAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("sin sesión queda sin autenticar", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loaded).toBe(true);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("");
  });
  it("con un token vencido queda sin autenticar y sin aviso", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: new Error("Invalid Refresh Token"),
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("");
  });
  it("con sesión carga el perfil", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as never);
    vi.mocked(ProfileService.GetProfile).mockResolvedValue(profile as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(ProfileService.GetProfile).toHaveBeenCalledWith("u1");
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.hasMotive).toBe(false);
  });
  it("si Google regresó con error marca sin-invitacion", async () => {
    window.location.hash =
      "#error=access_denied&error_description=Ese+correo+no+tiene+invitaci%C3%B3n.";
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loginError).toBe("sin-invitacion");
  });
  it("con sesión pero sin perfil marca sin-perfil", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as never);
    vi.mocked(ProfileService.GetProfile).mockResolvedValue(null);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("sin-perfil");
  });
  it("si no hay internet al cargar el perfil marca sin-conexion", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as never);
    vi.mocked(ProfileService.GetProfile).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("sin-conexion");
    expect(auth.loaded).toBe(true);
  });
});
