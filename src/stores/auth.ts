import type { Session } from "@supabase/supabase-js";
import { defineStore } from "pinia";
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
});
