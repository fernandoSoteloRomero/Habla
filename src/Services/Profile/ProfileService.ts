import type { LevelId } from "@/curriculum/levels";
import { supabase } from "@/lib/supabase";
import type {
  Ayuda,
  Motive,
  Profile,
} from "@/Services/interfaces/Profile/ProfileInterface";

export default {
  // null si la cuenta todavía no tiene perfil; lanza el error si falla la consulta
  async GetProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, name, motive, level, current_unit_id, is_admin, placed_at, ayuda",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },

  // TEMPORAL (hasta la fase 5): pasa a la siguiente meta si ya tiene sus frases en el repaso.
  // La base revisa que las tenga; regresa false si todavía no.
  async AdvanceUnit(
    nextUnitId: string,
    nextLevel: LevelId,
    required: number,
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("advance_unit", {
      p_next_unit: nextUnitId,
      p_next_level: nextLevel,
      p_required: required,
    });
    if (error) throw error;
    return data === true;
  },

  // "Más ayuda" / "Menos ayuda" en la conversación (el RLS solo deja cambiar el propio)
  async SaveAyuda(userId: string, ayuda: Ayuda): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ ayuda })
      .eq("user_id", userId);
    if (error) throw error;
  },

  // El RLS solo deja cambiar el motivo de tu propio perfil
  async SaveMotive(userId: string, motive: Motive): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ motive })
      .eq("user_id", userId);
    if (error) throw error;
  },
};
