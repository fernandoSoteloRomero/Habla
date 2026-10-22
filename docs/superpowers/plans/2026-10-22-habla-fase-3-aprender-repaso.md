# Habla, Fase 3 (Aprender y Repaso): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde Hoy se practica a diario sin gastar en IA.
- "Empezar sesión" repasa las frases que tocan, con un máximo de 15 al día, y enseña hasta 4 frases nuevas de la meta actual.
- La pestaña Repaso deja repasar cuando quieras y muestra las frases que más cuestan.
- Cuando ya aprendiste las 6 frases de tu meta, un botón temporal te lleva a la siguiente estación.

**Architecture:**
- **Las frases clave** viven en el temario (`src/curriculum/units.ts`, 6 por meta).
- **El repaso de cada persona** vive en la tabla `phrases`, con RLS y cada quien con sus filas.
- **El algoritmo de repetición espaciada** es una función pura en `src/common/SpacedRepetition.ts`. Las fechas se manejan como fechas locales `AAAA-MM-DD`.
- **La sesión de hoy** tiene tres partes en esta fase: Repasar, Aprender y Resumen. "Conversar" llega en la fase 4.
- **El avance temporal de estación** usa la función de base `advance_unit`. En la fase 5 se reemplaza por la conversación final.

**Tech Stack:** el mismo de las fases 1 y 2. Esta fase no usa IA ni dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-07-english-app-design.md`, secciones 5.3 (aprender y repasar), 5.4, 7.2 (`frases_clave`), 8 (`phrases`) y 12. Pantallas 2.1, 2.2, 2.3, 2.6 y 3.1 de `docs/design/habla-pantallas.html`.

## Global Constraints

- **Siguen vigentes las Global Constraints de las fases 1 y 2:** textos en español, tokens de Línea, una sola acción rosa por pantalla, botones de 52px, estilo BaseFront, commit por tarea y push solo si Fernando lo pide.
- **Repaso (spec 5.4), con valores exactos:**
  - **"No me acordé":** intervalo 1 día, `lapses + 1` y `ease = max(1.3, ease − 0.2)`.
  - **"Me costó":** `interval = max(3, round(interval × 1.2))` y `ease = max(1.3, ease − 0.15)`.
  - **"Fácil":** `interval = max(7, round(interval × ease))`, sin cambiar `ease`.
  - **En todas:** `reps + 1`, `due_on = hoy + interval` y `reviewed_on = hoy`.
  - **Frases nuevas:** `due_on` = mañana, `interval_days` = 1 y `ease` = 2.5.
  - **Máximo 15 repasos al día.** Primero van las más atrasadas (`due_on` ascendente) y, si empatan, las de más `lapses`.
- **Aprender:** máximo 4 frases nuevas por sesión, de las 6 frases clave de la meta actual, en orden y sin repetir las que ya están en el repaso.
- **Audio:** `useSpeechOutput` de la fase 2, normal y lento (0.6). Si el navegador no puede leer en voz alta, la frase ya está escrita en la tarjeta.
- **Fechas:**
  - "Hoy" es la fecha local del teléfono (`AAAA-MM-DD`) y se calcula una sola vez al abrir la pantalla.
  - Nunca se usa UTC para las fechas del repaso.
- **Avance temporal** (decisión de Fernando del 2026-10-22):
  - Se puede pasar a la siguiente estación cuando las 6 frases clave de la meta actual ya están en su repaso.
  - Al cruzar de línea, por ejemplo de `l0-nombre` a `a1-quien-eres`, también cambia el nivel.
  - En la última meta (`b1-viaje`) no hay botón.
- **Las frases clave nunca se repiten en todo el temario,** porque `phrases` tiene `unique (user_id, en)`.

## Review Focus

1. **Hay más de 15 frases vencidas:**
   - La sesión y la pestaña Repaso solo dan 15.
   - Después de 15 repasos en el día, Repaso dice "Ya repasaste 15 frases hoy" y no ofrece más.
   - Lo cubren las pruebas de `PhrasesService.GetReviewQueue` y de `RepasoPage` (Tarea 4).
2. **Se recarga a media lección, o se abre la sesión en dos pestañas:** las frases no se duplican en el repaso (`unique` + `ignoreDuplicates`), y la siguiente lección sigue con las que faltan. Lo cubren la prueba SQL y las de `pickNewPhrases` (Tareas 2 y 3).
3. **Un repaso cerca de la medianoche o a fin de mes:** las fechas se calculan con la fecha local, y `addDays` cruza bien meses y años. Lo cubren las pruebas de `Dates` (Tarea 2).
4. **Calificar una tarjeta sin internet:** la tarjeta no avanza, aparece el aviso "No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar." y se puede volver a calificar. Lo cubren las pruebas de `ReviewDeck` (Tarea 4).
5. **Terminar las frases de la última meta (`b1-viaje`):** no aparece "Seguir a la próxima estación". En su lugar dice "Llegaste al final de la ruta." Lo cubren las pruebas de `SesionHoyPanel` (Tarea 6).

## Estructura de archivos

```
src/
├── curriculum/units.ts                     # + frases_clave (6 por meta, 138 en total)
├── common/Dates.ts  common/SpacedRepetition.ts  common/LessonPicker.ts
├── Services/Phrases/PhrasesService.ts  Services/interfaces/Phrases/PhraseInterface.ts
├── Services/Profile/ProfileService.ts      # + AdvanceUnit
├── components/ReviewDeck.vue  components/LessonDeck.vue  components/SessionSteps.vue
├── Views/Repaso/RepasoPage.vue  Views/Repaso/TarjetasPage.vue
├── Views/Sesion/SesionPage.vue
└── Views/Hoy/SesionHoyPanel.vue            # pasos con números reales y botón
supabase/migrations/20261023000000_phrases.sql  supabase/tests/phrases_checks.sql
```

---

### Task 1: Frases clave del temario

**Files:**
- Modify: `src/curriculum/units.ts`. Agrega a `Unit` el campo `frases_clave: KeyPhrase[]`, con `interface KeyPhrase { en: string; es: string; nota?: string }`.
- Test: `src/curriculum/units.test.ts`

**Interfaces:**
- Produces: `Unit.frases_clave` (6 por meta) y el tipo `KeyPhrase`.

- [ ] **Step 1: Escribir las pruebas que fallan**, con estas aserciones:
  - Cada meta tiene exactamente 6 `frases_clave`.
  - Cada `en` y cada `es` tiene entre 2 y 120 caracteres.
  - Cada `nota`, si existe, tiene 120 caracteres como máximo.
  - Ningún `en` se repite en todo el temario (comparando `trim().toLowerCase()`).
  - Ningún texto tiene "·", "¡" ni emojis (`/\p{Extended_Pictographic}/u`).
  - Al menos 2 frases de cada meta tienen `nota`.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL, porque no existe `frases_clave`.
- [ ] **Step 3: Escribir las 138 frases.** Reglas:
  - Inglés de EE. UU., natural y para usarse de verdad en la situación de la meta.
  - El nivel tiene que corresponder a la línea: Nivel 0 son frases de 1 a 4 palabras, A1 frases simples en presente, A2 incluye pasado y frases de cortesía, y B1 frases con opinión o condición.
  - Español de México en `es`.
  - Una `nota` corta en español en las frases donde hay un error típico de hispanohablantes o un uso que conviene explicar, como en el diseño 2.3: "I'd like" es la forma amable de decir "I want".
  - El motivo (trabajo, viajes o ambos) no cambia las frases clave. Lo usará la IA en la fase 4.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test && npm run type-check`
  - Expected: todo en PASS.
- [ ] **Step 5 (Fernando): Revisar las frases** en `src/curriculum/units.ts`, sobre todo las de A2, y pedir cambios si hacen falta.
- [ ] **Step 6: Commit**: `feat: frases clave del temario (6 por meta)`

---

### Task 2: Repetición espaciada, fechas y lección del día (TS puro)

**Files:**
- Create: `src/common/Dates.ts`, `src/common/SpacedRepetition.ts`, `src/common/LessonPicker.ts`
- Test: `src/common/Dates.test.ts`, `src/common/SpacedRepetition.test.ts`, `src/common/LessonPicker.test.ts`

**Interfaces:**
- Produces:
  - `Dates.ts`:
    - `localDate(d: Date): string`, que da `"AAAA-MM-DD"` con la hora local.
    - `addDays(date: string, days: number): string`.
  - `SpacedRepetition.ts`:
    - `type Rating = "no-me-acorde" | "me-costo" | "facil"`.
    - `interface SrsState { interval_days: number; ease: number; reps: number; lapses: number }`.
    - `interface SrsUpdate extends SrsState { due_on: string; reviewed_on: string }`.
    - `rate(state: SrsState, rating: Rating, today: string): SrsUpdate`.
    - `nextIntervals(state: SrsState): Record<Rating, number>`.
    - `intervalLabel(days: number): string`.
    - `newPhraseState(today: string): SrsState & { due_on: string }`.
    - `MAX_REVIEWS_PER_DAY = 15`.
  - `LessonPicker.ts`:
    - `pickNewPhrases(unit: Unit, learnedEn: string[], max?: number): KeyPhrase[]`, con `max` 4 por defecto.
    - `allLearned(unit: Unit, learnedEn: string[]): boolean`.

- [ ] **Step 1: Escribir las pruebas que fallan**, con estas aserciones:
  - **Fechas:**
    - `localDate(new Date(2026, 9, 22, 23, 59))` es `"2026-10-22"`.
    - `addDays("2026-10-31", 1)` es `"2026-11-01"`.
    - `addDays("2026-12-31", 1)` es `"2027-01-01"`.
    - `addDays("2026-02-27", 3)` es `"2026-03-02"`.
  - **Repetición espaciada:**
    - **Frase nueva** (`newPhraseState("2026-10-22")`): `{ interval_days: 1, ease: 2.5, reps: 0, lapses: 0, due_on: "2026-10-23" }`.
    - **"No me acordé"** en `{ interval_days: 10, ease: 2.5, reps: 4, lapses: 0 }` el 2026-10-22: `{ interval_days: 1, ease: 2.3, reps: 5, lapses: 1, due_on: "2026-10-23", reviewed_on: "2026-10-22" }`.
    - **"Me costó":**
      - Con `interval_days: 1` y `ease: 2.5` da `interval_days` 3 (es el mínimo) y `ease` 2.35.
      - Con `interval_days: 10` da 12.
    - **"Fácil":**
      - Con `interval_days: 1` y `ease: 2.5` da 7 (es el mínimo).
      - Con `interval_days: 10` y `ease: 2.5` da 25, sin cambiar `ease`.
    - **El `ease` nunca baja de 1.3**, ni después de 10 "No me acordé" seguidos.
    - **Para una frase nueva:** `nextIntervals` es `{ "no-me-acorde": 1, "me-costo": 3, facil: 7 }`.
    - **Etiquetas:** `intervalLabel(1)` es `"Vuelve mañana"` e `intervalLabel(3)` es `"En 3 días"`.
  - **Lección del día** (con la meta `a2-junta`):
    - Sin nada aprendido, `pickNewPhrases` da las 4 primeras.
    - Con las 4 primeras aprendidas, da las 2 que faltan.
    - Con las 6 aprendidas, da `[]` y `allLearned` es `true`.
    - Compara sin importar mayúsculas ni espacios.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar** con los valores de las Global Constraints. `addDays` trabaja con `Date.UTC` sobre los componentes de la fecha, para que no le afecte el horario de verano.
- [ ] **Step 4: Correr las pruebas.**
  - Run: `npm run test`
  - Expected: PASS.
- [ ] **Step 5: Commit**: `feat: repetición espaciada, fechas locales y lección del día`

---

### Task 3: Base de datos del repaso y servicios

**Files:**
- Create: `supabase/migrations/20261023000000_phrases.sql`, `supabase/tests/phrases_checks.sql`, `src/Services/Phrases/PhrasesService.ts`, `src/Services/interfaces/Phrases/PhraseInterface.ts`
- Modify: `src/Services/Profile/ProfileService.ts` (`AdvanceUnit`)
- Test: `src/Services/Phrases/PhrasesService.test.ts`

**Interfaces:**
- Produces:
  - **Tabla `public.phrases`:**
    - Columnas: `id bigint identity pk`, `user_id uuid fk`, `en text`, `es text`, `source text check in ('leccion','correccion')`, `unit_id text`, `due_on date`, `interval_days int ≥ 1 default 1`, `ease numeric(4,2) between 1.3 and 5 default 2.5`, `reps int default 0`, `lapses int default 0`, `reviewed_on date null` y `created_at`.
    - Restricciones: `unique (user_id, en)`, y `en` y `es` de 200 caracteres como máximo.
  - **Función `public.advance_unit(p_next_unit text, p_next_level text, p_required integer) returns boolean`:**
    - Es `security definer` y usa `auth.uid()`. La puede llamar `authenticated`, pero no `anon`.
    - Si la persona tiene al menos `p_required` frases con `unit_id` igual a su `current_unit_id`, mueve `current_unit_id` y `level` y regresa `true`. Si no, regresa `false` sin cambiar nada.
    - Es **temporal**: en la fase 5 se reemplaza por la conversación final.
  - **`interface Phrase`:** `{ id: number; en: string; es: string; unit_id: string; due_on: string; interval_days: number; ease: number; reps: number; lapses: number; reviewed_on: string | null }`.
  - **`PhrasesService`:**
    - `GetReviewQueue(today: string): Promise<{ phrases: Phrase[]; reviewedToday: number }>`: da las que vencen hasta hoy, limitadas a `15 − reviewedToday`.
    - `SaveReview(id: number, update: SrsUpdate): Promise<void>`.
    - `AddLessonPhrases(userId: string, unitId: string, phrases: KeyPhrase[], dueOn: string): Promise<void>`: hace upsert con `ignoreDuplicates`.
    - `GetLearnedEn(unitId: string): Promise<string[]>`.
    - `GetStats(today: string): Promise<{ tomorrow: number; week: number; total: number; hardest: Phrase[] }>`. `week` cuenta las que vencen de mañana a hoy + 7, y `hardest` son hasta 3 con `lapses > 0`, ordenadas por `lapses` de mayor a menor.
    - Todos lanzan un error si falla la consulta.
  - **`ProfileService.AdvanceUnit(nextUnitId: string, nextLevel: LevelId, required: number): Promise<boolean>`.**

- [ ] **Step 1: Escribir `supabase/tests/phrases_checks.sql`.** Mismo estilo que las otras pruebas: `FALLO: …` y al final `OK: pruebas de la fase 3`. Estas son las aserciones:
  - **Como Ana (authenticated):**
    - Inserta sus frases de lección y las ve.
    - No ve las frases de Beto.
    - No puede insertar una frase con `user_id` de Beto ni con `source: 'correccion'`.
    - Insertar la misma frase dos veces no la duplica (con `on conflict do nothing`).
    - Puede hacer `update` de `due_on`, `interval_days`, `ease`, `reps`, `lapses` y `reviewed_on`, pero no de `en`, `es` ni `user_id` (`insufficient_privilege`).
    - No puede borrar.
    - No acepta `ease` 1.0 ni `interval_days` 0 (`check_violation`).
  - **`advance_unit` como Ana**, en `a2-junta`:
    - Con 5 frases de `a2-junta`, `advance_unit('a2-trabajo','A2',6)` regresa `false` y no se mueve.
    - Con 6 regresa `true` y queda en `a2-trabajo`.
  - **Como `anon`:** no puede leer `phrases` ni llamar `advance_unit`.
- [ ] **Step 2: Correrla para ver que falla.**
  - Run: `npm run db:sql -- supabase/tests/phrases_checks.sql`
  - Expected: FAIL con `relation "public.phrases" does not exist`.
- [ ] **Step 3: Escribir la migración** con las políticas y los permisos:
  - Políticas `select` e `update` de las propias filas, e `insert` con `with check (user_id = auth.uid() and source = 'leccion')`.
  - `grant select`.
  - `grant insert (user_id, en, es, source, unit_id, due_on)`.
  - `grant update (due_on, interval_days, ease, reps, lapses, reviewed_on)`.
  - Sin `delete`.
  - El índice `(user_id, due_on)`.
  - `advance_unit` con `set search_path = ''`.
- [ ] **Step 4: Aplicar y correr las pruebas de las tres fases.**
  - Run: `npm run db:push`, y luego `npm run db:sql` con `phrases_checks.sql`, `placement_checks.sql` y `base_checks.sql`.
  - Expected: los tres `OK`.
- [ ] **Step 5: Escribir las pruebas de `PhrasesService`**, con un `supabase` falso que registra las llamadas:
  - **`GetReviewQueue("2026-10-22")`:**
    - Filtra `due_on <= 2026-10-22` y ordena por `due_on` y luego por `lapses` de mayor a menor.
    - Con 4 repasos hechos hoy pide `limit 11`.
    - Con 15 hechos regresa `[]` sin consultar las frases.
  - **`AddLessonPhrases`:** manda `upsert` con `onConflict: "user_id,en"` e `ignoreDuplicates: true`, y cada fila lleva `source: "leccion"` y el `due_on` recibido.
  - **Errores:** si la consulta falla, se lanza el error.
- [ ] **Step 6: Implementar los servicios y correr las pruebas.**
  - Run: `npm run test && npm run type-check`
  - Expected: PASS.
- [ ] **Step 7: Commit**: `feat: tabla del repaso con RLS y servicios de frases`

---

### Task 4: Pestaña Repaso y tarjetas

**Files:**
- Create: `src/components/ReviewDeck.vue`, `src/Views/Repaso/RepasoPage.vue`, `src/Views/Repaso/TarjetasPage.vue`
- Modify: `src/router/index.ts` (rutas `repaso` y `repaso-tarjetas`, hijas de `MainLayout`), `src/components/layout/MainLayout.vue` (la pestaña "Repaso" entre Hoy y Mi línea, con el ícono `#i-tab-review`)
- Test: `src/components/ReviewDeck.test.ts`, `src/Views/Repaso/RepasoPage.test.ts`, `src/components/layout/MainLayout.test.ts` (un caso nuevo)

**Interfaces:**
- Consumes: `PhrasesService` (Tarea 3); `rate`, `nextIntervals`, `intervalLabel` y `localDate` (Tarea 2); `useSpeechOutput` (fase 2).
- Produces:
  - `<ReviewDeck :phrases="Phrase[]" :today="string" @done="(reviewed: number) => void" />`.
  - Las rutas `/repaso` (`name: "repaso"`) y `/repaso/tarjetas` (`name: "repaso-tarjetas"`).

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`ReviewDeck`**, con dos frases nuevas:
    - Muestra "Frase 1 de 2", "¿Recuerdas qué significa?", el inglés, y los botones "Escuchar" y "Más lento".
    - El español no se ve hasta tocar "Ver significado".
    - Después aparecen "¿Qué tan fácil fue?" y tres placas: "No me acordé" con "Vuelve mañana", "Me costó" con "En 3 días" y "Fácil" con "En 7 días".
    - Tocar "Fácil" llama `SaveReview(id, rate(...))`, con `interval_days` 7 y `due_on` hoy + 7, y pasa a "Frase 2 de 2".
    - Al calificar la última se emite `done` con 2.
    - Si `SaveReview` falla, la tarjeta no avanza, aparece "No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar." y se puede volver a calificar.
  - **`RepasoPage`:**
    - Con 8 frases pendientes muestra "Hoy toca repasar 8 frases" y el botón "Repasar ahora".
    - Muestra los datos "mañana", "esta semana" y "en total", y la lista "Las que más te cuestan" con sus botones de audio.
    - Con 0 pendientes y menos de 15 hechos dice "No tienes frases pendientes hoy" y no muestra el botón.
    - Con 15 hechos hoy dice "Ya repasaste 15 frases hoy".
  - **`MainLayout`:** en `/repaso` solo se marca la pestaña "Repaso".
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **`ReviewDeck`** es la tarjeta de la pantalla 2.2 (`.l-flash` y `.l-rate`):
    - La tarjeta va con borde negro de 3px, el inglés en 22px bold y la línea punteada antes del español.
    - Las tres placas de calificación llevan el borde de arriba de 6px: rosa en "No me acordé", amarillo en "Me costó" y verde en "Fácil".
    - Antes de ver el significado, la única acción es el botón `line` "Ver significado". Las placas de calificación no son rosas.
  - **`RepasoPage`** es la pantalla 3.1: el título "Repaso", el texto "Las frases regresan justo antes de que se te olviden.", el panel con los minutos (`Math.ceil(n × 0.6)`), `.l-facts` y `.l-list`.
  - **`TarjetasPage`** carga la cola con `localDate(new Date())` y muestra `ReviewDeck`. Al terminar dice "Listo, repasaste {n} frases" y ofrece el botón "Volver a Repaso".
- [ ] **Step 4: Correr las pruebas, el lint y el build.**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: todo en PASS.
- [ ] **Step 5: Commit**: `feat: pestaña Repaso y tarjetas con repetición espaciada`

---

### Task 5: Aprender y la sesión de hoy

**Files:**
- Create: `src/components/LessonDeck.vue`, `src/components/SessionSteps.vue`, `src/Views/Sesion/SesionPage.vue`
- Modify: `src/router/index.ts` (ruta `sesion`, hija de `MainLayout`), `src/Views/Hoy/SesionHoyPanel.vue` (números reales y el botón "Empezar sesión")
- Test: `src/components/LessonDeck.test.ts`, `src/Views/Sesion/SesionPage.test.ts`, `src/Views/Hoy/SesionHoyPanel.test.ts`

**Interfaces:**
- Consumes: `pickNewPhrases` y `allLearned` (Tarea 2), `PhrasesService` (Tarea 3), `ReviewDeck` (Tarea 4) y `getUnit` (fase 1).
- Produces:
  - `<LessonDeck :unit="Unit" :phrases="KeyPhrase[]" @done="() => void" />`. Al terminar guarda las frases con `AddLessonPhrases(userId, unit.id, phrases, addDays(today, 1))`.
  - `<SessionSteps :current="'repasar' | 'aprender' | 'resumen'" />`, que es la mini línea `.l-mini` con "Repasar", "Aprender" y "Resumen".
  - La ruta `/sesion` (`name: "sesion"`).

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`LessonDeck`** con 2 frases de `a2-junta`:
    - Muestra "Frase nueva 1 de 2", el pictograma de la meta, el inglés en 22px, el español, "Escuchar", "Más lento" y la `nota` en la placa amarilla, si la frase tiene nota.
    - "Siguiente frase" pasa a la 2. En la última, el botón dice "Terminar".
    - "Terminar" llama `AddLessonPhrases` con las 2 frases y `due_on` mañana, y emite `done`.
    - Si falla, aparece "No se guardaron tus frases nuevas. Revisa tu conexión y vuelve a intentar." y no emite.
  - **`SesionPage`** con 3 frases para repasar y 4 nuevas:
    - Primero se ve `ReviewDeck` con la mini línea en "Repasar".
    - Al terminar el repaso se ve `LessonDeck` en "Aprender".
    - Al terminar la lección aparece el resumen "Sesión terminada", con "Repasaste 3 frases", "Aprendiste 4 frases nuevas" y el botón "Terminar", que lleva a Hoy.
    - Sin frases para repasar, empieza directo en Aprender.
    - Sin frases nuevas, termina después del repaso.
  - **`SesionHoyPanel`:**
    - Con 8 pendientes y 4 nuevas, muestra los pasos "Repasar 8 frases", "Aprender 4 frases nuevas", "Conversar (llega pronto)" y "Ver tu resumen", y el botón rosa "Empezar sesión" que lleva a `sesion`.
    - Con 0 pendientes y 0 nuevas, y la meta completa, no muestra "Empezar sesión". Ese caso lo cubre la Tarea 6.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **`LessonDeck`** es la pantalla 2.3: el pictograma `md` en el color del nivel, `.l-en`, `.l-es` y `.l-note`. "Otro ejemplo" y "Decirla en voz alta" llegan con la IA y la voz de la fase 4.
  - **`SesionPage`:**
    - Al montar calcula `today` una vez, y carga en paralelo la cola de repaso y las frases ya aprendidas de la meta.
    - Si falla la carga, muestra el aviso de sin conexión con "Reintentar".
  - **`SesionHoyPanel`:**
    - Carga los mismos datos para mostrar los números.
    - Los minutos son `Math.ceil(repasos × 0.6 + nuevas × 1.5)`.
    - El paso "Conversar" va en gris con "(llega pronto)".
- [ ] **Step 4: Correr las pruebas, el lint y el build.**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: todo en PASS.
- [ ] **Step 5: Commit**: `feat: aprender frases nuevas y sesión de hoy sin IA`

---

### Task 6: Siguiente estación temporal, publicar y probar

**Files:**
- Modify: `src/Views/Hoy/SesionHoyPanel.vue` (el botón de avance), `src/stores/auth.ts` (acción `advanceUnit`), `README.md` y la hoja de ruta
- Test: `src/Views/Hoy/SesionHoyPanel.test.ts` (casos nuevos) y `src/stores/auth.test.ts` (`advanceUnit`)

**Interfaces:**
- Consumes: `ProfileService.AdvanceUnit` (Tarea 3) y `allLearned` (Tarea 2).
- Produces: la acción `advanceUnit(): Promise<boolean>` del store.
  - Calcula la siguiente meta en el orden global de `units` y el nivel de esa meta.
  - Llama `AdvanceUnit(next.id, next.nivel, 6)`.
  - Si regresa `true`, actualiza `profile.level` y `current_unit_id`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - **`SesionHoyPanel`:**
    - Con las 6 frases de `a2-junta` aprendidas y 0 repasos pendientes, el botón rosa es "Seguir a la próxima estación". Al tocarlo se llama `advanceUnit` y luego aparece la meta "Hablar de tu trabajo".
    - Si además hay repasos pendientes, la acción rosa es "Empezar sesión" y el avance va como botón `line`.
    - En `b1-viaje` con todo aprendido no hay botón de avance, y dice "Llegaste al final de la ruta."
  - **Store:**
    - En `l0-nombre`, `advanceUnit` llama `AdvanceUnit("a1-quien-eres", "A1", 6)` y deja el perfil en A1.
    - Si regresa `false`, el perfil no cambia.
- [ ] **Step 2: Correr y ver que fallan.**
  - Run: `npm run test`
  - Expected: FAIL.
- [ ] **Step 3: Implementar.** Agrega al README una nota: "Avance temporal de estación: en la fase 5 se cambia por la conversación final". En la hoja de ruta, marca la fase 3 como ✅ con el enlace a este plan.
- [ ] **Step 4: Correr todo y publicar.**
  - Run: `npm run test && npm run lint && npm run build && npm run deploy`
  - Expected: todo en PASS y `Deployed habla`.
- [ ] **Step 5: Prueba a mano (Fernando, en el iPhone):**
  1. Desde Hoy, "Empezar sesión": no hay repasos todavía, así que aprende 4 frases de "Presentarte en una junta" y ve el resumen.
  2. En la pestaña Repaso debe decir "No tienes frases pendientes hoy", y "mañana" debe marcar 4.
  3. Al día siguiente: repasar las 4 frases, aprender las 2 que faltan y ver aparecer "Seguir a la próxima estación".
  4. Revisa en la base con `npm run db:sql -- --query "select en, due_on, interval_days, ease from public.phrases order by id"`.
- [ ] **Step 6: Commit**: `feat: siguiente estación temporal al terminar las frases de la meta`
