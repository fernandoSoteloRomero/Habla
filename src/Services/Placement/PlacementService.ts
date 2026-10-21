import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  PlacementAnswer,
  PlacementErrorCode,
  PlacementResult,
} from "@/Services/interfaces/Placement/PlacementInterface";

const FUNCTION_CODES: PlacementErrorCode[] = [
  "datos",
  "limite",
  "presupuesto",
  "ia",
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

export default {
  // Manda las respuestas a la Edge Function `placement` (la IA decide el nivel)
  async Run(answers: PlacementAnswer[]): Promise<PlacementResult> {
    const { data, error } = await supabase.functions.invoke("placement", {
      body: { answers },
    });
    if (!error) return data as PlacementResult;

    // La función respondió con { error: código }
    if (error instanceof FunctionsHttpError) {
      let code: PlacementErrorCode = "ia";
      try {
        const body = await error.context.json();
        if (FUNCTION_CODES.includes(body?.error)) code = body.error;
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
  },
};
