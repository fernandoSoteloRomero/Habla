-- Pruebas de la fase 1. Todo corre en una transacción y se deshace al final.
-- Correr: npm run db:sql -- supabase/tests/base_checks.sql
-- Si algo falla, el error dice "FALLO: …" y se detiene antes de la última línea.
begin;

insert into public.invites (email) values ('ana.lopez@gmail.com'), ('beto@gmail.com');

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
  -- Segunda barrera: aunque el hook estuviera apagado, la base no crea cuentas sin invitación
  begin
    insert into auth.users (id, email, aud, role) values
      ('00000000-0000-4000-8000-00000000000c', 'intruso@gmail.com', 'authenticated', 'authenticated');
    raise exception 'FALLO: se creó una cuenta sin invitación';
  exception when raise_exception then
    if sqlerrm like 'FALLO:%' then raise; end if;
  end;
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
  begin insert into public.profiles (user_id, name) values ('00000000-0000-4000-8000-00000000000d', 'X');
    raise exception 'FALLO: Ana pudo insertar un perfil'; exception when insufficient_privilege then null; end;
  begin delete from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b';
    raise exception 'FALLO: Ana pudo borrar un perfil'; exception when insufficient_privilege then null; end;
  begin perform public.hook_before_user_created('{"user":{"email":"ana.lopez@gmail.com"}}'::jsonb);
    raise exception 'FALLO: Ana puede preguntarle al hook quién está invitado'; exception when insufficient_privilege then null; end;
end $$;

-- Sin sesión (anon): no ve ni toca nada
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.profiles;
    raise exception 'FALLO: anon puede leer perfiles'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.invites;
    raise exception 'FALLO: anon puede leer invitaciones'; exception when insufficient_privilege then null; end;
  begin insert into public.invites (email) values ('colado@gmail.com');
    raise exception 'FALLO: anon pudo invitarse'; exception when insufficient_privilege then null; end;
  begin perform public.hook_before_user_created('{"user":{"email":"x@gmail.com"}}'::jsonb);
    raise exception 'FALLO: anon puede llamar al hook'; exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
begin
  assert (select motive from public.profiles where user_id = '00000000-0000-4000-8000-00000000000b') is null, 'FALLO: Ana cambió el perfil de Beto';
end $$;

rollback;
select 'OK: pruebas de la fase 1' as resultado;
