# Habla — Documento de diseño

- **Estado:** aprobado el 2026-10-19
- **Fecha:** 2026-10-12 (diseño iniciado el 2026-10-07; ajustes del 2026-10-19 en las secciones 4 y 7)
- **Autor del producto:** Fernando (admin del grupo)
- **Nombre:** "Habla" es provisional.
- **Pantallas de referencia:** [`docs/design/habla-pantallas.html`](../../design/habla-pantallas.html) (abrir en el navegador)

---

## 1. Objetivo

Una web app instalable (PWA) para que un grupo chico de hispanohablantes adultos aprenda inglés **para la vida real** (trabajo, conversación y viajes) en **20 a 30 minutos al día**. Lo central es **practicar hablando** con una IA, sin pagar extra por hablar y sin la sensación de juego que no enseña a conversar.

**Cómo sabemos que funciona**

- Cada persona practica al menos 4 días por semana durante el piloto.
- Cada persona aprueba al menos una meta (unidad) en sus primeras 2 semanas.
- El gasto de IA del grupo se mantiene por debajo de **$5 USD al mes**.

## 2. Usuarios y contexto

- **Quiénes:** Fernando, más unos 4 amigos o familiares. Cada quien con su propio progreso.
- **Nivel:** desde **cero** hasta más o menos **A2/B1**. Algunas personas casi no entienden inglés, así que **toda la app está en español** y nadie tiene que elegir temas.
- **Dispositivos:**
  - Fernando usa iPhone y computadora.
  - El resto usa Android o computadora.
- **Presupuesto:** muy bajo. Es un proyecto personal, así que el gasto mínimo es un requisito de diseño.
- **Sin examen por ahora.** La app mide el nivel, pero la preparación de un examen queda fuera de la v1.

## 3. Problemas que resuelve y principios de producto

| Problema con otras apps | Cómo lo resuelve Habla |
|---|---|
| Cobran aparte por practicar hablando | La conversación con IA es parte de cada sesión, sin costo extra para el usuario |
| Lecciones repetitivas y aburridas | Bloques cortos que cambian de actividad; la IA genera variaciones de cada meta |
| Parece juego, pero no enseña a hablar | Sin rachas, puntos ni rankings; el avance se mide en "ya puedes…" |
| Cuesta mantener la constancia | Un solo botón "Empezar sesión"; la app decide qué toca hoy; contar días por semana no castiga faltar un día |
| Da pena hablar o equivocarse | Se practica en privado con la IA; correcciones amables en verde, nunca en rojo |

**Principios**

1. La app decide el plan; la persona solo toca "Empezar".
2. Todo en español; el inglés siempre con audio normal y lento.
3. Primero lo que salió bien, luego máximo 2 o 3 correcciones.
4. Gratis o lo más barato que funcione bien, en cada decisión técnica.

## 4. Alcance

**En la v1**

- Login por invitación, solo con Google.
- Pregunta de motivo (trabajo, viajes o ambos).
- Evaluación inicial y revisión mensual de nivel.
- Ruta fija Nivel 0 → A1 → A2 → B1, con metas por unidad.
- Sesión diaria de 4 partes: repasar, aprender, conversar y resumen.
- Repaso con repetición espaciada.
- Mi línea (avance), meta lograda y "casi lo tienes".
- Vista de admin: invitar personas y ver el gasto de IA.
- Voz gratis:
  - Reconocimiento del navegador en Chrome/Edge y Android.
  - Dictado del teclado en iPhone.
  - Voz del navegador para escuchar.
- Límites de gasto y avisos claros.

**Fuera de la v1** (posibles siguientes pasos)

- Preparación de examen (TOEFL, IELTS, etc.).
- Entrar con un enlace al correo. El correo gratis de Supabase solo llega a los miembros del equipo del proyecto, como máximo 2 por hora. Para tus amigos haría falta un dominio propio y un servicio de correo (decisión del 2026-10-19).
- Modo sin conexión.
- Comparar el avance entre personas o un tablero del grupo.
- Recordatorios con notificaciones push.
- Reconocimiento de voz de paga, solo para iPhone si el dictado resulta incómodo.
- Apps nativas.
- Evaluación de pronunciación.

## 5. Experiencia

### 5.1 Plan de trabajo (la "línea")

- Cada **nivel** es una línea de color y cada **meta** (unidad) es una estación:

  | Nivel | Línea |
  |---|---|
  | Nivel 0 | Rosa |
  | A1 | Azul |
  | A2 | Verde |
  | B1 | Naranja |

- Una unidad dura de 1 a 2 semanas: unas **5 sesiones** más una **conversación final**.
- **Se avanza de unidad** cuando la conversación final demuestra la meta, no por tiempo.
  - Si no sale, se muestra "Casi lo tienes": qué faltó, una sesión extra enfocada y otro intento. No hay límite de intentos.
- **Primera propuesta de temario** (se afina en el plan de implementación):
  - **Nivel 0:** saludar y despedirte; números, precios y la hora; días, meses y colores; decir y deletrear tu nombre.
  - **A1:** decir quién eres y de dónde; hablar de tu familia; comprar en una tienda; tu rutina diaria; pedir algo en una cafetería.
  - **A2 (8 metas):** presentarte en una junta; hablar de tu trabajo; pedir comida en un restaurante; pedir direcciones; reservar un hotel; en el aeropuerto; una llamada corta; contar qué hiciste el fin de semana.
  - **B1:** dar tu opinión en una junta; resolver un problema (una queja); explicar un proceso de tu trabajo; llamadas de trabajo; contar una experiencia; planear un viaje.
- **El motivo** (trabajo, viajes o ambos) solo cambia los ejemplos y personajes de las situaciones; el orden de las metas es el mismo.

### 5.2 Evaluación

**Inicial (5 a 10 minutos)**

- Preguntas adaptativas: escuchar y elegir el significado, completar frases y responder en voz alta.
- Las instrucciones son en español y el botón **"No sé"** siempre está visible, sin penalización.
- La evaluación se detiene sola cuando las preguntas se ponen difíciles.
- Resultado: el nivel inicial y la primera estación.

**Mensual**

- Una mini conversación de unos 5 minutos para medir el avance.
- Si muestra que ya domina su nivel, la app **ofrece** saltar a la siguiente línea; la persona decide.
- Si muestra dificultad, **no baja de nivel**: agrega sesiones de refuerzo en la unidad actual.

### 5.3 Sesión diaria (~22 minutos)

| Parte | Duración | Qué pasa |
|---|---|---|
| 1. Repasar | ~5 min | Hasta 10–15 frases pendientes del mazo; la persona califica qué tan fácil fue |
| 2. Aprender | ~5–7 min | 3 a 5 frases nuevas de la meta, con significado, audio normal y lento, una nota corta y otro ejemplo |
| 3. Conversar | ~8–10 min | Situación de la meta con un personaje de la IA (p. ej. el mesero). Los niveles bajos ven frases sugeridas. Las correcciones se muestran en una placa verde y se guardan en el repaso |
| 4. Resumen | ~2 min | Lo que salió bien, máximo 2 o 3 correcciones y el avance en la meta |

- Se puede pausar y continuar después, porque la sesión queda guardada.
- **El apoyo en español baja con el nivel:**
  - Nivel 0 y A1: traducción visible por defecto y frases sugeridas.
  - A2: traducción con un toque.
  - B1: sin sugerencias.

### 5.4 Repaso (repetición espaciada)

Cada frase guarda su próxima fecha de repaso, su intervalo y su facilidad.

| Botón | Qué hace |
|---|---|
| **No me acordé** | Vuelve mañana (intervalo de 1 día), cuenta como fallo y baja la facilidad |
| **Me costó** | Intervalo × 1.2, con mínimo 3 días; baja un poco la facilidad |
| **Fácil** | Intervalo × facilidad (inicial 2.5), con mínimo 7 días |

- Máximo 15 frases al día, priorizando las más atrasadas.
- Las frases nuevas (de la lección o de una corrección) entran con `due_on` = mañana, `interval_days` = 1 y `ease` = 2.5.
- El repaso funciona aunque la IA no esté disponible, porque no llama a la IA.

### 5.5 Admin ("Mi grupo")

Solo lo ve Fernando:

- Invitar por correo.
- Ver nivel y última práctica de cada persona.
- Ver el **gasto de IA del mes** contra el tope de $5, con una proyección a fin de mes y el gasto por persona.

## 6. Diseño visual: dirección "Línea"

Se inspira en la señalética del Metro de la Ciudad de México (Lance Wyman): orientarse con **color, pictograma y posición** aunque no se pueda leer el letrero.

Las pantallas aprobadas están en `docs/design/habla-pantallas.html`, numeradas de la 1.1 a la 5:
- **Primer uso:** bienvenida, motivo, evaluación y resultado. La bienvenida (1.1) ya no lleva el botón "Recibir un enlace por correo" (ver sección 4).
- **Sesión:** inicio, repasar, aprender, conversar en iPhone, conversar en Android o computadora, y resumen.
- **Avance:** repaso, mi línea, meta lograda y casi lo tienes.
- **Admin:** mi grupo y avisos.
- **Computadora.**

### 6.1 Colores

| Token | Hex | Uso |
|---|---|---|
| `white` | `#FFFFFF` | Fondo |
| `concrete` | `#EEF0F2` | Paneles |
| `rule` | `#D9DDE2` | Bordes y estaciones futuras |
| `ink` | `#000000` | Texto y pictogramas |
| `ink-2` | `#5B616B` | Texto secundario |
| `rosa` | `#E4007C` | Acción principal y Nivel 0 |
| `yellow` | `#FFD100` | "Estás aquí" y avisos importantes |
| `l1` | `#0057B8` | A1 y placas de información |
| `l2` | `#00965E` | A2 y placas de corrección |
| `l3` | `#E87722` | B1 (solo como color de línea; texto negro encima) |
| `l1-soft`, `l2-soft`, `yellow-soft` | `#E5EEF9`, `#E3F4EC`, `#FFF6CC` | Fondos de placas |

### 6.2 Tipografía (Google Fonts, gratis)

- **Barlow Condensed 600/700:** nombres de estación, títulos y números grandes.
- **Atkinson Hyperlegible 400/700:** todo lo demás. Distingue letras parecidas (I, l, 1), lo cual es clave al leer inglés.
- **Escala (px):** 12, 14, 16, 19, 22, 30 y 44.

### 6.3 Reglas

- Alineado a la izquierda.
- Una sola acción rosa por pantalla.
- Botones de 52px de alto y contraste AA.
- Sin sombras, degradados ni emojis.
- Pictogramas sólidos propios en SVG sobre un cuadro de color: uno por meta, más personajes y controles.
- Números solo donde hay un orden real (los pasos de la sesión).
- Esquinas: 7–9px en pictogramas, 12px en botones, 14px en paneles.
- Una sola animación: el círculo amarillo avanza entre estaciones al lograr una meta. Se desactiva con `prefers-reduced-motion`.
- **Textos:**
  - Frases cortas y en voz activa, sin mayúsculas decorativas, sin "·" para unir datos y sin "¡Hola! 👋".
  - Los errores dicen qué pasó y qué sí se puede hacer, sin disculpas.

## 7. Arquitectura

```
[PWA Vue 3]  --login-->  [Supabase Auth: Google, solo invitados]
     |                                   |
     |  supabase-js (con sesión)         v
     +------------------------>  [Postgres + RLS] (perfiles, progreso, frases, uso)
     |
     +--> [Edge Functions (TypeScript)] --@anthropic-ai/sdk--> [Claude Haiku 5.5]
              (la API key vive aquí)
```

- **Frontend:**
  - Vue 3 + Vite + TypeScript + shadcn-vue + Tailwind, más `vite-plugin-pwa`.
  - Router con pestañas Hoy / Repaso / Mi línea, y Mi grupo solo para el admin.
  - TanStack Query para los datos.
  - Se publica gratis en Cloudflare (Workers con archivos estáticos). No tiene límite de tráfico ni pausa el sitio.
- **Voz (módulos intercambiables):**
  - `useSpeechInput` elige la estrategia en este orden:
    1. `webSpeech` (Web Speech API) si el navegador la soporta bien: Chrome/Edge de escritorio y Android.
    2. `keyboardDictation`: cuadro de texto con instrucciones para usar el dictado del teclado. Es la opción por defecto en iOS.
    3. A futuro, `cloudStt` (servicio de paga), sin cambiar las pantallas.
  - `useSpeechOutput` usa `speechSynthesis`, con velocidad normal o lenta (0.8×).
  - Siempre se puede cambiar a escribir.
- **Backend (Supabase):**
  - Auth con registro **solo por invitación**. La tabla `invites` es la lista permitida. El hook "Before User Created" de Supabase rechaza cualquier otro correo antes de crear la cuenta.
  - Postgres con Row Level Security por usuario.
  - Edge Functions en TypeScript.
- **IA:**
  - Claude **Haiku 5.5** (`claude-haiku-5-5`) por defecto, con el modelo configurable por función.
  - SDK oficial `@anthropic-ai/sdk` (MIT, gratis).
  - Respuestas estructuradas con JSON Schema (`output_config.format`).
  - Prompt caching en las instrucciones fijas.
  - Streaming en `conversation-turn`.

### 7.1 Funciones del backend

| Función | Entrada | Salida |
|---|---|---|
| `placement` | Respuestas de la evaluación (incluye "No sé") | Nivel inicial, unidad inicial y resumen breve |
| `session-generate` | Usuario (lee perfil, unidad, frases pendientes y motivo) | JSON de la sesión: frases nuevas, notas, situación y personaje de la conversación, frases sugeridas |
| `conversation-turn` | `session_id`, historial y lo que dijo la persona | Respuesta en personaje, corrección opcional (`{original, mejor, nota}`) y si la situación terminó |
| `session-close` | `session_id` | Lo que salió bien, 2–3 correcciones, frases para el mazo y avance en la meta |
| `unit-check` | Conversación final | Aprobado o no, criterios cumplidos y qué faltó |

- Todas las funciones verifican la sesión del usuario, aplican los **límites diarios** y registran el uso en `usage_log`.
- El prompt de cada función incluye el nivel y la regla de apoyo en español de la sección 5.3.

### 7.2 Temario

Archivo versionado en el repo (`src/curriculum/`), no en la base de datos. Cada unidad define:

- `id`, `nivel`, `orden` y `título_es` (el nombre de la estación).
- `meta_puedes` ("Ya puedes…").
- `pictograma`.
- `frases_clave` (inglés y español).
- `situación` y `personaje`, con variantes por motivo.
- `criterios_de_aprobación`, usados por `unit-check`.

## 8. Datos (Postgres)

| Tabla | Campos principales |
|---|---|
| `invites` | `email` (único), `invited_by`, `created_at`, `accepted_at` |
| `profiles` | `user_id` (PK, FK auth), `name`, `motive` (`trabajo`/`viajes`/`ambos`), `level` (`L0`/`A1`/`A2`/`B1`), `current_unit_id`, `is_admin`, `created_at` |
| `placements` | `id`, `user_id`, `kind` (`inicial`/`mensual`), `result_level`, `details` (jsonb), `created_at` |
| `unit_progress` | `user_id`, `unit_id`, `status` (`pendiente`/`en_curso`/`aprobada`), `sessions_done`, `check_attempts`, `passed_at` |
| `sessions` | `id`, `user_id`, `unit_id`, `date`, `content` (jsonb), `transcript` (jsonb), `summary` (jsonb), `status` (`en_curso`/`terminada`), `minutes` |
| `phrases` | `id`, `user_id`, `en`, `es`, `source` (`leccion`/`correccion`), `unit_id`, `due_on`, `interval_days`, `ease`, `reps`, `lapses` |
| `usage_log` | `id`, `user_id`, `function`, `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cost_usd`, `created_at` |

- **RLS:** cada usuario lee y escribe solo sus filas. El admin además puede leer `profiles`, `usage_log` (agregado) e `invites`.
- La API key de Claude **nunca** llega al navegador.

## 9. Errores y estados

| Situación | Qué hace la app |
|---|---|
| La IA tarda o falla | Hasta 2 reintentos automáticos; luego el aviso "La IA no respondió" con "Intentar de nuevo". El repaso sigue disponible |
| Respuesta mal formada | Se regenera una vez gracias al formato JSON validado; si vuelve a fallar, se trata como fallo de la IA |
| Sin permiso de micrófono | Placa azul con instrucciones y cambio automático a escribir |
| Sin internet | Placa "Sin conexión" con "Reintentar"; lo hecho en la sesión queda guardado. La v1 necesita internet |
| Se alcanza el tope mensual | La API responde 400 `invalid_request_error` ("You have reached your specified API usage limits"). La app muestra la placa amarilla "Se terminó el presupuesto de IA de [mes]" y deja ir a repasar |
| Se alcanza el límite diario por persona | Aviso: "Ya practicaste mucho hoy; vuelve mañana o repasa tus frases" |

## 10. Costos y límites

**Estimado** para 5 personas × 10 min de conversación al día:
- Haiku 5.5 ($0.10 / $0.50 por millón de tokens de entrada/salida con prompts de hasta 100k): **~$2–4 USD al mes** (unos 40–80 MXN).
- Hosting, base de datos, login y voz: **$0**, con planes gratuitos.

**Controles**

1. **Tope en la Claude Console:** $5 USD al mes, en Settings → Billing → Spend limits (o directo en `platform.claude.com/settings/billing`).
   - El crédito se paga por adelantado.
   - Opcional: un workspace exclusivo para la app con su propio límite.
2. **Límite diario por persona:** 2 sesiones y 40 turnos de conversación, aplicado en las funciones.
3. **Prompt caching** en instrucciones y temario.
4. **`usage_log`** para ver el costo real por persona y por función.

**Riesgo conocido:** si el proyecto de Supabase pasa 7 días sin uso, el plan gratuito lo pausa. Con uso diario no pasa. Los límites exactos del plan gratuito se confirman al crear el proyecto.

## 11. Privacidad

- No se guarda audio. El reconocimiento de voz lo hace el navegador o el teclado, y a la app solo llega texto.
- Lo que sí hay que saber: el reconocimiento de Chrome envía el audio a los servidores de Google, y el dictado de iPhone lo procesa Apple.
- Las conversaciones se guardan como texto en `sessions.transcript`, solo visibles para su dueño.
- Solo entran correos invitados.

## 12. Pruebas

- **Unitarias (Vitest):**
  - Algoritmo de repaso (intervalos y límites).
  - Reglas para pasar de unidad.
  - Selección de la estrategia de voz.
  - Cálculo de costo en `usage_log`.
  - Aplicación de límites diarios.
- **Pruebas de la IA:**
  - Un set de unas 20 respuestas de ejemplo por nivel (Nivel 0 a B1), con errores típicos de hispanohablantes.
  - Se revisa que las correcciones sean correctas, amables y en español en niveles bajos, y que `unit-check` apruebe o rechace bien.
  - Se corre antes de cambiar cualquier prompt.
- **Manuales:**
  - iPhone: Safari, app instalada en la pantalla de inicio y dictado del teclado.
  - Android con Chrome.
  - Computadora con Chrome y Edge.
- **Piloto:** Fernando la usa solo durante 1 semana antes de invitar al grupo.

## 13. Decisiones pendientes

- Nombre final de la app (por ahora "Habla").
- Contenido final de cada unidad del temario: se detalla en el plan de implementación.
- Proveedor de voz de paga, solo si en el piloto el dictado del iPhone resulta incómodo.
- Recordatorios push (v1.1).
