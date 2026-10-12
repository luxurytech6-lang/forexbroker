-- ════════════════════════════════════════════════════════════════════════════
-- payments_schema.sql — additions the payment pages need on top of the main schema
-- Run in the Supabase SQL editor. Safe to re-run.
--
--   transactions.proof_url          path of the payment screenshot (MarketPlace.jsx, deposits,
--                                   and the crypto checkout on Real estate, Mining, Cards, Copy trading)
--   subscription_payment_requests   plan payments waiting for an admin (payment.jsx)
--   storage bucket "payment-proofs" private bucket for the screenshots
--   card_orders payment columns     crypto payment details for paid cards (Cards.jsx)
--   copy_relationships payment      crypto payment for a copy allocation (CopyTrading.jsx), plus a
--                                   guard so only an admin can switch a paid copy on
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Admin check (identical in every schema file) ───────────────────────────
-- An admin is a signed-in Supabase Auth user whose email has an active row in public.admins.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admins
     where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       and is_active
  );
$$;
grant execute on function public.is_admin() to authenticated;


-- ─── transactions: where the proof screenshot lives ─────────────────────────
alter table public.transactions add column if not exists proof_url text;


-- ─── Plan payments waiting for review ───────────────────────────────────────
create table if not exists public.subscription_payment_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  plan_id       integer references public.subscription_plans(id),
  plan_name     varchar,
  billing_cycle varchar not null default 'monthly',
  amount        numeric not null,
  coin          varchar,
  network       varchar,
  tx_hash       varchar,
  proof_url     text,
  status        varchar not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists subscription_payment_requests_user_idx   on public.subscription_payment_requests(user_id);
create index if not exists subscription_payment_requests_status_idx on public.subscription_payment_requests(status);

alter table public.subscription_payment_requests enable row level security;

drop policy if exists "plan payments: read own" on public.subscription_payment_requests;
create policy "plan payments: read own" on public.subscription_payment_requests
  for select using (user_id = auth.uid());

drop policy if exists "plan payments: file own" on public.subscription_payment_requests;
create policy "plan payments: file own" on public.subscription_payment_requests
  for insert with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "admin full access" on public.subscription_payment_requests;
create policy "admin full access" on public.subscription_payment_requests
  for all using (public.is_admin()) with check (public.is_admin());


-- ─── Private bucket for payment screenshots ─────────────────────────────────
-- Files are stored as "<user id>/<context>-<timestamp>.<ext>" (see uploadPaymentProof in payment.jsx)
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "payment proofs: upload own" on storage.objects;
create policy "payment proofs: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "payment proofs: read own" on storage.objects;
create policy "payment proofs: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admins read payment proofs" on storage.objects;
create policy "admins read payment proofs" on storage.objects
  for select using (bucket_id = 'payment-proofs' and public.is_admin());


-- ─── Card orders paid in crypto (Cards.jsx) ─────────────────────────────────
-- Needs your cards schema (card_orders) to be installed first.
do $$ begin
  if to_regclass('public.card_orders') is not null then
    alter table public.card_orders add column if not exists pay_coin    text;
    alter table public.card_orders add column if not exists pay_network text;
    alter table public.card_orders add column if not exists pay_tx_hash text;
    alter table public.card_orders add column if not exists proof_url   text;
    alter table public.card_orders add column if not exists payment_tx_id uuid;
  end if;
end $$;


-- ─── Copy trading paid in crypto (CopyTrading.jsx) ──────────────────────────
-- A new copy is filed as 'pending' with its payment details; an admin checks
-- the proof and sets it to 'active' (Admin → Copy trading → Requests).
do $$ begin
  if to_regclass('public.copy_relationships') is not null then
    alter table public.copy_relationships add column if not exists pay_coin    text;
    alter table public.copy_relationships add column if not exists pay_network text;
    alter table public.copy_relationships add column if not exists pay_tx_hash text;
    alter table public.copy_relationships add column if not exists proof_url   text;
    alter table public.copy_relationships add column if not exists payment_tx_id uuid;
    alter table public.copy_relationships add column if not exists created_at  timestamptz not null default now();
  end if;
end $$;

-- Users can't start a copy as active, switch on their own pending copy, or edit their gains.
create or replace function public.guard_copy_relationship()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;                                         -- admins and server jobs are trusted
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.realised_gain := 0;
  else
    new.realised_gain := old.realised_gain;
    new.allocated_amount := old.allocated_amount;
    if old.status = 'pending' and new.status is distinct from old.status and new.status <> 'stopped' then
      new.status := old.status;                         -- only an admin activates a paid copy
    end if;
    if old.status <> 'pending' and new.status = 'active' and old.status not in ('active', 'paused') then
      new.status := old.status;                         -- a stopped/rejected copy can't be revived by the user
    end if;
  end if;
  return new;
end $$;

do $$ begin
  if to_regclass('public.copy_relationships') is not null then
    drop trigger if exists copy_relationships_guard on public.copy_relationships;
    create trigger copy_relationships_guard
      before insert or update on public.copy_relationships
      for each row execute function public.guard_copy_relationship();
  end if;
end $$;
