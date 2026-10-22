-- Pruebas de la fase 4 (sesiones con IA). Todo corre en una transacción y se deshace al final.
-- Correr: npm run db:sql -- supabase/tests/sessions_checks.sql
-- Si algo falla, el error dice "FALLO: …" y se detiene antes de la última línea.
begin;

insert into public.invites (email) values ('ana.lopez@gmail.com'), ('beto@gmail.com');
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'ana.lopez@gmail.com', 'authenticated', 'authenticated', '{"full_name":"Ana López"}'),
  ('00000000-0000-4000-8000-00000000000b', 'beto@gmail.com', 'authenticated', 'authenticated', '{}');
-- Las sesiones las escribe la Edge Function con la llave de admin; aquí, como postgres
insert into public.sessions (user_id, unit_id, date) values
  ('00000000-0000-4000-8000-00000000000a', 'a2-junta', '2026-10-22'),
  ('00000000-0000-4000-8000-00000000000b', 'l0-saludar', '2026-10-22');

do $$
begin
  assert (select status || '/' || turns || '/' || transcript::text from public.sessions
          where user_id = '00000000-0000-4000-8000-00000000000a') = 'en_curso/0/[]',
    'FALLO: la sesión nueva no empieza en curso, sin turnos y sin conversación';
  -- Una sesión por día
  begin insert into public.sessions (user_id, unit_id, date) values
      ('00000000-0000-4000-8000-00000000000a', 'a2-junta', '2026-10-22');
    raise exception 'FALLO: hubo dos sesiones el mismo día'; exception when unique_violation then null; end;
  begin update public.sessions set status = 'pausada';
    raise exception 'FALLO: aceptó un status inválido'; exception when check_violation then null; end;
end $$;

-- Ana (authenticated)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.sessions) = 1, 'FALLO: Ana ve sesiones ajenas o no ve la suya';
  assert (select unit_id from public.sessions) = 'a2-junta', 'FALLO: Ana no ve su sesión';

  begin insert into public.sessions (user_id, unit_id, date) values
      ('00000000-0000-4000-8000-00000000000a', 'a2-junta', '2026-10-23');
    raise exception 'FALLO: Ana pudo crear una sesión desde la app'; exception when insufficient_privilege then null; end;
  begin update public.sessions set status = 'terminada';
    raise exception 'FALLO: Ana pudo cambiar su sesión desde la app'; exception when insufficient_privilege then null; end;
  begin delete from public.sessions;
    raise exception 'FALLO: Ana pudo borrar su sesión'; exception when insufficient_privilege then null; end;
end $$;

-- Sin sesión (anon)
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.sessions;
    raise exception 'FALLO: anon puede leer sesiones'; exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
begin
  assert (select count(*) from public.sessions) = 2, 'FALLO: cambiaron las sesiones';
end $$;

rollback;
select 'OK: pruebas de la fase 4' as resultado;
