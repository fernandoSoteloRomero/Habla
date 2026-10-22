-- Pruebas de la fase 3 (repaso y avance temporal). Todo corre en una transacción y se deshace al final.
-- Correr: npm run db:sql -- supabase/tests/phrases_checks.sql
-- Si algo falla, el error dice "FALLO: …" y se detiene antes de la última línea.
begin;

insert into public.invites (email) values ('ana.lopez@gmail.com'), ('beto@gmail.com');
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'ana.lopez@gmail.com', 'authenticated', 'authenticated', '{"full_name":"Ana López"}'),
  ('00000000-0000-4000-8000-00000000000b', 'beto@gmail.com', 'authenticated', 'authenticated', '{}');
update public.profiles set level = 'A2', current_unit_id = 'a2-junta'
  where user_id = '00000000-0000-4000-8000-00000000000a';
-- Una frase de Beto (como postgres)
insert into public.phrases (user_id, en, es, source, unit_id, due_on) values
  ('00000000-0000-4000-8000-00000000000b', 'Hello.', 'Hola.', 'leccion', 'l0-saludar', '2026-10-23');

-- Ana (authenticated)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
begin
  insert into public.phrases (user_id, en, es, source, unit_id, due_on) values
    ('00000000-0000-4000-8000-00000000000a', 'I''m in charge of the new system.', 'Estoy a cargo del sistema nuevo.', 'leccion', 'a2-junta', '2026-10-23');
  assert (select count(*) from public.phrases) = 1, 'FALLO: Ana ve frases ajenas o no ve la suya';
  assert (select interval_days || '/' || ease || '/' || reps || '/' || lapses from public.phrases) = '1/2.50/0/0',
    'FALLO: la frase nueva no empieza con 1 día, facilidad 2.5 y cero repasos';

  -- La misma frase dos veces no se duplica
  insert into public.phrases (user_id, en, es, source, unit_id, due_on) values
    ('00000000-0000-4000-8000-00000000000a', 'I''m in charge of the new system.', 'Estoy a cargo del sistema nuevo.', 'leccion', 'a2-junta', '2026-10-23')
  on conflict (user_id, en) do nothing;
  assert (select count(*) from public.phrases) = 1, 'FALLO: se duplicó la frase';

  begin insert into public.phrases (user_id, en, es, source, unit_id, due_on) values
      ('00000000-0000-4000-8000-00000000000b', 'Bye.', 'Adiós.', 'leccion', 'l0-saludar', '2026-10-23');
    raise exception 'FALLO: Ana pudo agregar frases a Beto'; exception when insufficient_privilege then null; end;
  begin insert into public.phrases (user_id, en, es, source, unit_id, due_on) values
      ('00000000-0000-4000-8000-00000000000a', 'Fake fix.', 'Falsa.', 'correccion', 'a2-junta', '2026-10-23');
    raise exception 'FALLO: Ana pudo inventarse una corrección'; exception when insufficient_privilege then null; end;

  -- Calificar sí; cambiar el texto, el dueño o borrar no
  update public.phrases set due_on = '2026-10-29', interval_days = 7, ease = 2.5, reps = 1, lapses = 0, reviewed_on = '2026-10-22';
  assert (select interval_days from public.phrases) = 7, 'FALLO: Ana no pudo guardar su repaso';
  begin update public.phrases set en = 'Otra cosa';
    raise exception 'FALLO: Ana pudo cambiar el texto'; exception when insufficient_privilege then null; end;
  begin update public.phrases set user_id = '00000000-0000-4000-8000-00000000000b';
    raise exception 'FALLO: Ana pudo cambiar el dueño'; exception when insufficient_privilege then null; end;
  begin delete from public.phrases;
    raise exception 'FALLO: Ana pudo borrar'; exception when insufficient_privilege then null; end;
  begin update public.phrases set ease = 1.0;
    raise exception 'FALLO: aceptó una facilidad menor a 1.3'; exception when check_violation then null; end;
  begin update public.phrases set interval_days = 0;
    raise exception 'FALLO: aceptó un intervalo de 0 días'; exception when check_violation then null; end;

  -- Avance temporal: solo con las 6 frases de la meta
  assert public.advance_unit('a2-trabajo', 'A2', 6) = false, 'FALLO: avanzó sin las 6 frases';
  assert (select current_unit_id from public.profiles) = 'a2-junta', 'FALLO: se movió sin las 6 frases';
  insert into public.phrases (user_id, en, es, source, unit_id, due_on) values
    ('00000000-0000-4000-8000-00000000000a', 'f2', 'f2', 'leccion', 'a2-junta', '2026-10-23'),
    ('00000000-0000-4000-8000-00000000000a', 'f3', 'f3', 'leccion', 'a2-junta', '2026-10-23'),
    ('00000000-0000-4000-8000-00000000000a', 'f4', 'f4', 'leccion', 'a2-junta', '2026-10-23'),
    ('00000000-0000-4000-8000-00000000000a', 'f5', 'f5', 'leccion', 'a2-junta', '2026-10-23'),
    ('00000000-0000-4000-8000-00000000000a', 'f6', 'f6', 'leccion', 'a2-junta', '2026-10-23');
  assert public.advance_unit('a2-trabajo', 'A2', 6) = true, 'FALLO: no avanzó con las 6 frases';
  assert (select current_unit_id || '/' || level from public.profiles) = 'a2-trabajo/A2', 'FALLO: no quedó en la siguiente meta';
end $$;

-- Sin sesión (anon)
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.phrases;
    raise exception 'FALLO: anon puede leer frases'; exception when insufficient_privilege then null; end;
  begin perform public.advance_unit('a2-trabajo', 'A2', 6);
    raise exception 'FALLO: anon puede avanzar'; exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
begin
  assert (select count(*) from public.phrases where user_id = '00000000-0000-4000-8000-00000000000b') = 1,
    'FALLO: cambiaron las frases de Beto';
end $$;

rollback;
select 'OK: pruebas de la fase 3' as resultado;
