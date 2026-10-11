-- ═══════════════════════════════════════════════════════════════════════════
-- Tradexflow · Real Estate
-- Tables, row-level security and the invest RPC used by RealEstate.jsx.
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- Assumes existing tables: public.users (id = auth.uid()) and
-- public.wallets (user_id, currency, balance).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Listings ────────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null,
  city             text        not null,
  country          text        not null,
  type             text        not null check (type in ('residential','commercial','industrial','hospitality')),
  description      text,
  image_url        text,                          -- optional photo; the page draws an illustration if empty
  target_yield     numeric(5,2) not null,         -- % per year, e.g. 7.20
  appreciation     numeric(5,2) not null default 0, -- expected % growth per year
  hold_years       int         not null check (hold_years > 0),
  min_investment   numeric(12,2) not null default 100,
  share_price      numeric(12,2) not null default 10,
  total_value      numeric(14,2) not null,        -- amount being raised
  funded_amount    numeric(14,2) not null default 0,
  investors_count  int         not null default 0,
  occupancy        int,                           -- % let, optional
  featured         boolean     not null default false,
  status           text        not null default 'open' check (status in ('draft','open','funded','closed')),
  created_at       timestamptz not null default now()
);

-- ── Positions ───────────────────────────────────────────────────────────────
create table if not exists public.property_investments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete restrict,
  amount       numeric(14,2) not null check (amount > 0),
  shares       int  not null default 0,
  status       text not null default 'active' check (status in ('pending','active','exited','rejected')),
  created_at   timestamptz not null default now()
);
create index if not exists property_investments_user_idx on public.property_investments(user_id);

-- ── Rent paid out ───────────────────────────────────────────────────────────
create table if not exists public.property_payouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete restrict,
  amount       numeric(14,2) not null check (amount > 0),
  period       text,                                -- e.g. '2026-Q3'
  paid_at      timestamptz not null default now()
);
create index if not exists property_payouts_user_idx on public.property_payouts(user_id);

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.properties           enable row level security;
alter table public.property_investments enable row level security;
alter table public.property_payouts     enable row level security;

-- Any signed-in user can read published listings
drop policy if exists "read published properties" on public.properties;
create policy "read published properties" on public.properties
  for select to authenticated using (status in ('open','funded','closed'));

-- Users see only their own positions and payouts
drop policy if exists "read own investments" on public.property_investments;
create policy "read own investments" on public.property_investments
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "read own payouts" on public.property_payouts;
create policy "read own payouts" on public.property_payouts
  for select to authenticated using (user_id = auth.uid());

-- Fallback path only: lets a user file a PENDING request for themselves when the
-- RPC below isn't installed. An admin approves it and debits the wallet by hand.
-- Once invest_in_property() is installed you can drop this policy.
drop policy if exists "request own investment" on public.property_investments;
create policy "request own investment" on public.property_investments
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

-- ── Invest RPC: atomic wallet debit + position ──────────────────────────────
-- Runs as the table owner so it can update wallets and funding totals, but it
-- only ever acts for auth.uid(). Row locks stop double-spending and over-funding.
create or replace function public.invest_in_property(p_property_id uuid, p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_prop    public.properties%rowtype;
  v_balance numeric;
  v_first   boolean;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount greater than zero'; end if;

  select * into v_prop from public.properties where id = p_property_id for update;
  if not found then raise exception 'Property not found'; end if;
  if v_prop.status <> 'open' then raise exception 'This property is not open for investment'; end if;
  if p_amount < v_prop.min_investment then
    raise exception 'The minimum investment is %', v_prop.min_investment;
  end if;
  if v_prop.funded_amount + p_amount > v_prop.total_value then
    raise exception 'Only % of this property is still available', v_prop.total_value - v_prop.funded_amount;
  end if;

  select balance into v_balance from public.wallets
   where user_id = v_uid and currency = 'USD' for update;
  if v_balance is null then raise exception 'No USD wallet found'; end if;
  if v_balance < p_amount then raise exception 'Insufficient wallet balance'; end if;

  update public.wallets set balance = balance - p_amount
   where user_id = v_uid and currency = 'USD';

  select not exists (
    select 1 from public.property_investments
     where user_id = v_uid and property_id = p_property_id and status = 'active'
  ) into v_first;

  insert into public.property_investments (user_id, property_id, amount, shares, status)
  values (v_uid, p_property_id, p_amount, floor(p_amount / v_prop.share_price)::int, 'active')
  returning id into v_id;

  update public.properties
     set funded_amount   = funded_amount + p_amount,
         investors_count = investors_count + case when v_first then 1 else 0 end,
         status          = case when funded_amount + p_amount >= total_value then 'funded' else status end
   where id = p_property_id;

  return v_id;
end;
$$;

revoke all on function public.invest_in_property(uuid, numeric) from public;
grant execute on function public.invest_in_property(uuid, numeric) to authenticated;

-- ── Optional: one listing to test with ──────────────────────────────────────
-- insert into public.properties
--   (name, city, country, type, description, target_yield, appreciation, hold_years,
--    min_investment, share_price, total_value, funded_amount, investors_count, occupancy, featured)
-- values
--   ('Riverside Apartments', 'Manchester', 'United Kingdom', 'residential',
--    'A 48-unit apartment block a short walk from Manchester city centre, fully let on 12-month tenancies.',
--    7.2, 3.0, 5, 100, 10, 2400000, 1968000, 1284, 97, true);
