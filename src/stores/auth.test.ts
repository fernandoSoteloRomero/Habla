import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import ProfileService from "@/Services/Profile/ProfileService";
import type { Profile } from "@/Services/interfaces/Profile/ProfileInterface";
import { useAuthStore } from "./auth";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));
vi.mock("@/Services/Profile/ProfileService", () => ({
  default: { GetProfile: vi.fn(), SaveMotive: vi.fn(), AdvanceUnit: vi.fn() },
}));

const session = { user: { id: "u1" } };
const profile = {
  user_id: "u1",
  name: "Ana",
  motive: null,
  level: "L0",
  current_unit_id: "l0-saludar",
  is_admin: false,
  placed_at: null,
};

describe("auth store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
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

  it("con el token vencido y sin internet marca sin-conexion", async () => {
    // supabase-js no puede renovar el token sin red: regresa este error y deja la sesión guardada
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError("Failed to fetch", 0),
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("sin-conexion");
  });
  it("si el teléfono no tiene internet al abrir marca sin-conexion", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loginError).toBe("sin-conexion");
  });
  it("si getSession truena, termina de cargar y avisa", async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(
      new Error("lock timeout"),
    );
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loaded).toBe(true);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("sin-conexion");
  });
  it("también detecta el error de la invitación en la query (?error=)", async () => {
    window.history.replaceState(
      null,
      "",
      "/?error=access_denied&error_description=Ese%20correo%20no%20tiene%20invitaci%C3%B3n.",
    );
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loginError).toBe("sin-invitacion");
  });
  it("otro error de Google (por ejemplo, cancelar) marca login-fallido", async () => {
    window.location.hash =
      "#error=access_denied&error_description=The+user+denied+access";
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loginError).toBe("login-fallido");
  });
  it("si la sesión se cierra en otro lado, limpia el store y avisa", () => {
    let listener: (event: string) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(((
      callback: (event: string) => void,
    ) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }) as never);
    const auth = useAuthStore();
    auth.session = session as never;
    auth.profile = profile as never;
    const onSignedOut = vi.fn();
    auth.listenForSignOut(onSignedOut);
    listener("SIGNED_OUT");
    expect(auth.session).toBeNull();
    expect(auth.profile).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });
  it("al avanzar desde la última meta del Nivel 0 cruza a la línea A1", async () => {
    vi.mocked(ProfileService.AdvanceUnit).mockResolvedValue(true);
    const auth = useAuthStore();
    auth.profile = { ...profile, current_unit_id: "l0-nombre" } as Profile;
    expect(await auth.advanceUnit()).toBe(true);
    expect(ProfileService.AdvanceUnit).toHaveBeenCalledWith(
      "a1-quien-eres",
      "A1",
      6,
    );
    expect(auth.profile?.current_unit_id).toBe("a1-quien-eres");
    expect(auth.profile?.level).toBe("A1");
  });
  it("si la base no deja avanzar, el perfil no cambia", async () => {
    vi.mocked(ProfileService.AdvanceUnit).mockResolvedValue(false);
    const auth = useAuthStore();
    auth.profile = { ...profile, current_unit_id: "l0-nombre" } as Profile;
    expect(await auth.advanceUnit()).toBe(false);
    expect(auth.profile?.current_unit_id).toBe("l0-nombre");
    expect(auth.profile?.level).toBe("L0");
  });
  it("en la última meta no hay a dónde avanzar", async () => {
    const auth = useAuthStore();
    auth.profile = { ...profile, current_unit_id: "b1-viaje" } as Profile;
    expect(await auth.advanceUnit()).toBe(false);
    expect(ProfileService.AdvanceUnit).not.toHaveBeenCalled();
  });
  it("cerrar sesión solo cierra este dispositivo", async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    } as never);
    await useAuthStore().signOut();
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
