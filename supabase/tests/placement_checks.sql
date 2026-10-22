-- Pruebas de la fase 2 (evaluación y gasto de IA). Todo corre en una transacción y se deshace al final.
-- Correr: npm run db:sql -- supabase/tests/placement_checks.sql
-- Si algo falla, el error dice "FALLO: …" y se detiene antes de la última línea.
begin;

insert into public.invites (email) values ('ana.lopez@gmail.com'), ('beto@gmail.com');
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'ana.lopez@gmail.com', 'authenticated', 'authenticated', '{"full_name":"Ana López"}'),
  ('00000000-0000-4000-8000-00000000000b', 'beto@gmail.com', 'authenticated', 'authenticated', '{}');

-- Lo que escribe la función (como postgres / admin)
insert into public.placements (user_id, kind, result_level, details) values
  ('00000000-0000-4000-8000-00000000000a', 'inicial', 'A2', '{}'),
  ('00000000-0000-4000-8000-00000000000b', 'inicial', 'L0', '{}');
insert into public.usage_log (user_id, function, model, input_tokens, output_tokens, cache_read_tokens, cost_usd) values
  ('00000000-0000-4000-8000-00000000000a', 'placement', 'claude-haiku-5-5', 800, 120, 0, 0.00014);

do $$
begin
  assert (select placed_at from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a') is null,
    'FALLO: un perfil nuevo ya trae placed_at';
  begin
    insert into public.placements (user_id, kind, result_level) values ('00000000-0000-4000-8000-00000000000a', 'otra', 'A2');
    raise exception 'FALLO: aceptó un kind inválido';
  exception when check_violation then null;
  end;
  begin
    insert into public.placements (user_id, kind, result_level) values ('00000000-0000-4000-8000-00000000000a', 'inicial', 'C2');
    raise exception 'FALLO: aceptó un nivel inválido';
  exception when check_violation then null;
  end;
end $$;

-- Reserva de llamadas a la IA (límite diario sin carreras) y guardado del resultado en un paso
do $$
declare
  r1 bigint; r2 bigint; r3 bigint;
begin
  -- Beto no tiene llamadas: con máximo 2, las dos primeras reservan y la tercera no
  r1 := public.reserve_ai_call('00000000-0000-4000-8000-00000000000b', 'placement', 'claude-haiku-5-5', 2);
  r2 := public.reserve_ai_call('00000000-0000-4000-8000-00000000000b', 'placement', 'claude-haiku-5-5', 2);
  r3 := public.reserve_ai_call('00000000-0000-4000-8000-00000000000b', 'placement', 'claude-haiku-5-5', 2);
  assert r1 is not null and r2 is not null and r1 <> r2, 'FALLO: no reservó las dos primeras llamadas';
  assert r3 is null, 'FALLO: reservó más llamadas que el máximo';
  assert (select count(*) from public.usage_log where user_id = '00000000-0000-4000-8000-00000000000b') = 2,
    'FALLO: la reserva no dejó su fila en usage_log';
  assert (select cost_usd from public.usage_log where id = r1) = 0, 'FALLO: la reserva no empieza en cero';

  -- Guardar el resultado: la primera vez guarda todo junto; la segunda no cambia nada
  assert public.save_placement('00000000-0000-4000-8000-00000000000b', 'A1', 'a1-quien-eres', '{"x":1}'::jsonb) = true,
    'FALLO: no guardó la primera evaluación';
  assert (select level || '/' || current_unit_id from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b') = 'A1/a1-quien-eres',
    'FALLO: no actualizó el perfil';
  assert (select placed_at from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b') is not null,
    'FALLO: no marcó placed_at';
  assert (select count(*) from public.placements where user_id = '00000000-0000-4000-8000-00000000000b' and result_level = 'A1') = 1,
    'FALLO: no guardó la evaluación';
  assert public.save_placement('00000000-0000-4000-8000-00000000000b', 'B1', 'b1-opinion', '{}'::jsonb) = false,
    'FALLO: dejó evaluar dos veces';
  assert (select level from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b') = 'A1',
    'FALLO: la segunda evaluación cambió el nivel';
end $$;

-- Ana (authenticated): ve sus evaluaciones; no escribe nada ni ve el gasto
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.placements) = 1, 'FALLO: Ana ve evaluaciones ajenas';
  assert (select result_level from public.placements) = 'A2', 'FALLO: Ana no ve su evaluación';
  begin insert into public.placements (user_id, kind, result_level) values ('00000000-0000-4000-8000-00000000000a', 'inicial', 'B1');
    raise exception 'FALLO: Ana pudo escribir su propia evaluación'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.usage_log;
    raise exception 'FALLO: Ana puede leer el gasto'; exception when insufficient_privilege then null; end;
  begin insert into public.usage_log (user_id, function, model) values ('00000000-0000-4000-8000-00000000000a', 'x', 'y');
    raise exception 'FALLO: Ana pudo escribir en el gasto'; exception when insufficient_privilege then null; end;
  begin update public.profiles set placed_at = now() where user_id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FALLO: Ana pudo marcarse como evaluada'; exception when insufficient_privilege then null; end;
  begin perform public.reserve_ai_call('00000000-0000-4000-8000-00000000000a', 'placement', 'x', 99);
    raise exception 'FALLO: Ana puede reservar llamadas'; exception when insufficient_privilege then null; end;
  begin perform public.save_placement('00000000-0000-4000-8000-00000000000a', 'B1', 'b1-opinion', '{}'::jsonb);
    raise exception 'FALLO: Ana puede guardarse un nivel'; exception when insufficient_privilege then null; end;
end $$;

-- Sin sesión (anon): nada
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.placements;
    raise exception 'FALLO: anon puede leer evaluaciones'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.usage_log;
    raise exception 'FALLO: anon puede leer el gasto'; exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
select 'OK: pruebas de la fase 2' as resultado;
