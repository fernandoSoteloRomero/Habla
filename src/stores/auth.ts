import type { Session } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";
import ProfileService from "@/Services/Profile/ProfileService";
import type {
  Motive,
  Profile,
} from "@/Services/interfaces/Profile/ProfileInterface";

// Aviso que se muestra en la Bienvenida cuando no se pudo entrar
type LoginError =
  "" | "sin-invitacion" | "sin-perfil" | "sin-conexion" | "login-fallido";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loaded: boolean;
  loginError: LoginError;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    session: null,
    profile: null,
    loaded: false,
    loginError: "",
  }),

  getters: {
    isAuthenticated: (state) => !!state.session && !!state.profile,
    hasMotive: (state) => !!state.profile?.motive,
    isAdmin: (state) => !!state.profile?.is_admin,
    isPlaced: (state) => !!state.profile?.placed_at,
  },

  actions: {
    // Se llama en main.ts antes de montar la app
    async initialize(): Promise<void> {
      // Se lee antes de cualquier await, porque supabase-js limpia la URL al procesarla.
      // Si Google o el hook rechazaron el login, Supabase regresa con ?error= o #error=.
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (query.get("error") || hash.get("error")) {
        const description =
          query.get("error_description") ?? hash.get("error_description") ?? "";
        // El hook rechaza con "Ese correo no tiene invitación."; lo demás (cancelar, etc.) es otro aviso
        this.loginError = /invitaci/i.test(description)
          ? "sin-invitacion"
          : "login-fallido";
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        // Sin red, supabase-js no puede renovar un token vencido: no es "sin sesión", es "sin internet"
        if (isAuthRetryableFetchError(error) || !navigator.onLine) {
          this.session = null;
          this.loginError = "sin-conexion";
          return;
        }
        // Un token vencido o inválido llega como error: se trata como "sin sesión"
        this.session = error ? null : data.session;
        if (!this.session) return;

        try {
          this.profile = await ProfileService.GetProfile(this.session.user.id);
          if (!this.profile) {
            this.session = null;
            this.loginError = "sin-perfil";
          }
        } catch (profileError) {
          console.error(profileError);
          this.session = null;
          this.loginError = "sin-conexion";
        }
      } catch (sessionError) {
        // Nunca dejar la app en blanco: si algo raro truena, se muestra la Bienvenida con aviso
        console.error(sessionError);
        this.session = null;
        this.loginError = "sin-conexion";
      } finally {
        this.loaded = true;
      }
    },

    // Si la sesión se cierra en otra pestaña o vence sin poder renovarse, limpia y avisa
    listenForSignOut(onSignedOut: () => void): void {
      supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_OUT") return;
        this.session = null;
        this.profile = null;
        onSignedOut();
      });
    },

    async signInWithGoogle(): Promise<void> {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        },
      });
    },

    // Lanza el error si no se guardó, para que la pantalla avise
    async saveMotive(motive: Motive): Promise<void> {
      if (!this.profile) return;
      await ProfileService.SaveMotive(this.profile.user_id, motive);
      this.profile.motive = motive;
    },

    // Solo cierra la sesión de este dispositivo (la de la compu sigue abierta)
    async signOut(): Promise<void> {
      await supabase.auth.signOut({ scope: "local" });
      this.session = null;
      this.profile = null;
    },
  },
});
