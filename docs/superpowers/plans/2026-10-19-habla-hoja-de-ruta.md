# Habla: hoja de ruta de implementación

- **Spec:** [`docs/superpowers/specs/2026-10-07-english-app-design.md`](../specs/2026-10-07-english-app-design.md), aprobado el 2026-10-19.
- **Por qué hay fases:** el spec tiene varios subsistemas: la app, la base de datos, las funciones con IA, la voz y el temario. Cada fase es un plan propio que deja algo usable en el iPhone.
- **Cuándo se escribe cada plan:** el plan de la fase N se escribe cuando termina la fase N−1, para que parta del código real.

| Fase | Plan | Qué queda funcionando | Secciones del spec |
|---|---|---|---|
| 1. Base | [`2026-10-19-habla-fase-1-base.md`](2026-10-19-habla-fase-1-base.md) | App instalable con el estilo Línea. Una persona invitada entra con Google, elige su motivo y ve Hoy y Mi línea. Publicada en Cloudflare. | 4, 5.1, 6, 7 (front y auth), 8 (`invites`, `profiles`) |
| 2. Repaso | se escribe al terminar la 1 | Pestaña Repaso, tarjetas con "No me acordé / Me costó / Fácil", máximo 15 frases al día, audio normal y lento. Funciona sin IA. | 5.4, 3.1/2.2 de las pantallas, 8 (`phrases`), 12 (pruebas del algoritmo) |
| 3. Sesión diaria con IA | se escribe al terminar la 2 | Las cuatro partes de la sesión, con `session-generate`, `conversation-turn` y `session-close`. Voz de entrada intercambiable. `usage_log`, límites diarios y los avisos de la IA y del presupuesto. | 5.3, 7 (voz, IA y funciones), 8 (`sessions`, `usage_log`), 9, 10 |
| 4. Evaluación y avance | se escribe al terminar la 3 | Evaluación inicial y resultado, conversación final (`unit-check`), meta lograda con la única animación, "Casi lo tienes", revisión mensual y Mi grupo (invitar y gasto). Piloto de 1 semana. | 5.2, 5.5, 8 (`placements`, `unit_progress`), 12 (piloto) |

## Datos verificados el 2026-10-19 para las fases 2 a 4

Se guardan aquí para que no haya que investigarlos otra vez. Hay que revisar las versiones al escribir cada plan.

**Claude Haiku 5.5 (`claude-haiku-5-5`), según platform.claude.com**
- **Precio:** $0.10 por MTok de entrada y $0.50 de salida en prompts de hasta 100k tokens. La lectura de caché cuesta $0.01 por MTok y la escritura de 5 minutos, $0.125. Arriba de 100k tokens cuesta 5 veces más.
- **Pensamiento:** es adaptativo por defecto y se cobra como salida aunque no se muestre. Se puede apagar con `thinking: { type: "disabled" }`, pero solo con effort `low`, `medium` o `high`. Para el chat conviene `thinking: { type: "disabled" }` más `output_config: { effort: "low" }`.
  - Si aparece texto de razonamiento en las respuestas, se quita `thinking` y se deja `effort: "low"`.
- **Estabilidad de la caché:** la configuración de pensamiento y effort debe ser fija por función, porque cambiarla invalida la caché.
- **Restricciones:** no acepta prefill. `temperature` solo se puede omitir o poner en 1, y `top_k` da 400.
- **Salida estructurada:** `output_config: { format: zodOutputFormat(Schema) }` con `client.messages.parse()` o `stream()`, y `parsed_output`.
  - Sin `minimum`, `maximum`, `minLength` ni `maxLength`.
  - `additionalProperties: false` en todos los objetos.
- **Caché:** necesita un prefijo de al menos 512 tokens. `cache_control: { type: "ephemeral" }` va en el último bloque de `system`.
- **SDK:** `npm:@anthropic-ai/sdk@0.135.0`. Por defecto hace 2 reintentos y el timeout es de 10 minutos. Hay que bajar el timeout a menos de 150 s, que es el límite de las Edge Functions.
- **Errores que la app debe distinguir:**
  - **Tope mensual que pone uno mismo:** `BadRequestError` (400) con un mensaje que empieza `You have reached your specified (workspace )?API usage limits`.
  - **Tope del tier:** 429 con `error.details.error_code: "enforced_spend_limit_reached"`. El SDK lo reintenta y vuelve a fallar, así que hay que cortarlo.
- **Rechazos:** pueden llegar con HTTP 200 y `stop_reason: "refusal"`, y no hay fallback.
  - Hay que descartar la salida parcial y no meter ese turno al historial.
  - También hay que manejar `max_tokens` cuando no trae texto.

**Supabase Free**
- **Cupo de las funciones:** 500,000 invocaciones al mes, 2 s de CPU (no cuenta la espera a la API), 150 s de tiempo total y 256 MB.
- **Esqueleto de una función:** `npm:@supabase/server@1` (`withSupabase({ auth: "user" }, handler)`). Ya trae CORS, verifica el JWT y da `ctx.supabase` con RLS.
- **Despliegue sin Docker:** `npx supabase functions deploy --use-api`.
- **Secretos:** se leen con `Deno.env.get`. Los nombres no pueden empezar con `SUPABASE_`.
- **Streaming:** `supabase.functions.invoke` regresa el `Response` crudo cuando la respuesta es `text/event-stream`.
- **Pruebas:** `deno test` necesita Deno, que no está instalado en la laptop. Para esquivarlo, la lógica pura va en módulos sin `npm:` ni `Deno`, que Vitest puede importar desde `supabase/functions/_shared/`.
- **Riesgo con el temario:** está en `src/curriculum/` y ahí lo dejó el spec. En la fase 3 hay que comprobar que `functions deploy --use-api` empaqueta un archivo importado desde fuera de `supabase/functions`.
  - Si no lo empaqueta, se mueve a `supabase/functions/_shared/curriculum/` y el front lo importa desde ahí.
  - Por eso los archivos del temario importan entre sí con ruta relativa y la extensión `.ts`, sin `@/`.

**Voz en el navegador (MDN, caniuse y WebKit Bugzilla)**
- **Reconocimiento:** `window.SpeechRecognition || window.webkitSpeechRecognition`.
  - Chrome Android ignora `continuous`.
  - Chrome manda el audio a Google.
  - Firefox no lo soporta.
  - En Edge hay que probarlo.
- **iOS 27 tiene errores abiertos:**
  - Solo funciona la primera sesión de reconocimiento por pestaña (326069).
  - Si se llama `speak()` mientras escucha, se mata el reconocimiento; hay que hacer `abort()` antes (324436).
  - Puede colgarse sin `onend`, así que hace falta un temporizador de rescate (321436).
  - Esto confirma que en iPhone el modo por defecto debe ser el dictado del teclado.
- **Lectura en voz alta (`speechSynthesis`):**
  - El primer `speak()` debe salir de un toque.
  - `getVoices()` puede llegar vacío hasta el evento `voiceschanged`.
  - Si la cola se atora, se usa `cancel()`.
  - En iOS solo hay voces de baja calidad.
- **Permisos en iPhone:** las apps de la pantalla de inicio vuelven a pedir el micrófono en cada arranque (WebKit 327237).
