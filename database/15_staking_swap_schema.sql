-- ════════════════════════════════════════════════════════════════════════════
-- 15_staking_swap_schema.sql — Staking (/staking) and Swap (/swap)
-- Run in the Supabase SQL editor AFTER 07 and 09. Safe to re-run.
--
-- STAKING
--   staking_plans     plans an admin publishes (coin, APY, lock period, limits)
--   stakes            a user's stakes. Paid in crypto with a proof screenshot
--                     (same popup as Mining), so a new stake is 'pending' until an
--                     admin approves it in Admin → Staking.
--   admin_review_stake()        approve → active (lock starts now) / reject
--   process_staking_rewards()   pays every full day of rewards into the USD wallet
--                               and returns the stake when the lock ends
--                               (run from Admin → Staking, or daily with pg_cron)
--
-- SWAP
--   swap_assets       the coins users can swap between, with a USD price an admin
--                     keeps up to date (Admin → Swap → "Fetch market prices")
--   swap_settings     fee and how old a price may be before swaps are paused
--   swaps             history of every swap
--   swap_quote()      what the user would get (shown before they confirm)
--   swap_currency()   does the swap: the DATABASE works out the amount from the
--                     stored prices, takes it from one wallet and adds it to the
--                     other, in one step. The browser can't choose the rate.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Remove earlier versions of this file's functions ───────────────────────
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in (
              'admin_review_stake', 'process_staking_rewards', 'swap_quote', 'swap_currency', '_swap_price')
  loop execute format('drop function %s', r.sig); end loop;
end $$;


-- ════════════════════════════════ STAKING ═══════════════════════════════════
create table if not exists public.staking_plans (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  coin         text not null,                         -- e.g. ETH, SOL, USDT (what's being staked)
  apy_pct      numeric not null check (apy_pct >= 0), -- yearly %, paid daily in USD
  lock_days    int not null check (lock_days > 0),
  min_amount   numeric not null default 100,
  max_amount   numeric,
  description  text,
  is_active    boolean not null default true,
  featured     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.stakes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  plan_id        uuid references public.staking_plans(id) on delete set null,
  plan_name      text,
  coin           text,
  amount         numeric not null check (amount > 0),  -- USD
  apy_pct        numeric not null,
  lock_days      int not null,
  status         text not null default 'pending' check (status in ('pending', 'active', 'completed', 'rejected', 'cancelled')),
  started_at     timestamptz,
  ends_at        timestamptz,
  last_reward_at timestamptz,
  rewards_paid   numeric not null default 0,
  pay_coin       text,
  pay_network    text,
  pay_tx_hash    text,
  proof_url      text,
  payment_tx_id  uuid,
  review_note    text,
  created_at     timestamptz not null default now()
);
create index if not exists stakes_user_idx   on public.stakes(user_id, created_at desc);
create index if not exists stakes_status_idx on public.stakes(status);

alter table public.staking_plans enable row level security;
alter table public.stakes        enable row level security;

drop policy if exists "staking plans: anyone signed in reads active" on public.staking_plans;
create policy "staking plans: anyone signed in reads active" on public.staking_plans
  for select using (is_active or public.is_admin());
drop policy if exists "admin full access" on public.staking_plans;
create policy "admin full access" on public.staking_plans for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stakes: read own" on public.stakes;
create policy "stakes: read own" on public.stakes for select using (user_id = auth.uid());
drop policy if exists "stakes: create own" on public.stakes;
create policy "stakes: create own" on public.stakes for insert with check (user_id = auth.uid());
drop policy if exists "admin full access" on public.stakes;
create policy "admin full access" on public.stakes for all using (public.is_admin()) with check (public.is_admin());

-- A stake from the app always starts pending, with the plan's real terms
create or replace function public.guard_stake()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare p public.staking_plans%rowtype;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'UPDATE' then raise exception 'A stake can''t be changed once it''s submitted.'; end if;
  select * into p from public.staking_plans where id = new.plan_id and is_active;
  if not found then raise exception 'This staking plan isn''t available.'; end if;
  if new.amount < p.min_amount then raise exception 'The minimum for this plan is $%.', p.min_amount; end if;
  if p.max_amount is not null and new.amount > p.max_amount then raise exception 'The maximum for this plan is $%.', p.max_amount; end if;
  new.user_id := auth.uid();
  if to_regprocedure('public._assert_can_transact(uuid,boolean)') is not null then
    perform public._assert_can_transact(new.user_id, false);
  end if;
  new.status := 'pending';
  new.plan_name := p.name; new.coin := p.coin; new.apy_pct := p.apy_pct; new.lock_days := p.lock_days;
  new.started_at := null; new.ends_at := null; new.last_reward_at := null; new.rewards_paid := 0; new.review_note := null;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists guard_stake on public.stakes;
create trigger guard_stake before insert or update on public.stakes
  for each row execute function public.guard_stake();

-- Suspended / locked accounts can't stake (rule from file 09)
do $$ begin
  if to_regprocedure('public.guard_restricted_insert()') is not null then
    drop trigger if exists zz_guard_restricted on public.stakes;
    create trigger zz_guard_restricted before insert on public.stakes
      for each row execute function public.guard_restricted_insert('user_id');
  end if;
end $$;

-- Approve / reject
create function public.admin_review_stake(p_id uuid, p_approve boolean, p_note text default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare s public.stakes%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into s from public.stakes where id = p_id for update;
  if not found then raise exception 'Stake not found'; end if;
  if s.status <> 'pending' then raise exception 'This stake was already reviewed'; end if;

  update public.stakes
     set status = case when p_approve then 'active' else 'rejected' end,
         started_at = case when p_approve then now() end,
         ends_at = case when p_approve then now() + make_interval(days => s.lock_days) end,
         last_reward_at = case when p_approve then now() end,
         review_note = nullif(trim(p_note), '')
   where id = p_id returning * into s;

  if s.payment_tx_id is not null then
    update public.transactions set status = case when p_approve then 'completed' else 'rejected' end, updated_at = now()
     where id = s.payment_tx_id and status = 'pending';
  end if;

  perform public._admin_log(case when p_approve then 'approve_stake' else 'reject_stake' end, 'stakes', p_id::text,
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', s.status, 'note', s.review_note));
  perform public._notify_user(s.user_id,
    case when p_approve then format('Your %s stake is active', s.coin) else 'Your stake payment was declined' end,
    case when p_approve then format('$%s at %s%% APY for %s days. Rewards are paid into your wallet daily.', to_char(s.amount, 'FM999,999,990.00'), s.apy_pct, s.lock_days)
         else coalesce(nullif(trim(p_note), '') || ' ', '') || 'Contact support if you have questions.' end,
    case when p_approve then 'ti-stack-2' else 'ti-circle-x' end, '/staking');
  return row_to_json(s);
end $$;
grant execute on function public.admin_review_stake(uuid, boolean, text) to authenticated;

-- Daily rewards (USD) and returning the stake at the end of the lock
create function public.process_staking_rewards()
returns json
language plpgsql security definer set search_path = public
as $$
declare
  s record; v_days int; v_reward numeric; v_paid numeric := 0; v_done int := 0; v_n int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Admins only'; end if;
  for s in select * from public.stakes where status = 'active' for update loop
    -- whole days since the last payment, never past the end of the lock
    v_days := floor(extract(epoch from (least(now(), s.ends_at) - coalesce(s.last_reward_at, s.started_at))) / 86400);
    if v_days > 0 then
      v_reward := round(s.amount * s.apy_pct / 100 / 365 * v_days, 2);
      if v_reward > 0 then
        perform public._wallet_move(s.user_id, v_reward, 'USD', 'staking_reward',
          format('%s staking reward — %s day%s at %s%% APY', s.coin, v_days, case when v_days = 1 then '' else 's' end, s.apy_pct), true);
        v_paid := v_paid + v_reward;
      end if;
      update public.stakes set rewards_paid = rewards_paid + v_reward,
             last_reward_at = coalesce(last_reward_at, started_at) + make_interval(days => v_days)
       where id = s.id;
      v_n := v_n + 1;
    end if;
    if now() >= s.ends_at then
      perform public._wallet_move(s.user_id, s.amount, 'USD', 'staking_return', format('%s stake returned at the end of the lock', s.coin), true);
      update public.stakes set status = 'completed' where id = s.id;
      perform public._notify_user(s.user_id, format('Your %s stake has ended', s.coin),
        format('$%s has been returned to your wallet.', to_char(s.amount, 'FM999,999,990.00')), 'ti-stack-2', '/staking');
      v_done := v_done + 1;
    end if;
  end loop;
  return json_build_object('stakes_paid', v_n, 'rewards_paid', v_paid, 'completed', v_done);
end $$;
grant execute on function public.process_staking_rewards() to authenticated;

-- Starter plans (only when the table is empty)
insert into public.staking_plans (name, coin, apy_pct, lock_days, min_amount, max_amount, description, featured, sort_order)
select * from (values
  ('USDT Flexible',  'USDT', 6.5::numeric,  30,  100::numeric, 50000::numeric,  'Stable-coin staking with a short 30-day lock.', false, 1),
  ('ETH Validator',  'ETH',  8.2,           90,  250,          100000,          'Earn on Ethereum staking with a 90-day lock.', true,  2),
  ('SOL Growth',     'SOL',  11.0,          120, 250,          75000,           'Higher yield on Solana with a 120-day lock.',  false, 3),
  ('BTC Vault',      'BTC',  5.0,           180, 500,          250000,          'Long-term Bitcoin staking, 180-day lock.',     false, 4)
) v(name, coin, apy_pct, lock_days, min_amount, max_amount, description, featured, sort_order)
where not exists (select 1 from public.staking_plans);


-- ═════════════════════════════════ SWAP ═════════════════════════════════════
create table if not exists public.swap_assets (
  symbol      text primary key,                 -- USD, BTC, ETH, USDT …
  name        text not null,
  usd_price   numeric not null check (usd_price > 0),
  decimals    int not null default 8,           -- how many decimals amounts are kept to
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);
create table if not exists public.swap_settings (
  id                   int primary key default 1 check (id = 1),
  fee_pct              numeric not null default 0.5 check (fee_pct >= 0 and fee_pct < 20),
  max_price_age_mins   int not null default 60,   -- swaps pause if a price is older than this
  min_usd              numeric not null default 5,
  updated_at           timestamptz not null default now()
);
insert into public.swap_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.swaps (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  from_currency text not null,
  to_currency   text not null,
  from_amount   numeric not null,
  to_amount     numeric not null,
  rate          numeric not null,                -- 1 from = rate to (before the fee)
  fee_pct       numeric not null,
  usd_value     numeric not null,
  created_at    timestamptz not null default now()
);
create index if not exists swaps_user_idx on public.swaps(user_id, created_at desc);

alter table public.swap_assets   enable row level security;
alter table public.swap_settings enable row level security;
alter table public.swaps         enable row level security;
drop policy if exists "swap assets: signed-in read" on public.swap_assets;
create policy "swap assets: signed-in read" on public.swap_assets for select using (auth.uid() is not null);
drop policy if exists "swap settings: signed-in read" on public.swap_settings;
create policy "swap settings: signed-in read" on public.swap_settings for select using (auth.uid() is not null);
drop policy if exists "swaps: read own" on public.swaps;
create policy "swaps: read own" on public.swaps for select using (user_id = auth.uid());
do $$ declare t text; begin
  foreach t in array array['swap_assets', 'swap_settings', 'swaps'] loop
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format('create policy "admin full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
-- swaps rows are only ever written by swap_currency() (no insert policy for users)

-- Starter assets (prices are placeholders — refresh them in Admin → Swap)
insert into public.swap_assets (symbol, name, usd_price, decimals, sort_order) values
  ('USD',  'US Dollar', 1,     2, 0),
  ('USDT', 'Tether',    1,     2, 1),
  ('BTC',  'Bitcoin',   65000, 8, 2),
  ('ETH',  'Ethereum',  3200,  6, 3)
on conflict (symbol) do nothing;

-- Price of one unit in USD; raises if missing, inactive or stale
create function public._swap_price(p_symbol text, p_max_age int)
returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare a public.swap_assets%rowtype;
begin
  select * into a from public.swap_assets where symbol = upper(p_symbol);
  if not found or not a.is_active then raise exception '% isn''t available for swaps.', upper(p_symbol); end if;
  if a.symbol <> 'USD' and a.updated_at < now() - make_interval(mins => p_max_age) then
    raise exception 'Swaps for % are paused while we refresh its price. Please try again shortly.', a.symbol using hint = 'PRICE_STALE';
  end if;
  return a.usd_price;
end $$;
revoke all on function public._swap_price(text, int) from public, anon, authenticated;

create function public.swap_quote(p_from text, p_to text, p_amount numeric)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  cfg public.swap_settings%rowtype;
  pf numeric; pt numeric; dec int; v_usd numeric; v_out numeric;
begin
  select * into cfg from public.swap_settings where id = 1;
  if upper(p_from) = upper(p_to) then raise exception 'Choose two different currencies.'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Enter an amount.'; end if;
  pf := public._swap_price(p_from, cfg.max_price_age_mins);
  pt := public._swap_price(p_to,   cfg.max_price_age_mins);
  select decimals into dec from public.swap_assets where symbol = upper(p_to);
  v_usd := p_amount * pf;
  v_out := trunc(v_usd * (1 - cfg.fee_pct / 100) / pt, dec);
  return json_build_object('from', upper(p_from), 'to', upper(p_to), 'from_amount', p_amount, 'to_amount', v_out,
                           'rate', pf / pt, 'fee_pct', cfg.fee_pct, 'usd_value', round(v_usd, 2), 'min_usd', cfg.min_usd);
end $$;
grant execute on function public.swap_quote(text, text, numeric) to authenticated;

-- p_min_to_amount: the least the user agreed to receive (from the quote they saw).
-- If prices moved against them since, the swap is refused instead of filling worse.
create function public.swap_currency(p_from text, p_to text, p_amount numeric, p_min_to_amount numeric default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  q json; v_out numeric; v_from text := upper(p_from); v_to text := upper(p_to); v_bal numeric; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  -- Suspended / locked accounts can't swap (rules from file 09)
  if to_regprocedure('public._assert_can_transact(uuid,boolean)') is not null then
    perform public._assert_can_transact(auth.uid(), false);
  end if;
  q := public.swap_quote(v_from, v_to, p_amount);
  if (q ->> 'usd_value')::numeric < (q ->> 'min_usd')::numeric then
    raise exception 'The minimum swap is $%.', q ->> 'min_usd';
  end if;
  v_out := (q ->> 'to_amount')::numeric;
  if v_out <= 0 then raise exception 'That amount is too small to swap.'; end if;
  if p_min_to_amount is not null and v_out < p_min_to_amount then
    raise exception 'The price changed. You''d now get % %. Please review and try again.', v_out, v_to using hint = 'PRICE_MOVED';
  end if;

  select balance into v_bal from public.wallets where user_id = auth.uid() and currency = v_from for update;
  if coalesce(v_bal, 0) < p_amount then raise exception 'Not enough % in your wallet.', v_from; end if;

  -- One step: take, give, record (all or nothing).
  perform public._wallet_move(auth.uid(), -p_amount, v_from, 'swap_out', format('Swapped %s %s → %s %s', p_amount, v_from, v_out, v_to), true);
  perform public._wallet_move(auth.uid(),  v_out,    v_to,   'swap_in',  format('Swapped %s %s → %s %s', p_amount, v_from, v_out, v_to), true);
  insert into public.swaps (user_id, from_currency, to_currency, from_amount, to_amount, rate, fee_pct, usd_value)
  values (auth.uid(), v_from, v_to, p_amount, v_out, (q ->> 'rate')::numeric, (q ->> 'fee_pct')::numeric, (q ->> 'usd_value')::numeric)
  returning id into v_id;
  return json_build_object('id', v_id, 'from', v_from, 'to', v_to, 'from_amount', p_amount, 'to_amount', v_out);
end $$;
grant execute on function public.swap_currency(text, text, numeric, numeric) to authenticated;
