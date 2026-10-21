// La evaluación usa los mismos tipos que la Edge Function `placement` (supabase/functions/_shared)
import type { AiErrorCode } from "@shared/placementTypes";

export type { PlacementAnswer, PlacementResult } from "@shared/placementTypes";

// Errores que ve la pantalla: los de la función más "sin-conexion" (no llegó a la función)
export type PlacementErrorCode = AiErrorCode | "sin-conexion";
