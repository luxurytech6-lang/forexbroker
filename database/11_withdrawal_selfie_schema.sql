-- ════════════════════════════════════════════════════════════════════════════
-- 11_withdrawal_selfie_schema.sql — live selfie to confirm every withdrawal
-- Run in the Supabase SQL editor AFTER 09 (it uses the identity-documents
-- bucket). Safe to re-run.
--
-- Flow
--   1. On Payments → Withdraw the user fills in the amount and details and
--      clicks Withdraw. A camera window opens and they take a live selfie.
--   2. The photo is stored privately at identity-documents/<user id>/… and a
--      row is added to withdrawal_selfies.
--   3. The withdrawal is created. The database refuses any withdrawal that
--      doesn't have a fresh, unused selfie (taken in the last 15 minutes), and
--      links that selfie to the withdrawal (transactions.selfie_path).
--   4. Admin → Transactions shows the selfie next to the user's ID photo so the
--      admin can compare them before approving.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Selfies taken for withdrawals ───────────────────────────────────────
create table if not exists public.withdrawal_selfies (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  path            text not null,
  created_at      timestamptz not null default now(),
  used_at         timestamptz,
  transaction_id  uuid
);
create index if not exists withdrawal_selfies_user_idx on public.withdrawal_selfies(user_id, created_at desc);

alter table public.withdrawal_selfies enable row level security;
drop policy if exists "withdrawal selfies: add own" on public.withdrawal_selfies;
create policy "withdrawal selfies: add own" on public.withdrawal_selfies
  for insert with check (user_id = auth.uid());
drop policy if exists "withdrawal selfies: read own" on public.withdrawal_selfies;
create policy "withdrawal selfies: read own" on public.withdrawal_selfies
  for select using (user_id = auth.uid());
drop policy if exists "admin full access" on public.withdrawal_selfies;
create policy "admin full access" on public.withdrawal_selfies
  for all using (public.is_admin()) with check (public.is_admin());

-- A selfie row from the app is always fresh, unused, and points at the user's own folder
create or replace function public.guard_withdrawal_selfie()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'UPDATE' then
    -- Only the withdrawal trigger below may mark a selfie as used (it runs one level deeper)
    if pg_trigger_depth() > 1 and old.used_at is null and new.path = old.path and new.user_id = old.user_id then
      return new;
    end if;
    raise exception 'Selfies can''t be changed.';
  end if;
  new.user_id := auth.uid();
  new.created_at := now();
  new.used_at := null;
  new.transaction_id := null;
  if split_part(new.path, '/', 1) <> auth.uid()::text then
    raise exception 'Invalid selfie upload. Please take the photo again.';
  end if;
  return new;
end $$;
drop trigger if exists guard_withdrawal_selfie on public.withdrawal_selfies;
create trigger guard_withdrawal_selfie before insert or update on public.withdrawal_selfies
  for each row execute function public.guard_withdrawal_selfie();


-- ─── 2. Link the selfie to the withdrawal ───────────────────────────────────
alter table public.transactions add column if not exists selfie_path text;

create or replace function public.require_withdrawal_selfie()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare s record;
begin
  -- Admins, the SQL editor, the service role and scheduled jobs are not asked for a selfie
  if auth.uid() is null or public.is_admin() then return new; end if;
  if coalesce(new.type, '') not ilike '%withdraw%' then return new; end if;

  select * into s
    from public.withdrawal_selfies
   where user_id = new.user_id and used_at is null and created_at > now() - interval '15 minutes'
   order by created_at desc
   limit 1
   for update;

  if not found then
    raise exception 'Please take a live selfie to confirm this withdrawal.' using hint = 'WITHDRAWAL_SELFIE_REQUIRED';
  end if;

  new.selfie_path := s.path;
  update public.withdrawal_selfies set used_at = now(), transaction_id = new.id where id = s.id;
  return new;
end $$;

drop trigger if exists require_withdrawal_selfie on public.transactions;
create trigger require_withdrawal_selfie before insert on public.transactions
  for each row execute function public.require_withdrawal_selfie();

-- Users can't swap the selfie on a withdrawal afterwards
create or replace function public.guard_transaction_selfie()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  new.selfie_path := old.selfie_path;
  return new;
end $$;
drop trigger if exists guard_transaction_selfie on public.transactions;
create trigger guard_transaction_selfie before update on public.transactions
  for each row execute function public.guard_transaction_selfie();


-- ─── Checking it ────────────────────────────────────────────────────────────
-- Recent withdrawals and their selfies:
-- select t.created_at, u.email, t.amount, t.status, t.selfie_path
--   from public.transactions t join public.users u on u.id = t.user_id
--  where t.type ilike '%withdraw%' order by t.created_at desc limit 20;
