-- Revisión de la fase 2: el límite diario no se puede saltar y el resultado se guarda en un solo paso.
-- Las dos funciones son solo para la Edge Function (service_role); la app no puede llamarlas.

-- Reserva una llamada a la IA antes de hacerla. Cuenta las de las últimas 24 horas y, si cabe,
-- deja su fila en usage_log (en cero; la función le pone los tokens al terminar).
-- El candado por persona hace que peticiones al mismo tiempo esperen su turno: no se brincan el límite.
-- Regresa el id de la fila, o null si ya llegó al máximo.
create function public.reserve_ai_call(p_user uuid, p_function text, p_model text, p_max integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
  reserved bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || p_function));
  select count(*) into used
  from public.usage_log
  where user_id = p_user and function = p_function and created_at > now() - interval '24 hours';
  if used >= p_max then
    return null;
  end if;
  insert into public.usage_log (user_id, function, model)
  values (p_user, p_function, p_model)
  returning id into reserved;
  return reserved;
end;
$$;

-- Guarda la evaluación inicial y actualiza el perfil en la misma transacción.
-- Solo si todavía no estaba evaluado: regresa false si ya lo estaba (y no cambia nada).
create function public.save_placement(p_user uuid, p_level text, p_unit text, p_details jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set level = p_level, current_unit_id = p_unit, placed_at = now()
  where user_id = p_user and placed_at is null;
  if not found then
    return false;
  end if;
  insert into public.placements (user_id, kind, result_level, details)
  values (p_user, 'inicial', p_level, p_details);
  return true;
end;
$$;

revoke execute on function public.reserve_ai_call(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.save_placement(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_ai_call(uuid, text, text, integer) to service_role;
grant execute on function public.save_placement(uuid, text, text, jsonb) to service_role;
