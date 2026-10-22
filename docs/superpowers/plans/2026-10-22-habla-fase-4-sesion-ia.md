# Habla, Fase 4 (Sesión diaria con IA): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La sesión de hoy queda completa, con sus 4 partes: Repasar, Aprender, Conversar y Resumen.
- **Conversar:** practicas con un personaje de la IA (el mesero, tu jefa, la recepcionista) en la escena de tu meta.
  - Hablas con la voz o escribes.
  - Si algo se puede decir mejor, aparece en una placa verde y entra a tu repaso.
- **Aprender:** suma "Otro ejemplo", que escribe la IA según tu motivo, y "Decirla en voz alta".
- **Resumen:** te dice lo que hiciste bien y lo que conviene practicar.

**Architecture:**
- **El temario** se mueve a `supabase/functions/_shared/curriculum/`, para que la Edge Function lo lea igual que la app. Los archivos de `src/curriculum/` quedan como re-exports.
  - Cada meta suma `escenas`: una para trabajo y otra para viajes, cada una con su personaje.
- **Una sola Edge Function, `session`,** con tres acciones:
  - `start`: prepara la sesión del día y guarda la fila en `sessions`.
  - `turn`: un turno de la conversación.
  - `close`: el resumen.
  - En `usage_log` cada acción se registra con su nombre del spec 7.1: `session-generate`, `conversation-turn` y `session-close`.
- **La lógica pura vive en `_shared/` y la prueba Vitest,** igual que en la fase 2:
  - Los reintentos se extraen de `placementHandler` a `aiCall.ts`.
  - Los prompts, esquemas y lectores de respuesta van en `sessionPrompts.ts`.
  - El flujo, con las dependencias inyectadas, va en `sessionHandler.ts`.
- **El servidor guarda la conversación.** La app solo manda el texto de la persona y nunca el historial.
- **Voz de entrada intercambiable** (`useSpeechInput`):
  - En Chrome o Edge de computadora y en Android usa el reconocimiento del navegador, manteniendo presionado el micrófono.
  - En iPhone y en navegadores sin reconocimiento usa un cuadro de texto, con el dictado del teclado.

**Tech Stack:** el mismo de las fases 1 a 3. Las únicas novedades son la tabla `sessions` y la dev-dependency `@anthropic-ai/sdk@0.135.0`, solo para las pruebas de la IA.

**Spec:** `docs/superpowers/specs/2026-10-07-english-app-design.md`, secciones 3, 5.3, 7 (voz e IA), 7.1, 7.2 (`situación` y `personaje`), 8 (`sessions`), 9, 10, 11 y 12. Pantallas 2.1, 2.3, 2.4, 2.5, 2.6 y los avisos de `docs/design/habla-pantallas.html`.

## Global Constraints

- **Siguen vigentes las Global Constraints de las fases 1 a 3:**
  - Textos en español, sin "¡" ni "·" ni emojis.
  - Una sola acción rosa por pantalla y botones de 52px.
  - Estilo BaseFront.
  - Commit por tarea, y push solo si Fernando lo pide.
  - Máximo 4 frases nuevas de lección al día y 15 repasos al día.
- **IA, igual que `placement`:**
  - Modelo `claude-haiku-5-5`, con `thinking: { type: "disabled" }` y `output_config: { effort: "low", format: { type: "json_schema", schema } }`.
  - El SDK va con `maxRetries: 0` y `timeout: 25_000`. Nuestro ciclo hace hasta 3 intentos y no empieza uno nuevo después de 60 s.
  - En los esquemas todas las propiedades van en `required`, con `additionalProperties: false`, y sin `minimum`, `maximum`, `minLength`, `maxLength` ni `maxItems`. Los largos los recorta el lector de la respuesta.
- **Caché:**
  - Los prompts de sistema son texto fijo: sin fechas, nombres ni ids.
  - El contexto de la sesión (meta, escena, nivel y motivo) va en un segundo bloque de `system`, que es igual en toda la sesión.
  - `turn` usa `cache_control: { type: "ephemeral" }` en el nivel superior (caché automática de la conversación).
- **Sin streaming (decisión del 2026-10-22):** las respuestas son JSON cortos de unas 60 palabras como máximo. Con streaming habría que leer JSON a medias. Se revisa si en el piloto la espera se siente larga.
- **Límites por persona en 24 horas, con `reserve_ai_call`:** `session-generate` 3, `conversation-turn` 40 y `session-close` 3.
  - **Por conversación:** máximo 10 turnos de la persona. En el turno 10 el personaje se despide y la conversación termina.
  - **Por sesión:** máximo 3 correcciones guardadas en el repaso.
- **Una sesión por día local** (`unique (user_id, date)`):
  - Abrirla otra vez la continúa donde se quedó, sin otra llamada a la IA.
  - Ya terminada, Hoy dice "Ya hiciste tu sesión de hoy. Vuelve mañana."
- **Apoyo en español** (spec 5.3), con `supportFor(level)`:
  - **L0 y A1:** la traducción se ve desde el principio y hay frases sugeridas.
  - **A2:** la traducción sale con un toque ("En español") y hay frases sugeridas.
  - **B1:** la traducción sale con un toque y no hay sugerencias. El servidor también las quita.
- **Correcciones:**
  - Van en la placa verde, con tono amable. Nunca dicen "error" ni "mal", y nunca van en rojo.
  - Entran a `phrases` con `source = 'correccion'`, `en = mejor`, `es = mejor_es` y `due_on = date + 1 día`.
  - No cuentan en el máximo de 4 frases nuevas, porque `CountLearnedToday` solo cuenta `leccion`.
- **Si la IA no está disponible,** la sesión no se atora:
  - Repasar y Aprender funcionan igual que en la fase 3.
  - Conversar muestra el aviso que corresponde y ofrece "Saltar la conversación".
  - `close` siempre termina la sesión. Sin IA, el resumen sale sin "Lo que hiciste bien".
- **Privacidad (spec 11):** no se guarda audio. A la app solo llega texto, y la conversación vive en `sessions.transcript`, que solo ve su dueño.
- **Textos exactos de la pantalla:**
  - **Encabezado y escena:** "Con {personaje_es}". Arriba del chat va la placa azul con `escena_es` y, en negritas, "Tu objetivo:" seguido de `objetivo_es`.
  - **Líneas del personaje:** las acciones "Escuchar" y "En español".
  - **Sugerencias:** el título "Si no sabes qué decir:".
  - **Corrección:** "Se entendió. Suena mejor así:", luego la frase `mejor` en negritas y la `nota`. Si se guardó, "Guardada en tu repaso".
  - **Escribir o dictar:**
    - Teclado: el placeholder "Toca y dicta con el teclado" y el aviso "En el iPhone puedes tocar el micrófono del teclado para dictar."
    - Micrófono: "Mantén presionado mientras hablas", "Te estoy escuchando", "Prefiero escribir", y después de hablar, "Enviar" y "Otra vez".
  - **Avisos de la conversación:**
    - **IA:** "La IA no respondió", con "Lo intentamos dos veces. Prueba de nuevo en un minuto." y "Intentar de nuevo".
    - **Límite:** "Ya practicaste mucho hoy", con "Vuelve mañana o repasa tus frases."
    - **Presupuesto:** "Se terminó el presupuesto de IA de {mes}", con "Vuelve el {siguiente}. El repaso sigue disponible." Usa `budgetMonthText`.
    - **Micrófono:** "Falta permiso para el micrófono", con "Toca el candado junto a la dirección de la página y activa “Micrófono”." y "Escribir mientras tanto".
  - **Botones de la conversación:** "Terminar conversación", "Ver tu resumen", "Saltar la conversación" y "Preparando la conversación…".
  - **Aprender:** "Otro ejemplo", "Decirla en voz alta", "Se entendió bien." y "Se entendió: “{texto}”. Inténtalo otra vez."
  - **Resumen:** "Lo que hiciste bien", "Para la próxima" y "Agregamos {n} frases a tu repaso."
  - **Hoy:** "Conversar con {personaje_es}", "Continuar sesión" y "Esta semana practicaste {n} días." (con 1, "1 día"; con 0 no se muestra).

## Review Focus

1. **La IA falla o se niega a media conversación:**
   - Lo que escribió la persona se queda en el cuadro y aparece "La IA no respondió" con "Intentar de nuevo".
   - La conversación guardada no gana medio turno.
   - Lo cubren las pruebas de `sessionHandler` (`turn` con falla: no llama `saveTurns`) y de `ConversationView` (Tareas 4 y 9).
2. **Se acaba el presupuesto o el límite diario durante la sesión:**
   - Repasar y Aprender siguen funcionando, y Conversar muestra la placa correspondiente con "Saltar la conversación".
   - `close` termina la sesión sin IA.
   - Lo cubren las pruebas de `sessionHandler` (`close` sin reserva) y de `SesionPage` (Tareas 4 y 10).
3. **Se recarga a media sesión, o se abre en dos pestañas:**
   - `start` regresa la sesión que ya existe sin gastar.
   - Dos turnos al mismo tiempo no se duplican: el segundo recibe `conflicto` y la app vuelve a cargar la conversación.
   - Lo cubren las pruebas de `sessionHandler` (Tarea 4) y de `ConversationView` (Tarea 9).
4. **No hay permiso de micrófono, o el navegador no tiene reconocimiento (Firefox, iPhone):**
   - Aparece la placa azul y la persona pasa a escribir.
   - En iPhone, el modo de entrada es el teclado desde el principio.
   - Lo cubren las pruebas de `SpeechStrategy`, `useSpeechInput` y `ChatInput` (Tareas 6 y 9).
5. **La IA corrige algo que ya estaba bien, o corrige de más:**
   - Hay máximo una corrección por turno y máximo 3 guardadas por sesión.
   - Una corrección cuyo `mejor` es igual al original se descarta.
   - En las pruebas de la IA, 80% o más de los casos se corrigen o no se corrigen como se espera.
   - Lo cubren las pruebas de `sessionPrompts` y de `sessionHandler`, y la evaluación (Tareas 3, 4 y 5).

## Estructura de archivos

```
supabase/functions/_shared/curriculum/units.ts  levels.ts  pictograms.ts   # movidos desde src (+ escenas)
supabase/functions/_shared/aiCall.ts            # reintentos (sale de placementHandler)
supabase/functions/_shared/sessionTypes.ts  sessionPrompts.ts  sessionHandler.ts
supabase/functions/session/index.ts             # la Edge Function (start, turn y close)
supabase/migrations/20261024000000_sessions.sql  supabase/tests/sessions_checks.sql
evals/conversation.eval.ts  vitest.eval.config.ts
src/curriculum/units.ts  levels.ts  src/common/PictogramTypes.ts           # re-exports
src/common/SpeechStrategy.ts  src/common/SameWords.ts  src/composables/useSpeechInput.ts
src/Services/Session/SessionService.ts  src/Services/interfaces/Session/SessionInterface.ts
src/components/SayItAloud.vue  ChatInput.vue  ConversationView.vue
src/components/LessonDeck.vue  SessionSteps.vue                            # cambian
src/Views/Sesion/SesionPage.vue  src/Views/Hoy/HoyPage.vue  SesionHoyPanel.vue  # cambian
```

---

### Task 1: Temario compartido con las funciones, con escenas y personajes

**Files:**
- Move (`git mv`):
  - `src/curriculum/units.ts` → `supabase/functions/_shared/curriculum/units.ts`
  - `src/curriculum/levels.ts` → `supabase/functions/_shared/curriculum/levels.ts`
  - `src/common/PictogramTypes.ts` → `supabase/functions/_shared/curriculum/pictograms.ts`
  - `src/curriculum/units.test.ts` → `supabase/functions/_shared/curriculum/units.test.ts`
- Create: re-exports en las rutas viejas (`export * from "@shared/curriculum/units"`, etc.), para que el resto de la app no cambie sus imports.
- Modify: `index.html` (el símbolo `i-person`: el de `i-waiter` sin el moño) y `supabase/functions/_shared/curriculum/units.ts`.

**Interfaces:**
- Produces:
  - `interface Situation { personaje_es: string; rol_en: string; escena_es: string; objetivo_es: string; pictograma: "waiter" | "person" }`
  - `Unit.escenas: { trabajo: Situation; viajes: Situation }`
  - `sceneFor(unit: Unit, motive: "trabajo" | "viajes" | "ambos" | null, date: string): Situation`
    - `trabajo` da la escena de trabajo y `viajes` la de viajes.
    - `ambos` o `null` alternan según el día del mes de `date`: par es trabajo e impar es viajes.
  - `PictogramName` suma `"person"`.

- [ ] **Step 1: Mover los archivos y crear los re-exports.**
  - Run: `npm run test && npm run type-check`
  - Expected: PASS sin cambiar ningún import de la app.
- [ ] **Step 2: Escribir las pruebas que fallan** en `units.test.ts`:
  - **Las escenas:**
    - Cada meta tiene `escenas.trabajo` y `escenas.viajes`.
    - `personaje_es` empieza con "el ", "la ", "tu " o "un " y tiene 40 caracteres como máximo. `rol_en` tiene 160 como máximo. `escena_es` y `objetivo_es`, 120 como máximo.
    - El pictograma es `waiter` o `person`.
    - Sin "¡", "·" ni emojis.
  - **`sceneFor`:**
    - Con `trabajo` da `escenas.trabajo` y con `viajes`, `escenas.viajes`.
    - Con `ambos`, "2026-10-22" da trabajo y "2026-10-23" da viajes.
    - Con `null` sigue la misma regla que `ambos`.
- [ ] **Step 3: Escribir las 46 escenas.** Reglas:
  - Cada escena es una situación real de la meta: en trabajo, una junta, la oficina o un cliente; en viajes, el hotel, el aeropuerto o la calle.
  - El `objetivo_es` es algo que se logra en 6 a 10 turnos, como "Pide un plato y una bebida, y pregunta cuánto es."
  - El `rol_en` va en inglés, para la IA: quién es el personaje y en qué lugar está. Por ejemplo: "a friendly waiter at Sam's Diner, a casual restaurant".
  - Las metas de comida y cafetería llevan `waiter`; todas las demás, `person`.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run type-check && npm run lint`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: temario compartido con las funciones, con escenas y personajes`

---

### Task 2: Tabla `sessions`

**Files:**
- Create: `supabase/migrations/20261024000000_sessions.sql`, `supabase/tests/sessions_checks.sql`

**Interfaces:**
- Produces: la tabla `public.sessions`:
  - **Columnas:**
    - `id uuid pk default gen_random_uuid()`
    - `user_id uuid fk auth.users on delete cascade`
    - `unit_id text not null`
    - `date date not null`
    - `content jsonb not null default '{}'`
    - `transcript jsonb not null default '[]'`
    - `turns integer not null default 0 check (turns >= 0)`
    - `summary jsonb`
    - `status text not null default 'en_curso' check in ('en_curso','terminada')`
    - `minutes integer check (minutes between 0 and 600)`
    - `created_at timestamptz default now()` y `updated_at timestamptz default now()`
  - **Restricción:** `unique (user_id, date)`.
  - **Permisos:** RLS con `select` de las propias filas, `revoke all from anon, authenticated` y `grant select to authenticated`. Solo la Edge Function escribe, con la llave de admin.

- [ ] **Step 1: Escribir `sessions_checks.sql`**, en el estilo de las otras pruebas, con `FALLO: …` y al final `OK: pruebas de la fase 4`:
  - **Como Ana:** ve su sesión y no la de Beto.
  - **No puede escribir:** `insert`, `update` y `delete` fallan con `insufficient_privilege`.
  - **Una sesión por día:** dos sesiones de Ana en la misma fecha dan `unique_violation` (insertadas como `postgres`).
  - **Como `anon`:** no puede leer `sessions`.
- [ ] **Step 2: Correrla para ver que falla.**
  - Run: `npm run db:sql -- supabase/tests/sessions_checks.sql`
  - Expected: FAIL, con `relation "public.sessions" does not exist`.
- [ ] **Step 3: Escribir la migración y aplicarla.**
  - Run: `npm run db:push`, y luego `npm run db:sql` con `sessions_checks.sql`, `phrases_checks.sql`, `placement_checks.sql` y `base_checks.sql`.
  - Expected: los cuatro `OK`.
- [ ] **Step 4: Commit**: `feat: tabla sessions con RLS`

---

### Task 3: IA compartida: intentos y prompts de la sesión (TS puro)

**Files:**
- Create: `supabase/functions/_shared/aiCall.ts`, `sessionTypes.ts`, `sessionPrompts.ts`
- Modify: `supabase/functions/_shared/placementHandler.ts` (usa `callAi`). Sigue exportando `MODEL`, `AiMessage` y `MessageParams` para `placement/index.ts`.
- Test: `aiCall.test.ts`, `sessionPrompts.test.ts`. `placementHandler.test.ts` debe seguir en PASS sin cambios.

**Interfaces:**
- **Produces, en `aiCall.ts`:**
  - `MODEL = "claude-haiku-5-5"`.
  - `interface MessageParams`, que suma a la de la fase 2:
    - `system: string | { type: "text"; text: string }[]`
    - `messages: { role: "user" | "assistant"; content: string }[]`
    - `cache_control?: { type: "ephemeral" }`
  - `interface UsageTotals { input_tokens; output_tokens; cache_read_input_tokens; cache_creation_input_tokens }`, todos `number`.
  - `callAi<T>(deps: { createMessage(p: MessageParams): Promise<AiMessage>; now(): number }, params: MessageParams, parse: (text: string) => T | null): Promise<{ ok: true; output: T; usage: UsageTotals } | { ok: false; error: "presupuesto" | "ia"; usage: UsageTotals; spent: boolean }>`
    - Es el mismo ciclo de `placementHandler`: hasta 3 intentos, sin intento nuevo después de 60 s, y sin reintentar el presupuesto.
    - Un `refusal` corta el ciclo.
    - Solo lee la respuesta si llegó con `end_turn`.
- **Produces, en `sessionTypes.ts`:**
  - `type SessionAction = "start" | "turn" | "close"`.
  - `interface LessonExtra { en: string; nota: string; ejemplo_en: string; ejemplo_es: string }`.
  - `interface SessionContent { frases: LessonExtra[]; escena: Situation; apertura_en: string; apertura_es: string; sugerencias: string[] }`.
  - `interface Correction { original: string; mejor: string; mejor_es: string; nota: string; guardada: boolean }`.
  - `type Turn = { quien: "persona"; texto: string } | { quien: "personaje"; en: string; es: string; sugerencias: string[]; correccion: Correction | null; terminada: boolean }`.
  - `interface SessionSummary { bien: string[]; correcciones: Correction[] }`.
  - `interface SessionView { id: string; date: string; unitId: string; status: "en_curso" | "terminada"; content: SessionContent; transcript: Turn[]; summary: SessionSummary | null; minutes: number | null }`.
  - `type SessionErrorCode = "datos" | "limite" | "presupuesto" | "ia" | "servidor" | "conflicto" | "terminada"`.
- **Produces, en `sessionPrompts.ts`:**
  - `supportFor(level: LevelId): { translationVisible: boolean; suggestions: boolean }`.
  - `interface SessionContext { unit: Unit; level: LevelId; motive: string | null; scene: Situation }`.
  - **Constructores de la llamada:**
    - `buildStartParams(ctx, phrases: KeyPhrase[]): MessageParams`, con `max_tokens` 900.
    - `buildTurnParams(ctx, transcript: Turn[], text: string, lastTurn: boolean): MessageParams`, con `max_tokens` 350 y `cache_control` en el nivel superior.
    - `buildCloseParams(ctx, transcript: Turn[]): MessageParams`, con `max_tokens` 300.
  - **Lectores de la respuesta:**
    - `parseStartOutput(text, phrases: KeyPhrase[], level: LevelId): Omit<SessionContent, "escena"> | null`.
    - `parseTurnOutput(text, level: LevelId, original: string): { en; es; sugerencias; correccion: Omit<Correction, "guardada"> | null; terminada } | null`.
    - `parseCloseOutput(text): string[] | null`.
  - `turnToAssistantJson(turn): string`, que serializa con un orden fijo de llaves: `en`, `es`, `corregir`, `original`, `mejor`, `mejor_es`, `nota`, `sugerencias` y `terminada`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`aiCall`:**
    - Responde bien a la primera.
    - Un 529 y luego éxito da `ok`, con el uso de los dos intentos sumado.
    - El presupuesto agotado sin gasto previo da `spent: false`.
    - Un `refusal` da `ia` sin reintentar.
    - Un JSON inválido 3 veces da `ia`.
    - Después de 60 s no empieza otro intento.
  - **`supportFor`:**
    - L0 y A1 dan `{ translationVisible: true, suggestions: true }`.
    - A2 da `{ false, true }`.
    - B1 da `{ false, false }`.
  - **`buildTurnParams`:**
    - El primer bloque de `system` es idéntico para dos personas distintas (es fijo).
    - El segundo bloque trae la meta, la escena y el nivel.
    - Los `messages` empiezan con el user "(Empieza la escena.)" y el assistant con la apertura, y alternan con el historial.
    - El último mensaje es el texto nuevo. Con `lastTurn` se le suma la nota "(Nota del sistema: es el último turno; despídete y pon terminada en true.)".
    - Lleva `thinking` disabled, `effort` low, `cache_control` ephemeral y `max_tokens` 350.
  - **`parseTurnOutput`:**
    - Lee un JSON válido.
    - Regresa `null` con un JSON inválido o si falta `en`.
    - Recorta `sugerencias` a 3, y las vacía en B1.
    - Descarta la corrección si `corregir` es false, si `mejor` está vacío, o si `mejor` es igual al original (comparado en minúsculas y sin puntuación).
    - Recorta `nota` a 140 caracteres.
  - **`parseStartOutput`:** solo regresa las frases pedidas, en su orden, aunque la IA mande otras.
  - **`parseCloseOutput`:** recorta a 3 elementos y regresa `null` si no es una lista de textos.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.** Los tres prompts van en español, en el estilo de `PLACEMENT_SYSTEM`:
  - **Turno:**
    - El personaje habla solo en inglés de EE. UU., en 1 o 2 oraciones con un máximo de 25 palabras, y hace una pregunta a la vez.
    - El inglés va según el nivel: L0 con frases de 3 a 6 palabras, A1 en presente simple, A2 en situaciones comunes y B1 natural.
    - `es` es la traducción al español de México.
    - Solo corrige el último mensaje de la persona: lo que cambia el sentido, lo que suena raro o poco amable, o un error típico de hispanohablantes ("I have 30 years", "I want" al pedir, falta de sujeto). No corrige mayúsculas, puntuación ni typos.
    - La `nota` va en español, tiene un máximo de 15 palabras, es amable y no dice "error" ni "mal".
    - Si la persona escribe en español, el personaje le responde en inglés simple, y `mejor` es cómo decirlo en inglés.
    - Si la persona se sale de la escena, el personaje la regresa con amabilidad.
    - Las 3 sugerencias son respuestas que la persona puede decir ahora, de 6 palabras como máximo.
    - `terminada` es true al cumplir el objetivo o en el último turno, y en ese caso el personaje se despide sin hacer pregunta.
  - **Inicio:** para cada frase, un "otro ejemplo" corto, con la misma estructura y del motivo de la persona, y su traducción. Una `nota` solo si la frase no trae, de 15 palabras como máximo. La apertura del personaje y 3 sugerencias.
  - **Cierre:** de 1 a 3 cosas concretas que la persona hizo bien, en español, de 10 palabras como máximo y empezando con un verbo en pasado ("Pediste…", "Entendiste…").
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run type-check`
  - Expected: PASS, incluido `placementHandler.test.ts` sin cambios.
- [ ] **Step 5: Commit**: `feat: prompts de la sesión y reintentos de IA compartidos`

---

### Task 4: Edge Function `session` (start, turn y close)

**Files:**
- Create: `supabase/functions/_shared/sessionHandler.ts`, `supabase/functions/session/index.ts`
- Modify: `supabase/functions/_shared/limits.ts` y `package.json` (`"fn:deploy": "supabase functions deploy --use-api"`, que publica las dos funciones)
- Test: `supabase/functions/_shared/sessionHandler.test.ts`

**Interfaces:**
- Consumes: `callAi`, `sessionPrompts`, `sceneFor` y `costUsd`.
- **Produces, en `limits.ts`:** `SESSION_START_DAILY_MAX = 3`, `CONVERSATION_TURN_DAILY_MAX = 40`, `SESSION_CLOSE_DAILY_MAX = 3`, `MAX_USER_TURNS = 10` y `MAX_SAVED_CORRECTIONS = 3`.
- **Produces, en `sessionHandler.ts`:** `handleSession(body: unknown, deps: SessionDeps): Promise<{ status: number; body: unknown }>`.
- **Lo que manda la app:**
  - `start`: `{ action: "start", date: "AAAA-MM-DD", newEn: string[] }`, con hasta 4 frases.
  - `turn`: `{ action: "turn", sessionId, text }`, con un texto de 1 a 300 caracteres.
  - `close`: `{ action: "close", sessionId }`.
- **Lo que regresa:**
  - `start`: `{ session: SessionView }`.
  - `turn`: `{ persona: Turn; personaje: Turn }`.
  - `close`: `{ summary: SessionSummary; minutes: number }`.
  - Si falla: `{ error: SessionErrorCode }`, con datos 400, limite 429, presupuesto 402, ia 502, servidor 500, conflicto 409 y terminada 409.
- **`SessionDeps`:**
  - **Perfil:** `getProfile()`.
  - **Leer sesiones:** `findSessionByDate(date)` y `getSession(id)`. Las dos filtran por la persona.
  - **Escribir sesiones:**
    - `insertSession(row)`, que regresa `"existe"` si choca con el `unique`.
    - `saveTurns(id, expectedTurns, transcript)`, que regresa `false` si `turns` ya cambió.
    - `closeSession(id, summary, minutes)`.
  - **Correcciones:** `addCorrectionPhrase(unitId, en, es, dueOn)`.
  - **Gasto:** `reserveCall(fn)`, `finishCall(id, usage)` y `releaseCall(id)`.
  - **IA y reloj:** `createMessage(params)` y `now()`.

- [ ] **Step 1: Escribir las pruebas que fallan**, con dependencias falsas que registran las llamadas.
  - **`start`:**
    - Una fecha inválida o más de 4 frases da 400 `datos`.
    - Si ya hay sesión en esa fecha, la regresa sin `reserveCall` ni `createMessage`.
    - Si no hay sesión:
      - Reserva `session-generate`, llama a la IA e inserta la fila.
      - La fila lleva solo las frases de la meta, y la escena sale de `sceneFor(unit, motive, date)`.
      - Llama `finishCall` y responde 200.
    - Sin lugar en el límite da 429 `limite`.
    - Con el presupuesto agotado y sin gasto, da 402 y libera la reserva.
    - Si la IA falla, da 502 `ia` y no inserta nada.
    - Si `insertSession` regresa `"existe"`, que es una carrera con otra pestaña, regresa la sesión que ganó.
  - **`turn`:**
    - Un texto vacío o de más de 300 caracteres da `datos`.
    - Si la sesión es ajena o no existe, da `datos`.
    - Si la sesión ya terminó, da 409 `terminada`.
    - Si la IA falla, da 502 sin llamar `saveTurns`.
    - **Cuando sale bien:**
      - Llama `saveTurns(id, turns, [...transcript, persona, personaje])`.
      - Con corrección, llama `addCorrectionPhrase(unitId, mejor, mejor_es, date + 1)` después de guardar, y marca `guardada: true`.
      - La cuarta corrección de la sesión ya no se guarda (`guardada: false`).
    - Si `saveTurns` regresa `false`, da 409 `conflicto` y no guarda la frase.
    - En el turno 10, los params llevan `lastTurn` y la respuesta trae `terminada: true` aunque la IA diga false. Un turno 11 da `terminada`.
  - **`close`:**
    - Si la sesión ya terminó, regresa su resumen sin gastar.
    - Si la persona no habló ni una vez, cierra sin IA, con `bien` vacío.
    - Si habló:
      - Reserva `session-close`, y con la IA cierra con `bien`.
      - `correcciones` son las primeras 3 de la conversación.
      - `minutes` es `round((now − created_at) / 60000)`, entre 1 y 120.
    - Sin lugar en el límite, con el presupuesto agotado o con la IA fallando, cierra sin IA (`bien` vacío) y responde 200.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar `sessionHandler.ts` e `index.ts`.**
  - `index.ts` sigue el estilo de `placement/index.ts`: `withSupabase({ auth: "user" })` y `ctx.supabaseAdmin`. Toda consulta filtra por `user_id`.
  - `getProfile` lee `level`, `motive` y `current_unit_id`.
  - `saveTurns` usa `.update({ transcript, turns: n + 1, updated_at }).eq("id").eq("user_id").eq("turns", n).select("id")`. Si regresa 0 filas, es conflicto.
  - `addCorrectionPhrase` hace `upsert` en `phrases` con `ignoreDuplicates` y `source: "correccion"`.
- [ ] **Step 4: Correr las pruebas y publicar.**
  - Run: `npm run test && npm run type-check && npm run fn:deploy`
  - Expected: PASS, y Supabase publica `placement` y `session`.
- [ ] **Step 5: Commit**: `feat: edge function session (preparar, conversar y cerrar)`

---

### Task 5: Pruebas de la IA (spec 12)

**Files:**
- Create: `evals/conversation.eval.ts`, `vitest.eval.config.ts` (entorno `node`, con `include: ["evals/**/*.eval.ts"]` y timeout de 180 s)
- Modify: `package.json` (dev-dependency `@anthropic-ai/sdk@0.135.0` y el script `"ai:eval": "vitest run --config vitest.eval.config.ts"`)

**Interfaces:**
- Consumes: `buildTurnParams`, `parseTurnOutput`, `buildStartParams`, `parseStartOutput`, `buildCloseParams`, `parseCloseOutput` y `costUsd`.

- [ ] **Step 1: Escribir la evaluación.**
  - **24 mensajes de la persona,** 6 por nivel (L0, A1, A2 y B1), cada uno con su meta y si debe corregirse o no:
    - La mitad con errores típicos de hispanohablantes: "I have 25 years", "I want a coffee" al pedir, "Is very good", "I am agree", "She have", "I go yesterday", "Can you explain me", "I'm boring" en vez de "bored".
    - La otra mitad, frases correctas o con detalles que no se corrigen, como la falta de mayúscula o de punto.
  - **Se revisa:**
    - Hay acierto en `corregir` en 80% o más de los casos.
    - Cuando corrige, `mejor` es distinto del original y `nota` va en español, sin "error" ni "mal".
    - `en` tiene 30 palabras como máximo y ningún texto tiene "¡" ni emojis.
    - En B1 no hay sugerencias.
  - **Además:** una prueba de `start` con 2 frases, en la que cada una trae su ejemplo, y una de `close` con una conversación corta, que regresa de 1 a 3 cosas bien hechas.
  - **Seguridad y costo:**
    - La key se lee de `.env.local` con `loadEnv`, y nunca se imprime.
    - Al final se imprime el costo total con `costUsd`.
- [ ] **Step 2: Correrla.**
  - Run: `npm run ai:eval`
  - Expected: PASS. Cuesta unos $0.01 USD.
  - Si falla, se ajusta el prompt (Tarea 3) y se vuelve a correr. El README guarda que esta prueba se corre antes de cambiar cualquier prompt.
- [ ] **Step 3: Commit**: `test: pruebas de la IA de la conversación`

---

### Task 6: Voz de entrada intercambiable

**Files:**
- Create: `src/common/SpeechStrategy.ts`, `src/common/SameWords.ts`, `src/composables/useSpeechInput.ts`
- Test: `src/common/SpeechStrategy.test.ts`, `src/common/SameWords.test.ts`, `src/composables/useSpeechInput.test.ts`

**Interfaces:**
- Produces:
  - **`SpeechStrategy.ts`:**
    - `isIOSDevice(nav: { userAgent: string; platform: string; maxTouchPoints: number }): boolean`.
    - `chooseSpeechStrategy(env: { hasRecognition: boolean; isIOS: boolean }): "webSpeech" | "keyboardDictation"`. Usa `webSpeech` solo si hay reconocimiento y no es iOS.
  - **`SameWords.ts`:**
    - `normalizeWords(text: string): string[]`: pasa a minúsculas, quita la puntuación y expande contracciones (i'm, you're, it's, don't, can't, i'd, i'll, we're, they're, let's, what's, that's).
    - `soundsSame(target: string, heard: string): boolean`: es true si al menos 80% de las palabras de `target` aparecen en `heard`.
  - **`useSpeechInput()`:** regresa `{ strategy: Ref<"webSpeech" | "keyboardDictation">; listening: Ref<boolean>; interim: Ref<string>; error: Ref<"" | "permiso" | "fallo">; start(): void; stop(): Promise<string>; useKeyboard(): void }`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`isIOSDevice`:**
    - Es true en un iPhone y en un iPad con `platform: "MacIntel"` y `maxTouchPoints: 5`.
    - Es false en Android, en Chrome de Windows y en una Mac sin pantalla táctil.
  - **`chooseSpeechStrategy`:** cubre las 4 combinaciones.
  - **`soundsSame`:**
    - "I'm fine, thank you." contra "i am fine thank you" es true.
    - "Can I see the menu, please?" contra "can I see the menu" es true.
    - Contra "the menu" es false.
  - **`useSpeechInput`**, con una clase falsa en `window.webkitSpeechRecognition` y el `userAgent` de Chrome de Windows:
    - `start` deja `listening` en true y usa `lang` "en-US" con `interimResults` true.
    - Un `onresult` intermedio actualiza `interim`.
    - `stop` resuelve con el texto final.
    - Un `onerror` con `not-allowed` deja `error: "permiso"` y `strategy: "keyboardDictation"`.
    - Si no llega `onend` en 8 s después de `stop`, llama `abort` y resuelve con lo que haya en `interim`.
    - Sin la clase, o con el `userAgent` de un iPhone, la estrategia es `keyboardDictation`.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.** Sigue los datos verificados de la hoja de ruta: Chrome Android ignora `continuous`, y en iOS hay que llamar `abort()` antes de hablar.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: voz de entrada (reconocimiento del navegador o dictado del teclado)`

---

### Task 7: Servicio de la sesión en la app

**Files:**
- Create: `src/Services/Session/SessionService.ts`, `src/Services/interfaces/Session/SessionInterface.ts`
- Test: `src/Services/Session/SessionService.test.ts`

**Interfaces:**
- Produces:
  - `SessionInterface.ts`: re-exporta los tipos de `@shared/sessionTypes` y agrega `type SessionClientError = SessionErrorCode | "sin-conexion" | "sesion"`.
  - `class SessionError extends Error { code: SessionClientError }`.
  - **`SessionService`:**
    - `Start(date: string, newEn: string[]): Promise<SessionView>`.
    - `Turn(sessionId: string, text: string): Promise<{ persona: Turn; personaje: Turn }>`.
    - `Close(sessionId: string): Promise<{ summary: SessionSummary; minutes: number }>`.
    - `GetTodayStatus(date: string): Promise<"ninguna" | "en_curso" | "terminada">`: hace `select status`, con `eq date` y `maybeSingle`.
    - `CountPracticeDays(from: string, to: string): Promise<number>`: cuenta las sesiones con status `terminada` y `date` entre `from` y `to`.

- [ ] **Step 1: Escribir las pruebas que fallan**, con `supabase.functions.invoke` y `supabase.from` falsos:
  - **Lo que manda:** `Start` llama `invoke("session", { body: { action: "start", date, newEn } })`. `Turn` y `Close` mandan su acción con `sessionId`.
  - **Errores,** con el mismo mapeo que `PlacementService`:
    - Un 401 da `sesion`.
    - Un `FunctionsHttpError` con `{ error: "conflicto" }` da `conflicto`.
    - Si el error no es JSON, da `ia`.
    - Un `FunctionsFetchError` da `sin-conexion`.
  - **`GetTodayStatus`:** sin fila da `"ninguna"`.
  - **`CountPracticeDays`:** filtra `status = terminada`, `gte` y `lte` en `date`.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run type-check`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: servicio de la sesión con IA en la app`

---

### Task 8: Aprender con IA: otro ejemplo y decirla en voz alta

**Files:**
- Create: `src/components/SayItAloud.vue`
- Modify: `src/components/LessonDeck.vue` (la prop `extras`)
- Test: `src/components/SayItAloud.test.ts`, `src/components/LessonDeck.test.ts`

**Interfaces:**
- Consumes: `useSpeechInput` y `soundsSame` (Tarea 6), y `supportFor` (Tarea 3).
- Produces:
  - `<LessonDeck :unit :phrases :today :extras="LessonExtra[] | undefined" @done />`.
    - Las `extras` se buscan por `en`.
    - Si llegan tarde, la frase se actualiza sola.
  - `<SayItAloud :phrase="string" />`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`LessonDeck`:**
    - Con `extras`, muestra "Otro ejemplo" con `ejemplo_en`. En A1 también se ve `ejemplo_es`; en A2, no.
    - Si la frase no trae `nota`, usa la de `extras`.
    - Sin `extras`, se ve igual que en la fase 3.
  - **`SayItAloud`**, con `useSpeechInput` falso:
    - **Con `webSpeech`:** el botón `line` "Decirla en voz alta" escucha, y mientras tanto se ve "Te estoy escuchando".
      - Si lo que se oyó es igual a la frase, sale la placa verde "Se entendió bien.".
      - Si no, sale "Se entendió: “the menu”. Inténtalo otra vez.".
    - **Con `keyboardDictation`:** se ve un cuadro de texto con "Toca el micrófono del teclado y dila en inglés." y un botón `quiet` "Revisar".
    - **Con el error `permiso`:** sale la placa azul de micrófono, y "Escribir mientras tanto" cambia al cuadro de texto.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar,** según la pantalla 2.3:
  - "Otro ejemplo" va en gris de 13px, y el ejemplo en bold de 15px.
  - "Decirla en voz alta" es un botón `line` con el ícono `#i-mic`.
  - "Siguiente frase" sigue siendo la única acción rosa.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run lint`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: otro ejemplo y decirla en voz alta en Aprender`

---

### Task 9: Conversar (pantallas 2.4 y 2.5)

**Files:**
- Create: `src/components/ChatInput.vue`, `src/components/ConversationView.vue`
- Test: `src/components/ChatInput.test.ts`, `src/components/ConversationView.test.ts`

**Interfaces:**
- Consumes: `SessionService.Turn` y `Start` (para recargar si hay conflicto), `useSpeechInput`, `useSpeechOutput`, `supportFor` y `budgetMonthText`.
- Produces:
  - `<ChatInput v-model="string" :disabled="boolean" @send="(text: string) => void" />`.
  - `<ConversationView :session="SessionView" :level="LevelId" @done="() => void" />`. Emite `done` cuando la persona toca "Ver tu resumen" o "Terminar conversación".

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`ChatInput`:**
    - **Con `keyboardDictation`:** un `textarea` (`lang="en"`, `maxlength` 300) con el placeholder "Toca y dicta con el teclado", y el botón rosa de enviar con `#i-send`, que emite `send` con el texto.
    - **Con `webSpeech`:**
      - `pointerdown` en el micrófono llama `start`, y `pointerup` llama `stop`.
      - Después se ven el texto, "Enviar" (rosa) y "Otra vez" (quiet).
      - "Prefiero escribir" cambia al teclado.
    - **Con el error `permiso`:** sale la placa azul con "Escribir mientras tanto".
  - **`ConversationView`**, con `SessionService` falso:
    - Muestra "Con el mesero", la placa de la escena con "Tu objetivo:" y la apertura del personaje con "Escuchar" y "En español".
    - En A1 la traducción se ve desde el principio. En A2 se ve hasta tocar "En español".
    - **Al enviar:**
      - Llama `Turn(id, texto)`.
      - Agrega la burbuja negra de la persona y la respuesta del personaje.
      - Si hay corrección, la placa verde dice "Se entendió. Suena mejor así:", `mejor` y "Guardada en tu repaso".
    - **Sugerencias:**
      - En A2 se ven con "Si no sabes qué decir:", y tocar una la pone en el cuadro de texto, sin enviarla.
      - En B1 no hay sugerencias.
    - **Avisos:**
      - Si `Turn` falla con `ia`, el texto se queda, aparece "La IA no respondió" e "Intentar de nuevo" vuelve a mandar el mismo texto.
      - Con `presupuesto` sale la placa amarilla del mes.
      - Con `limite` sale "Ya practicaste mucho hoy".
      - Con `sin-conexion` sale "Sin conexión a internet" con "Reintentar", y el texto también se queda.
      - Con `conflicto` llama `Start(date, [])` y muestra la conversación recargada.
    - **Final:**
      - Con `terminada` se oculta el cuadro de texto y aparece el botón rosa "Ver tu resumen", que emite `done`.
      - Después del primer turno de la persona, "Terminar conversación" (quiet) también emite `done`.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar,** según las pantallas 2.4 y 2.5:
  - **El chat** usa `.l-ai`, `.l-you`, `.l-fix` y `.l-sugg`, y el personaje va en un pictograma `l1` (`waiter` o `person`).
  - **El micrófono** es el círculo rosa de 84px con su anillo (`outline`, sin sombra), y el texto en vivo va en `.l-live`.
  - **El audio:** llama `useSpeechOutput().speak` solo con un toque. Antes de hablar, si se está escuchando, se cancela el reconocimiento.
  - **El scroll:** el chat baja solo al último mensaje.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run lint`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: conversar con el personaje (voz o texto)`

---

### Task 10: La sesión completa con IA

**Files:**
- Modify: `src/Views/Sesion/SesionPage.vue` y `src/components/SessionSteps.vue` (los 4 pasos: "Repasar", "Aprender", "Conversar" y "Resumen")
- Test: `src/Views/Sesion/SesionPage.test.ts`

**Interfaces:**
- Consumes: `SessionService` (Tarea 7), `ConversationView` (Tarea 9) y `LessonDeck` con `extras` (Tarea 8).

- [ ] **Step 1: Escribir las pruebas que fallan**, con los servicios falsos:
  - **El camino completo:**
    - Con 2 repasos y 2 frases nuevas, `Start(today, [en1, en2])` se llama al abrir, sin esperar a que termine para empezar a repasar.
    - En Aprender se ve "Otro ejemplo" en cuanto `Start` responde.
    - En Conversar se ve `ConversationView`.
    - Al terminar la conversación se llama `Close(id)`.
    - **El resumen muestra:**
      - "Sesión terminada" y "{minutos} minutos en {meta}".
      - "Lo que hiciste bien" con la lista de `bien`.
      - "Para la próxima", con los pares tachado → mejor de las correcciones.
      - "Repasaste 2 frases" y "Aprendiste 2 frases nuevas".
      - "Agregamos {2 + guardadas} frases a tu repaso."
  - **Sin IA:**
    - Si `Start` falla con `presupuesto`, se puede repasar y aprender igual, sin "Otro ejemplo".
    - Conversar muestra la placa amarilla con "Saltar la conversación", que lleva al resumen sin "Lo que hiciste bien".
  - **Esperando a la IA:** mientras `Start` no responde, Conversar dice "Preparando la conversación…".
  - **Si la IA falla en Conversar:** "Intentar de nuevo" vuelve a llamar `Start`.
  - **Sesiones de hoy que ya existen:**
    - Si `Start` regresa una sesión `terminada`, se ve directo su resumen.
    - Si regresa una sesión `en_curso` con conversación, y no hay repasos ni frases nuevas, se abre en Conversar con los turnos anteriores.
  - **Si `Close` falla con `sin-conexion`:** sale el aviso con "Intentar de nuevo".
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.** El resumen es la pantalla 2.6: `.l-chk` para lo bien hecho y `.l-good` con `.l-pair` para las correcciones. Los puntos de estación llegan en la fase 5, con `unit_progress`.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: sesión de hoy completa con conversación y resumen de la IA`

---

### Task 11: Hoy con la sesión de IA

**Files:**
- Modify: `src/Views/Hoy/HoyPage.vue`, `src/Views/Hoy/SesionHoyPanel.vue`, `src/common/Dates.ts` (`weekStart`) y `src/common/Greeting.ts` (los días de práctica)
- Test: `HoyPage.test.ts`, `SesionHoyPanel.test.ts`, `Dates.test.ts` y `Greeting.test.ts`

**Interfaces:**
- Produces:
  - `weekStart(date: string): string`: el lunes de esa semana.
  - `practiceDaysText(n: number): string`: "Esta semana practicaste 4 días.", "Esta semana practicaste 1 día." o `""`.
  - **`SesionHoyPanel`** suma las props `sessionStatus: "ninguna" | "en_curso" | "terminada"` y `personaje: string`:
    - El paso 3 es "Conversar con {personaje}", y no va en gris.
    - Los minutos son `Math.ceil(repasos × 0.6 + nuevas × 1.5 + 10)`.
    - **El botón:**
      - Con `ninguna` dice "Empezar sesión", y con `en_curso`, "Continuar sesión".
      - Con `terminada` no hay botón y dice "Ya hiciste tu sesión de hoy. Vuelve mañana."
    - **El avance temporal:** "Seguir a la próxima estación" es rosa solo si la sesión de hoy ya terminó. Antes es `line`.
- Consumes: `SessionService.GetTodayStatus` y `CountPracticeDays`, y `sceneFor`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`weekStart`:** "2026-10-22" (jueves) da "2026-10-19", y "2026-11-01" (domingo) da "2026-10-26".
  - **`practiceDaysText`:** 0 da "", 1 da "… 1 día." y 4 da "… 4 días.".
  - **`SesionHoyPanel`:** cubre los tres estados de la sesión y el paso "Conversar con el mesero".
  - **`HoyPage`:**
    - Carga una sola vez el estado de hoy y los días de práctica.
    - Con `terminada` no ofrece la sesión.
    - El saludo suma "Esta semana practicaste 3 días."
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: Hoy con la sesión de IA y los días de práctica`

---

### Task 12: Publicar, documentar y probar

**Files:**
- Modify: `README.md` (la sección "Sesión con IA (fase 4)") y la hoja de ruta (la fase 4 con ✅ y el enlace a este plan, y el riesgo del temario como resuelto)

- [ ] **Step 1: Documentar en el README:**
  - Cómo se publica la función `session`.
  - Los límites del día.
  - `npm run ai:eval`, con su costo y la regla de correrla antes de cambiar un prompt.
  - La consulta del gasto por función: `select function, count(*), sum(cost_usd) from public.usage_log group by function`.
- [ ] **Step 2: Correr todo y publicar.**
  - Run: `npm run test && npm run lint && npm run build && npm run fn:deploy && npm run deploy`
  - Expected: todo en PASS, y `Deployed habla`.
- [ ] **Step 3: Prueba a mano (Fernando).**
  - **En el iPhone, con Safari y la app instalada:**
    1. Haz la sesión de hoy.
    2. En Conversar, dicta con el micrófono del teclado y equivócate a propósito, por ejemplo con "I want a coffee". Debe salir la placa verde, y la frase debe aparecer mañana en Repaso.
  - **En la computadora, con Chrome:** mantén presionado el micrófono y habla.
  - **El gasto:** revisa con la consulta del README. Una sesión debe costar menos de $0.01.
- [ ] **Step 4: Commit**: `docs: fase 4 publicada`

---

### Agregado del 2026-10-22: Practicar (ejercicios)

Fernando pidió ejercicios para comprobar si recuerda las frases, además de leerlas. Lo aprobó con este diseño:

- **Un paso nuevo en la sesión:** Repasar → Aprender → **Practicar** → Conversar → Resumen.
  - Son unos 6 ejercicios con las frases nuevas de hoy, más 2 recientes del repaso (`PhrasesService.GetRecent`).
- **Tipos** (`src/common/Exercises.ts`), que se turnan por nivel:
  - Elegir el significado, escuchar y elegir, ordenar las palabras (de 3 a 9 palabras), completar y escribir en inglés.
  - Escribir solo sale desde A2.
  - Sin voz del navegador no hay "escuchar".
  - Si a una frase no le toca un tipo, usa el siguiente.
- **Completar lo prepara la IA en `start`:**
  - `LessonExtra` suma `hueco` (copiado tal cual de la frase), `trampas` (2 versiones equivocadas del mismo hueco, típicas de hispanohablantes) y `por_que`.
  - `parseStartOutput` descarta el ejercicio si el hueco no está en la frase o no hay 2 trampas distintas.
  - `max_tokens` de `start` sube a 1400.
- **Pantalla** (`ExerciseDeck`):
  - Se marca la respuesta y se confirma con "Revisar". Luego sale "Correcto." o "Era: …", con la explicación, en placa verde o azul y nunca en rojo.
  - Lo que falla vuelve al final, hasta 3 intentos.
  - El resumen dice "Ejercicios: acertaste X de N a la primera."
- **Repaso:** "Practicar con ejercicios" (`/repaso/ejercicios`) arma 8 ejercicios con frases recientes, sin IA.
- **Evaluación:** `npm run ai:eval` revisa que al menos 3 de 4 frases traigan su ejercicio de completar bien armado. En la meta del hotel salieron 3 de 4: la cuarta traía un hueco que no estaba en la frase y se descartó.

### Agregado del 2026-10-22: ayuda en la conversación y "Seguir practicando"

Fernando: "no a todos se les facilita chatear o hablar". Aprobó este diseño:

- **Tres niveles de ayuda** (`_shared/ayuda.ts`):
  - **guiada:** se elige la respuesta entre 3 opciones con su traducción, con un toque.
  - **con ayuda:** se escribe o se dicta, con sugerencias.
  - **libre:** sin sugerencias.
  - Las sugerencias ahora son `{ en, es }`, y se guardan siempre en la conversación. Mostrarlas o no lo decide la app según la ayuda.
- **Ajuste automático al cerrar** (`nextAyuda`):
  - **Le costó:** no habló, o la mitad o más de sus mensajes necesitaron corrección. Más ayuda, y la recomendación es ejercicios.
  - **Le salió bien:** 3 mensajes o más, máximo 1 corrección y, en guiada, llegó al final de la escena; con ayuda, la mayoría con sus palabras. Menos ayuda.
  - La función la guarda en `profiles.ayuda`. La persona también la cambia con "Más ayuda" o "Menos ayuda" (`grant update (ayuda)`).
- **Seguir practicando:**
  - `start` con `practice: true` crea una sesión `kind = 'practica'` con la otra escena de la meta (se turnan si hay más de una) y sin frases nuevas.
  - La sesión del día queda única con un índice parcial (`where kind = 'diaria'`). Hoy, los días de práctica y `findSessionByDate` solo miran la diaria.
- **Límites:** preparar y cerrar suben a 6 al día. Los 40 turnos siguen siendo el tope del gasto. El turno sube a 500 tokens, porque las sugerencias traen su traducción.
- **El avance temporal (`advance_unit`)** ya no cuenta las correcciones (`source = 'leccion'`).
