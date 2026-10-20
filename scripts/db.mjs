// Corre SQL en el proyecto de Supabase por HTTPS (Management API), igual que el SQL Editor.
// Existe porque el firewall de la oficina bloquea las conexiones a Postgres, y sin ellas
// no funcionan `supabase db push` ni `supabase db query --linked`.
//
//   npm run db:sql -- supabase/tests/base_checks.sql     corre un archivo SQL
//   npm run db:sql -- --query "select 1"                 corre una consulta
//   npm run db:push                                      aplica las migraciones pendientes
//   npm run db:check-auth                                revisa la configuración de Auth
//
// Necesita SUPABASE_ACCESS_TOKEN (sbp_...) en .env.local (git lo ignora) o en el entorno.
import { existsSync, readdirSync, readFileSync } from "node:fs";

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("SUPABASE_ACCESS_TOKEN="));
    if (line) return line.slice("SUPABASE_ACCESS_TOKEN=".length).trim();
  }
  console.error("Falta SUPABASE_ACCESS_TOKEN en .env.local (ver README).");
  process.exit(1);
}

function readProjectRef() {
  const file = "supabase/.temp/project-ref";
  if (!existsSync(file)) {
    console.error("El proyecto no está enlazado. Corre: npx supabase link --project-ref <ref>");
    process.exit(1);
  }
  return readFileSync(file, "utf8").trim();
}

async function runSql(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${readProjectRef()}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      message = JSON.parse(text).message ?? text;
    } catch {
      // la respuesta no era JSON; se muestra tal cual
    }
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return text ? JSON.parse(text) : [];
}

async function push() {
  // Misma tabla de historial que usa la CLI, para que `supabase db push` siga funcionando
  // desde una red donde Postgres no esté bloqueado.
  await runSql(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
    alter table supabase_migrations.schema_migrations add column if not exists statements text[];
    alter table supabase_migrations.schema_migrations add column if not exists name text;`);
  const applied = new Set(
    (await runSql("select version from supabase_migrations.schema_migrations")).map(
      (r) => r.version,
    ),
  );
  const all = readdirSync("supabase/migrations").filter((f) =>
    f.endsWith(".sql"),
  );
  // El nombre va dentro del SQL del historial: solo minúsculas, números y "_"
  const badNames = all.filter((f) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(f));
  if (badNames.length > 0) {
    throw new Error(
      `Nombre de migración inválido (usa AAAAMMDDHHMMSS_nombre_en_minusculas.sql): ${badNames.join(", ")}`,
    );
  }
  const files = all.sort();
  const pending = files.filter((f) => !applied.has(f.split("_")[0]));
  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
    return;
  }
  for (const file of pending) {
    const version = file.split("_")[0];
    const name = file.slice(version.length + 1, -".sql".length);
    const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
    if (sql.includes("$habla_migration$")) {
      throw new Error(`${file} no puede contener $habla_migration$`);
    }
    // La migración y su registro van en la misma transacción: o entran los dos o ninguno
    await runSql(`begin;
${sql}
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('${version}', '${name}', array[$habla_migration$${sql}$habla_migration$]);
commit;`);
    console.log(`Aplicada: ${file}`);
  }
}

// Revisa que la configuración de Auth en Supabase siga como la necesita Habla.
// Solo imprime valores que no son secretos.
const SITE_URL = "https://habla.oloferolo.workers.dev";
async function checkAuth() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${readProjectRef()}/config/auth`,
    { headers: { Authorization: `Bearer ${readToken()}` } },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const c = await response.json();
  const allowList = String(c.uri_allow_list ?? "").split(",");
  const checks = [
    ["Google activado", c.external_google_enabled === true],
    ["Email desactivado", c.external_email_enabled === false],
    ["Hook de invitados activado", c.hook_before_user_created_enabled === true],
    [
      "Hook apunta a public.hook_before_user_created",
      c.hook_before_user_created_uri ===
        "pg-functions://postgres/public/hook_before_user_created",
    ],
    [`Site URL es ${SITE_URL}`, c.site_url === SITE_URL],
    [`Redirect URLs incluyen ${SITE_URL}/**`, allowList.includes(`${SITE_URL}/**`)],
  ];
  for (const [label, ok] of checks) console.log(`${ok ? "OK   " : "FALLA"} ${label}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "push") {
    await push();
  } else if (command === "check-auth") {
    await checkAuth();
  } else if (command === "sql" && args[0] === "--query" && args[1]) {
    console.table(await runSql(args[1]));
  } else if (command === "sql" && args[0]) {
    console.table(await runSql(readFileSync(args[0], "utf8")));
  } else {
    console.error('Uso: npm run db:sql -- <archivo.sql>');
    console.error('     npm run db:sql -- --query "select 1"');
    console.error("     npm run db:push");
    console.error("     npm run db:check-auth");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  // exitCode y no process.exit(): en Windows, salir mientras fetch cierra la conexión tumba Node
  process.exitCode = 1;
}
