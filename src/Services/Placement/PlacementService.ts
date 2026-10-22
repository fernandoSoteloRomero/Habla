import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  PlacementAnswer,
  PlacementErrorCode,
  PlacementResult,
} from "@/Services/interfaces/Placement/PlacementInterface";

// Códigos que puede mandar la Edge Function `placement` en { error }
const FUNCTION_CODES: PlacementErrorCode[] = [
  "datos",
  "ya-evaluado",
  "limite",
  "presupuesto",
  "ia",
  "servidor",
];

// Error con el código que la pantalla convierte en aviso
export class PlacementError extends Error {
  code: PlacementErrorCode;
  constructor(code: PlacementErrorCode) {
    super(code);
    this.name = "PlacementError";
    this.code = code;
  }
}

async function callPlacement(body: object): Promise<PlacementResult> {
  const { data, error } = await supabase.functions.invoke("placement", {
    body,
  });
  if (!error) return data as PlacementResult;

  // La función respondió con un error
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    // 401: la sesión venció (lo responde withSupabase antes de llegar a la función)
    if (response.status === 401) throw new PlacementError("sesion");
    let code: PlacementErrorCode = "ia";
    try {
      const json = await response.json();
      if (FUNCTION_CODES.includes(json?.error)) code = json.error;
    } catch {
      // la respuesta no era JSON: se queda como "ia"
    }
    throw new PlacementError(code);
  }
  // No llegó a la función
  if (error instanceof FunctionsFetchError || !navigator.onLine) {
    throw new PlacementError("sin-conexion");
  }
  throw new PlacementError("ia");
}

export default {
  // Manda las respuestas a la Edge Function `placement` (la IA decide el nivel)
  Run(answers: PlacementAnswer[]): Promise<PlacementResult> {
    return callPlacement({ answers });
  },

  // "Empezar en Nivel 0 por ahora": sin IA y sin gastar, cuando la IA no está disponible
  Fallback(): Promise<PlacementResult> {
    return callPlacement({ fallback: true });
  },
};
