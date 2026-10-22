import type { Ayuda } from "@shared/ayuda";
import type { LevelId } from "@/curriculum/levels";

export type { Ayuda };

export type Motive = "trabajo" | "viajes" | "ambos";

// Fila de public.profiles (fase 1)
export interface Profile {
  user_id: string;
  name: string;
  motive: Motive | null;
  level: LevelId;
  current_unit_id: string;
  is_admin: boolean;
  // Se llena al terminar la evaluación inicial (fase 2); null mientras no la hace
  placed_at: string | null;
  // Cuánta ayuda tiene en la conversación; null (o sin dato) = la de su nivel (ver ayuda.ts)
  ayuda?: Ayuda | null;
}
