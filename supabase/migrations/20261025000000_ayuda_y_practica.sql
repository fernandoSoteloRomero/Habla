-- Fase 4, agregado del 2026-10-22: ayuda en la conversación y "Seguir practicando".

-- Cuánta ayuda quiere la persona en la conversación. null = la de su nivel
-- (Nivel 0 y A1 guiada, A2 con ayuda, B1 libre). La ajusta la función al cerrar cada sesión
-- y la persona la puede cambiar desde la app.
alter table public.profiles
  add column ayuda text check (ayuda in ('guiada', 'con_ayuda', 'libre'));
grant update (ayuda) on public.profiles to authenticated;

-- diaria = la sesión de hoy (una por día); practica = conversaciones extra al terminarla
alter table public.sessions
  add column kind text not null default 'diaria' check (kind in ('diaria', 'practica'));
alter table public.sessions drop constraint sessions_user_id_date_key;
create unique index sessions_one_daily_per_day on public.sessions (user_id, date)
  where kind = 'diaria';

-- TEMPORAL (hasta la fase 5): el avance solo cuenta las frases de la lección, no las
-- correcciones de la conversación (también llevan el unit_id de la meta)
create or replace function public.advance_unit(p_next_unit text, p_next_level text, p_required integer)
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
  where ph.user_id = uid and ph.unit_id = current_unit and ph.source = 'leccion';
  if learned < greatest(p_required, 1) then
    return false;
  end if;
  update public.profiles
  set current_unit_id = p_next_unit, level = p_next_level
  where user_id = uid;
  return true;
end;
$$;
