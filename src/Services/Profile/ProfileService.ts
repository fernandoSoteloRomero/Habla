import { supabase } from "@/lib/supabase";
import type {
  Motive,
  Profile,
} from "@/Services/interfaces/Profile/ProfileInterface";

export default {
  // null si la cuenta todavía no tiene perfil; lanza el error si falla la consulta
  async GetProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, motive, level, current_unit_id, is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
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
