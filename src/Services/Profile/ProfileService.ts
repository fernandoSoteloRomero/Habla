import { supabase } from "@/lib/supabase";
import type { Profile } from "@/Services/interfaces/Profile/ProfileInterface";

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
};
