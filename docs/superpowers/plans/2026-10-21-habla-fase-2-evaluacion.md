# Habla, Fase 2 (Evaluación con IA): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La primera vez que alguien entra, después del motivo, contesta una evaluación corta y adaptativa (pantalla 1.3). La IA decide su nivel y su primera estación y la app se lo anuncia como un letrero de línea (1.4). Todo con el gasto de IA registrado y limitado.

**Architecture:**
- **Las preguntas no usan IA.** Salen de un banco fijo en `src/curriculum/placement.ts`, y la app decide en el navegador cuándo sube de nivel y cuándo termina.
- **La IA solo se llama una vez, al final.** Lo hace la Edge Function `placement` de Supabase, que es la que tiene la API key:
  - Valida lo que llega y revisa el límite diario.
  - Le pide a Claude Haiku 5.5 un JSON con el nivel y el resumen.
  - Ajusta el nivel a lo que de verdad se alcanzó y guarda el resultado con la llave de admin.
  - Registra el costo en `usage_log`.
- **La lógica pura de la función vive en `supabase/functions/_shared/`:** precios, errores, validación, prompt, ajuste del nivel y límites. No usa `npm:` ni `Deno`, así que Vitest la prueba sin instalar Deno.

**Tech Stack:**
- Lo de la fase 1 más Supabase Edge Functions (Deno), con `npm:@supabase/server@1` (1.9.2) y `npm:@anthropic-ai/sdk@0.135.0`.
- Modelo `claude-haiku-5-5`.
- `speechSynthesis` del navegador para el audio.

**Spec:** `docs/superpowers/specs/2026-10-07-english-app-design.md`, secciones 5.2, 7.1, 8, 9 y 10. Pantallas 1.3 y 1.4 en `docs/design/habla-pantallas.html`. Los datos verificados de Haiku 5.5 y Supabase están en `docs/superpowers/plans/2026-10-19-habla-hoja-de-ruta.md`.

## Global Constraints

- **Las Global Constraints de la fase 1 siguen vigentes:** textos en español, tokens de Línea, estilo BaseFront, commit por tarea y push solo si Fernando lo pide.
- **La API key de Anthropic solo vive en los secretos de Supabase** (`ANTHROPIC_API_KEY`) y en `.env.local`, que git ignora y desde donde se sube. Nunca va en el front, en el repo ni en la salida de un comando.
- **Configuración de cada llamada:**
  - `model: "claude-haiku-5-5"`, `max_tokens: 400`.
  - `thinking: { type: "disabled" }` y `output_config: { effort: "low", format: { type: "json_schema", schema } }`.
  - Sin `temperature`, `top_k` ni prefill.
- **Cliente del SDK:** `new Anthropic({ apiKey, maxRetries: 2, timeout: 30_000 })`, porque el spec pide "hasta 2 reintentos" y las Edge Functions tienen un límite de 150 s.
- **Precios de Haiku 5.5 por millón de tokens**, en prompts de hasta 100k: entrada $0.10, salida $0.50, escritura de caché 5 min $0.125, lectura de caché $0.01. Arriba de 100k tokens de entrada todo cuesta 5×.
- **Límite diario de la evaluación:** máximo **5 llamadas a `placement` en 24 horas** por persona, contadas en `usage_log`. Al pasarlo, la función responde 429 `limite` sin llamar a la IA.
- **Errores que regresa la función**, en JSON `{ "error": código }`:
  - `datos` (400): lo que llegó no tiene la forma esperada.
  - `limite` (429): se pasó el límite diario.
  - `presupuesto` (402): la API dice que se acabó el tope mensual.
  - `ia` (502): la IA falló, no respondió a tiempo, se negó o regresó algo inválido.
- **Detección del presupuesto agotado:**
  - Un 400 cuyo mensaje cumple `/You have reached your specified (workspace )?API usage limits/`.
  - O un 429 con `error.details.error_code === "enforced_spend_limit_reached"`.
- **Las respuestas abiertas se escriben en un cuadro de texto.** En iPhone se dictan con el micrófono del teclado, que es lo que el spec ya pedía para iOS. El reconocimiento de voz del navegador llega en la fase 4.
- **Audio:** `speechSynthesis` con voz `en-US`, velocidad normal (1) y lenta (0.6). La primera vez siempre sale de un toque.
- **Notas de la prueba de Fernando (2026-10-21):**
  - Con 0.8 casi no se notaba la diferencia, así que lento quedó en 0.6.
  - Tocar una opción solo la marca, y se avanza con "Siguiente".
  - Al enviar, el botón dice "Calculando tu nivel…" y abajo aparece "Tarda unos segundos.".
- **La red de la oficina bloquea Postgres:** las migraciones van con `npm run db:push`, los secretos con `npm run db:secrets` y las funciones con `npm run fn:deploy`. Todo es HTTPS.

## Review Focus

1. **Alguien manda a `placement` un cuerpo enorme o raro** (100 respuestas, textos de 10,000 caracteres, un nivel inventado): la función responde 400 `datos` sin llamar a la IA y sin gastar. Lo cubren las pruebas de `validatePlacementRequest` en la Tarea 2.
2. **Se acabó el presupuesto del mes** (400 "usage limits" o 429 `enforced_spend_limit_reached`): sale el aviso amarillo con el mes, no un error genérico, y las respuestas se conservan para reintentar. Lo cubren las pruebas de `classifyAnthropicError` (Tarea 2) y de `EvaluacionPage` (Tarea 6).
3. **La IA regresa algo fuera del esquema**, un nivel inexistente o un nivel mayor al que la persona alcanzó: nunca se guarda un nivel inválido. El nivel se ajusta al alcanzado, o se trata como `ia`. Lo cubren las pruebas de `parsePlacementOutput` y `clampLevel` (Tarea 2).
4. **El navegador no puede leer en voz alta** (no tiene `speechSynthesis` o no tiene voz en inglés): la pregunta de escuchar muestra la frase escrita, y se puede contestar igual. Lo cubren las pruebas de `useSpeechOutput` (Tarea 5) y de `EvaluacionPage` (Tarea 6).
5. **Tocar dos veces "Ver mi resultado", o recargar a media evaluación:**
   - Con dos toques se hace una sola llamada a la IA.
   - Si se recarga, la evaluación empieza de nuevo. `placed_at` solo se escribe al final, así que nunca queda marcada como hecha a medias.
   - Lo cubren las pruebas de `EvaluacionPage` y del guard (Tarea 6).

## Estructura de archivos

```
supabase/
├── migrations/20261021000000_placement.sql      # placements, usage_log, profiles.placed_at
├── tests/placement_checks.sql
└── functions/
    ├── _shared/                                  # TS puro: lo prueba Vitest y lo importa Deno
    │   ├── placementTypes.ts  pricing.ts  aiErrors.ts  placementLogic.ts  limits.ts
    │   └── *.test.ts
    └── placement/index.ts                        # Edge Function (Deno)
scripts/db.mjs                                    # + comandos secrets y fn-deploy
src/
├── curriculum/placement.ts                       # banco de 12 preguntas
├── common/PlacementFlow.ts  common/BudgetMonth.ts
├── composables/useSpeechOutput.ts
├── Services/Placement/PlacementService.ts  Services/interfaces/Placement/PlacementInterface.ts
├── stores/auth.ts (+ placed_at)  router/index.ts (+ evaluacion, resultado)
└── Views/Evaluacion/EvaluacionPage.vue  Views/Resultado/ResultadoPage.vue
```

Vitest también corre `supabase/functions/_shared/**/*.test.ts`. El alias `@shared` apunta a `supabase/functions/_shared`; va en `vite.config.ts` y en `tsconfig.app.json`, junto con esa carpeta en `include`.

---

### Task 1: Base de datos de la evaluación y del gasto

**Files:**
- Create: `supabase/migrations/20261021000000_placement.sql`, `supabase/tests/placement_checks.sql`
- Modify: `src/Services/interfaces/Profile/ProfileInterface.ts` (agrega `placed_at: string | null`), `src/Services/Profile/ProfileService.ts` (agrega `placed_at` al `select`), las pruebas que arman un `Profile` (agrega `placed_at`)

**Interfaces:**
- Produces:
  - Columna `public.profiles.placed_at timestamptz`, `null` hasta terminar la evaluación inicial.
  - Tabla `public.placements(id uuid pk, user_id uuid fk, kind text check in ('inicial','mensual'), result_level text check in ('L0','A1','A2','B1'), details jsonb, created_at)`.
  - Tabla `public.usage_log(id bigint identity pk, user_id uuid fk, function text, model text, input_tokens int, output_tokens int, cache_read_tokens int, cost_usd numeric(10,6), created_at)`, con índice `(user_id, function, created_at)`.
  - El getter del store `isPlaced` (`!!profile?.placed_at`).

- [ ] **Step 1: Escribir `supabase/tests/placement_checks.sql`.** Mismo estilo que `base_checks.sql`: una transacción que se deshace, `FALLO: …` y al final `OK: pruebas de la fase 2`. Comprueba lo siguiente:
  - El perfil de un usuario nuevo trae `placed_at` en `null`.
  - **Como `authenticated` (Ana):**
    - Ve sus `placements` y no las de Beto.
    - No puede insertar en `placements` (`insufficient_privilege`).
    - No puede leer ni insertar en `usage_log`.
    - No puede hacer `update` de `placed_at`.
  - **Como `anon`:** no puede leer `placements` ni `usage_log`.
- [ ] **Step 2: Correrla para ver que falla.**
  - Run: `npm run db:sql -- supabase/tests/placement_checks.sql`
  - Expected: FAIL con `column "placed_at" does not exist` o `relation "public.placements" does not exist`.
- [ ] **Step 3: Escribir la migración.**
  - `alter table public.profiles add column placed_at timestamptz;`
  - Las dos tablas, con `enable row level security`.
  - `placements`: la política `placements_select_own` (`(select auth.uid()) = user_id`), `revoke all ... from anon, authenticated` y `grant select ... to authenticated`.
  - `usage_log`: `revoke all ... from anon, authenticated`. Solo escribe la función con la llave de admin, y lo lee la fase 5.
  - No se cambia ningún `grant update` de `profiles`: el nivel, la estación y `placed_at` solo los escribe la función.
- [ ] **Step 4: Aplicarla y correr las dos pruebas de la base.**
  - Run: `npm run db:push && npm run db:sql -- supabase/tests/placement_checks.sql && npm run db:sql -- supabase/tests/base_checks.sql`
  - Expected: `Aplicada: 20261021000000_placement.sql`, `OK: pruebas de la fase 2` y `OK: pruebas de la fase 1`.
- [ ] **Step 5: Agregar `placed_at` al front.**
  - Va en `Profile`, en el `select` de `GetProfile` y en los objetos `Profile` de las pruebas, con `null`.
  - En el store se agrega el getter `isPlaced`.
  - Run: `npm run test && npm run type-check`. Expected: todo en PASS.
- [ ] **Step 6: Commit**: `feat: tablas de evaluación y de gasto de IA`

---

### Task 2: Lógica de la IA (TS puro, probada con Vitest)

**Files:**
- Create: `supabase/functions/_shared/placementTypes.ts`, `pricing.ts`, `aiErrors.ts`, `placementLogic.ts`, `limits.ts`, y un `*.test.ts` por cada uno salvo `placementTypes.ts`
- Modify: `vite.config.ts` (alias `@shared` y `test.include`), `tsconfig.app.json` (`paths` e `include` de `_shared`)

**Interfaces:**
- Produces:
  - En `placementTypes.ts`:
    - `type LevelId = "L0" | "A1" | "A2" | "B1"`.
    - `type QuestionKind = "escuchar" | "completar" | "responder"`.
    - `interface PlacementAnswer { level: LevelId; kind: QuestionKind; prompt: string; answer: string | null; correct: boolean | null }`. Aquí `answer: null` es "No sé", y `correct` es `null` en las preguntas abiertas.
    - `interface PlacementRequest { answers: PlacementAnswer[] }` e `interface PlacementResult { level: LevelId; unitId: string; resumen: string }`.
    - `type AiErrorCode = "datos" | "limite" | "presupuesto" | "ia"`.
  - En `pricing.ts`: `costUsd(usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): number`.
  - En `aiErrors.ts`: `classifyAnthropicError(error: { status?: number; message?: string; error?: unknown }): "presupuesto" | "ia"`.
  - En `placementLogic.ts`:
    - `validatePlacementRequest(body: unknown): PlacementRequest | null`.
    - `highestLevel(answers: PlacementAnswer[]): LevelId`.
    - `clampLevel(level: LevelId, max: LevelId): LevelId`.
    - `parsePlacementOutput(text: string): { level: LevelId; resumen: string } | null`.
    - `firstUnitOf(level: LevelId): string`.
    - `buildPlacementPrompt(answers: PlacementAnswer[]): string`.
    - `PLACEMENT_SYSTEM: string` y `PLACEMENT_SCHEMA: object`.
  - En `limits.ts`: `PLACEMENT_DAILY_MAX = 5` e `isOverDailyLimit(callsLast24h: number, max: number): boolean`.

- [ ] **Step 1: Escribir las pruebas que fallan.** Estas son las aserciones:
  - **`pricing.test.ts`:**
    - `costUsd({ input_tokens: 1_000_000, output_tokens: 0 })` es `0.10`.
    - `costUsd({ input_tokens: 0, output_tokens: 1_000_000 })` es `0.50`.
    - `costUsd({ input_tokens: 800, output_tokens: 120, cache_read_input_tokens: 0 })` es `0.00014`, con `toBeCloseTo(…, 8)`.
    - Con `input_tokens: 150_000` el resultado es `0.075`, porque arriba de 100k cuesta 5×.
  - **`aiErrors.test.ts`:**
    - `{ status: 400, message: "400 You have reached your specified API usage limits. You will regain access on 2026-11-01" }` → `"presupuesto"`.
    - La variante `"…specified workspace API usage limits…"` → `"presupuesto"`.
    - `{ status: 429, error: { error: { details: { error_code: "enforced_spend_limit_reached" } } } }` → `"presupuesto"`.
    - `{ status: 429, message: "rate limited" }`, `{ status: 529 }`, `{ status: 500 }`, `{ message: "Request timed out." }` y un 400 cualquiera → `"ia"`.
  - **`placementLogic.test.ts`:**
    - `validatePlacementRequest`:
      - Acepta 3 respuestas válidas.
      - Regresa `null` con `{}`, con `answers` vacío, con más de 12 respuestas, con un `prompt` o `answer` de más de 300 caracteres, con `level: "C2"`, con `kind: "otro"` y con `correct: "sí"`.
    - `highestLevel` de respuestas L0, L0, A1 → `"A1"`.
    - `clampLevel("B1", "A1")` → `"A1"` y `clampLevel("L0", "A2")` → `"L0"`.
    - `parsePlacementOutput`:
      - `'{"level":"A2","resumen":"Ya entiendes frases de trabajo."}'` → `{ level: "A2", resumen: … }`.
      - Regresa `null` con `"no es json"`, con `'{"level":"C1","resumen":"x"}'` y con un resumen vacío.
      - Con un resumen de más de 300 caracteres lo recorta a 300.
    - `firstUnitOf`: `"L0"` → `"l0-saludar"`, `"A1"` → `"a1-quien-eres"`, `"A2"` → `"a2-junta"`, `"B1"` → `"b1-opinion"`.
    - `buildPlacementPrompt`:
      - Incluye cada `prompt` y su `answer`.
      - Escribe `"No sé"` cuando `answer` es `null`.
      - Escribe `"correcta"` o `"incorrecta"` en las de opción múltiple.
  - **`limits.test.ts`:** `isOverDailyLimit(4, 5)` es `false` e `isOverDailyLimit(5, 5)` es `true`.
  - **Una prueba en `src/curriculum/units.test.ts`:** para cada nivel, `firstUnitOf(nivel)` es igual al id de la primera meta de ese nivel en `units`. Así el mapa de `_shared` no se desincroniza del temario.
- [ ] **Step 2: Correrlas para ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL, porque los módulos no existen.
- [ ] **Step 3: Implementar.**
  - **`costUsd`:** suma `(input × 0.10 + cache_creation × 0.125 + cache_read × 0.01 + output × 0.50) / 1e6`, y multiplica por 5 si `input + cache_creation + cache_read > 100_000`.
  - **`classifyAnthropicError`:** sigue la regla de las Global Constraints. En el 429, busca `error_code` en `error.error.details` y en `error.details`.
  - **`PLACEMENT_SCHEMA`:** `{ type: "object", properties: { level: { type: "string", enum: ["L0","A1","A2","B1"] }, resumen: { type: "string" } }, required: ["level","resumen"], additionalProperties: false }`.
  - **`PLACEMENT_SYSTEM`** (texto exacto):

```
Eres el evaluador de Habla, una app para que adultos hispanohablantes aprendan inglés para la vida real.
Recibes las respuestas de una evaluación corta. Las de opción múltiple ya vienen calificadas; las abiertas son texto que la persona escribió o dictó.
Decide en qué línea empieza:
- L0: casi no entiende inglés; necesita saludos, números y frases básicas.
- A1: entiende y dice frases simples sobre sí misma, su familia y compras.
- A2: se comunica en situaciones comunes: trabajo, restaurante, direcciones, viajes.
- B1: da opiniones, cuenta experiencias y resuelve problemas con cierta fluidez.
Califica las abiertas por comunicación, no por perfección: si se entiende y responde lo que se pidió, cuenta. "No sé" o una respuesta vacía no cuenta, sin castigar más.
Si dudas entre dos niveles, elige el más bajo: es mejor empezar fácil.
Escribe "resumen" en español de México, en máximo dos frases cortas y 35 palabras en total, hablándole de tú pero sin escribir la palabra "tú", en voz activa.
La primera frase dice lo que ya puede hacer; la segunda empieza con "Primero vas a practicar" y nombra un tema de su primera línea, no una regla de gramática.
Ejemplo: "Ya entiendes saludos y frases básicas. Primero vas a practicar cómo hablar de ti y de tu trabajo."
Sin emojis, sin signos de admiración y sin mencionar errores ni calificaciones.
```

  - Nota de la ejecución (2026-10-21): en la prueba real, la primera versión del prompt dio resúmenes de más de 300 caracteres que empezaban con "Tú ya puedes…". Por eso se fijó el máximo de 35 palabras, el inicio "Primero vas a practicar" y el ejemplo. Además, `parsePlacementOutput` corta en una frase completa.

  - **`buildPlacementPrompt`:** una línea por respuesta, `"{n}. [{level}] ({kind}) {prompt} → {answer|"No sé"} ({correcta|incorrecta|abierta})"`, más una línea final con el nivel más alto que se alcanzó.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run type-check`
  - Expected: todo en PASS.
- [ ] **Step 5: Commit**: `feat: lógica de la IA para la evaluación (precios, errores, prompt y validación)`

---

### Task 3: Edge Function `placement`, secreto y despliegue

**Files:**
- Create: `supabase/functions/placement/index.ts`
- Modify: `scripts/db.mjs` (comandos `secrets` y `fn-deploy`), `package.json` (`db:secrets`, `fn:deploy`), `README.md` (sección IA)

**Interfaces:**
- Consumes: todo `_shared` (Tarea 2) y las tablas (Tarea 1).
- Produces:
  - `POST {SUPABASE_URL}/functions/v1/placement` con el JWT del usuario y el cuerpo `PlacementRequest`.
  - Si sale bien: 200 con `PlacementResult`. Si no: `{ error: AiErrorCode }` con los códigos de las Global Constraints.

- [ ] **Step 1: Subir el secreto.**
  - Agrega `secrets` a `db.mjs`: lee `ANTHROPIC_API_KEY` de `.env.local` y hace `POST /v1/projects/{ref}/secrets` con `[{ name: "ANTHROPIC_API_KEY", value }]`. Después lista solo los **nombres** con `GET /v1/projects/{ref}/secrets`. Nunca imprime el valor.
  - Run: `npm run db:secrets`
  - Expected: la lista incluye `ANTHROPIC_API_KEY`.
- [ ] **Step 2: Escribir `supabase/functions/placement/index.ts`.**
  - Usa `export default { fetch: withSupabase({ auth: "user" }, async (req, ctx) => …) }` con `import { withSupabase } from "npm:@supabase/server@1"` y `import Anthropic from "npm:@anthropic-ai/sdk@0.135.0"`. Los módulos de `_shared` se importan con `../_shared/x.ts`. Los pasos, en orden:
    1. Si el método no es POST, responde 405.
    2. Pasa el cuerpo por `validatePlacementRequest`. Si da `null`, responde 400 `datos`.
    3. Cuenta en `usage_log`, con `ctx.supabaseAdmin`, las filas con `function = 'placement'` de ese `user_id` (`ctx.userClaims.id`) en las últimas 24 h. Si `isOverDailyLimit`, responde 429 `limite`.
    4. Llama a `client.messages.create(...)` con la configuración de las Global Constraints, `system: PLACEMENT_SYSTEM` y un solo mensaje `user` con `buildPlacementPrompt(answers)`.
       - Si el SDK lanza un error, guarda `usage_log` solo si trae `usage`; si no, guarda una fila con ceros para que cuente en el límite. Luego responde según `classifyAnthropicError`: 402 `presupuesto` o 502 `ia`.
       - Si `stop_reason` no es `end_turn`, o `parsePlacementOutput` da `null`: guarda `usage_log` y **repite la llamada una vez**, como pide el spec en la sección 9. Si vuelve a fallar, guarda `usage_log` otra vez y responde 502 `ia`.
    5. Guarda `usage_log` con `costUsd(message.usage)`.
    6. Calcula `level = clampLevel(output.level, highestLevel(answers))` y `unitId = firstUnitOf(level)`.
    7. Con `ctx.supabaseAdmin` inserta en `placements` (`kind: "inicial"`, `result_level`, `details: { answers, ai: output }`) y actualiza `profiles` con `level`, `current_unit_id` y `placed_at = now`.
    8. Responde 200 `{ level, unitId, resumen: output.resumen }`.
- [ ] **Step 3: Desplegar.**
  - Agrega `fn-deploy` a `db.mjs`. Corre `npx supabase functions deploy placement --use-api --project-ref <ref>` con la entrada estándar cerrada.
  - Si la CLI se cuelga por la prueba de conexión a Postgres, usa la Management API: `POST /v1/projects/{ref}/functions/deploy?slug=placement` en multipart, con `metadata` (`entrypoint_path: "index.ts"`) y los archivos de `placement/` y `_shared/`. Anota en el README cuál de los dos funcionó.
  - Run: `npm run fn:deploy`
  - Expected: `Deployed Functions … placement`.
- [ ] **Step 4: Probar la función sin sesión.**
  - Run: `curl -s -o /dev/null -w "%{http_code}" -X POST https://<ref>.supabase.co/functions/v1/placement -H "Content-Type: application/json" -d "{}"`
  - Expected: `401`. Eso confirma que está publicada y que pide sesión. La prueba con la IA de verdad se hace en la Tarea 6.
- [ ] **Step 5: Agregar la sección "IA" al README:**
  - Dónde vive la key: en `.env.local` y en los secretos de Supabase.
  - Cómo subirla con `npm run db:secrets`.
  - Cómo publicar la función con `npm run fn:deploy`.
  - Que el tope de $5 se pone en Settings → Billing → Spend limits, sin recarga automática.
- [ ] **Step 6: Commit**: `feat: Edge Function placement con la key en los secretos de Supabase`

---

### Task 4: Banco de preguntas y flujo adaptativo

**Files:**
- Create: `src/curriculum/placement.ts`, `src/common/PlacementFlow.ts`
- Test: `src/curriculum/placement.test.ts`, `src/common/PlacementFlow.test.ts`

**Interfaces:**
- Consumes: `LevelId`, `QuestionKind` y `PlacementAnswer` de `@shared/placementTypes`.
- Produces:
  - `interface PlacementQuestion { id: string; level: LevelId; kind: QuestionKind; instruction: string; text: string; options?: string[]; correct?: number }`.
  - `const placementQuestions: PlacementQuestion[]`.
  - `interface PlacementState { index: number; answers: PlacementAnswer[]; done: boolean }`.
  - `startPlacement(): PlacementState`, `currentQuestion(state): PlacementQuestion` y `answerQuestion(state, value: number | string | null): PlacementState`. En `answerQuestion`, `number` es la opción elegida, `string` el texto abierto y `null` "No sé".

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`placement.test.ts`:**
    - Hay 12 preguntas, 3 por nivel, en el orden L0, A1, A2, B1.
    - En cada nivel el orden es `escuchar`, `completar`, `responder`.
    - Las de opción múltiple tienen 4 opciones y un `correct` entre 0 y 3.
    - Las abiertas no tienen `options`.
  - **`PlacementFlow.test.ts`:**
    - Fallar o decir "No sé" en las dos de opción múltiple de L0 termina la evaluación sin la pregunta abierta: `done` después de 2 respuestas.
    - Acertar 1 de 2 en L0 hace la abierta de L0 y termina: `done` con 3 respuestas.
    - Acertar las 2 de L0 y contestar la abierta pasa a A1: `currentQuestion` tiene `level: "A1"`.
    - Acertar todo llega a B1 y termina con 12 respuestas.
    - Cada `PlacementAnswer` guardada lleva `correct: true/false` en las de opción múltiple, `null` en las abiertas, y `answer: null` cuando fue "No sé".
- [ ] **Step 2: Correrlas para ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar el banco** (texto exacto; la respuesta correcta va primero en la tabla, y en el código las opciones se guardan en el orden indicado):

| id | nivel | tipo | instruction | text | opciones (correcta = índice) |
|---|---|---|---|---|---|
| l0-escuchar | L0 | escuchar | Escucha y elige qué significa | Good morning. | Buenas noches. / **Buenos días.** / Hasta luego. / Mucho gusto. (1) |
| l0-completar | L0 | completar | Elige la palabra que completa la frase | My ___ is Ana. | years / from / **name** / morning (2) |
| l0-responder | L0 | responder | Responde en inglés | What is your name? | — |
| a1-escuchar | A1 | escuchar | Escucha y elige qué significa | Where do you live? | **¿Dónde vives?** / ¿A qué te dedicas? / ¿Cuántos años tienes? / ¿De dónde eres? (0) |
| a1-completar | A1 | completar | Elige la palabra que completa la frase | I ___ coffee every morning. | drinks / **drink** / drinking / drank (1) |
| a1-responder | A1 | responder | Responde en inglés | What do you do on weekends? | — |
| a2-escuchar | A2 | escuchar | Escucha y elige qué significa | Could you tell me how to get to the station? | ¿Sabe a qué hora sale el tren? / ¿Me puede llamar un taxi? / **¿Me podría decir cómo llegar a la estación?** / ¿La estación está cerrada hoy? (2) |
| a2-completar | A2 | completar | Elige la palabra que completa la frase | Last weekend I ___ to the beach with my family. | **went** / go / have gone / going (0) |
| a2-responder | A2 | responder | Responde en inglés, en dos o tres frases | Tell me about your job. | — |
| b1-escuchar | B1 | escuchar | Escucha y elige qué significa | If I had known about the meeting, I would have prepared a presentation. | Como sé de la junta, voy a preparar una presentación. / Si hay junta, prepararé una presentación. / Supe de la junta y preparé una presentación. / **Si hubiera sabido de la junta, habría preparado una presentación.** (3) |
| b1-completar | B1 | completar | Elige la palabra que completa la frase | I've been working here ___ 2019. | for / **since** / from / during (1) |
| b1-responder | B1 | responder | Da tu opinión en inglés | What would you change about your city, and why? | — |

- [ ] **Step 4: Implementar el flujo.** Por cada nivel hay dos preguntas de opción múltiple y luego la abierta:
  - Si no acertó ninguna de las dos, termina sin hacer la abierta.
  - Si acertó al menos una, hace la abierta.
  - Después de la abierta, si acertó las dos y no está en B1, sigue al siguiente nivel. En cualquier otro caso, termina.
  - Las funciones son puras: regresan un estado nuevo y no cambian el anterior.
- [ ] **Step 5: Correr las pruebas.**
  - Run: `npm run test`
  - Expected: PASS.
- [ ] **Step 6: Commit**: `feat: banco de la evaluación y flujo adaptativo`

---

### Task 5: Audio normal y lento

**Files:**
- Create: `src/composables/useSpeechOutput.ts`
- Test: `src/composables/useSpeechOutput.test.ts`

**Interfaces:**
- Produces: `useSpeechOutput(): { supported: boolean; speak: (text: string, slow?: boolean) => void }`.

- [ ] **Step 1: Escribir las pruebas que fallan.** Usan un `speechSynthesis` falso en `window`, con `speak`, `cancel` y `getVoices`, y un `SpeechSynthesisUtterance` falso:
  - `speak("Good morning.")` cancela lo anterior y habla con `lang` `"en-US"`, `rate` 1 y la voz `en-US`.
  - `speak(x, true)` usa `rate` 0.8.
  - Sin voz `en-US` usa la primera que empiece con `"en"`.
  - Sin ninguna voz en inglés, `supported` sigue en `true` y se habla solo con `lang`.
  - Sin `speechSynthesis` en `window`, `supported` es `false` y `speak` no hace nada ni truena.
- [ ] **Step 2: Correrlas para ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - `supported = typeof window !== "undefined" && "speechSynthesis" in window`.
  - Las voces se buscan en el momento de hablar, porque `getVoices()` puede llegar vacío al principio.
  - Siempre se llama `cancel()` antes de `speak()`, porque así se recupera la cola atorada de iOS.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: audio normal y lento con la voz del navegador`

---

### Task 6: Pantallas de Evaluación y Resultado

**Files:**
- Create: `src/Views/Evaluacion/EvaluacionPage.vue`, `src/Views/Resultado/ResultadoPage.vue`, `src/Services/Placement/PlacementService.ts`, `src/Services/interfaces/Placement/PlacementInterface.ts`, `src/common/BudgetMonth.ts`
- Modify: `src/stores/auth.ts` (acción `finishPlacement` y estado `lastPlacement`), `src/router/index.ts` (rutas y regla), `src/Views/Motivo/MotivoPage.vue` (después de guardar va a `evaluacion`)
- Test: `src/Views/Evaluacion/EvaluacionPage.test.ts`, `src/Views/Resultado/ResultadoPage.test.ts`, `src/common/BudgetMonth.test.ts`, `src/router/index.test.ts` (casos nuevos), `src/Views/Motivo/MotivoPage.test.ts` (destino)

**Interfaces:**
- Consumes: `PlacementResult` y `AiErrorCode` (Tarea 2), la función (Tarea 3), el banco y el flujo (Tarea 4), y `useSpeechOutput` (Tarea 5).
- Produces:
  - `PlacementService.Run(answers: PlacementAnswer[]): Promise<PlacementResult>`. Lanza `PlacementError`, que se exporta desde `PlacementService.ts` como `class PlacementError extends Error { code: AiErrorCode | "sin-conexion" }`.
  - `budgetMonthText(now: Date): { mes: string; siguiente: string }`, por ejemplo `{ mes: "octubre", siguiente: "1 de noviembre" }`.
  - Rutas `/evaluacion` (`name: "evaluacion"`) y `/resultado` (`name: "resultado"`).

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`BudgetMonth.test.ts`:**
    - 2026-10-21 da `{ mes: "octubre", siguiente: "1 de noviembre" }`.
    - 2026-12-05 da `{ mes: "diciembre", siguiente: "1 de enero" }`.
  - **Guard** (con `go`):
    - Autenticado, con motivo y sin `placed_at`: `/mi-linea` manda a `evaluacion`.
    - Con `placed_at`: `/evaluacion` manda a `hoy`, y `/resultado` sin `lastPlacement` manda a `hoy`.
    - Sin motivo, sigue mandando a `motivo` aunque no tenga `placed_at`.
  - **`MotivoPage`:** después de guardar llega a `evaluacion`, porque el perfil de prueba no tiene `placed_at`.
  - **`EvaluacionPage`** (con `PlacementService` y `useSpeechOutput` falsos y `enableAutoUnmount`):
    - **Arranque:** muestra "Pregunta 1, de unas 12", "Escucha y elige qué significa", los botones "Escuchar" y "Más lento" y el botón "No sé".
    - **Botones de audio:** tocar "Escuchar" llama `speak("Good morning.", false)`, y "Más lento" llama `speak("Good morning.", true)`.
    - **Sin audio:** con `supported: false` se ve la frase "Good morning." escrita y el aviso "Tu navegador no puede leer en voz alta. Lee la frase."
    - **Dos "No sé":** después de "No sé" dos veces aparece "Ver mi resultado".
    - **Una sola llamada:** tocar "Ver mi resultado" dos veces seguidas llama `PlacementService.Run` una sola vez, con 2 respuestas.
    - **Si sale bien:** con `Run` resuelto en `{ level: "A2", unitId: "a2-junta", resumen: "…" }`, se navega a `resultado`. El store queda con `lastPlacement` y con `profile.level`, `current_unit_id` y `placed_at` llenos.
    - **Presupuesto agotado:** con `Run` rechazado con `code: "presupuesto"` (fecha 2026-10-21), muestra "Se terminó el presupuesto de IA de octubre" y "Vuelve el 1 de noviembre." Sigue en la evaluación, y "Intentar de nuevo" vuelve a llamar `Run` con las mismas respuestas.
    - **La IA no respondió:** con `code: "ia"` muestra "La IA no respondió" y "Lo intentamos dos veces. Prueba de nuevo en un minuto."
    - **Límite diario:** con `code: "limite"` muestra "Ya hiciste la evaluación varias veces hoy" y "Vuelve mañana para intentarlo otra vez."
    - **Sin conexión:** con `code: "sin-conexion"` muestra "Sin conexión a internet" y "Tus respuestas siguen aquí. Revisa tu conexión y vuelve a intentar."
  - **`ResultadoPage`:**
    - Con `lastPlacement` en A2 y `a2-junta`, muestra "Tu línea es la verde", "Empiezas en A2", el resumen y "Presentarte en una junta" con "Primera estación".
    - Con L0 muestra "Empiezas en Nivel 0".
    - El botón "Continuar" lleva a `hoy`.
- [ ] **Step 2: Correrlas para ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar el servicio y el store.**
  - **`PlacementService.Run`:**
    - Llama `supabase.functions.invoke("placement", { body: { answers } })`.
    - Con `FunctionsHttpError` lee `await error.context.json()` y lanza su `error`.
    - Con `FunctionsFetchError`, o sin internet, lanza `sin-conexion`.
    - Con cualquier otra cosa lanza `ia`.
  - **`finishPlacement(answers)`:** llama `Run`. Con el resultado actualiza `profile` (`level`, `current_unit_id` y `placed_at = new Date().toISOString()`) y `lastPlacement`.
- [ ] **Step 4: Implementar el guard.**
  - Las reglas quedan en este orden:
    1. Sin sesión: `bienvenida`.
    2. Sin motivo: `motivo`.
    3. Sin `placed_at`: solo deja ver `evaluacion`.
    4. Con `placed_at`: si va a `bienvenida`, `motivo` o `evaluacion`, lo manda a `hoy`. `resultado` solo se ve si hay `lastPlacement`; si no, también manda a `hoy`.
  - `MotivoPage` cambia `router.replace({ name: "hoy" })` por `{ name: "evaluacion" }`. El guard igual corrige el destino si ya hizo la evaluación.
- [ ] **Step 5: Implementar las pantallas.**
  - **EvaluacionPage**, como la 1.3: `.l-meter` en rosa, `.l-audio` y `.l-ans`.
    - **Encabezado:** "Pregunta {n}, de unas 12" y la barra de avance al `n / 12`.
    - **Escuchar:** la instrucción, los botones "Escuchar" (oscuro) y "Más lento", y las 4 opciones como placas `.l-ans`. Si no hay audio, la frase va escrita arriba de las opciones con el aviso de las pruebas.
    - **Completar:** la frase con el `___`, en `font-display` de 22px, y las 4 opciones.
    - **Responder:**
      - Arriba, la pregunta en inglés en 22px, con su botón "Escuchar".
      - Un `textarea` con la etiqueta "Tu respuesta en inglés" y el texto chico "En el iPhone puedes tocar el micrófono del teclado para dictar."
      - Abajo, el botón `go` "Siguiente", que se activa cuando hay texto.
    - **Siempre visibles:** el botón `quiet` "No sé" y el texto chico del diseño, "Elegir "No sé" está bien: nos ayuda a saber por dónde empezar. La evaluación termina sola cuando se pone difícil."
    - **Al terminar:** la pantalla dice "Listo, ya tenemos tus respuestas" y el botón `go` "Ver mi resultado", que se desactiva mientras envía. Arriba del botón, la placa del error si lo hubo. El aviso de presupuesto va en amarillo, con `budgetMonthText`.
    - **Una sola acción rosa:** en las preguntas de opción múltiple no hay botón rosa, porque al tocar una opción se pasa a la siguiente. En las abiertas, la acción rosa es "Siguiente".
  - **ResultadoPage**, como la 1.4: el letrero `.l-sign` del color del nivel, con "Tu línea es la {linea en minúsculas}", "Empiezas en {nombre}" y el resumen.
    - Debajo, `LineaVertical` con las 3 primeras metas del nivel, la primera como actual, y la etiqueta "Primera estación" en lugar de "Estás aquí". Para eso `LineaVertical` recibe el prop `currentLabel?: string`, que por defecto es "Estás aquí".
    - El botón `go` dice "Continuar". En la fase 4 se cambia por "Empezar mi primera sesión".
- [ ] **Step 6: Correr todo, publicar y probar con la IA de verdad.**
  - Run: `npm run test && npm run lint && npm run build && npm run deploy`. Expected: todo en PASS y `Deployed habla`.
  - **Prueba a mano (Fernando):**
    1. Corre `npm run db:sql -- --query "update public.profiles set placed_at = null"`.
    2. En `https://habla.oloferolo.workers.dev`, entra, haz la evaluación y ve el resultado.
    3. Revisa que `npm run db:sql -- --query "select level, current_unit_id, placed_at is not null as evaluado from public.profiles"` muestre el nivel nuevo.
    4. Revisa que `npm run db:sql -- --query "select function, input_tokens, output_tokens, cost_usd from public.usage_log order by created_at desc limit 3"` tenga la llamada, con un costo menor a $0.01.
  - Revisa también en la consola de Anthropic que el gasto del día coincida más o menos con la suma de `usage_log`.
- [ ] **Step 7: Commit**: `feat: evaluación inicial con IA y letrero de resultado`

---

## Correcciones de la revisión independiente (2026-10-22)

- **Límite diario sin carreras:** `reserve_ai_call` cuenta y reserva en un solo paso, con un candado por persona (migración `20261022000000_placement_hardening.sql`). Con 10 peticiones al mismo tiempo y un máximo de 3, se probó que solo entran 3.
  - Ahora el límite cuenta evaluaciones, no intentos.
  - Si se acabó el presupuesto y no se gastó nada, la reserva se libera.
- **Reintentos en nuestro código:** el SDK va con `maxRetries: 0` y `timeout` de 25 s.
  - Hay máximo 3 intentos, solo ante fallas pasajeras (red, 408, 409, 429, 5xx) o una respuesta inválida, nunca ante presupuesto agotado, una negativa (`refusal`) o un 400.
  - No empieza otro intento después de 60 s.
  - Todos los tokens se suman en la fila reservada.
- **Guardado en un paso:** `save_placement` actualiza el perfil e inserta la evaluación en la misma transacción, y solo si `placed_at` todavía es null.
  - Si ya estaba evaluado, la función responde 409 `ya-evaluado`, y la pantalla recarga el perfil y lleva a Hoy.
- **Códigos nuevos:**
  - `servidor` (500): "No se guardó tu resultado".
  - `sesion` (401 de `withSupabase`): "Tu sesión se cerró", con el botón "Entrar otra vez".
  - `datos` ahora muestra "Algo salió mal con tus respuestas", con el botón "Empezar de nuevo".
- **Nadie se queda atorado:** con `presupuesto`, `limite`, `ia` o `servidor`, la pantalla ofrece "Empezar en Nivel 0 por ahora" (`{ fallback: true }`), que no usa IA.
- **Pruebas:** el flujo de la función vive en `_shared/placementHandler.ts` y lo prueba Vitest con dependencias falsas (18 casos). También se agregaron:
  - las pruebas de `PlacementService`;
  - el doble toque de verdad;
  - los ejemplos reales del error de presupuesto;
  - las pruebas SQL de las dos funciones nuevas.
- **Riesgo aceptado:** el servidor confía en las respuestas que manda el navegador (nivel y si fue correcta). Alguien podría ponerse un nivel más alto, pero solo se engaña a sí mismo. Se deja para después: el servidor calificaría con el banco movido a `_shared`.

