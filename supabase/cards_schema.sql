-- ═══════════════════════════════════════════════════════════════════════════
-- Tradexflow · Cards
-- Tables, row-level security and RPCs used by src/dashboard/Cards.jsx.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Assumes: public.wallets (user_id, currency, balance) — fees come from the USD wallet.
--
-- IMPORTANT: never store a full card number (PAN) or CVV in these tables.
-- Keep only the last four digits. Full details belong with your card issuer.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Card products: price, monthly cap, physical or not ──────────────────────
-- Keep these in step with PRODUCTS at the top of Cards.jsx.
create table if not exists public.card_products (
  key            text primary key,
  name           text not null,
  price          numeric(10,2) not null default 0,
  monthly_cap    numeric(12,2) not null,
  physical       boolean not null,
  designs        text[] not null
);
insert into public.card_products (key, name, price, monthly_cap, physical, designs) values
  ('virtual',  'Virtual card',  0,    5000, false, array['virtual']),
  ('standard', 'Standard card', 10,  10000, true,  array['midnight','graphite']),
  ('gold',     'Gold metal',    49,  25000, true,  array['gold']),
  ('black',    'Black metal',   149, 50000, true,  array['black'])
on conflict (key) do update set
  name = excluded.name, price = excluded.price, monthly_cap = excluded.monthly_cap,
  physical = excluded.physical, designs = excluded.designs;

-- ── Orders ──────────────────────────────────────────────────────────────────
create table if not exists public.card_orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  product          text not null references public.card_products(key),
  design           text not null,
  name_on_card     text not null check (char_length(name_on_card) between 3 and 22),
  delivery         jsonb,                          -- null for virtual cards
  fee              numeric(10,2) not null default 0,
  status           text not null default 'pending'
                   check (status in ('pending','processing','shipped','delivered','cancelled')),
  tracking_number  text,
  card_id          uuid,                           -- set when the card is issued
  created_at       timestamptz not null default now()
);
create index if not exists card_orders_user_idx on public.card_orders(user_id);

-- ── Issued cards (last four digits only) ────────────────────────────────────
create table if not exists public.cards (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  order_id             uuid references public.card_orders(id),
  product              text not null references public.card_products(key),
  design               text not null,
  name_on_card         text not null,
  last4                char(4) not null check (last4 ~ '^[0-9]{4}$'),
  exp_month            int  not null check (exp_month between 1 and 12),
  exp_year             int  not null,
  status               text not null default 'active' check (status in ('active','frozen','blocked')),
  online_enabled       boolean not null default true,
  contactless_enabled  boolean not null default true,
  monthly_limit        numeric(12,2) not null,
  issuer_ref           text,                       -- the issuer's ID for this card
  created_at           timestamptz not null default now()
);
create index if not exists cards_user_idx on public.cards(user_id);

-- ── Card payments (written by your issuer webhook / admin, never the client) ─
create table if not exists public.card_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  card_id     uuid not null references public.cards(id) on delete cascade,
  merchant    text,
  category    text check (category in ('purchase','online','atm','fee','refund')),
  amount      numeric(12,2) not null check (amount >= 0),
  currency    text not null default 'USD',
  status      text not null default 'completed' check (status in ('pending','completed','declined','refunded')),
  created_at  timestamptz not null default now()
);
create index if not exists card_transactions_user_idx on public.card_transactions(user_id, created_at desc);

-- ── Row-level security: users read only their own rows ──────────────────────
alter table public.card_products     enable row level security;
alter table public.card_orders       enable row level security;
alter table public.cards             enable row level security;
alter table public.card_transactions enable row level security;

drop policy if exists "read card products" on public.card_products;
create policy "read card products" on public.card_products for select to authenticated using (true);

drop policy if exists "read own card orders" on public.card_orders;
create policy "read own card orders" on public.card_orders for select to authenticated using (user_id = auth.uid());

drop policy if exists "read own cards" on public.cards;
create policy "read own cards" on public.cards for select to authenticated using (user_id = auth.uid());

drop policy if exists "read own card transactions" on public.card_transactions;
create policy "read own card transactions" on public.card_transactions for select to authenticated using (user_id = auth.uid());

-- Fallback only: lets the page file a PENDING, unpaid order when order_card()
-- isn't installed. Drop this policy once order_card() is in place.
drop policy if exists "request own card order" on public.card_orders;
create policy "request own card order" on public.card_orders
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

-- No update/delete policies: users change cards only through the RPCs below.

-- ── order_card(): validate, charge the fee from the wallet, record the order ─
create or replace function public.order_card(
  p_product text, p_design text, p_name_on_card text, p_delivery jsonb default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_prod    public.card_products%rowtype;
  v_name    text := upper(trim(p_name_on_card));
  v_balance numeric;
  v_live    int;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select * into v_prod from public.card_products where key = p_product;
  if not found then raise exception 'Unknown card type'; end if;
  if not (p_design = any (v_prod.designs)) then raise exception 'That colour isn''t available for this card'; end if;
  if v_name !~ '^[A-Z][A-Z '' -]{2,21}$' then raise exception 'Enter a valid name for the card'; end if;

  if v_prod.physical then
    if p_delivery is null
       or coalesce(p_delivery->>'line1','') = '' or coalesce(p_delivery->>'city','') = ''
       or coalesce(p_delivery->>'postal_code','') = '' or coalesce(p_delivery->>'country','') = ''
       or coalesce(p_delivery->>'phone','') = '' then
      raise exception 'Enter a full delivery address';
    end if;
  end if;

  -- At most 5 cards that are live or on the way
  select (select count(*) from public.cards where user_id = v_uid and status <> 'blocked')
       + (select count(*) from public.card_orders where user_id = v_uid and status in ('pending','processing','shipped'))
    into v_live;
  if v_live >= 5 then raise exception 'You can have up to 5 cards at a time'; end if;

  if v_prod.price > 0 then
    select balance into v_balance from public.wallets
     where user_id = v_uid and currency = 'USD' for update;
    if v_balance is null then raise exception 'No USD wallet found'; end if;
    if v_balance < v_prod.price then raise exception 'Insufficient wallet balance'; end if;
    update public.wallets set balance = balance - v_prod.price where user_id = v_uid and currency = 'USD';
  end if;

  insert into public.card_orders (user_id, product, design, name_on_card, delivery, fee, status)
  values (v_uid, p_product, p_design, v_name, case when v_prod.physical then p_delivery else null end,
          v_prod.price, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

-- ── set_card_controls(): freeze, online, contactless, monthly limit ─────────
-- Pass null for anything you don't want to change.
create or replace function public.set_card_controls(
  p_card_id uuid, p_frozen boolean default null, p_online boolean default null,
  p_contactless boolean default null, p_monthly_limit numeric default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_card public.cards%rowtype;
  v_cap  numeric;
begin
  select * into v_card from public.cards where id = p_card_id and user_id = auth.uid() for update;
  if not found then raise exception 'Card not found'; end if;
  if v_card.status = 'blocked' then raise exception 'This card is blocked'; end if;

  if p_monthly_limit is not null then
    select monthly_cap into v_cap from public.card_products where key = v_card.product;
    if p_monthly_limit < 50 or p_monthly_limit > v_cap then
      raise exception 'Monthly limit must be between 50 and %', v_cap;
    end if;
  end if;

  update public.cards set
    status              = case when p_frozen is null then status when p_frozen then 'frozen' else 'active' end,
    online_enabled      = coalesce(p_online, online_enabled),
    contactless_enabled = coalesce(p_contactless, contactless_enabled),
    monthly_limit       = coalesce(p_monthly_limit, monthly_limit)
  where id = p_card_id;
  -- TODO: also call your card issuer's API here (or from a trigger / edge function)
  -- so the freeze or limit takes effect on the issuer's side.
end;
$$;

-- ── report_card_lost(): block a card permanently ────────────────────────────
create or replace function public.report_card_lost(p_card_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.cards set status = 'blocked'
   where id = p_card_id and user_id = auth.uid() and status <> 'blocked';
  if not found then raise exception 'Card not found or already blocked'; end if;
  -- TODO: tell the card issuer to block the card immediately.
end;
$$;

revoke all on function public.order_card(text, text, text, jsonb)                          from public;
revoke all on function public.set_card_controls(uuid, boolean, boolean, boolean, numeric)  from public;
revoke all on function public.report_card_lost(uuid)                                        from public;
grant execute on function public.order_card(text, text, text, jsonb)                         to authenticated;
grant execute on function public.set_card_controls(uuid, boolean, boolean, boolean, numeric) to authenticated;
grant execute on function public.report_card_lost(uuid)                                       to authenticated;

-- ── Admin: issue a card for an order (run from the SQL editor or an admin tool) ─
-- Fill in the last four digits and expiry your issuer gives you.
--
-- with o as (select * from public.card_orders where id = '<order id>')
-- insert into public.cards (user_id, order_id, product, design, name_on_card, last4, exp_month, exp_year, monthly_limit)
-- select user_id, id, product, design, name_on_card, '4821', 10, 2029,
--        (select monthly_cap from public.card_products p where p.key = o.product)
--   from o;
-- update public.card_orders set status = 'delivered' where id = '<order id>';   -- or 'processing' / 'shipped' with tracking_number
