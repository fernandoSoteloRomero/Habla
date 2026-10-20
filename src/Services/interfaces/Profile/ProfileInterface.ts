import type { LevelId } from "@/curriculum/levels";

export type Motive = "trabajo" | "viajes" | "ambos";

// Fila de public.profiles (fase 1)
export interface Profile {
  user_id: string;
  name: string;
  motive: Motive | null;
  level: LevelId;
  current_unit_id: string;
  is_admin: boolean;
}
