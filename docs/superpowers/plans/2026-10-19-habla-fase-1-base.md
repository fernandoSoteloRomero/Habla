# Habla, Fase 1 (Base): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una PWA instalable con el estilo Línea, publicada en Cloudflare. Una persona invitada entra con Google, elige su motivo y ve su línea en "Hoy" y "Mi línea".

**Architecture:**
- Es una SPA en Vue 3 con la misma estructura que BaseFront/CafeteriaV2 (`Services/`, `Views/`, `stores/`, `router/`, `common/`). Habla directo con Supabase usando supabase-js y Row Level Security.
- La invitación se valida en Postgres con el hook "Before User Created", antes de crear la cuenta. Un trigger crea el perfil.
- El temario es un archivo TypeScript versionado en `src/curriculum/`.
- Esta fase no tiene Edge Functions ni IA.

**Tech Stack:**
- Vue 3.5, Vite 8, TypeScript ~6.0, Tailwind 4, shadcn-vue (reka-nova), Pinia 4, Vue Router 5.
- @supabase/supabase-js 2.118, vite-plugin-pwa 2.0, @vite-pwa/assets-generator 2.0.
- Vitest 5, @vue/test-utils 2.5, jsdom 30.
- Supabase CLI 2.121 (con npx), Wrangler 4.151 (Cloudflare Workers con archivos estáticos).
- Fuentes de Fontsource 5.3.

**Spec:** `docs/superpowers/specs/2026-10-07-english-app-design.md`. Las pantallas aprobadas están en `docs/design/habla-pantallas.html`, y cuando un paso dice "como en el diseño" se refiere a sus clases `.l-*`. Ver también la hoja de ruta, `docs/superpowers/plans/2026-10-19-habla-hoja-de-ruta.md`.

## Global Constraints

- Toda la interfaz va en español. El inglés solo aparece en las frases de práctica.
- **Reglas de los textos:**
  - Frases cortas y en voz activa.
  - Sin mayúsculas decorativas, sin "·" para unir datos y sin "¡Hola! 👋".
  - Sin emojis.
  - Los errores dicen qué pasó y qué sí se puede hacer, sin disculpas.
- Colores (tokens exactos): `white #FFFFFF`, `concrete #EEF0F2`, `rule #D9DDE2`, `ink #000000`, `ink-2 #5B616B`, `rosa #E4007C`, `yellow #FFD100`, `l1 #0057B8`, `l2 #00965E`, `l3 #E87722`, `l1-soft #E5EEF9`, `l2-soft #E3F4EC`, `yellow-soft #FFF6CC`. Nunca se usa rojo. El naranja `l3` solo va como color de línea, con texto negro encima.
- Las líneas por nivel son: Nivel 0 rosa, A1 azul, A2 verde y B1 naranja.
- **Tipografía:**
  - Barlow Condensed 600/700 para nombres de estación, títulos y números grandes.
  - Atkinson Hyperlegible 400/700 para todo lo demás.
  - Escala: 12, 14, 16, 19, 22, 30 y 44 px.
  - Las fuentes se instalan con Fontsource. Son las mismas de Google Fonts, gratis, y funcionan sin conexión.
- **Reglas visuales:**
  - Todo alineado a la izquierda.
  - Una sola acción rosa por pantalla.
  - Botones de 52px de alto y contraste AA.
  - Sin sombras, degradados ni emojis.
  - Esquinas: 7–9px en pictogramas, 12px en botones y 14px en paneles.
  - La única animación (fase 4) respeta `prefers-reduced-motion`.
- **Código al estilo BaseFront/CafeteriaV2:**
  - Services en `src/Services/<Modulo>/<Modulo>Service.ts`, con `export default { Metodo() }`.
  - Una interfaz completa por respuesta, en `src/Services/interfaces/<Modulo>/`.
  - Vistas en `src/Views/<Pantalla>/<Pantalla>Page.vue` y helpers sencillos en `src/common/`.
  - Sin helpers genéricos, registries ni componentes envoltorio.
  - Comentarios en español.
- **ESLint y Prettier:** las reglas de BaseFront se copian tal cual (`eslint.config.js`, `.prettierrc.json`). Solo se agregan a `ignores` las carpetas `supabase/**`, `dev-dist/**` y `public/**`.
- **Variables del front:** solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. La llave secreta (`sb_secret_...`) y cualquier API key nunca van en el front ni en el repo.
- **Archivos `.env.development` y `.env.production`:** existen en local y el `.gitignore` ya los excluye con `.env.*`. Solo se versiona `.env.example`.
- **Costo $0:**
  - Supabase Free, Cloudflare Workers con archivos estáticos y Google OAuth.
  - Ningún servicio de paga.
- **Login:**
  - Solo con Google, y solo entran los correos que están en `invites`. Lo decidió Fernando el 2026-10-19.
  - No hay botón de enlace por correo.
- **Sin Docker:** todo se hace contra el proyecto de Supabase en la nube.
- **Firewall de la oficina** (2026-10-20): bloquea el protocolo de Postgres, así que `supabase db push` y `db query --linked` no funcionan.
  - En su lugar se usan `npm run db:push` y `npm run db:sql -- <archivo>|--query "…"` (`scripts/db.mjs`). Mandan el SQL por HTTPS a la Management API con el token de `.env.local`.
  - `db:push` usa la misma tabla de historial que la CLI.
- **Red de Inventec:**
  - npm, GitHub por HTTPS y Supabase (puertos 5432, 6543 y 443) salen directo.
  - Los logins con navegador (`supabase login`, `wrangler login`, Google Cloud) se abren en el navegador de la cuenta personal de Fernando. El navegador predeterminado tiene la cuenta del trabajo, así que hay que copiar la URL que imprime la CLI.
- **Commits:** uno por tarea cuando pasan sus pruebas. Fernando lo autorizó el 2026-10-19. El push solo se hace si Fernando lo pide.
- **Importaciones del temario:** los archivos de `src/curriculum/` importan entre sí con ruta relativa y extensión `.ts`, sin `@/`, porque la fase 3 los va a importar desde Deno.

## Review Focus

1. **Cuenta de Google sin invitación:** no se crea la cuenta, y la Bienvenida muestra "No pudimos dejarte entrar". No queda en blanco ni en un ciclo. Lo cubren la prueba del hook en la Tarea 4 y las pruebas del store y de la Bienvenida en la Tarea 5.
2. **Correo invitado escrito distinto** (por ejemplo `" Ana.Lopez@Gmail.com "` contra `ana.lopez@gmail.com`): debe entrar igual. Lo cubre la prueba del hook en la Tarea 4.
3. **Cambios no permitidos desde el navegador:** alguien intenta ponerse `is_admin`, cambiar su `level` o su `current_unit_id`, ver o editar el perfil de otra persona, o leer las invitaciones. Postgres lo rechaza. Lo cubre la prueba de RLS en la Tarea 4.
4. **App abierta semanas después** con la sesión vencida o sin internet: termina en la Bienvenida con el aviso correcto y nunca se queda cargando. Lo cubren las pruebas del store en la Tarea 5.
5. **iPhone con la app instalada en la pantalla de inicio:** el login de Google regresa a la app instalada con la sesión abierta, no a Safari. Lo cubre la revisión manual en el dispositivo en la Tarea 7.

## Estructura de archivos

```
newProyect/
├── index.html                 # sprite SVG de pictogramas copiado del diseño
├── package.json  vite.config.ts  wrangler.jsonc  pwa-assets.config.ts
├── eslint.config.js  .prettierrc.json  tsconfig*.json  components.json   (de BaseFront)
├── .env.example  README.md
├── public/logo.svg            # ícono: la estación "Estás aquí" sobre rosa
├── src/
│   ├── main.ts  App.vue
│   ├── assets/index.css       # Tailwind + tokens Línea + variables de shadcn
│   ├── lib/utils.ts           # cn() de shadcn
│   ├── lib/supabase.ts        # el cliente único de Supabase
│   ├── components/ui/…        # shadcn: button (variantes go/line/quiet), dropdown-menu
│   ├── components/PictoTile.vue
│   ├── components/LineaVertical.vue
│   ├── components/layout/MainLayout.vue
│   ├── common/PictogramTypes.ts  common/Greeting.ts  common/StationStates.ts
│   ├── curriculum/levels.ts  curriculum/units.ts
│   ├── Services/Profile/ProfileService.ts
│   ├── Services/interfaces/Profile/ProfileInterface.ts
│   ├── stores/auth.ts
│   ├── router/index.ts
│   └── Views/Bienvenida/  Views/Motivo/  Views/Hoy/  Views/MiLinea/  Views/404/
└── supabase/
    ├── config.toml            # lo crea `supabase init`
    ├── migrations/20261019000000_base.sql
    └── tests/base_checks.sql
```

Las pruebas de Vitest van junto al archivo que prueban, con el nombre `*.test.ts`.

---

### Task 1: Proyecto base y estilo Línea

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `src/assets/index.css`, `src/common/PictogramTypes.ts`, `src/components/PictoTile.vue`
- Copy from `C:\Users\IMX115421\Desktop\Projects\BaseFront`: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `components.json`, `src/lib/utils.ts`
- Test: `src/components/PictoTile.test.ts`, `src/components/ui/button/Button.test.ts`

**Interfaces:**
- Produces:
  - `type PictogramName = "hand" | "work" | "food" | "sign" | "bed" | "plane" | "phone" | "waiter" | "both" | "clock" | "wallet" | "group" | "calendar" | "chat"`
  - `type TileColor = "ink" | "rosa" | "rule" | "l0" | "l1" | "l2" | "l3"`. Los dos tipos van en `src/common/PictogramTypes.ts`.
  - `<PictoTile :name="PictogramName" size?="sm"|"md"|"lg" bg?="TileColor" />`, con `md` e `ink` por defecto.
  - `<Button variant?="go"|"line"|"quiet">`, con `go` por defecto.
  - Las clases de Tailwind `bg-*`, `text-*` y `border-*` para cada token, más `font-display` y `font-sans`.
  - El script `npm run test` corre Vitest.

- [ ] **Step 1: Crear el proyecto**
  - Escribe `package.json` con `"name": "habla"`, `"private": true` y `"type": "module"`. Pon los scripts de BaseFront y agrega `"test": "vitest run"`.
  - Dependencias: `vue@^3.5.44`, `vue-router@^5.4.0`, `pinia@^4.0.3`, `@supabase/supabase-js@^2.118.0`, `reka-ui@^2.11.0`, `@vueuse/core@^15.0.0`, `@lucide/vue@^1.56.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.7.0`, `@fontsource/barlow-condensed@^5.3.0`, `@fontsource/atkinson-hyperlegible@^5.3.0`.
  - devDependencies: las mismas de BaseFront, más `vitest@^5.0.5`, `@vue/test-utils@^2.5.1`, `jsdom@^30.1.3`, `vite-plugin-pwa@^2.0.0`, `@vite-pwa/assets-generator@^2.0.0`, `supabase@^2.121.0` y `wrangler@^4.151.2`.
  - Copia los archivos de BaseFront de la lista. En `components.json` **quita** la línea `"font": "inter"`: con ella, `shadcn-vue add` reemplaza las fuentes.
  - En `eslint.config.js` agrega `"supabase/**"`, `"dev-dist/**"` y `"public/**"` a `ignores`.
  - Corre `npm install`.
- [ ] **Step 2: Configurar Vite y Vitest**
  - En `vite.config.ts` toma el de BaseFront y quítale `base`/`loadEnv`, porque la app se publica en `/`. Agrega `/// <reference types="vitest/config" />` y `test: { environment: "jsdom", include: ["src/**/*.test.ts"] }`.
  - En `index.html`:
    - `<html lang="es">`, `<title>Habla</title>` y `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
    - Dentro de `<body>`, antes de `<div id="app">`, copia **tal cual** el bloque `<svg width="0" height="0" …><defs>…</defs></svg>` de `docs/design/habla-pantallas.html` (líneas 285–311).
    - Agrega estos dos símbolos nuevos dentro de `<defs>`:
      ```html
      <symbol id="i-calendar" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7 2h2v3h6V2h2v3h2.5A1.5 1.5 0 0 1 21 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-13A1.5 1.5 0 0 1 4.5 5H7zM5 10v9h14v-9z"/><rect x="7" y="12" width="3" height="3" rx=".6"/></symbol>
      <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 3.5h16A1.5 1.5 0 0 1 21.5 5v10a1.5 1.5 0 0 1-1.5 1.5h-9l-5 4v-4H4A1.5 1.5 0 0 1 2.5 15V5A1.5 1.5 0 0 1 4 3.5z"/></symbol>
      ```
- [ ] **Step 3: Agregar los componentes de shadcn**
  - Corre `npx shadcn-vue@latest add button dropdown-menu`.
  - Nota de la ejecución (2026-10-20): shadcn-vue 2.8 importa `cn` del paquete oficial `cn` (de shadcn) y se queda así. Se quitaron `tw-animate-css`, las animaciones y las sombras del menú, que usa `border-2 border-ink`, porque la única animación permitida es la de la fase 4.
  - Escribe `src/assets/index.css` con `@import "tailwindcss";` y un `@theme` con:
    - `--color-white`, `--color-concrete`, `--color-rule`, `--color-ink`, `--color-ink-2`, `--color-rosa`, `--color-yellow`, `--color-yellow-soft`, `--color-l0: #E4007C`, `--color-l1`, `--color-l1-soft`, `--color-l2`, `--color-l2-soft`, `--color-l3`.
    - `--font-sans: "Atkinson Hyperlegible", system-ui, sans-serif` y `--font-display: "Barlow Condensed", sans-serif`.
    - `--text-xs: 12px`, `--text-sm: 14px`, `--text-base: 16px`, `--text-lg: 19px`, `--text-xl: 22px`, `--text-2xl: 30px` y `--text-3xl: 44px`.
  - Variables de shadcn (`:root` + `@theme inline`):
    - `--background` y `--popover`: #FFFFFF.
    - `--foreground` y `--popover-foreground`: #000000.
    - `--primary`: #E4007C, y `--primary-foreground`: #FFFFFF.
    - `--muted`, `--accent` y `--secondary`: #EEF0F2, y sus `-foreground`: #000000. La excepción es `--muted-foreground`: #5B616B.
    - `--border` e `--input`: #D9DDE2.
    - `--ring`: #000000.
    - `--radius`: 12px.
  - Borra el bloque `.dark` y cualquier sombra que haya agregado shadcn.
  - `body`: `bg-white text-ink font-sans text-base`.
  - En `src/main.ts` importa `@fontsource/barlow-condensed/600.css`, `/700.css`, `@fontsource/atkinson-hyperlegible/400.css`, `/700.css` y `@/assets/index.css`, y monta `App.vue`.
  - En esta tarea `App.vue` solo muestra `<PictoTile name="food" />`, para comprobar en `npm run dev` que el sprite carga. La Tarea 3 lo cambia a `<RouterView />`.
- [ ] **Step 4: Escribir las pruebas que fallan**

```ts
// src/components/PictoTile.test.ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PictoTile from "./PictoTile.vue";

describe("PictoTile", () => {
  it("usa el símbolo del sprite", () => {
    const w = mount(PictoTile, { props: { name: "food" } });
    expect(w.find("use").attributes("href")).toBe("#i-food");
  });
  it("aplica tamaño chico y fondo azul", () => {
    const w = mount(PictoTile, { props: { name: "work", size: "sm", bg: "l1" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["size-[30px]", "rounded-[7px]", "bg-l1"]));
  });
  it("por defecto es mediano y negro", () => {
    const w = mount(PictoTile, { props: { name: "hand" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["size-10", "rounded-[9px]", "bg-ink"]));
  });
});
```

```ts
// src/components/ui/button/Button.test.ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Button } from "./index";

describe("Button", () => {
  it("go es rosa y mide 52px", () => {
    const w = mount(Button, { slots: { default: "Empezar" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["bg-rosa", "text-white", "min-h-[52px]", "rounded-[12px]"]));
  });
  it("line es blanco con borde negro", () => {
    const w = mount(Button, { props: { variant: "line" }, slots: { default: "Google" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["bg-white", "border-2", "border-ink"]));
  });
  it("quiet es gris concreto", () => {
    const w = mount(Button, { props: { variant: "quiet" }, slots: { default: "Ahora no" } });
    expect(w.classes()).toContain("bg-concrete");
  });
});
```

- [ ] **Step 5: Correr las pruebas para ver que fallan**
  - Run: `npm run test`
  - Expected: FAIL. No existe `PictoTile.vue`, y las variantes de `Button` siguen siendo las de shadcn.
- [ ] **Step 6: Implementar**
  - **`PictoTile.vue`:**
    - Es un `<span>` con `inline-grid place-items-center shrink-0`.
    - Lleva un `<svg class="fill-white"><use :href="`#i-${name}`" /></svg>`.
    - Tamaños: `sm` = `size-[30px] rounded-[7px]` con ícono `size-[18px]`, `md` = `size-10 rounded-[9px]` con ícono `size-6`, `lg` = `size-24 rounded-[20px]` con ícono `size-[60px]`.
    - El fondo sale de un objeto con las clases completas (`{ ink: "bg-ink", rosa: "bg-rosa", … }`). Tailwind no detecta las clases que se arman con template strings.
  - **Variantes de `Button`** (en `buttonVariants` del archivo generado):
    - Reemplázalas por `go: "bg-rosa text-white"`, `line: "bg-white text-ink border-2 border-ink"` y `quiet: "bg-concrete text-ink"`.
    - La base común es `inline-flex w-full items-center justify-center gap-2 min-h-[52px] rounded-[12px] px-4 font-bold text-base disabled:opacity-50`.
    - Deja un solo `size: default` y quita las sombras.
- [ ] **Step 7: Correr las pruebas y el build**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: 6 pruebas en PASS, lint sin errores y build sin errores.
- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: proyecto base de Habla con el estilo Línea"
```

---

### Task 2: Temario y estado de las estaciones

**Files:**
- Create: `src/curriculum/levels.ts`, `src/curriculum/units.ts`, `src/common/StationStates.ts`, `src/common/Greeting.ts`
- Test: `src/curriculum/units.test.ts`, `src/common/StationStates.test.ts`, `src/common/Greeting.test.ts`

**Interfaces:**
- Consumes: `PictogramName` (Task 1).
- Produces:
  - En `levels.ts`:
    - `type LevelId = "L0" | "A1" | "A2" | "B1"`.
    - `interface Level { id: LevelId; nombre: string; linea: string; color: "l0" | "l1" | "l2" | "l3"; resumen: string }`.
    - `const levels: Level[]` y `function getLevel(id: LevelId): Level`.
  - En `units.ts`:
    - `interface Unit { id: string; nivel: LevelId; orden: number; titulo_es: string; meta_puedes: string; pictograma: PictogramName }`.
    - `const units: Unit[]`, ordenado por nivel y luego por orden.
    - `function getUnit(id: string): Unit`, que regresa `units[0]` si el id no existe.
  - En `StationStates.ts`: `type StationState = "lograda" | "aqui" | "proxima"` y `function getStationState(unitId: string, currentUnitId: string): StationState`.
  - En `Greeting.ts`: `function getGreeting(now: Date, name: string): string`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/curriculum/units.test.ts
import { describe, expect, it } from "vitest";
import { levels } from "./levels.ts";
import { getUnit, units } from "./units.ts";

describe("temario", () => {
  it("tiene 4, 5, 8 y 6 metas por nivel", () => {
    const count = (id: string) => units.filter((u) => u.nivel === id).length;
    expect(levels.map((l) => count(l.id))).toEqual([4, 5, 8, 6]);
  });
  it("no repite ids", () => {
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
  });
  it("va ordenado por nivel y el orden empieza en 1 sin huecos", () => {
    const idx = units.map((u) => levels.findIndex((l) => l.id === u.nivel));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    levels.forEach((l) => {
      const orden = units.filter((u) => u.nivel === l.id).map((u) => u.orden);
      expect(orden).toEqual(orden.map((_, i) => i + 1));
    });
  });
  it("empieza en l0-saludar y cada meta dice 'Ya puedes …'", () => {
    expect(units[0].id).toBe("l0-saludar");
    units.forEach((u) => expect(u.meta_puedes.startsWith("Ya puedes ")).toBe(true));
  });
  it("getUnit regresa la primera meta si el id no existe", () => {
    expect(getUnit("a2-restaurante").titulo_es).toBe("Pedir comida en un restaurante");
    expect(getUnit("ya-no-existe").id).toBe("l0-saludar");
  });
});
```

```ts
// src/common/StationStates.test.ts
import { describe, expect, it } from "vitest";
import { getStationState } from "./StationStates";

describe("getStationState", () => {
  it("lo anterior está logrado, lo actual es aquí y lo siguiente es próximo", () => {
    expect(getStationState("a2-trabajo", "a2-restaurante")).toBe("lograda");
    expect(getStationState("a2-restaurante", "a2-restaurante")).toBe("aqui");
    expect(getStationState("a2-direcciones", "a2-restaurante")).toBe("proxima");
  });
  it("los niveles anteriores cuentan como logrados", () => {
    expect(getStationState("l0-saludar", "a1-quien-eres")).toBe("lograda");
    expect(getStationState("b1-viaje", "a1-quien-eres")).toBe("proxima");
  });
});
```

```ts
// src/common/Greeting.test.ts
import { describe, expect, it } from "vitest";
import { getGreeting } from "./Greeting";

const at = (h: number) => new Date(2026, 9, 19, h, 30);

describe("getGreeting", () => {
  it("usa la hora y solo el primer nombre", () => {
    expect(getGreeting(at(9), "Fernando Sotelo")).toBe("Buenos días, Fernando.");
    expect(getGreeting(at(15), "Fernando Sotelo")).toBe("Buenas tardes, Fernando.");
    expect(getGreeting(at(21), "Fernando Sotelo")).toBe("Buenas noches, Fernando.");
    expect(getGreeting(at(3), "Ana")).toBe("Buenas noches, Ana.");
  });
  it("sin nombre solo saluda", () => {
    expect(getGreeting(at(15), "")).toBe("Buenas tardes.");
  });
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**
  - Run: `npm run test`
  - Expected: FAIL, porque los módulos no existen.
- [ ] **Step 3: Implementar `levels.ts`**

| id | nombre | linea | color | resumen |
|---|---|---|---|---|
| L0 | Nivel 0 | Rosa | l0 | Saludar, números y colores |
| A1 | A1 | Azul | l1 | Hablar de ti, de tu familia y comprar |
| A2 | A2 | Verde | l2 | Trabajo, restaurante, viajes y llamadas |
| B1 | B1 | Naranja | l3 | Llamadas, juntas en inglés, resolver problemas |

- [ ] **Step 4: Implementar `units.ts`**
  - Este es el temario fijo de la v1. En la tabla `meta_puedes` aparece sin el "Ya puedes " inicial; el código lo guarda **con** "Ya puedes " al principio.
  - Los títulos son los del spec, sección 5.1.

| id | nivel/orden | titulo_es | meta_puedes ("Ya puedes " + …) | pictograma |
|---|---|---|---|---|
| l0-saludar | L0/1 | Saludar y despedirte | saludar y despedirte | hand |
| l0-numeros | L0/2 | Números, precios y la hora | decir números, precios y la hora | clock |
| l0-dias | L0/3 | Días, meses y colores | decir días, meses y colores | calendar |
| l0-nombre | L0/4 | Decir y deletrear tu nombre | decir y deletrear tu nombre | chat |
| a1-quien-eres | A1/1 | Decir quién eres y de dónde | decir quién eres y de dónde | hand |
| a1-familia | A1/2 | Hablar de tu familia | hablar de tu familia | group |
| a1-tienda | A1/3 | Comprar en una tienda | comprar en una tienda | wallet |
| a1-rutina | A1/4 | Tu rutina diaria | contar tu rutina diaria | clock |
| a1-cafeteria | A1/5 | Pedir algo en una cafetería | pedir algo en una cafetería | food |
| a2-junta | A2/1 | Presentarte en una junta | presentarte en una junta | hand |
| a2-trabajo | A2/2 | Hablar de tu trabajo | hablar de tu trabajo | work |
| a2-restaurante | A2/3 | Pedir comida en un restaurante | pedir comida en un restaurante | food |
| a2-direcciones | A2/4 | Pedir direcciones | pedir direcciones | sign |
| a2-hotel | A2/5 | Reservar un hotel | reservar un hotel | bed |
| a2-aeropuerto | A2/6 | En el aeropuerto | moverte en el aeropuerto | plane |
| a2-llamada | A2/7 | Una llamada corta | hacer una llamada corta | phone |
| a2-fin-de-semana | A2/8 | Contar qué hiciste el fin de semana | contar qué hiciste el fin de semana | calendar |
| b1-opinion | B1/1 | Dar tu opinión en una junta | dar tu opinión en una junta | work |
| b1-queja | B1/2 | Resolver un problema (una queja) | resolver un problema o hacer una queja | chat |
| b1-proceso | B1/3 | Explicar un proceso de tu trabajo | explicar un proceso de tu trabajo | work |
| b1-llamadas | B1/4 | Llamadas de trabajo | atender llamadas de trabajo | phone |
| b1-experiencia | B1/5 | Contar una experiencia | contar una experiencia | chat |
| b1-viaje | B1/6 | Planear un viaje | planear un viaje | plane |

  - `units.ts` importa `./levels.ts` y `../common/PictogramTypes.ts` con ruta relativa (ver Global Constraints).
- [ ] **Step 5: Implementar `StationStates.ts` y `Greeting.ts`**
  - `getStationState` compara el índice de cada meta en `units`, y resuelve la meta actual con `getUnit`.
  - `getGreeting` usa "Buenos días" de 5:00 a 11:59, "Buenas tardes" de 12:00 a 18:59 y "Buenas noches" el resto. Toma la primera palabra del nombre.
- [ ] **Step 6: Correr las pruebas**
  - Run: `npm run test`
  - Expected: todas en PASS.
- [ ] **Step 7: Commit**

```bash
git add src/curriculum src/common
git commit -m "feat: temario v1 y estado de las estaciones"
```

---

### Task 3: Pantallas Hoy y Mi línea

**Files:**
- Create: `src/stores/auth.ts` (solo state y getters), `src/Services/interfaces/Profile/ProfileInterface.ts`, `src/components/LineaVertical.vue`, `src/components/layout/MainLayout.vue`, `src/Views/Hoy/HoyPage.vue`, `src/Views/MiLinea/MiLineaPage.vue`, `src/router/index.ts` (sin guard)
- Modify: `src/App.vue` (`<RouterView />`) y `src/main.ts` (pinia + router)
- Test: `src/Views/Hoy/HoyPage.test.ts`, `src/Views/MiLinea/MiLineaPage.test.ts`

**Interfaces:**
- Consumes: `units`, `getUnit`, `levels`, `getLevel` y `getStationState` (Task 2); `PictoTile` (Task 1).
- Produces:
  - En `ProfileInterface.ts`:
    - `type Motive = "trabajo" | "viajes" | "ambos"`.
    - `interface Profile { user_id: string; name: string; motive: Motive | null; level: LevelId; current_unit_id: string; is_admin: boolean }`.
  - `useAuthStore` (Pinia, en estilo opciones como el de BaseFront):
    - state: `{ session: Session | null; profile: Profile | null; loaded: boolean; loginError: "" | "sin-invitacion" | "sin-perfil" | "sin-conexion" }`.
    - getters: `isAuthenticated` (`!!session && !!profile`), `hasMotive` e `isAdmin`.
  - Rutas: `/` con `MainLayout` y los hijos `""` (`name: "hoy"`) y `"mi-linea"` (`name: "mi-linea"`).
  - `<LineaVertical :stations="Unit[]" :current-unit-id="string" :color="Level['color']">`, con un slot por defecto que se pinta debajo de la estación actual. Cada estación lleva `data-estado` igual a su `StationState`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/Views/Hoy/HoyPage.test.ts
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import HoyPage from "./HoyPage.vue";

describe("HoyPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 19, 15, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("saluda y muestra la estación anterior, la actual y la siguiente", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().profile = {
      user_id: "u1", name: "Fernando Sotelo", motive: "ambos",
      level: "A2", current_unit_id: "a2-restaurante", is_admin: false,
    };
    const w = mount(HoyPage, { global: { plugins: [pinia] } });
    const movil = w.get('[data-testid="linea-movil"]');
    expect(w.text()).toContain("Buenas tardes, Fernando.");
    expect(movil.get('[data-estado="lograda"]').text()).toContain("Hablar de tu trabajo");
    expect(movil.get('[data-estado="aqui"]').text()).toContain("Pedir comida en un restaurante");
    expect(movil.get('[data-estado="aqui"]').text()).toContain("Estás aquí");
    expect(movil.get('[data-estado="proxima"]').text()).toContain("Pedir direcciones");
    expect(w.text()).toContain("Sesión de hoy");
  });
});
```

```ts
// src/Views/MiLinea/MiLineaPage.test.ts
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth";
import MiLineaPage from "./MiLineaPage.vue";

function mountAt(unitId: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().profile = {
    user_id: "u1", name: "Ana", motive: "viajes", level: "A2", current_unit_id: unitId, is_admin: false,
  };
  return mount(MiLineaPage, { global: { plugins: [pinia] } });
}

describe("MiLineaPage", () => {
  it("resume cada nivel según la estación actual", () => {
    const w = mountAt("a2-restaurante");
    expect(w.get('[data-nivel="L0"]').text()).toContain("completo");
    expect(w.get('[data-nivel="A1"]').text()).toContain("completo");
    const a2 = w.get('[data-nivel="A2"]').text();
    expect(a2).toContain("2 de 8");
    expect(a2).toContain("Ya puedes hablar de tu trabajo");
    expect(a2).toContain("Pedir comida en un restaurante");
    expect(a2).toContain("Pedir direcciones y 4 metas más");
    expect(w.get('[data-nivel="B1"]').text()).toContain("después");
  });
  it("al empezar no hay nada logrado", () => {
    const l0 = mountAt("l0-saludar").get('[data-nivel="L0"]').text();
    expect(l0).toContain("0 de 4");
    expect(l0).toContain("Números, precios y la hora y 2 metas más");
  });
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**
  - Run: `npm run test`
  - Expected: FAIL, porque las vistas y el store no existen.
- [ ] **Step 3: Implementar el store, la interfaz y `LineaVertical`**
  - El store queda como en las Interfaces, sin acciones todavía. Su estado inicial es `loaded: false` y `loginError: ""`.
  - `LineaVertical` copia las medidas de `.l-line`, `.l-st` y `.l-tag` del diseño (líneas 66–77):
    - **Estación lograda:** punto relleno del color de la línea, pictograma `sm` del color del nivel y nombre en `ink-2`.
    - **Estación actual:** punto amarillo de 26px con borde negro de 6px, pictograma `ink`, nombre de 22px en Hoy y etiqueta "Estás aquí".
    - **Estación próxima:** pictograma `rule` y nombre en `ink-2` con opacidad .75.
- [ ] **Step 4: Implementar `HoyPage` y `MiLineaPage`**
  - **HoyPage, en móvil (`data-testid="linea-movil"`, `lg:hidden`):**
    - Arriba va `getGreeting(new Date(), profile.name)`.
    - Debajo, `LineaVertical` con la meta anterior, la actual y la siguiente según el orden global de `units` (las que existan), en el color del nivel actual.
    - En el slot va el panel "Sesión de hoy", con "22 minutos" a la derecha.
    - Dentro del panel hay una lista numerada: "Repasar frases", "Aprender frases nuevas", "Conversar en inglés" y "Ver tu resumen". Abajo, el texto "Las sesiones llegan en la próxima versión de Habla."
    - El panel no lleva botón todavía, porque el botón lo agrega la fase 3. Se pinta como en el diseño, clases `.l-panel` y `.l-steps`.
  - **HoyPage, en computadora (`hidden lg:grid`, columnas `270px 1fr`):**
    - A la izquierda va el texto "Línea {linea en minúsculas}, nivel {nombre}", por ejemplo "Línea verde, nivel A2". En L0 se escribe "Línea rosa, Nivel 0". Debajo va `LineaVertical` con todas las metas del nivel actual.
    - En el centro van el saludo, el nombre de la estación actual en `font-display` de 44px y el mismo panel.
  - **MiLineaPage**, como en el diseño (`.l-lv`, `.l-can` y `.l-facts`, líneas 157–176), con un bloque `data-nivel` por nivel:
    - El encabezado es el nombre, una etiqueta con el color de la línea y un texto chico:
      - "completo" si el nivel ya pasó.
      - "{logradas} de {total}" si es el nivel actual.
      - "después" si es un nivel futuro.
    - **Nivel completo:** una línea con palomita y el `resumen` del nivel.
    - **Nivel actual:**
      - Una palomita con `meta_puedes` por cada meta lograda.
      - La meta actual en negritas, con el punto amarillo.
      - Una línea gris con "{siguiente titulo} y {n} metas más". Si solo falta una, se pone el título solo. Si es la última, no se pone nada.
    - **Nivel futuro:** el `resumen` en gris.
    - Entre niveles va el círculo negro de transbordo. Esta fase no lleva la fila de datos (`.l-facts`).
- [ ] **Step 5: Implementar `MainLayout`, el router y `main.ts`**
  - **`MainLayout` en móvil:**
    - Arriba, la palabra "Habla" con el punto rosa (`.l-word`) y el avatar (`.l-me`). El avatar lleva la inicial de `profile.name` en mayúscula, o "?", sobre el color del nivel.
    - Al centro, `<RouterView />` con un padding de 20px.
    - Abajo, las pestañas "Hoy" y "Mi línea" (`.l-tabs`), con los íconos `i-tab-today` e `i-tab-map`.
    - La pestaña activa usa `text-ink` y el ícono rosa. Las pestañas dejan `padding-bottom: env(safe-area-inset-bottom)`.
  - **`MainLayout` desde `lg`:**
    - Las pestañas se ocultan y aparece la barra superior (`.l-topbar`).
    - El enlace activo se subraya con `border-b-4 border-rosa`, en vez de la sombra del diseño.
    - El contenido queda con un ancho máximo de 1040px, centrado.
  - **Router:** `createWebHistory(import.meta.env.BASE_URL)` con las rutas de las Interfaces.
  - **`main.ts`:** igual que el de BaseFront, pero sin `initialize()` (eso llega en la Tarea 5) y sin VueQuery.
- [ ] **Step 6: Correr las pruebas y el build**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: todo en PASS y build sin errores.
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pantallas Hoy y Mi línea con el layout de pestañas"
```

---

### Task 4: Base de datos en Supabase

**Files:**
- Create: `supabase/config.toml` (con `npx supabase init`), `supabase/migrations/20261019000000_base.sql`, `supabase/tests/base_checks.sql`, `.env.example`

**Interfaces:**
- Produces:
  - La tabla `public.invites(email text pk en minúsculas, invited_by uuid, created_at, accepted_at)`.
  - La tabla `public.profiles(user_id uuid pk, name text, motive text|null, level text, current_unit_id text, is_admin bool, created_at)`. El usuario `authenticated` puede hacer `select` de su fila y `update` solo de `motive`.
  - El hook `public.hook_before_user_created(jsonb)`.
  - El trigger `on_auth_user_created`, que crea el perfil.

- [ ] **Step 1 (Fernando, en el navegador de su cuenta personal): Crear el proyecto de Supabase**
  - En supabase.com crea el proyecto **habla** en el plan Free, región **East US (North Virginia)**. Guarda la contraseña de la base en tu gestor de contraseñas.
  - En Settings → API Keys copia la **Project URL** y la **Publishable key** (`sb_publishable_…`).
  - Crea `.env.development` y `.env.production` con `VITE_SUPABASE_URL=…` y `VITE_SUPABASE_PUBLISHABLE_KEY=…`.
  - Crea `.env.example` con los mismos nombres y valores de ejemplo (`https://<ref>.supabase.co`, `sb_publishable_xxx`).
- [ ] **Step 2 (Fernando, en su terminal): Enlazar la CLI**
  - Corre `npx supabase init`, luego `npx supabase login` (copia la URL que imprime en tu navegador personal) y luego `npx supabase link --project-ref <ref>`. Cuando lo pida, escribe la contraseña de la base.
  - Se hace en tu terminal porque la CLI pide datos de forma interactiva.
- [ ] **Step 3: Escribir la prueba que falla, `supabase/tests/base_checks.sql`**

```sql
-- Pruebas de la fase 1. Todo corre en una transacción y se deshace al final.
-- Correr: npm run db:sql -- supabase/tests/base_checks.sql
begin;

insert into public.invites (email) values ('ana.lopez@gmail.com');

do $$
begin
  begin
    insert into public.invites (email) values ('Beto@Gmail.com');
    raise exception 'FALLO: guardó un correo sin normalizar';
  exception when check_violation then null;
  end;
  assert public.hook_before_user_created('{"user":{"email":" Ana.Lopez@Gmail.com "}}'::jsonb) = '{}'::jsonb,
    'FALLO: el hook rechazó un correo invitado';
  assert public.hook_before_user_created('{"user":{"email":"nadie@gmail.com"}}'::jsonb) -> 'error' ->> 'http_code' = '403',
    'FALLO: el hook dejó pasar un correo sin invitación';
end $$;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'ana.lopez@gmail.com', 'authenticated', 'authenticated', '{"full_name":"Ana López"}'),
  ('00000000-0000-4000-8000-00000000000b', 'beto@gmail.com', 'authenticated', 'authenticated', '{}');

do $$
begin
  assert (select name from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a') = 'Ana López', 'FALLO: nombre de Google';
  assert (select name from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b') = 'beto', 'FALLO: nombre por defecto';
  assert (select level || '/' || current_unit_id from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a') = 'L0/l0-saludar', 'FALLO: nivel inicial';
  assert (select motive from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a') is null, 'FALLO: motivo inicial';
  assert (select accepted_at from public.invites where email = 'ana.lopez@gmail.com') is not null, 'FALLO: invitación sin marcar';
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.profiles) = 1, 'FALLO: Ana ve perfiles ajenos';
  update public.profiles set motive = 'viajes' where user_id = '00000000-0000-4000-8000-00000000000a';
  assert (select motive from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a') = 'viajes', 'FALLO: Ana no pudo guardar su motivo';
  update public.profiles set motive = 'trabajo' where user_id = '00000000-0000-4000-8000-00000000000b';
  begin update public.profiles set is_admin = true where user_id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FALLO: Ana pudo hacerse admin'; exception when insufficient_privilege then null; end;
  begin update public.profiles set level = 'B1' where user_id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FALLO: Ana pudo cambiar su nivel'; exception when insufficient_privilege then null; end;
  begin update public.profiles set current_unit_id = 'b1-viaje' where user_id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FALLO: Ana pudo cambiar su estación'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.invites;
    raise exception 'FALLO: Ana puede leer las invitaciones'; exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
begin
  assert (select motive from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b') is null, 'FALLO: Ana cambió el perfil de Beto';
end $$;

select 'OK: pruebas de la fase 1' as resultado;
rollback;
```

- [ ] **Step 4: Correr la prueba para ver que falla**
  - Run: `npm run db:sql -- supabase/tests/base_checks.sql`
  - Expected: FAIL con `relation "public.invites" does not exist`.
  - Si la CLI no acepta el archivo, pega su contenido en el SQL Editor del dashboard. Si en lugar de eso falla con `permission denied for table users`, detente y avísale a Fernando: habría que probar el RLS con dos cuentas reales.
- [ ] **Step 5: Escribir la migración `20261019000000_base.sql`**

```sql
-- Fase 1: invitaciones, perfiles y el filtro de invitados.

create table public.invites (
  email text primary key check (email = lower(trim(email))),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  motive text check (motive in ('trabajo', 'viajes', 'ambos')),
  level text not null default 'L0' check (level in ('L0', 'A1', 'A2', 'B1')),
  current_unit_id text not null default 'l0-saludar',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
alter table public.profiles enable row level security;

-- Cada quien ve y cambia solo su perfil, y solo puede cambiar su motivo.
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (motive) on public.profiles to authenticated;

-- Las invitaciones no se ven desde la app en esta fase (Mi grupo llega en la fase 4).
revoke all on public.invites from anon, authenticated;

-- Hook "Before User Created": solo se crean cuentas de correos invitados.
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.invites i
    where i.email = lower(trim(event -> 'user' ->> 'email'))
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Ese correo no tiene invitación.'));
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant select on public.invites to supabase_auth_admin;
create policy "invites_auth_admin_read" on public.invites for select to supabase_auth_admin using (true);

-- Al crear la cuenta: perfil nuevo e invitación aceptada.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  update public.invites set accepted_at = now() where email = lower(trim(new.email));
  return new;
end;
$$;

-- No se le quita EXECUTE: PostgREST no expone funciones que regresan trigger,
-- y así no se arriesga la creación de cuentas que hace Auth.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 6: Aplicar la migración**
  - Run: `npm run db:push`
  - Expected: `Applying migration 20261019000000_base.sql...` y `Finished supabase db push.`
  - Si pide la contraseña, Fernando lo corre en su terminal.
- [ ] **Step 7: Correr la prueba**
  - Run: `npm run db:sql -- supabase/tests/base_checks.sql`
  - Expected: una fila con `OK: pruebas de la fase 1` y ningún `FALLO`.
- [ ] **Step 8: Commit**

```bash
git add supabase .env.example
git commit -m "feat: tablas de invitaciones y perfiles con RLS y filtro de invitados"
```

---

### Task 5: Entrar con Google

**Files:**
- Create: `src/lib/supabase.ts`, `src/Services/Profile/ProfileService.ts`, `src/Views/Bienvenida/BienvenidaPage.vue`, `src/Views/404/NotFoundPage.vue`
- Modify: `src/stores/auth.ts` (acciones), `src/router/index.ts` (rutas y guard), `src/main.ts` (`await initialize()` antes de montar), `src/components/layout/MainLayout.vue` (menú del avatar)
- Test: `src/stores/auth.test.ts`, `src/router/index.test.ts`, `src/Views/Bienvenida/BienvenidaPage.test.ts`

**Interfaces:**
- Consumes: `Profile` y `useAuthStore` (Task 3), y las tablas y el hook (Task 4).
- Produces:
  - En `lib/supabase.ts`: `export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)`.
  - En `ProfileService`: `GetProfile(userId: string): Promise<Profile | null>`, que lanza un error si falla.
  - Acciones del store: `initialize(): Promise<void>`, `signInWithGoogle(): Promise<void>` y `signOut(): Promise<void>`.
  - Rutas `/bienvenida` (`name: "bienvenida"`) y `/:pathMatch(.*)*` (NotFound).

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/stores/auth.test.ts
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import ProfileService from "@/Services/Profile/ProfileService";
import { useAuthStore } from "./auth";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn() } },
}));
vi.mock("@/Services/Profile/ProfileService", () => ({ default: { GetProfile: vi.fn(), SaveMotive: vi.fn() } }));

const session = { user: { id: "u1" } };
const profile = { user_id: "u1", name: "Ana", motive: null, level: "L0", current_unit_id: "l0-saludar", is_admin: false };

describe("auth store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    vi.resetAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("sin sesión queda sin autenticar", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loaded).toBe(true);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("");
  });
  it("con un token vencido queda sin autenticar y sin aviso", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: new Error("Invalid Refresh Token") } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("");
  });
  it("con sesión carga el perfil", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null } as never);
    vi.mocked(ProfileService.GetProfile).mockResolvedValue(profile as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(ProfileService.GetProfile).toHaveBeenCalledWith("u1");
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.hasMotive).toBe(false);
  });
  it("si Google regresó con error marca sin-invitacion", async () => {
    window.location.hash = "#error=access_denied&error_description=Ese+correo+no+tiene+invitaci%C3%B3n.";
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.loginError).toBe("sin-invitacion");
  });
  it("con sesión pero sin perfil marca sin-perfil", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null } as never);
    vi.mocked(ProfileService.GetProfile).mockResolvedValue(null);
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("sin-perfil");
  });
  it("si no hay internet al cargar el perfil marca sin-conexion", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null } as never);
    vi.mocked(ProfileService.GetProfile).mockRejectedValue(new TypeError("Failed to fetch"));
    const auth = useAuthStore();
    await auth.initialize();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.loginError).toBe("sin-conexion");
    expect(auth.loaded).toBe(true);
  });
});
```

```ts
// src/router/index.test.ts
import type { Session } from "@supabase/supabase-js";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import router from "./index";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

function login(motive: "viajes" | null) {
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = { user_id: "u1", name: "Ana", motive, level: "L0", current_unit_id: "l0-saludar", is_admin: false };
}

// force: el router es el mismo en todas las pruebas; sin force, ir a la ruta actual no corre el guard
const go = (path: string) => router.push({ path, force: true });

describe("guard del router", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("sin sesión manda a bienvenida", async () => {
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("bienvenida");
  });
  it("con sesión, bienvenida manda a hoy", async () => {
    login("viajes");
    await go("/bienvenida");
    expect(router.currentRoute.value.name).toBe("hoy");
  });
  it("con sesión entra a mi línea", async () => {
    login("viajes");
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("mi-linea");
  });
});
```

```ts
// src/Views/Bienvenida/BienvenidaPage.test.ts
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import BienvenidaPage from "./BienvenidaPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

function setup(loginError: "" | "sin-invitacion" = "") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.loginError = loginError;
  const signIn = vi.spyOn(auth, "signInWithGoogle").mockResolvedValue();
  return { w: mount(BienvenidaPage, { global: { plugins: [pinia] } }), signIn };
}

describe("BienvenidaPage", () => {
  it("entra con Google y explica la invitación", async () => {
    const { w, signIn } = setup();
    expect(w.text()).toContain("Inglés para moverte en la vida real, 20 minutos al día.");
    expect(w.text()).toContain("Solo pueden entrar personas invitadas. Si no tienes invitación, pídesela a quien te recomendó la app.");
    expect(w.text()).not.toContain("enlace por correo");
    await w.get("button").trigger("click");
    expect(signIn).toHaveBeenCalled();
  });
  it("avisa cuando el correo no tiene invitación", () => {
    expect(setup("sin-invitacion").w.text()).toContain("No pudimos dejarte entrar");
  });
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**
  - Run: `npm run test`
  - Expected: FAIL, porque faltan `lib/supabase`, `ProfileService`, las acciones, la ruta `bienvenida` y la vista.
- [ ] **Step 3: Implementar `lib/supabase.ts`, `ProfileService` y las acciones del store**
  - **`GetProfile`:** `supabase.from("profiles").select("user_id, name, motive, level, current_unit_id, is_admin").eq("user_id", userId).maybeSingle()`. Si viene `error`, lo lanza.
  - **`initialize()`:**
    1. Antes de cualquier `await`, lee `error` del `window.location.search` y del hash. Si viene, pone `loginError = "sin-invitacion"`.
    2. Llama `getSession()`. Si trae error o no hay sesión, deja `session = null`.
    3. Si hay sesión, llama `GetProfile`:
       - Si regresa `null`, pone `session = null` y `loginError = "sin-perfil"`.
       - Si lanza un error, pone `session = null` y `loginError = "sin-conexion"`.
    4. Al final siempre pone `loaded = true`.
  - **`signInWithGoogle()`:** `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + import.meta.env.BASE_URL } })`.
  - **`signOut()`:** `await supabase.auth.signOut()`, y deja `session` y `profile` en null.
- [ ] **Step 4: Implementar el guard, la Bienvenida, NotFound y el menú del avatar**
  - **Reglas del `router.beforeEach`**, en este orden:
    1. Si no está autenticado: solo deja ver `bienvenida`, y cualquier otra ruta manda ahí.
    2. Si está autenticado y va a `bienvenida`: lo manda a `hoy`.
  - **BienvenidaPage** se pinta como la pantalla 1.1, con `.l-cover`:
    - La línea rosa con "Habla" en 76px y la frase "Inglés para moverte en la vida real, 20 minutos al día.".
    - Tres estaciones decorativas: "Presentarte" (la primera, en amarillo), "Pedir comida" y "Tu primera junta".
    - El botón `line` "Continuar con Google", con la G en `#4285F4`.
    - El texto chico "Solo pueden entrar personas invitadas. Si no tienes invitación, pídesela a quien te recomendó la app."
  - **Avisos de la Bienvenida**, según `loginError`. Van encima del botón y se pintan como `.l-alert`:
    - `sin-invitacion`, en amarillo: "No pudimos dejarte entrar". Texto: "Solo pueden entrar correos invitados. Si ya te invitaron, revisa que elegiste la cuenta de Google correcta."
    - `sin-perfil`, en amarillo: "Entraste, pero falta tu perfil". Texto: "Avísale a quien te invitó para que lo revise."
    - `sin-conexion`, en gris con el ícono `i-nowifi`: "Sin conexión a internet". Texto: "Revisa tu conexión y vuelve a intentar." Abajo, la acción "Reintentar", que recarga la página.
  - **NotFoundPage:** el texto "Esta página no existe." y un enlace "Ir a Hoy".
  - **Avatar de MainLayout:** abre un `DropdownMenu` con "Cerrar sesión", que llama `signOut()` y luego `router.replace({ name: "bienvenida" })`.
  - **`main.ts`:** `app.use(pinia)` → `await useAuthStore().initialize()` → `app.use(router)` → `mount`, igual que en BaseFront.
- [ ] **Step 5: Correr las pruebas**
  - Run: `npm run test && npm run lint`
  - Expected: todo en PASS.
- [ ] **Step 6 (Fernando, en su navegador personal): Configurar Google y Supabase**
  1. **Google Cloud Console** (Google Auth Platform, `console.cloud.google.com/auth/overview`):
     - Crea un proyecto "Habla", da Get started y llena el asistente: nombre Habla, tu Gmail, Audience External.
     - En Data access deja solo `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile`.
     - **La app se queda en Testing ("Prueba")**, que es el camino normal. Para publicarla, Google pide página de inicio, política de privacidad y dominios verificados, y para 5 personas no hace falta.
     - En Audience → Test users agrega el Gmail de cada persona invitada (máximo 100).
     - La primera vez, Google muestra "Google no verificó esta app" y cada persona da Continuar.
  2. **Cliente OAuth:**
     - En Clients → Create client → Web application.
     - Authorized JavaScript origins: `http://localhost:5173`.
     - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
     - Copia el Client ID y el secret.
  3. **Supabase → Authentication → Sign In / Providers:**
     - Activa **Google** con ese Client ID y ese secret.
     - **Desactiva Email**, porque la decisión es solo Google.
  4. **Supabase → Authentication → URL Configuration:** Site URL `http://localhost:5173` y Redirect URLs `http://localhost:5173/**`.
  5. **Supabase → Authentication → Hooks:** en "Before User Created" elige Postgres, esquema `public` y función `hook_before_user_created`, y activa.
  6. **Tu invitación:** `npm run db:sql -- --query "insert into public.invites (email) values (lower(trim('TU_GMAIL')))"`.
- [ ] **Step 7: Probar el login a mano**
  - Run: `npm run dev` y abre `http://localhost:5173` en tu navegador personal.
  - Expected:
    - "Continuar con Google" con tu Gmail invitado te lleva a Hoy, con "Buenas …, Fernando." y la línea rosa en "Saludar y despedirte".
    - `npm run db:sql -- --query "select name, level, current_unit_id from public.profiles"` muestra tu fila.
    - Cerrar sesión desde el avatar te regresa a la Bienvenida.
    - Con otra cuenta de Google **no invitada**, ves "No pudimos dejarte entrar" y `select count(*) from auth.users` no aumenta.
- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: entrar con Google solo con invitación"
```

---

### Task 6: Tu motivo

**Files:**
- Create: `src/Views/Motivo/MotivoPage.vue`
- Modify: `src/Services/Profile/ProfileService.ts` (`SaveMotive`), `src/stores/auth.ts` (acción `saveMotive`), `src/router/index.ts` (ruta y regla del motivo)
- Test: `src/Views/Motivo/MotivoPage.test.ts`, `src/router/index.test.ts` (2 casos nuevos)

**Interfaces:**
- Consumes: `useAuthStore` y `ProfileService` (Task 5), y `PictoTile` (Task 1).
- Produces:
  - En `ProfileService`: `SaveMotive(userId: string, motive: Motive): Promise<void>`, que lanza un error si falla.
  - En el store: `saveMotive(motive: Motive): Promise<void>`, que también actualiza `profile.motive`.
  - La ruta `/motivo` (`name: "motivo"`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/Views/Motivo/MotivoPage.test.ts
import type { Session } from "@supabase/supabase-js";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import ProfileService from "@/Services/Profile/ProfileService";
import { useAuthStore } from "@/stores/auth";
import MotivoPage from "./MotivoPage.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));
vi.mock("@/Services/Profile/ProfileService", () => ({ default: { GetProfile: vi.fn(), SaveMotive: vi.fn() } }));

async function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.session = { user: { id: "u1" } } as Session;
  auth.profile = { user_id: "u1", name: "Ana", motive: null, level: "L0", current_unit_id: "l0-saludar", is_admin: false };
  await router.push({ path: "/motivo", force: true });
  return mount(MotivoPage, { global: { plugins: [pinia, router] } });
}

describe("MotivoPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("no deja continuar sin elegir", async () => {
    const w = await setup();
    expect(w.get('[data-testid="continuar"]').attributes("disabled")).toBeDefined();
  });
  it("guarda el motivo y lleva a hoy", async () => {
    vi.mocked(ProfileService.SaveMotive).mockResolvedValue();
    const w = await setup();
    await w.get('[data-motivo="viajes"]').trigger("click");
    await w.get('[data-testid="continuar"]').trigger("click");
    await flushPromises();
    expect(ProfileService.SaveMotive).toHaveBeenCalledWith("u1", "viajes");
    expect(useAuthStore().profile?.motive).toBe("viajes");
    // Hoy se carga con import(): se espera a que termine la navegación
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("hoy"));
  });
  it("si no se guarda, avisa y se queda", async () => {
    vi.mocked(ProfileService.SaveMotive).mockRejectedValue(new TypeError("Failed to fetch"));
    const w = await setup();
    await w.get('[data-motivo="ambos"]').trigger("click");
    await w.get('[data-testid="continuar"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar.");
    expect(router.currentRoute.value.name).toBe("motivo");
  });
});
```

  - Casos nuevos en `src/router/index.test.ts`:

```ts
  it("sin motivo manda a motivo, incluso desde bienvenida", async () => {
    login(null);
    await go("/mi-linea");
    expect(router.currentRoute.value.name).toBe("motivo");
    await go("/bienvenida");
    expect(router.currentRoute.value.name).toBe("motivo");
  });
  it("con motivo, motivo manda a hoy", async () => {
    login("viajes");
    await go("/motivo");
    expect(router.currentRoute.value.name).toBe("hoy");
  });
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**
  - Run: `npm run test`
  - Expected: FAIL, porque no existen la ruta `motivo` ni `MotivoPage`.
- [ ] **Step 3: Implementar**
  - **`SaveMotive`:** `supabase.from("profiles").update({ motive }).eq("user_id", userId)`. Si viene `error`, lo lanza.
  - **Guard:** las reglas finales reemplazan las de la Tarea 5 y van en este orden:
    1. Si no está autenticado: solo deja ver `bienvenida`, y todo lo demás manda ahí.
    2. Si está autenticado pero no tiene motivo: solo deja ver `motivo`, y todo lo demás manda ahí, incluida `bienvenida`.
    3. Si tiene motivo y va a `bienvenida` o a `motivo`: lo manda a `hoy`.
  - **MotivoPage, como la pantalla 1.2:**
    - **Mini línea** (`.l-mini`) con "Cuenta" lograda, "Tu motivo" actual y "Evaluación" pendiente. La evaluación llega en la fase 4.
    - **Título y subtítulo:** "¿Para qué quieres aprender inglés?" y "Solo cambia los ejemplos que vas a ver. Tu plan es el mismo."
    - **Opciones:** tres botones `role="radio"` dentro de un `role="radiogroup"`, con `data-motivo` y las medidas de `.l-opt`:
      - `trabajo`, con `PictoTile` `work` en `l1`: "Trabajo", y abajo "Juntas, correos y llamadas".
      - `viajes`, con `plane` en `rosa`: "Viajes", y abajo "Aeropuerto, hotel y restaurante".
      - `ambos`, con `both` en `ink`: "Las dos cosas", y abajo "Un poco de cada una".
    - **Selección:** la opción elegida lleva borde negro de 3px y el círculo amarillo.
    - **Botón** `go` "Continuar" (`data-testid="continuar"`): está deshabilitado sin selección y mientras guarda.
    - **Si falla:** aparece una placa gris con el texto exacto de la prueba.
- [ ] **Step 4: Correr las pruebas y probar a mano**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: todo en PASS.
  - Prueba a mano:
    1. Corre `npm run db:sql -- --query "update public.profiles set motive = null"`.
    2. Recarga la app: debe pedirte el motivo.
    3. Elige uno y llegas a Hoy.
    4. Recarga otra vez: ya no lo pide.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pregunta del motivo al primer uso"
```

---

### Task 7: App instalable y publicada

**Files:**
- Create: `public/logo.svg`, `pwa-assets.config.ts`, `wrangler.jsonc`, `README.md`, y los íconos generados en `public/`
- Modify: `vite.config.ts` (VitePWA), `index.html` (`apple-touch-icon` y `theme-color`), `package.json` (scripts `generate-pwa-assets` y `deploy`)

**Interfaces:**
- Consumes: la app completa de las Tasks 1–6.
- Produces: la URL pública `https://habla.<subdominio>.workers.dev`, ya instalable en iPhone, Android y computadora.

- [ ] **Step 1: Ícono y generador**
  - `public/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#E4007C"/>
  <circle cx="256" cy="256" r="120" fill="#FFD100" stroke="#000000" stroke-width="48"/>
</svg>
```

  - En `pwa-assets.config.ts` usa `defineConfig({ preset: minimal2023Preset, images: ["public/logo.svg"] })`, que viene de `@vite-pwa/assets-generator/config`.
  - Agrega el script `"generate-pwa-assets": "pwa-assets-generator"` y córrelo. Si npm no encuentra el comando, usa `npx @vite-pwa/assets-generator`.
  - Revisa los PNG en `public/`. Si el maskable o el de Apple quedan con margen blanco, ponles `padding: 0` y `resizeOptions: { background: "#E4007C" }`. Anota los nombres reales de los archivos para el manifest.
- [ ] **Step 2: Agregar VitePWA**
  - En `vite.config.ts` agrega `VitePWA({ registerType: "autoUpdate", includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"], manifest: {...} })`. El manifest lleva:
    - `name: "Habla"` y `short_name: "Habla"`.
    - `description: "Inglés para moverte en la vida real, 20 minutos al día."` y `lang: "es"`.
    - `theme_color: "#FFFFFF"`, `background_color: "#FFFFFF"`, `display: "standalone"` y `start_url: "/"`.
    - Los íconos 192, 512 y el maskable 512 (`purpose: "maskable"`).
  - En `index.html` agrega `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">` y `<meta name="theme-color" content="#FFFFFF">`.
- [ ] **Step 3: Verificar el build**
  - Run:

```bash
npm run build && node -e "const m=JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8'));const ok=m.name==='Habla'&&m.display==='standalone'&&m.icons.some(i=>i.purpose==='maskable')&&require('fs').existsSync('dist/sw.js');console.log(ok?'ok':'falta algo');process.exit(ok?0:1)"
```

  - Expected: `ok`.
- [ ] **Step 4: Publicar en Cloudflare**
  - `wrangler.jsonc`:

```jsonc
{
  "name": "habla",
  "compatibility_date": "2026-10-19",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

  - Agrega el script `"deploy": "npm run build && wrangler deploy"`.
  - **Fernando:** crea una cuenta gratis en Cloudflare y corre `npx wrangler login` (copia la URL a tu navegador personal).
  - Run: `npm run deploy`
  - Expected: `Deployed habla … https://habla.<subdominio>.workers.dev`.
- [ ] **Step 5 (Fernando): Agregar la URL pública**
  - En Supabase → URL Configuration: Site URL `https://habla.<subdominio>.workers.dev`, y en Redirect URLs agrega `https://habla.<subdominio>.workers.dev/**`.
  - En el cliente OAuth de Google agrega ese origen en Authorized JavaScript origins.
- [ ] **Step 6: Revisar en los dispositivos**
  - Expected:
    - **iPhone (Safari):**
      1. Abre la URL y entra con Google.
      2. Usa Compartir → "Agregar a inicio".
      3. Abre la app desde el ícono y cierra sesión.
      4. Vuelve a entrar con Google **desde la app instalada**: debes regresar a la app instalada, ya con tu sesión.
      - Si la sesión queda en Safari y la app sigue en la Bienvenida, anota exactamente lo que pasó. Detente y avísale a Fernando: habría que cambiar el login del iPhone a Google Identity Services con `signInWithIdToken`.
    - **Android (Chrome):** "Instalar app" desde el menú, entrar con Google, ver Hoy y Mi línea, y confirmar que la barra de pestañas no queda tapada.
    - **Computadora (Chrome y Edge):** barra superior con Hoy y Mi línea, la línea completa del nivel a la izquierda, e instalable desde la barra de direcciones.
    - **Una cuenta no invitada** en la URL pública ve "No pudimos dejarte entrar".
- [ ] **Step 7: Escribir el README.md** (en español, con secciones cortas)
  - **Qué es:** una línea y el enlace al spec.
  - **Arrancar:** `npm install`, `.env.development` desde `.env.example` y `npm run dev`.
  - **Scripts:** dev, build, test, lint, deploy y generate-pwa-assets.
  - **Supabase:** cómo enlazar la CLI, `db push`, y cómo correr `supabase/tests/base_checks.sql`.
  - **Invitar a alguien:** son dos pasos. Primero `npm run db:sql -- --query "insert into public.invites (email) values (lower(trim('correo@gmail.com')))"`. Después agrégalo en Google Auth Platform → Audience → Test users.
  - **Hacerte admin**, para la fase 4: `update public.profiles set is_admin = true where user_id = (select id from auth.users where email = 'TU_GMAIL')`.
  - **Publicar:** `npm run deploy` y las URLs que hay que registrar en Supabase y Google.
  - **Aviso:** Supabase Free pausa el proyecto tras 7 días sin uso. Se reactiva desde el dashboard.
- [ ] **Step 8: Correr todo una última vez**
  - Run: `npm run test && npm run lint && npm run build`
  - Expected: todo en PASS.
- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: app instalable y publicada en Cloudflare"
```
