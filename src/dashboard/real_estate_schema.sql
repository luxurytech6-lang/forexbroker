-- ════════════════════════════════════════════════════════════════════════════
-- real_estate_schema.sql — data for the Real Estate page (/real-estate) and Admin → Real estate
-- Run in the Supabase SQL editor. Safe to re-run.
--
--   properties             listings
--   property_investments   a user's positions
--   property_payouts       rent paid out to a user
--   invest_in_property()   checks the wallet, debits it and records the position
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
create table if not exists public.properties (
  id               uuid primary key default gen_random_uuid(),
  name             varchar not null,
  type             varchar not null default 'residential'
                   check (type in ('residential','commercial','industrial','hospitality')),
  city             varchar not null,
  country          varchar not null,
  description      text,
  image_url        text,                                  -- empty = drawn illustration
  status           varchar not null default 'open'
                   check (status in ('draft','open','funded','closed')),
  featured         boolean not null default false,
  total_value      numeric not null check (total_value > 0),
  funded_amount    numeric not null default 0,
  min_investment   numeric not null default 100,
  share_price      numeric not null default 10 check (share_price > 0),
  target_yield     numeric not null default 0,            -- % a year
  appreciation     numeric not null default 0,            -- % a year
  hold_years       integer not null default 5,
  occupancy        numeric,                               -- %
  investors_count  integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.property_investments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete cascade,
  amount       numeric not null check (amount > 0),
  shares       integer not null default 0,
  status       varchar not null default 'pending'
               check (status in ('pending','active','exited','rejected')),
  created_at   timestamptz not null default now()
);
create index if not exists property_investments_user_idx     on public.property_investments(user_id);
create index if not exists property_investments_property_idx on public.property_investments(property_id);

create table if not exists public.property_payouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  property_id  uuid references public.properties(id) on delete set null,
  amount       numeric not null,
  period       varchar,                                   -- e.g. "Q3 2026"
  created_at   timestamptz not null default now()
);
create index if not exists property_payouts_user_idx on public.property_payouts(user_id);


-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.properties           enable row level security;
alter table public.property_investments enable row level security;
alter table public.property_payouts     enable row level security;

drop policy if exists "properties: read listed" on public.properties;
create policy "properties: read listed" on public.properties
  for select to authenticated using (status in ('open','funded'));

drop policy if exists "investments: read own" on public.property_investments;
create policy "investments: read own" on public.property_investments
  for select using (user_id = auth.uid());

-- Fallback used by the page when invest_in_property() isn't installed: a pending, unpaid request
drop policy if exists "investments: request own" on public.property_investments;
create policy "investments: request own" on public.property_investments
  for insert with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "payouts: read own" on public.property_payouts;
create policy "payouts: read own" on public.property_payouts
  for select using (user_id = auth.uid());

drop policy if exists "admin full access" on public.properties;
create policy "admin full access" on public.properties for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin full access" on public.property_investments;
create policy "admin full access" on public.property_investments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin full access" on public.property_payouts;
create policy "admin full access" on public.property_payouts for all using (public.is_admin()) with check (public.is_admin());


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


-- ─── invest_in_property(): pay from the USD wallet and record the position ──
create or replace function public.invest_in_property(p_property_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  p          properties%rowtype;
  uid        uuid := auth.uid();
  v_left     numeric;
  v_first    boolean;
  v_id       uuid;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  select * into p from properties where id = p_property_id for update;
  if not found or p.status <> 'open' then raise exception 'This property isn''t open for investment'; end if;
  if p_amount is null or p_amount < p.min_investment then raise exception 'The minimum investment is $%', p.min_investment; end if;
  v_left := p.total_value - p.funded_amount;
  if p_amount > v_left then raise exception 'Only $% of this property is still available', round(v_left, 2); end if;

  perform public._wallet_move(uid, -p_amount, 'USD', 'property_investment', 'Investment in ' || p.name, true);

  v_first := not exists (select 1 from property_investments where property_id = p.id and user_id = uid and status = 'active');

  insert into property_investments (user_id, property_id, amount, shares, status)
  values (uid, p.id, p_amount, floor(p_amount / p.share_price), 'active')
  returning id into v_id;

  update properties
     set funded_amount   = funded_amount + p_amount,
         investors_count = investors_count + case when v_first then 1 else 0 end,
         status          = case when funded_amount + p_amount >= total_value then 'funded' else status end,
         updated_at      = now()
   where id = p.id;

  return v_id;
end $$;
grant execute on function public.invest_in_property(uuid,numeric) to authenticated;
