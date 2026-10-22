-- Fase 3: el repaso de cada persona (spec 5.4 y 8) y el avance temporal de estación.

create table public.phrases (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  en text not null check (char_length(en) between 1 and 200),
  es text not null check (char_length(es) between 1 and 200),
  -- leccion = de Aprender; correccion = de la conversación (fase 4, la escribe la Edge Function)
  source text not null check (source in ('leccion', 'correccion')),
  unit_id text not null,
  due_on date not null,
  interval_days integer not null default 1 check (interval_days >= 1),
  ease numeric(4, 2) not null default 2.5 check (ease between 1.3 and 5),
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  -- Último día en que se repasó (fecha local de la persona): sirve para el máximo de 15 al día
  reviewed_on date,
  created_at timestamptz not null default now(),
  -- Las frases clave no se repiten en el temario; así recargar a media lección no duplica nada
  unique (user_id, en)
);
create index phrases_user_due on public.phrases (user_id, due_on);

alter table public.phrases enable row level security;

create policy "phrases_select_own" on public.phrases for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "phrases_insert_own_lesson" on public.phrases for insert to authenticated
  with check ((select auth.uid()) = user_id and source = 'leccion');
create policy "phrases_update_own" on public.phrases for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Desde la app: agregar frases de la lección y calificar. No se cambia el texto ni se borra.
revoke all on public.phrases from anon, authenticated;
grant select on public.phrases to authenticated;
grant insert (user_id, en, es, source, unit_id, due_on) on public.phrases to authenticated;
grant update (due_on, interval_days, ease, reps, lapses, reviewed_on) on public.phrases to authenticated;

-- TEMPORAL (decisión del 2026-10-22): pasa a la siguiente estación cuando la persona ya tiene
-- en su repaso las frases de su meta actual. En la fase 5 se reemplaza por la conversación final.
create function public.advance_unit(p_next_unit text, p_next_level text, p_required integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_unit text;
  learned integer;
begin
  if uid is null or p_next_level not in ('L0', 'A1', 'A2', 'B1') then
    return false;
  end if;
  select p.current_unit_id into current_unit from public.profiles p where p.user_id = uid;
  if current_unit is null then
    return false;
  end if;
  select count(*) into learned
  from public.phrases ph
  where ph.user_id = uid and ph.unit_id = current_unit;
  if learned < greatest(p_required, 1) then
    return false;
  end if;
  update public.profiles
  set current_unit_id = p_next_unit, level = p_next_level
  where user_id = uid;
  return true;
end;
$$;

revoke execute on function public.advance_unit(text, text, integer) from public, anon;
grant execute on function public.advance_unit(text, text, integer) to authenticated;
