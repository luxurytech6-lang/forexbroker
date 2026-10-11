-- ════════════════════════════════════════════════════════════════════════════
-- admin_schema.sql — what the admin console (/admin) needs in the database
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Run order (each file is safe to re-run):
--   1. your main schema + cards schema
--   2. dashboard/payments_schema.sql
--   3. dashboard/real_estate_schema.sql
--   4. dashboard/mining_schema.sql
--   5. this file
--
-- How admin access works
--   Admins sign in at /admin/login with a normal Supabase Auth account.
--   They're an admin when that account's email has an active row in public.admins.
--   (admins.password_hash is not used — Supabase Auth handles passwords.)
--   Every change made in the console is written to public.admin_audit_log.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 1. Admin check (identical in every schema file) ────────────────────────
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

-- The signed-in admin's admins.id (used for audit entries)
create or replace function public.current_admin_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.admins
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and is_active
   limit 1;
$$;
grant execute on function public.current_admin_id() to authenticated;


-- ─── 2. Lock down admins + audit log ────────────────────────────────────────
-- admins holds password hashes, so nobody but an admin may read it.
alter table public.admins          enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "admins: read own row" on public.admins;
create policy "admins: read own row" on public.admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "admins: admins manage" on public.admins;
create policy "admins: admins manage" on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

-- The log is append-only: admins can read it and add their own entries, never edit or delete.
drop policy if exists "audit: admins read" on public.admin_audit_log;
create policy "audit: admins read" on public.admin_audit_log
  for select using (public.is_admin());
drop policy if exists "audit: admins write own" on public.admin_audit_log;
create policy "audit: admins write own" on public.admin_audit_log
  for insert with check (public.is_admin() and admin_id = public.current_admin_id());


-- ─── 3. Admin access to every app table ─────────────────────────────────────
-- One extra permissive policy per table. Existing user policies are untouched,
-- so the app works exactly as before. Missing tables are skipped.
-- Note: a policy only matters on tables with RLS enabled. Tables without RLS
-- are already open to every signed-in user — consider enabling it.
do $$
declare t text;
begin
  foreach t in array array[
    'users','wallets','transactions','payment_methods','user_settings','sessions','two_factor_methods',
    'notifications','notification_preferences','notification_delivery_settings','user_activity_feed',
    'subscription_plans','user_subscriptions','subscription_payment_requests','usage_metrics',
    'platform_crypto_wallets',
    'properties','property_investments','property_payouts',
    'card_products','card_orders','cards','card_transactions',
    'support_tickets','ticket_messages',
    'trader_profiles','trader_performance','trader_follows','copy_traders','copy_relationships','copy_trades',
    'hire_requests','hire_agreements',
    'marketplace_items','marketplace_subscriptions',
    'stocks','stock_quotes','stock_orders','portfolio_holdings','portfolio_snapshots','open_positions','broker_connections',
    'news_articles','market_events','ai_predictions','asset_forecasts',
    'mining_plans','mining_contracts','mining_payouts'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "admin full access" on public.%I', t);
      execute format('create policy "admin full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;


-- ─── 4. Wallet helper (identical in every schema file; not callable from the app) ─
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


-- ─── 5. Admin RPCs ──────────────────────────────────────────────────────────

-- Credit (positive) or debit (negative) a wallet
create or replace function public.admin_wallet_adjust(
  p_user_id uuid, p_amount numeric, p_currency text default 'USD',
  p_type text default 'adjustment', p_description text default 'Balance adjustment by admin', p_record boolean default true
) returns numeric
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public._wallet_move(p_user_id, p_amount, coalesce(p_currency, 'USD'), p_type, p_description, p_record);
end $$;
grant execute on function public.admin_wallet_adjust(uuid,numeric,text,text,text,boolean) to authenticated;

-- Approve / reject a pending deposit, withdrawal or other payment.
-- Deposits credit net_amount (amount after fee). Withdrawals debit on approval,
-- unless p_withdrawal_debited (money already taken at request), in which case
-- rejecting refunds instead.
create or replace function public.admin_review_transaction(p_tx_id uuid, p_approve boolean, p_withdrawal_debited boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
declare tx transactions%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into tx from transactions where id = p_tx_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if tx.status <> 'pending' then raise exception 'This transaction was already reviewed'; end if;

  if tx.type ilike '%deposit%' and p_approve then
    perform public._wallet_move(tx.user_id, abs(coalesce(tx.net_amount, tx.amount)), coalesce(tx.currency, 'USD'), 'deposit', null, false);
  elsif tx.type ilike '%withdraw%' then
    if p_approve and not p_withdrawal_debited then
      perform public._wallet_move(tx.user_id, -abs(tx.amount), coalesce(tx.currency, 'USD'), 'withdrawal', null, false);
    elsif not p_approve and p_withdrawal_debited then
      perform public._wallet_move(tx.user_id, abs(tx.amount), coalesce(tx.currency, 'USD'), 'refund', 'Withdrawal declined — refunded', true);
    end if;
  end if;

  update transactions
     set status = case when p_approve then 'completed' else 'rejected' end, updated_at = now()
   where id = p_tx_id;
end $$;
grant execute on function public.admin_review_transaction(uuid,boolean,boolean) to authenticated;

-- Approve / reject a plan payment and switch the user's subscription
create or replace function public.admin_review_subscription_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare r subscription_payment_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into r from subscription_payment_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'This request was already reviewed'; end if;

  if p_approve then
    if r.plan_id is null then raise exception 'This request has no plan'; end if;
    update user_subscriptions set status = 'cancelled', cancelled_at = now()
     where user_id = r.user_id and status = 'active';
    insert into user_subscriptions (user_id, plan_id, billing_cycle, status, current_period_start, current_period_end)
    values (r.user_id, r.plan_id, coalesce(r.billing_cycle, 'monthly'), 'active', now(),
            now() + case when r.billing_cycle = 'annual' then interval '1 year' else interval '1 month' end);
    update users set plan = coalesce(r.plan_name, (select name from subscription_plans where id = r.plan_id)), updated_at = now()
     where id = r.user_id;
  end if;

  update subscription_payment_requests
     set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now()
   where id = p_request_id;
end $$;
grant execute on function public.admin_review_subscription_request(uuid,boolean) to authenticated;


-- ─── 6. Add yourself as an admin ────────────────────────────────────────────
-- Use the email of the Supabase Auth account you'll sign in with at /admin/login.
-- insert into public.admins (email, full_name, is_active)
-- values ('you@example.com', 'Your Name', true)
-- on conflict (email) do update set is_active = true;
