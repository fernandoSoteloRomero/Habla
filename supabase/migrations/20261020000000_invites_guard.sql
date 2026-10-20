-- Segunda barrera para las invitaciones (revisión de la fase 1).
-- El filtro principal es el hook "Before User Created", que vive en la configuración de Auth.
-- Si alguien lo apagara (por ejemplo con `supabase config push`), este trigger igual
-- impide que se cree una cuenta cuyo correo no esté en public.invites.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.invites i where i.email = lower(trim(new.email))
  ) then
    raise exception 'Ese correo no tiene invitación.';
  end if;

  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  update public.invites set accepted_at = now() where email = lower(trim(new.email));
  return new;
end;
$$;
