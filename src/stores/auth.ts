import type { Session } from "@supabase/supabase-js";
import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";
import ProfileService from "@/Services/Profile/ProfileService";
import type { Profile } from "@/Services/interfaces/Profile/ProfileInterface";

// Aviso que se muestra en la Bienvenida cuando no se pudo entrar
type LoginError = "" | "sin-invitacion" | "sin-perfil" | "sin-conexion";

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
  },

  actions: {
    // Se llama en main.ts antes de montar la app
    async initialize(): Promise<void> {
      // Se lee antes de cualquier await, porque supabase-js limpia la URL al procesarla.
      // Si Google o el hook rechazaron el login, Supabase regresa con ?error= o #error=.
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (query.get("error") || hash.get("error")) {
        this.loginError = "sin-invitacion";
      }

      try {
        // Un token vencido o inválido llega como error: se trata como "sin sesión"
        const { data, error } = await supabase.auth.getSession();
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
      } finally {
        this.loaded = true;
      }
    },

    async signInWithGoogle(): Promise<void> {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        },
      });
    },

    async signOut(): Promise<void> {
      await supabase.auth.signOut();
      this.session = null;
      this.profile = null;
    },
  },
});
