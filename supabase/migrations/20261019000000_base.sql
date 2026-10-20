-- Fase 1: invitaciones, perfiles y el filtro de invitados.

create table public.invites (
  email text primary key check (email = lower(trim(email))),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  motive text check (motive in ('trabajo', 'viajes', 'ambos')),
  level text not null default 'L0' check (level in ('L0', 'A1', 'A2', 'B1')),
  current_unit_id text not null default 'l0-saludar',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
alter table public.profiles enable row level security;

-- Cada quien ve y cambia solo su perfil, y solo puede cambiar su motivo.
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (motive) on public.profiles to authenticated;

-- Las invitaciones no se ven desde la app en esta fase (Mi grupo llega en la fase 4).
revoke all on public.invites from anon, authenticated;

-- Hook "Before User Created": solo se crean cuentas de correos invitados.
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.invites i
    where i.email = lower(trim(event -> 'user' ->> 'email'))
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Ese correo no tiene invitación.'));
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant select on public.invites to supabase_auth_admin;
create policy "invites_auth_admin_read" on public.invites for select to supabase_auth_admin using (true);

-- Al crear la cuenta: perfil nuevo e invitación aceptada.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  update public.invites set accepted_at = now() where email = lower(trim(new.email));
  return new;
end;
$$;

-- No se le quita EXECUTE: PostgREST no expone funciones que regresan trigger,
-- y así no se arriesga la creación de cuentas que hace Auth.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
