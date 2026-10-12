-- ════════════════════════════════════════════════════════════════════════════
-- mining_schema.sql — data for the Mining page (/mining) and Admin → Mining
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Tables
--   mining_plans       plans an admin publishes (coin, hashrate, price, term, daily return)
--   mining_contracts   a user's contracts
--   mining_payouts     daily earnings paid into the wallet
--
-- Functions
--   start_mining_contract(plan_id, amount)  user buys a contract from the USD wallet
--   process_mining_payouts()                pays every full day earned; closes finished contracts
--
-- Depends on the main schema: users, wallets, transactions, admins and,
-- optionally, notifications.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── Admin check (identical in every schema file) ───────────────────────────
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


-- ─── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.mining_plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  coin              text not null,                 -- BTC, LTC, KAS, ETC, DOGE…
  algorithm         text,                          -- SHA-256, Scrypt…
  hashrate          numeric not null default 0,    -- hashrate given for min_investment; scales with the amount
  hashrate_unit     text not null default 'TH/s',
  min_investment    numeric not null default 100,
  max_investment    numeric,
  duration_days     int not null default 30 check (duration_days > 0),
  daily_return_pct  numeric not null default 1 check (daily_return_pct >= 0),
  returns_principal boolean not null default true, -- give the capital back when the term ends
  description       text,
  featured          boolean not null default false,
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.mining_contracts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  plan_id          uuid references public.mining_plans(id) on delete set null,
  coin             text,
  amount           numeric not null check (amount > 0),
  daily_return_pct numeric not null,
  duration_days    int not null,
  hashrate         numeric,
  hashrate_unit    text,
  status           text not null default 'pending'
                   check (status in ('pending','active','completed','cancelled')),
  started_at       timestamptz,
  ends_at          timestamptz,
  last_payout_at   timestamptz,
  total_earned     numeric not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists mining_contracts_user_idx   on public.mining_contracts(user_id);
create index if not exists mining_contracts_status_idx on public.mining_contracts(status);

-- ─── Crypto payment details (filled in by the page; checked by an admin) ────
alter table public.mining_contracts add column if not exists pay_coin    text;   -- e.g. USDT
alter table public.mining_contracts add column if not exists pay_network text;   -- e.g. TRC-20
alter table public.mining_contracts add column if not exists pay_tx_hash text;   -- optional, pasted by the user
alter table public.mining_contracts add column if not exists proof_url   text;   -- path in the private payment-proofs bucket
alter table public.mining_contracts add column if not exists payment_tx_id uuid; -- the matching pending row in transactions

create table if not exists public.mining_payouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  contract_id uuid references public.mining_contracts(id) on delete set null,
  amount      numeric not null,
  coin        text,
  days        int not null default 1,
  created_at  timestamptz not null default now()
);
create index if not exists mining_payouts_user_idx on public.mining_payouts(user_id);


-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.mining_plans     enable row level security;
alter table public.mining_contracts enable row level security;
alter table public.mining_payouts   enable row level security;

-- Users
drop policy if exists "plans: anyone signed in reads live plans" on public.mining_plans;
create policy "plans: anyone signed in reads live plans" on public.mining_plans
  for select to authenticated using (is_active);

drop policy if exists "contracts: read own" on public.mining_contracts;
create policy "contracts: read own" on public.mining_contracts
  for select using (user_id = auth.uid());

-- Users can only file *pending* requests; going live happens in the RPC or by an admin
drop policy if exists "contracts: request own" on public.mining_contracts;
create policy "contracts: request own" on public.mining_contracts
  for insert with check (user_id = auth.uid() and status = 'pending' and total_earned = 0);

drop policy if exists "payouts: read own" on public.mining_payouts;
create policy "payouts: read own" on public.mining_payouts
  for select using (user_id = auth.uid());

-- Admins
drop policy if exists "admin full access" on public.mining_plans;
create policy "admin full access" on public.mining_plans
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin full access" on public.mining_contracts;
create policy "admin full access" on public.mining_contracts
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin full access" on public.mining_payouts;
create policy "admin full access" on public.mining_payouts
  for all using (public.is_admin()) with check (public.is_admin());


-- ─── Wallet helper (identical in every schema file; not callable from the app) ─
create or replace function public._wallet_move(
  p_user_id uuid, p_amount numeric, p_currency text, p_type text, p_description text, p_record boolean default true
) returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_new    numeric;
  v_wallet uuid;
begin
  update wallets set balance = balance + p_amount, updated_at = now()
   where user_id = p_user_id and currency = p_currency
   returning id, balance into v_wallet, v_new;
  if not found then
    if p_amount < 0 then raise exception 'You don''t have a % wallet yet', p_currency; end if;
    insert into wallets (user_id, currency, balance) values (p_user_id, p_currency, p_amount)
    returning id, balance into v_wallet, v_new;
  end if;
  if v_new < 0 then raise exception 'Not enough balance in your wallet'; end if;
  if p_record then
    insert into transactions (user_id, wallet_id, type, amount, currency, fee, net_amount, status, description)
    values (p_user_id, v_wallet, p_type, p_amount, p_currency, 0, p_amount, 'completed', p_description);
  end if;
  return v_new;
end $$;
revoke all on function public._wallet_move(uuid,numeric,text,text,text,boolean) from public, anon, authenticated;


-- ─── start_mining_contract: user buys a contract from the USD wallet ────────
create or replace function public.start_mining_contract(p_plan_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  p   mining_plans%rowtype;
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  select * into p from mining_plans where id = p_plan_id and is_active;
  if not found then raise exception 'This plan is no longer available'; end if;
  if p_amount is null or p_amount < p.min_investment then
    raise exception 'The minimum for this plan is $%', p.min_investment;
  end if;
  if p.max_investment is not null and p_amount > p.max_investment then
    raise exception 'The maximum for this plan is $%', p.max_investment;
  end if;

  -- Debit the wallet (fails with "Not enough balance" if short)
  perform public._wallet_move(uid, -p_amount, 'USD', 'mining_purchase', 'Mining contract · ' || p.name, true);

  insert into mining_contracts (user_id, plan_id, coin, amount, daily_return_pct, duration_days,
                                hashrate, hashrate_unit, status, started_at, ends_at, last_payout_at)
  values (uid, p.id, p.coin, p_amount, p.daily_return_pct, p.duration_days,
          round(p.hashrate * p_amount / nullif(p.min_investment, 0), 4), p.hashrate_unit,
          'active', now(), now() + make_interval(days => p.duration_days), now())
  returning id into cid;
  return cid;
end $$;
grant execute on function public.start_mining_contract(uuid,numeric) to authenticated;


-- ─── process_mining_payouts: pay every full day earned ──────────────────────
-- Safe to run any time: it only pays whole days since the last payout.
-- Run by an admin (Admin → Mining → "Pay earnings now") or by pg_cron.
create or replace function public.process_mining_payouts()
returns table (paid numeric, contracts int)
language plpgsql security definer set search_path = public
as $$
declare
  c       record;
  v_from  timestamptz;
  v_upto  timestamptz;
  v_days  int;
  v_amt   numeric;
  v_total numeric := 0;
  v_count int := 0;
begin
  -- auth.uid() is null when called by pg_cron / the service role
  if auth.uid() is not null and not public.is_admin() then raise exception 'Admins only'; end if;

  for c in
    select mc.*, coalesce(mp.returns_principal, true) as give_back
      from mining_contracts mc
      left join mining_plans mp on mp.id = mc.plan_id
     where mc.status = 'active'
     for update of mc
  loop
    v_from := coalesce(c.last_payout_at, c.started_at, c.created_at);
    v_upto := least(now(), coalesce(c.ends_at, c.started_at + make_interval(days => c.duration_days)));
    v_days := floor(extract(epoch from (v_upto - v_from)) / 86400);

    if v_days > 0 then
      v_amt := round(c.amount * c.daily_return_pct / 100 * v_days, 2);
      perform public._wallet_move(c.user_id, v_amt, 'USD', 'mining_payout',
              format('Mining payout · %s · %s day%s', c.coin, v_days, case when v_days > 1 then 's' else '' end), true);
      insert into mining_payouts (user_id, contract_id, amount, coin, days)
      values (c.user_id, c.id, v_amt, c.coin, v_days);
      update mining_contracts
         set total_earned   = total_earned + v_amt,
             last_payout_at = v_from + make_interval(days => v_days)
       where id = c.id;
      v_total := v_total + v_amt;
      v_count := v_count + 1;
      v_from  := v_from + make_interval(days => v_days);
    end if;

    -- Term over and every full day paid: close it and return the capital
    if c.ends_at is not null and now() >= c.ends_at and c.ends_at - v_from < interval '1 day' then
      update mining_contracts set status = 'completed' where id = c.id;
      if c.give_back then
        perform public._wallet_move(c.user_id, c.amount, 'USD', 'mining_principal',
                'Mining contract ended · capital returned', true);
      end if;
      if to_regclass('public.notifications') is not null then
        insert into notifications (user_id, title, description, category, icon_class, action_url, is_read, is_dismissed)
        values (c.user_id, 'Your ' || c.coin || ' mining contract has ended',
                'Your earnings have been paid to your wallet.', 'payment', 'ti-pick', '/mining', false, false);
      end if;
    end if;
  end loop;

  return query select v_total, v_count;
end $$;
grant execute on function public.process_mining_payouts() to authenticated;


-- ─── Starter plans (only added if the table is empty) ───────────────────────
-- Edit or hide these any time from Admin → Mining → Plans.
insert into public.mining_plans
  (name, coin, algorithm, hashrate, hashrate_unit, min_investment, max_investment, duration_days, daily_return_pct, featured, sort_order, description)
select * from (values
  ('Bitcoin Starter',  'BTC',  'SHA-256',    10::numeric,  'TH/s', 100::numeric,  999::numeric,   30, 1.2::numeric, false, 1,
   'An entry contract on our SHA-256 fleet. Earnings are paid daily to your wallet in USD for the full 30-day term.'),
  ('Bitcoin Pro',      'BTC',  'SHA-256',    120,          'TH/s', 1000,          9999,           60, 1.5,          true,  2,
   'Dedicated hashrate on latest-generation ASIC miners with priority pool allocation and a longer 60-day term.'),
  ('Litecoin Scrypt',  'LTC',  'Scrypt',     500,          'MH/s', 250,           5000,           45, 1.3,          false, 3,
   'Merged Litecoin and Dogecoin mining on Scrypt hardware, settled daily to your wallet.'),
  ('Kaspa Turbo',      'KAS',  'kHeavyHash', 2,            'TH/s', 500,           20000,          90, 1.8,          false, 4,
   'High-throughput kHeavyHash contract for Kaspa with a 90-day term.'),
  ('Ethereum Classic', 'ETC',  'Etchash',    1,            'GH/s', 200,           4000,           30, 1.1,          false, 5,
   'GPU-based Etchash mining for Ethereum Classic, paid out daily.'),
  ('Dogecoin Sprint',  'DOGE', 'Scrypt',     300,          'MH/s', 100,           2500,           14, 1.0,          false, 6,
   'A short two-week contract for trying cloud mining with a small amount.')
) as v
where not exists (select 1 from public.mining_plans);


-- ─── Optional: pay earnings automatically every day at 00:05 UTC ────────────
-- Enable the pg_cron extension (Database → Extensions), then uncomment:
-- select cron.schedule('mining-payouts', '5 0 * * *', $$ select public.process_mining_payouts(); $$);
