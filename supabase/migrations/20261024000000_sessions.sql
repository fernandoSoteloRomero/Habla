-- Fase 4: la sesión diaria con IA (spec 5.3 y 8). Una por persona y por día local.
-- Solo la escribe la Edge Function `session` (llave de admin); desde la app solo se lee.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  unit_id text not null,
  -- Fecha local de la persona ("hoy" en su teléfono)
  date date not null,
  -- Lo que preparó la IA: ejemplos de las frases nuevas, la escena y la apertura del personaje
  content jsonb not null default '{}'::jsonb,
  -- La conversación como texto (no se guarda audio, spec 11)
  transcript jsonb not null default '[]'::jsonb,
  -- Cuántas veces se guardó la conversación: evita que dos pestañas se pisen
  turns integer not null default 0 check (turns >= 0),
  summary jsonb,
  status text not null default 'en_curso' check (status in ('en_curso', 'terminada')),
  minutes integer check (minutes between 0 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.sessions enable row level security;

create policy "sessions_select_own" on public.sessions for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.sessions from anon, authenticated;
grant select on public.sessions to authenticated;
