// Decide si un error de la API de Anthropic es "se acabó el presupuesto" o una falla de la IA.
// - Tope mensual propio: 400 cuyo mensaje empieza "You have reached your specified (workspace) API usage limits".
// - Tope del tier: 429 con error.details.error_code = "enforced_spend_limit_reached".
// Todo lo demás (429 de velocidad, 5xx, timeouts, 400 de otro tipo) cuenta como "ia".

const SPEND_LIMIT_MESSAGE =
  /You have reached your specified (workspace )?API usage limits/i;

interface AnthropicLikeError {
  status?: number;
  message?: string;
  error?: unknown;
}

function errorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  // El SDK guarda el JSON de la respuesta en `error`; según el caso viene anidado una vez más
  const nested = record.error as Record<string, unknown> | undefined;
  const details = (nested?.details ?? record.details) as
    Record<string, unknown> | undefined;
  const code = details?.error_code;
  return typeof code === "string" ? code : undefined;
}

export function classifyAnthropicError(
  error: AnthropicLikeError,
): "presupuesto" | "ia" {
  if (error.status === 400 && SPEND_LIMIT_MESSAGE.test(error.message ?? "")) {
    return "presupuesto";
  }
  if (
    error.status === 429 &&
    errorCode(error.error) === "enforced_spend_limit_reached"
  ) {
    return "presupuesto";
  }
  return "ia";
}
