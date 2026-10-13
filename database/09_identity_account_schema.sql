-- ════════════════════════════════════════════════════════════════════════════
-- 09_identity_account_schema.sql — identity verification + account controls
-- Run in the Supabase SQL editor AFTER files 01–08. Safe to re-run.
--
--   identity_verifications     what a user submits on /verify-identity
--   storage "identity-documents" private bucket for ID document photos
--   users: account + withdrawal controls
--        status            active | suspended | locked
--        withdrawal_status active | suspended | locked
--        (+ reason, optional end date for suspensions)
--
-- What each control does
--   Suspend account     user can sign in and look around, but can't deposit, withdraw,
--                       invest, trade or buy anything. Can end automatically on a date.
--   Lock account        user is signed out and can't sign in (auth ban) until unlocked.
--   Suspend withdrawals no new withdrawals; everything else works. Can end on a date.
--   Lock withdrawals    no new withdrawals until an admin unlocks them.
--   Delete user         removes the user, everything they own, and their sign-in.
--
-- The rules are enforced in the database (triggers), not only in the app, so a
-- user can't get round them — or switch them off, or mark themselves verified.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 0. Remove earlier versions of this file's functions ────────────────────
-- Postgres can't change a function's return type or parameter names in place,
-- so any older copy (from a previous version, or one you wrote yourself) is
-- dropped first — every overload, whatever its arguments. They're all
-- recreated below; nothing else in the database depends on them.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('_account_state', 'my_account_state', '_assert_can_transact',
                         '_admin_log', '_notify_user', '_is_self',
                         'admin_set_account_status', 'admin_set_withdrawal_status',
                         'admin_review_identity', 'admin_delete_user')
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;


-- ─── 1. Account + withdrawal control columns ────────────────────────────────
alter table public.users add column if not exists status               text not null default 'active';
alter table public.users add column if not exists status_reason        text;
alter table public.users add column if not exists status_until         timestamptz;
alter table public.users add column if not exists status_changed_at    timestamptz;
alter table public.users add column if not exists withdrawal_status    text not null default 'active';
alter table public.users add column if not exists withdrawal_reason    text;
alter table public.users add column if not exists withdrawal_until     timestamptz;
alter table public.users add column if not exists withdrawal_changed_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_withdrawal_status_check') then
    alter table public.users add constraint users_withdrawal_status_check
      check (withdrawal_status in ('active', 'suspended', 'locked'));
  end if;
end $$;


-- ─── 2. Effective state (suspensions with an end date lift by themselves) ───
create or replace function public._account_state(p_uid uuid)
returns table (
  account text, account_reason text, account_until timestamptz,
  withdrawals text, withdrawal_reason text, withdrawal_until timestamptz,
  is_verified boolean
)
language sql stable security definer set search_path = public
as $$
  select
    case
      when lower(coalesce(u.status, 'active')) in ('locked', 'banned', 'blocked', 'disabled') then 'locked'
      when lower(coalesce(u.status, 'active')) in ('suspended', 'inactive')
           and (u.status_until is null or u.status_until > now()) then 'suspended'
      else 'active'
    end,
    u.status_reason, u.status_until,
    case
      when u.withdrawal_status = 'locked' then 'locked'
      when u.withdrawal_status = 'suspended'
           and (u.withdrawal_until is null or u.withdrawal_until > now()) then 'suspended'
      else 'active'
    end,
    u.withdrawal_reason, u.withdrawal_until, u.is_verified
  from public.users u
  where u.id = p_uid;
$$;
revoke all on function public._account_state(uuid) from public, anon, authenticated;

-- What the app calls: the signed-in user's own state
create or replace function public.my_account_state()
returns json
language sql stable security definer set search_path = public
as $$
  select row_to_json(s) from public._account_state(auth.uid()) s;
$$;
grant execute on function public.my_account_state() to authenticated;


-- ─── 3. Blocking rules ──────────────────────────────────────────────────────
create or replace function public._assert_can_transact(p_uid uuid, p_withdrawal boolean default false)
returns void
language plpgsql stable security definer set search_path = public
as $$
declare s record;
begin
  if p_uid is null then return; end if;
  select * into s from public._account_state(p_uid);
  if not found then return; end if;

  if s.account = 'locked' then
    raise exception 'Your account is locked. Please contact support.' using hint = 'ACCOUNT_LOCKED';
  end if;
  if s.account = 'suspended' then
    raise exception 'Your account is suspended%. You can view your account, but deposits, withdrawals, investments and trades are paused.',
      coalesce(' until ' || to_char(s.account_until, 'DD Mon YYYY'), '') using hint = 'ACCOUNT_SUSPENDED';
  end if;
  if p_withdrawal and s.withdrawals = 'locked' then
    raise exception 'Withdrawals are locked on your account. Please contact support.' using hint = 'WITHDRAWALS_LOCKED';
  end if;
  if p_withdrawal and s.withdrawals = 'suspended' then
    raise exception 'Withdrawals are on hold for your account%. Please contact support if you have questions.',
      coalesce(' until ' || to_char(s.withdrawal_until, 'DD Mon YYYY'), '') using hint = 'WITHDRAWALS_SUSPENDED';
  end if;
end $$;
revoke all on function public._assert_can_transact(uuid, boolean) from public, anon, authenticated;

-- One trigger function for every table where a user starts something that
-- moves money. TG_ARGV[0] names the column holding the user's id.
-- Admins, the SQL editor, the service role and scheduled jobs are never blocked.
create or replace function public.guard_restricted_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_uid uuid;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  v_uid := nullif(v_row ->> coalesce(tg_argv[0], 'user_id'), '')::uuid;
  perform public._assert_can_transact(
    v_uid,
    tg_table_name = 'transactions' and coalesce(v_row ->> 'type', '') ilike '%withdraw%'
  );
  return new;
end $$;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('transactions',                  'user_id'),
      ('property_investments',          'user_id'),
      ('mining_contracts',              'user_id'),
      ('card_orders',                   'user_id'),
      ('copy_relationships',            'copier_id'),
      ('open_positions',                'user_id'),
      ('stock_orders',                  'user_id'),
      ('subscription_payment_requests', 'user_id'),
      ('hire_requests',                 'client_id'),
      ('marketplace_subscriptions',     'user_id')
    ) as t(tbl, col)
  loop
    if to_regclass('public.' || r.tbl) is not null then
      execute format('drop trigger if exists zz_guard_restricted on public.%I', r.tbl);
      execute format(
        'create trigger zz_guard_restricted before insert on public.%I
           for each row execute function public.guard_restricted_insert(%L)', r.tbl, r.col);
    end if;
  end loop;
end $$;

-- A restricted user's wallet can't be drawn down from the app either
create or replace function public.guard_wallet_debit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.balance < old.balance then
    perform public._assert_can_transact(new.user_id, false);
  end if;
  return new;
end $$;
drop trigger if exists zz_guard_wallet_debit on public.wallets;
create trigger zz_guard_wallet_debit before update of balance on public.wallets
  for each row execute function public.guard_wallet_debit();

-- Users can edit their profile, but never their own status, withdrawal
-- controls or verified badge. Changes from the app are quietly ignored
-- (so existing profile/sign-up saves keep working).
create or replace function public.guard_user_controls()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'active';            new.status_reason := null;     new.status_until := null;
    new.withdrawal_status := 'active'; new.withdrawal_reason := null; new.withdrawal_until := null;
    new.is_verified := false;
  else
    new.status := old.status;                       new.status_reason := old.status_reason;
    new.status_until := old.status_until;           new.status_changed_at := old.status_changed_at;
    new.withdrawal_status := old.withdrawal_status; new.withdrawal_reason := old.withdrawal_reason;
    new.withdrawal_until := old.withdrawal_until;   new.withdrawal_changed_at := old.withdrawal_changed_at;
    new.is_verified := old.is_verified;
  end if;
  return new;
end $$;
drop trigger if exists zz_guard_user_controls on public.users;
create trigger zz_guard_user_controls before insert or update on public.users
  for each row execute function public.guard_user_controls();


-- ─── 4. Identity verifications ──────────────────────────────────────────────
create table if not exists public.identity_verifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  first_name        text not null,
  last_name         text not null,
  date_of_birth     date not null,
  nationality       text,
  country           text not null,
  address_line      text not null,
  city              text not null,
  state_region      text,
  postal_code       text,
  document_type     text not null check (document_type in ('passport', 'national_id', 'drivers_license', 'residence_permit')),
  document_number   text not null,
  document_expiry   date,
  doc_front_path    text not null,
  doc_back_path     text,
  selfie_path       text,                 -- no longer collected; kept for older submissions
  rejection_reason  text,
  reviewed_by       uuid references public.admins(id) on delete set null,
  reviewed_at       timestamptz,
  submitted_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Selfies are no longer collected (databases that ran an earlier version had this required)
alter table public.identity_verifications alter column selfie_path drop not null;

create index if not exists identity_verifications_user_idx   on public.identity_verifications(user_id, created_at desc);
create index if not exists identity_verifications_status_idx on public.identity_verifications(status);
create unique index if not exists identity_verifications_one_pending
  on public.identity_verifications(user_id) where status = 'pending';

alter table public.identity_verifications enable row level security;

drop policy if exists "identity: read own" on public.identity_verifications;
create policy "identity: read own" on public.identity_verifications
  for select using (user_id = auth.uid());
drop policy if exists "identity: submit own" on public.identity_verifications;
create policy "identity: submit own" on public.identity_verifications
  for insert with check (user_id = auth.uid());
drop policy if exists "admin full access" on public.identity_verifications;
create policy "admin full access" on public.identity_verifications
  for all using (public.is_admin()) with check (public.is_admin());

-- A submission from the app always starts as pending, for the signed-in user,
-- with files from their own folder. Users can't edit a submission afterwards.
create or replace function public.guard_identity_verification()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_uid text := auth.uid()::text;
begin
  if auth.uid() is null or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'A submitted verification can''t be changed. Submit a new one instead.';
  end if;

  new.user_id := auth.uid();
  new.status := 'pending';
  new.rejection_reason := null; new.reviewed_by := null; new.reviewed_at := null;
  new.submitted_at := now(); new.created_at := now(); new.updated_at := now();

  if exists (select 1 from public.users where id = new.user_id and is_verified) then
    raise exception 'Your identity is already verified.';
  end if;
  if exists (select 1 from public.identity_verifications where user_id = new.user_id and status = 'pending') then
    raise exception 'You already have a verification under review.';
  end if;
  if new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'You must be at least 18 years old to verify your identity.';
  end if;
  if new.document_expiry is not null and new.document_expiry < current_date then
    raise exception 'This document has expired. Please use a valid document.';
  end if;
  if split_part(new.doc_front_path, '/', 1) <> v_uid
     or (new.selfie_path is not null and split_part(new.selfie_path, '/', 1) <> v_uid)
     or (new.doc_back_path is not null and split_part(new.doc_back_path, '/', 1) <> v_uid) then
    raise exception 'Invalid document upload. Please upload your files again.';
  end if;
  return new;
end $$;
drop trigger if exists guard_identity_verification on public.identity_verifications;
create trigger guard_identity_verification before insert or update on public.identity_verifications
  for each row execute function public.guard_identity_verification();

-- Keep users.is_verified in step with the review
create or replace function public.sync_identity_verified()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'approved' then
    update public.users set is_verified = true, updated_at = now() where id = new.user_id and not is_verified;
  elsif tg_op = 'UPDATE' and old.status = 'approved'
        and not exists (select 1 from public.identity_verifications
                         where user_id = new.user_id and status = 'approved' and id <> new.id) then
    update public.users set is_verified = false, updated_at = now() where id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists sync_identity_verified on public.identity_verifications;
create trigger sync_identity_verified after insert or update of status on public.identity_verifications
  for each row execute function public.sync_identity_verified();


-- ─── 5. Private storage for ID documents ────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "identity docs: upload own" on storage.objects;
create policy "identity docs: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "identity docs: read own" on storage.objects;
create policy "identity docs: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "identity docs: admins read" on storage.objects;
create policy "identity docs: admins read" on storage.objects
  for select using (bucket_id = 'identity-documents' and public.is_admin());

-- Admins can remove a deleted user's files (ID documents and payment proofs)
drop policy if exists "identity docs: admins delete" on storage.objects;
create policy "identity docs: admins delete" on storage.objects
  for delete using (bucket_id in ('identity-documents', 'payment-proofs') and public.is_admin());


-- ─── 6. Helpers for the admin functions ─────────────────────────────────────
create or replace function public._admin_log(p_action text, p_table text, p_target text, p_old jsonb, p_new jsonb)
returns void
language sql security definer set search_path = public
as $$
  insert into public.admin_audit_log (admin_id, action, target_table, target_id, old_value, new_value)
  select public.current_admin_id(), p_action, p_table, p_target, p_old, p_new
   where public.current_admin_id() is not null;
$$;
revoke all on function public._admin_log(text, text, text, jsonb, jsonb) from public, anon, authenticated;

create or replace function public._notify_user(p_uid uuid, p_title text, p_desc text, p_icon text, p_url text default null)
returns void
language sql security definer set search_path = public
as $$
  insert into public.notifications (user_id, category, title, description, icon_class, action_url)
  values (p_uid, 'security', p_title, p_desc, p_icon, p_url);
$$;
revoke all on function public._notify_user(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public._is_self(p_uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users
                  where id = p_uid and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public._is_self(uuid) from public, anon, authenticated;


-- ─── 7. Admin: account status ───────────────────────────────────────────────
create or replace function public.admin_set_account_status(
  p_user_id uuid, p_status text, p_reason text default null, p_until timestamptz default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_old  public.users%rowtype;
  v_new  public.users%rowtype;
  v_has_ban boolean;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('active', 'suspended', 'locked') then raise exception 'Unknown status %', p_status; end if;
  if public._is_self(p_user_id) and p_status <> 'active' then raise exception 'You can''t suspend or lock your own account.'; end if;
  if p_status = 'suspended' and p_until is not null and p_until <= now() then raise exception 'The end date must be in the future.'; end if;

  select * into v_old from public.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;

  update public.users
     set status            = p_status,
         status_reason     = case when p_status = 'active' then null else nullif(trim(p_reason), '') end,
         status_until      = case when p_status = 'suspended' then p_until else null end,
         status_changed_at = now(),
         updated_at        = now()
   where id = p_user_id
  returning * into v_new;

  -- Lock = can't sign in at all: ban in Supabase Auth and end their sessions
  select exists (select 1 from information_schema.columns
                  where table_schema = 'auth' and table_name = 'users' and column_name = 'banned_until') into v_has_ban;
  if v_has_ban then
    execute 'update auth.users set banned_until = $2 where id = $1'
      using p_user_id, case when p_status = 'locked' then 'infinity'::timestamptz else null end;
  end if;
  if p_status = 'locked' and to_regclass('auth.sessions') is not null then
    execute 'delete from auth.sessions where user_id = $1' using p_user_id;
  end if;

  perform public._admin_log('account_' || p_status, 'users', p_user_id::text,
    jsonb_build_object('status', v_old.status, 'reason', v_old.status_reason, 'until', v_old.status_until),
    jsonb_build_object('status', v_new.status, 'reason', v_new.status_reason, 'until', v_new.status_until));

  perform public._notify_user(p_user_id,
    case p_status when 'active' then 'Your account is active again'
                  when 'suspended' then 'Your account has been suspended'
                  else 'Your account has been locked' end,
    case p_status when 'active' then 'All features on your account are available again.'
                  else coalesce(nullif(trim(p_reason), '') || ' ', '')
                       || case when p_status = 'suspended' and p_until is not null
                               then 'This ends on ' || to_char(p_until, 'DD Mon YYYY') || '. ' else '' end
                       || 'Contact support if you have questions.' end,
    case p_status when 'active' then 'ti-circle-check' else 'ti-lock' end,
    '/support');

  return json_build_object('id', v_new.id, 'status', v_new.status, 'status_reason', v_new.status_reason, 'status_until', v_new.status_until);
end $$;
grant execute on function public.admin_set_account_status(uuid, text, text, timestamptz) to authenticated;


-- ─── 8. Admin: withdrawal status ────────────────────────────────────────────
create or replace function public.admin_set_withdrawal_status(
  p_user_id uuid, p_status text, p_reason text default null, p_until timestamptz default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_old public.users%rowtype;
  v_new public.users%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('active', 'suspended', 'locked') then raise exception 'Unknown status %', p_status; end if;
  if p_status = 'suspended' and p_until is not null and p_until <= now() then raise exception 'The end date must be in the future.'; end if;

  select * into v_old from public.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;

  update public.users
     set withdrawal_status     = p_status,
         withdrawal_reason     = case when p_status = 'active' then null else nullif(trim(p_reason), '') end,
         withdrawal_until      = case when p_status = 'suspended' then p_until else null end,
         withdrawal_changed_at = now(),
         updated_at            = now()
   where id = p_user_id
  returning * into v_new;

  perform public._admin_log('withdrawals_' || p_status, 'users', p_user_id::text,
    jsonb_build_object('withdrawal_status', v_old.withdrawal_status, 'reason', v_old.withdrawal_reason, 'until', v_old.withdrawal_until),
    jsonb_build_object('withdrawal_status', v_new.withdrawal_status, 'reason', v_new.withdrawal_reason, 'until', v_new.withdrawal_until));

  perform public._notify_user(p_user_id,
    case p_status when 'active' then 'Withdrawals are available again'
                  when 'suspended' then 'Withdrawals are on hold'
                  else 'Withdrawals are locked' end,
    case p_status when 'active' then 'You can request withdrawals again.'
                  else coalesce(nullif(trim(p_reason), '') || ' ', '')
                       || case when p_status = 'suspended' and p_until is not null
                               then 'This ends on ' || to_char(p_until, 'DD Mon YYYY') || '. ' else '' end
                       || 'Contact support if you have questions.' end,
    case p_status when 'active' then 'ti-circle-check' else 'ti-lock' end,
    '/payments');

  return json_build_object('id', v_new.id, 'withdrawal_status', v_new.withdrawal_status,
                           'withdrawal_reason', v_new.withdrawal_reason, 'withdrawal_until', v_new.withdrawal_until);
end $$;
grant execute on function public.admin_set_withdrawal_status(uuid, text, text, timestamptz) to authenticated;


-- ─── 9. Admin: review an identity verification ──────────────────────────────
create or replace function public.admin_review_identity(p_id uuid, p_approve boolean, p_reason text default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_old public.identity_verifications%rowtype;
  v_new public.identity_verifications%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not p_approve and nullif(trim(p_reason), '') is null then
    raise exception 'Give the user a reason so they know what to fix.';
  end if;

  select * into v_old from public.identity_verifications where id = p_id;
  if not found then raise exception 'Verification not found'; end if;

  update public.identity_verifications
     set status = case when p_approve then 'approved' else 'rejected' end,
         rejection_reason = case when p_approve then null else trim(p_reason) end,
         reviewed_by = public.current_admin_id(),
         reviewed_at = now()
   where id = p_id
  returning * into v_new;

  perform public._admin_log(case when p_approve then 'approve_identity' else 'reject_identity' end,
    'identity_verifications', p_id::text,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', v_new.status, 'reason', v_new.rejection_reason));

  perform public._notify_user(v_new.user_id,
    case when p_approve then 'Your identity is verified' else 'We couldn''t verify your identity' end,
    case when p_approve then 'Thanks — your account now shows as verified.'
         else trim(p_reason) || ' Please submit your details again.' end,
    case when p_approve then 'ti-shield-check' else 'ti-alert-circle' end,
    '/verify-identity');

  return row_to_json(v_new);
end $$;
grant execute on function public.admin_review_identity(uuid, boolean, text) to authenticated;


-- ─── 10. Admin: delete a user ───────────────────────────────────────────────
-- Removes the users row (and, through ON DELETE CASCADE, their wallets,
-- transactions, investments, cards, notifications …) and their sign-in.
-- Files in storage are removed by the admin console before this runs.
create or replace function public.admin_delete_user(p_user_id uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_snap jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_user from public.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;
  if public._is_self(p_user_id) then raise exception 'You can''t delete your own account.'; end if;
  if exists (select 1 from public.admins where lower(email) = lower(v_user.email) and is_active) then
    raise exception 'This user is an admin. Remove their admin access first.';
  end if;

  v_snap := jsonb_build_object(
    'email', v_user.email, 'first_name', v_user.first_name, 'last_name', v_user.last_name,
    'created_at', v_user.created_at,
    'wallets', coalesce((select jsonb_agg(jsonb_build_object('currency', currency, 'balance', balance))
                           from public.wallets where user_id = p_user_id), '[]'::jsonb));

  delete from public.users where id = p_user_id;
  if to_regclass('auth.users') is not null then
    execute 'delete from auth.users where id = $1' using p_user_id;
  end if;

  perform public._admin_log('delete_user', 'users', p_user_id::text, v_snap, null);
  return json_build_object('deleted', p_user_id, 'email', v_user.email);
end $$;
grant execute on function public.admin_delete_user(uuid) to authenticated;
