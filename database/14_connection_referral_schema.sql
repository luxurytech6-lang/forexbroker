-- ════════════════════════════════════════════════════════════════════════════
-- 14_connection_referral_schema.sql — connection keys and referral links
-- Run in the Supabase SQL editor AFTER 09. Safe to re-run.
--
-- Connection key
--   Every account gets a key automatically (e.g. PGS-7K2M-Q9XD-4HTW), shown on
--   the user's profile with a status:
--     not_connected → pending (the user taps "Request connection")
--                   → connected (an admin enters the key in Admin → Connections)
--
-- Referral link
--   Every account gets a referral code. The link is <site>/signup?ref=CODE.
--   Someone who signs up through it is recorded in users.referred_by.
--
-- Users can't change their key, status or referral fields themselves — only
-- through the functions below.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Columns ─────────────────────────────────────────────────────────────
alter table public.users add column if not exists connection_key          text;
alter table public.users add column if not exists connection_status       text not null default 'not_connected';
alter table public.users add column if not exists connection_requested_at timestamptz;
alter table public.users add column if not exists connected_at            timestamptz;
alter table public.users add column if not exists connected_by            uuid references public.admins(id) on delete set null;
alter table public.users add column if not exists referral_code           text;
alter table public.users add column if not exists referred_by             uuid references public.users(id) on delete set null;
alter table public.users add column if not exists referred_at             timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_connection_status_check') then
    alter table public.users add constraint users_connection_status_check
      check (connection_status in ('not_connected', 'pending', 'connected'));
  end if;
end $$;
create unique index if not exists users_connection_key_uniq on public.users (connection_key) where connection_key is not null;
create unique index if not exists users_referral_code_uniq  on public.users (upper(referral_code)) where referral_code is not null;
create index if not exists users_referred_by_idx on public.users (referred_by);


-- ─── 2. Remove earlier versions of this file's functions ────────────────────
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in (
              '_random_code', '_new_connection_key', '_new_referral_code', 'my_connection_referral',
              'request_connection', 'admin_lookup_connection_key', 'admin_connect_by_key',
              'admin_set_connection_status', 'claim_referral')
  loop execute format('drop function %s', r.sig); end loop;
end $$;


-- ─── 3. Code generators ─────────────────────────────────────────────────────
-- No 0/O/1/I/L so keys are easy to read out and type
create function public._random_code(p_len int)
returns text language plpgsql volatile as $$
declare
  a constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  s text := '';
begin
  for i in 1..p_len loop s := s || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
  return s;
end $$;

create function public._new_connection_key()
returns text language plpgsql volatile security definer set search_path = public as $$
declare k text;
begin
  loop
    k := 'PGS-' || public._random_code(4) || '-' || public._random_code(4) || '-' || public._random_code(4);
    exit when not exists (select 1 from public.users where connection_key = k);
  end loop;
  return k;
end $$;

create function public._new_referral_code()
returns text language plpgsql volatile security definer set search_path = public as $$
declare k text;
begin
  loop
    k := public._random_code(7);
    exit when not exists (select 1 from public.users where upper(referral_code) = k);
  end loop;
  return k;
end $$;
revoke all on function public._new_connection_key() from public, anon, authenticated;
revoke all on function public._new_referral_code()  from public, anon, authenticated;


-- ─── 4. New accounts get a key and a referral code automatically ────────────
create or replace function public.assign_account_codes()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.connection_key is null then new.connection_key := public._new_connection_key(); end if;
  if new.referral_code  is null then new.referral_code  := public._new_referral_code();  end if;
  return new;
end $$;
drop trigger if exists aa_assign_account_codes on public.users;
create trigger aa_assign_account_codes before insert on public.users
  for each row execute function public.assign_account_codes();

-- Existing accounts
update public.users set connection_key = public._new_connection_key() where connection_key is null;
update public.users set referral_code  = public._new_referral_code()  where referral_code  is null;


-- ─── 5. Users can't change these fields themselves ──────────────────────────
-- (The functions below set app.trusted for the length of their own transaction.)
create or replace function public.guard_connection_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() or current_setting('app.trusted', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.connection_status := 'not_connected'; new.connection_requested_at := null;
    new.connected_at := null; new.connected_by := null;
    new.connection_key := null; new.referral_code := null;          -- assigned by the trigger above
    new.referred_by := null; new.referred_at := null;               -- set through claim_referral()
  else
    new.connection_key := old.connection_key;     new.connection_status := old.connection_status;
    new.connection_requested_at := old.connection_requested_at;
    new.connected_at := old.connected_at;         new.connected_by := old.connected_by;
    new.referral_code := old.referral_code;       new.referred_by := old.referred_by;
    new.referred_at := old.referred_at;
  end if;
  return new;
end $$;
-- Named to run before aa_assign_account_codes on insert (so codes are assigned after the reset)
drop trigger if exists a0_guard_connection_fields on public.users;
create trigger a0_guard_connection_fields before insert or update on public.users
  for each row execute function public.guard_connection_fields();


-- ─── 6. What the profile page reads ─────────────────────────────────────────
create function public.my_connection_referral()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'connection_key',          u.connection_key,
    'connection_status',       u.connection_status,
    'connection_requested_at', u.connection_requested_at,
    'connected_at',            u.connected_at,
    'referral_code',           u.referral_code,
    'referral_count',          (select count(*) from public.users r where r.referred_by = u.id),
    'referrals', coalesce((
        select json_agg(json_build_object(
                 'name', trim(r.first_name || ' ' || left(coalesce(r.last_name, ''), 1) || case when r.last_name <> '' then '.' else '' end),
                 'joined_at', r.created_at, 'verified', r.is_verified) order by r.created_at desc)
          from (select * from public.users where referred_by = u.id order by created_at desc limit 20) r), '[]'::json)
  )
  from public.users u where u.id = auth.uid();
$$;
grant execute on function public.my_connection_referral() to authenticated;


-- ─── 7. User: request a connection ──────────────────────────────────────────
create function public.request_connection()
returns json
language plpgsql security definer set search_path = public
as $$
declare v public.users%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  perform set_config('app.trusted', 'on', true);
  update public.users
     set connection_status = 'pending', connection_requested_at = now(), updated_at = now()
   where id = auth.uid() and connection_status = 'not_connected'
  returning * into v;
  if not found then select * into v from public.users where id = auth.uid(); end if;
  return json_build_object('connection_status', v.connection_status, 'connection_requested_at', v.connection_requested_at);
end $$;
grant execute on function public.request_connection() to authenticated;


-- ─── 8. Admin: look up / connect / change status ────────────────────────────
create function public.admin_lookup_connection_key(p_key text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare v public.users%rowtype; k text := upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  -- Accept the key typed any way: with or without dashes/spaces, any case, with or without "PGS"
  if k like 'PGS%' and length(k) = 15 then k := substr(k, 4); end if;
  if length(k) = 12 then k := 'PGS-' || substr(k,1,4) || '-' || substr(k,5,4) || '-' || substr(k,9,4); end if;
  select * into v from public.users where connection_key = k;
  if not found then return null; end if;
  return json_build_object('id', v.id, 'email', v.email, 'first_name', v.first_name, 'last_name', v.last_name,
                           'connection_key', v.connection_key, 'connection_status', v.connection_status,
                           'connection_requested_at', v.connection_requested_at, 'connected_at', v.connected_at);
end $$;
grant execute on function public.admin_lookup_connection_key(text) to authenticated;

create function public.admin_set_connection_status(p_user_id uuid, p_status text)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_old public.users%rowtype; v_new public.users%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('not_connected', 'pending', 'connected') then raise exception 'Unknown status %', p_status; end if;
  select * into v_old from public.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;

  update public.users
     set connection_status = p_status,
         connected_at = case when p_status = 'connected' then now() else null end,
         connected_by = case when p_status = 'connected' then public.current_admin_id() else null end,
         connection_requested_at = case when p_status = 'not_connected' then null else connection_requested_at end,
         updated_at = now()
   where id = p_user_id
  returning * into v_new;

  perform public._admin_log('connection_' || p_status, 'users', p_user_id::text,
    jsonb_build_object('connection_status', v_old.connection_status),
    jsonb_build_object('connection_status', v_new.connection_status, 'key', v_new.connection_key));

  if p_status = 'connected' and v_old.connection_status <> 'connected' then
    perform public._notify_user(p_user_id, 'Your account is connected',
      'Your connection key has been activated by our team. Your profile now shows Connected.', 'ti-plug-connected', '/profile');
  elsif p_status = 'not_connected' and v_old.connection_status = 'connected' then
    perform public._notify_user(p_user_id, 'Your account was disconnected',
      'Contact support if you have questions.', 'ti-plug-x', '/profile');
  end if;

  return json_build_object('id', v_new.id, 'email', v_new.email, 'connection_status', v_new.connection_status, 'connected_at', v_new.connected_at);
end $$;
grant execute on function public.admin_set_connection_status(uuid, text) to authenticated;

create function public.admin_connect_by_key(p_key text)
returns json
language plpgsql security definer set search_path = public
as $$
declare u json;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  u := public.admin_lookup_connection_key(p_key);
  if u is null then raise exception 'No account has the key %. Check it and try again.', upper(trim(p_key)); end if;
  return public.admin_set_connection_status((u ->> 'id')::uuid, 'connected');
end $$;
grant execute on function public.admin_connect_by_key(text) to authenticated;


-- ─── 9. Referral: record who referred a new user ────────────────────────────
-- Called by the sign-up page with the ?ref= code. Only works once, only for a
-- new account (first 30 days), and never for your own code.
create function public.claim_referral(p_code text)
returns json
language plpgsql security definer set search_path = public
as $$
declare me public.users%rowtype; ref public.users%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into me from public.users where id = auth.uid();
  if not found then return json_build_object('claimed', false, 'reason', 'no profile yet'); end if;
  if me.referred_by is not null then return json_build_object('claimed', false, 'reason', 'already referred'); end if;
  if me.created_at < now() - interval '30 days' then return json_build_object('claimed', false, 'reason', 'account too old'); end if;
  select * into ref from public.users where upper(referral_code) = upper(trim(coalesce(p_code, '')));
  if not found then return json_build_object('claimed', false, 'reason', 'unknown code'); end if;
  if ref.id = me.id then return json_build_object('claimed', false, 'reason', 'own code'); end if;

  perform set_config('app.trusted', 'on', true);
  update public.users set referred_by = ref.id, referred_at = now() where id = me.id;
  perform public._notify_user(ref.id, 'Someone joined with your link',
    format('%s signed up using your referral link.', coalesce(nullif(me.first_name, ''), 'A new user')), 'ti-users', '/profile');
  return json_build_object('claimed', true);
end $$;
grant execute on function public.claim_referral(text) to authenticated;
