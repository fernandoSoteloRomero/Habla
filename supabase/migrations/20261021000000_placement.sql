-- Fase 2: evaluación inicial con IA y registro del gasto.

-- Se llena cuando termina la evaluación inicial; solo lo escribe la Edge Function (llave de admin)
alter table public.profiles add column placed_at timestamptz;

-- Resultado de cada evaluación (spec 8)
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('inicial', 'mensual')),
  result_level text not null check (result_level in ('L0', 'A1', 'A2', 'B1')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index placements_user_created on public.placements (user_id, created_at);

-- Cada llamada a la IA con sus tokens y su costo (spec 8 y 10)
create table public.usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  function text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index usage_log_user_function_created on public.usage_log (user_id, function, created_at);

alter table public.placements enable row level security;
alter table public.usage_log enable row level security;

-- Cada quien ve sus evaluaciones; solo la función las escribe
create policy "placements_select_own" on public.placements for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.placements from anon, authenticated;
grant select on public.placements to authenticated;

-- El gasto no se ve desde la app (Mi grupo, en la fase 5, lo leerá agregado)
revoke all on public.usage_log from anon, authenticated;
