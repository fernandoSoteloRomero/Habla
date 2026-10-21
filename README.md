# Habla

App web instalable (PWA) para aprender inglés de la vida real en 20 a 30 minutos al día, practicando con una IA. Es para un grupo chico, y solo entran personas invitadas.

- Documento de diseño: [`docs/superpowers/specs/2026-10-07-english-app-design.md`](docs/superpowers/specs/2026-10-07-english-app-design.md)
- Pantallas aprobadas: [`docs/design/habla-pantallas.html`](docs/design/habla-pantallas.html) (se abren en el navegador)
- Planes por fase: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Stack

| Qué | Con qué |
| --- | --- |
| App | Vue 3.5 + TypeScript 6 + Vite 8, instalable con `vite-plugin-pwa` |
| Estilos | Tailwind 4 + shadcn-vue con los tokens de la dirección "Línea" |
| Estado y rutas | Pinia 4 y Vue Router 5 |
| Login y datos | Supabase (Google, Postgres con RLS) |
| Pruebas | Vitest + @vue/test-utils (jsdom), y SQL para la base de datos |
| Publicación | Cloudflare Workers con archivos estáticos (gratis) |

La estructura de carpetas es la misma de BaseFront y CafeteriaV2: `Services/`, `Views/`, `stores/`, `router/` y `common/`. El temario vive en `src/curriculum/`.

## Arrancar

```bash
npm install
cp .env.example .env.development   # pon la URL y la publishable key de tu proyecto
cp .env.example .env.production
npm run dev                         # http://localhost:5173
```

## Scripts

| Script | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera `dist/` |
| `npm run test` | Pruebas de Vitest |
| `npm run lint` | ESLint (las mismas reglas de BaseFront) |
| `npm run db:push` | Aplica las migraciones pendientes de `supabase/migrations/` |
| `npm run db:sql -- archivo.sql` | Corre un archivo SQL (también `-- --query "select 1"`) |
| `npm run db:check-auth` | Revisa que Auth siga como debe: solo Google, hook de invitados y URLs |
| `npm run db:secrets` | Sube `ANTHROPIC_API_KEY` de `.env.local` a los secretos de Supabase |
| `npm run fn:deploy` | Publica la Edge Function `placement` |
| `npm run generate-pwa-assets` | Regenera los íconos desde `public/logo.svg` |
| `npm run deploy` | Build y publicación en Cloudflare |

## Supabase

1. Enlaza la CLI una vez: `npx supabase login` y `npx supabase link --project-ref <ref>`.
2. **Desde la red de la oficina, el firewall bloquea Postgres**, así que `supabase db push` y `supabase db query` no funcionan. Por eso existen `npm run db:push` y `npm run db:sql`: mandan el SQL por HTTPS a la Management API, como el SQL Editor del dashboard. `db:push` guarda el historial en la misma tabla que la CLI.
3. Esos dos scripts necesitan un Access Token de Supabase en `.env.local`, que git ignora:
   ```
   SUPABASE_ACCESS_TOKEN=sbp_...
   ```
   Se crea en tu avatar → Account preferences → Access Tokens. Vence a los 30 días: cuando venza, genera otro.
4. **No uses `supabase config push`.** La configuración de Auth vive en el proyecto, y `supabase/config.toml` está igualado a ella por si acaso. Para revisarla, usa `npm run db:check-auth`.
   - El hook es el filtro de invitados, pero también hay una segunda barrera: la base de datos no crea perfiles de correos que no estén en `invites`.
5. Pruebas de la base de datos: `npm run db:sql -- supabase/tests/base_checks.sql`. Si todo está bien, responde `OK: pruebas de la fase 1`, y no deja datos, porque corre en una transacción que se deshace.

## IA (Claude Haiku 5.5)

- **Dónde vive la key:** en `.env.local` como `ANTHROPIC_API_KEY`, que git ignora, y en los **secretos de Supabase**. Nunca va en la app.
  - Para subirla o cambiarla: `npm run db:secrets`, que solo muestra los nombres de los secretos.
- **Las funciones** están en `supabase/functions/`. La lógica pura vive en `_shared/`, sin `npm:` ni Deno, así que Vitest la prueba.
  - Para publicarlas: `npm run fn:deploy`, que usa `--use-api`, así que no necesita Docker y funciona desde la oficina.
- **Gasto:**
  - Cada llamada queda en `public.usage_log` con sus tokens y su costo en dólares. Una evaluación cuesta alrededor de $0.0002.
  - Revisa lo de las últimas llamadas con `npm run db:sql -- --query "select function, cost_usd, created_at from public.usage_log order by created_at desc limit 10"`.
- **Tope:** en la consola de Anthropic, en Settings → Billing → Spend limits, $5 USD al mes y **sin recarga automática**. Si se alcanza, la app muestra "Se terminó el presupuesto de IA".
- **Límite por persona:** máximo 5 evaluaciones en 24 horas.

## Invitar a alguien

Son dos pasos, porque la app de Google está en modo "Prueba":

1. Agrega su correo a la lista de invitados:
   ```bash
   npm run db:sql -- --query "insert into public.invites (email) values (lower(trim('correo@gmail.com')))"
   ```
2. En Google Auth Platform → **Público** (Audience) → **Usuarios de prueba**, agrega ese mismo Gmail.

La primera vez que entre, Google le va a mostrar "Google no verificó esta app". Solo tiene que dar **Continuar**.

**Hacerte admin** (para "Mi grupo", en la fase 4):

```bash
npm run db:sql -- --query "update public.profiles set is_admin = true where user_id = (select id from auth.users where email = 'TU_GMAIL')"
```

## Publicar

```bash
npm run deploy         # queda en https://habla.oloferolo.workers.dev
```

Wrangler toma la cuenta de Cloudflare del archivo `.env`, que git ignora:

```
CLOUDFLARE_API_TOKEN=...      # token con la plantilla "Edit Cloudflare Workers"
CLOUDFLARE_ACCOUNT_ID=...
```

`npx wrangler login` no funciona en la red de la oficina, porque el dashboard de Cloudflare no pasa su verificación ahí. El token y la cuenta se crean desde el celular, con datos móviles.

La URL pública debe estar registrada en dos lugares:
- **Supabase → Authentication → URL Configuration:** como Site URL y en Redirect URLs, con `/**` al final.
- **Google Auth Platform → Clientes → Habla web:** en Authorized JavaScript origins.

## Avisos

- Supabase Free **pausa el proyecto tras 7 días sin uso**. Se reactiva desde el dashboard.
- En iPhone, Habla se instala desde Safari con Compartir → "Agregar a inicio". En Android, con Chrome → "Instalar app".
