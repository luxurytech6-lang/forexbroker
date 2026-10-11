-- ════════════════════════════════════════════════════════════════════════════
-- payments_schema.sql — additions the payment pages need on top of the main schema
-- Run in the Supabase SQL editor. Safe to re-run.
--
--   transactions.proof_url          path of the payment screenshot (MarketPlace.jsx, deposits)
--   subscription_payment_requests   plan payments waiting for an admin (payment.jsx)
--   storage bucket "payment-proofs" private bucket for the screenshots
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
