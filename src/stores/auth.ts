import type { Session } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { defineStore } from "pinia";
import { units } from "@/curriculum/units";
import { supabase } from "@/lib/supabase";
import PlacementService from "@/Services/Placement/PlacementService";
import ProfileService from "@/Services/Profile/ProfileService";
import type {
  PlacementAnswer,
  PlacementResult,
} from "@/Services/interfaces/Placement/PlacementInterface";
import type {
  Ayuda,
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
  // Resultado de la evaluación que se acaba de hacer (para la pantalla Resultado)
  lastPlacement: PlacementResult | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    session: null,
    profile: null,
    loaded: false,
    loginError: "",
    lastPlacement: null,
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

    // Manda las respuestas a la IA; lanza PlacementError si no se pudo (la pantalla avisa).
    // El nivel, la estación y placed_at ya los guardó la función; aquí solo se reflejan.
    async finishPlacement(answers: PlacementAnswer[]): Promise<void> {
      this.applyPlacement(await PlacementService.Run(answers));
    },

    // "Empezar en Nivel 0 por ahora" (sin IA), cuando la IA no está disponible
    async finishPlacementFallback(): Promise<void> {
      this.applyPlacement(await PlacementService.Fallback());
    },

    applyPlacement(result: PlacementResult): void {
      if (this.profile) {
        this.profile.level = result.level;
        this.profile.current_unit_id = result.unitId;
        this.profile.placed_at = new Date().toISOString();
      }
      this.lastPlacement = result;
    },

    // "Más ayuda" / "Menos ayuda": se ve al momento; si no se pudo guardar, lanza el error
    async setAyuda(ayuda: Ayuda): Promise<void> {
      if (!this.profile) return;
      const before = this.profile.ayuda ?? null;
      this.profile.ayuda = ayuda;
      try {
        await ProfileService.SaveAyuda(this.profile.user_id, ayuda);
      } catch (error) {
        this.profile.ayuda = before;
        throw error;
      }
    },

    // La función ya la guardó al cerrar la sesión: aquí solo se refleja
    applyAyuda(ayuda: Ayuda): void {
      if (this.profile) this.profile.ayuda = ayuda;
    },

    // TEMPORAL (hasta la fase 5, que lo cambia por la conversación final): pasa a la siguiente
    // meta del temario; al cruzar de línea también cambia el nivel. La base revisa que las
    // frases de la meta ya estén en el repaso. false si no hay siguiente o la base no lo dejó.
    async advanceUnit(): Promise<boolean> {
      const index = units.findIndex(
        (u) => u.id === this.profile?.current_unit_id,
      );
      const next = units[index + 1];
      if (index < 0 || !next) return false;
      const moved = await ProfileService.AdvanceUnit(
        next.id,
        next.nivel,
        units[index].frases_clave.length,
      );
      if (moved && this.profile) {
        this.profile.level = next.nivel;
        this.profile.current_unit_id = next.id;
      }
      return moved;
    },

    // Vuelve a leer el perfil (por ejemplo, si la evaluación ya se hizo en otra pestaña)
    async reloadProfile(): Promise<void> {
      if (!this.session) return;
      const profile = await ProfileService.GetProfile(this.session.user.id);
      if (profile) this.profile = profile;
    },

    // Solo cierra la sesión de este dispositivo (la de la compu sigue abierta)
    async signOut(): Promise<void> {
      await supabase.auth.signOut({ scope: "local" });
      this.session = null;
      this.profile = null;
    },
  },
});
