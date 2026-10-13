-- ════════════════════════════════════════════════════════════════════════════
-- 12_broker_trades_schema.sql — record broker trades for a user, correct P/L
-- Run in the Supabase SQL editor AFTER 06 (trading), 07 (admin) and 09. Safe to re-run.
--
-- For trades executed at your broker / liquidity provider:
--   • admin_record_trade        books a trade on a user's terminal from the
--                               broker's fill: ticket number, prices and P/L.
--                               A closed trade pays its P/L into the wallet.
--   • admin_update_trade_pnl    corrects the P/L (and prices) of a trade to match
--                               the broker statement. A reason is required. On a
--                               closed trade only the difference is posted to the
--                               wallet, as its own transaction.
--   • admin_close_trade         closes an open trade at the broker's close price
--                               and pays the P/L into the wallet.
-- Every change is written to the audit log (before → after, with the reason)
-- and the user gets a notification.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Columns ─────────────────────────────────────────────────────────────
alter table public.open_positions add column if not exists source       text not null default 'terminal';  -- terminal | broker
alter table public.open_positions add column if not exists broker_name  text;
alter table public.open_positions add column if not exists broker_ref   text;                              -- broker ticket / order id
alter table public.open_positions add column if not exists pnl_settled  numeric not null default 0;        -- P/L already paid into the wallet
alter table public.open_positions add column if not exists entered_by   uuid references public.admins(id) on delete set null;
alter table public.open_positions add column if not exists admin_note   text;

-- A broker ticket can only be booked once
create unique index if not exists open_positions_broker_ref_uniq
  on public.open_positions (lower(coalesce(broker_name, '')), lower(broker_ref)) where broker_ref is not null;

-- Users can't change the broker fields or what's been settled
create or replace function public.guard_position_broker_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.source := 'terminal'; new.broker_name := null; new.broker_ref := null;
    new.pnl_settled := 0; new.entered_by := null; new.admin_note := null;
  else
    new.source := old.source; new.broker_name := old.broker_name; new.broker_ref := old.broker_ref;
    new.pnl_settled := old.pnl_settled; new.entered_by := old.entered_by; new.admin_note := old.admin_note;
    -- Broker-booked trades are managed by the desk only
    if old.source = 'broker' and (new.profit_loss is distinct from old.profit_loss
        or new.status is distinct from old.status or new.close_price is distinct from old.close_price) then
      raise exception 'This trade is managed by our trading desk. Contact support to change it.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists open_positions_guard_broker on public.open_positions;
create trigger open_positions_guard_broker before insert or update on public.open_positions
  for each row execute function public.guard_position_broker_fields();


-- ─── 2. Remove earlier versions of these functions (return types may differ) ─
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('admin_record_trade', 'admin_update_trade_pnl', 'admin_close_trade', '_settle_trade_pnl', '_money')
  loop execute format('drop function %s', r.sig); end loop;
end $$;


-- ─── 3. Helpers (internal) ──────────────────────────────────────────────────
-- +$1,234.50 / -$80.00
create function public._money(p numeric)
returns text language sql immutable as $$
  select case when coalesce(p, 0) < 0 then '-$' else '+$' end || to_char(abs(coalesce(p, 0)), 'FM999,999,999,990.00');
$$;

-- Settle P/L into the wallet
-- Posts (target − already settled) to the wallet and records it; returns the amount posted.
create function public._settle_trade_pnl(p_pos public.open_positions, p_target numeric, p_what text)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare v_diff numeric := round(coalesce(p_target, 0) - coalesce(p_pos.pnl_settled, 0), 2);
begin
  if v_diff = 0 then return 0; end if;
  perform public._wallet_move(
    p_pos.user_id, v_diff, 'USD',
    case when p_what = 'close' then 'trade_pnl' else 'trade_pnl_adjustment' end,
    format('%s %s %s lots%s — %s', p_pos.symbol, upper(p_pos.trade_type), p_pos.lots,
           case when p_pos.broker_ref is not null then ' (ticket ' || p_pos.broker_ref || ')' else '' end,
           case when p_what = 'close' then 'trade closed' else 'P/L correction' end),
    true);
  update public.open_positions set pnl_settled = round(coalesce(p_target, 0), 2) where id = p_pos.id;
  return v_diff;
end $$;
revoke all on function public._settle_trade_pnl(public.open_positions, numeric, text) from public, anon, authenticated;


-- ─── 4. Record a broker trade for a user ────────────────────────────────────
create function public.admin_record_trade(
  p_user_id       uuid,
  p_symbol        text,
  p_side          text,
  p_lots          numeric,
  p_open_price    numeric,
  p_profit_loss   numeric,
  p_broker_ref    text,
  p_broker_name   text default null,
  p_status        text default 'open',          -- open | closed
  p_current_price numeric default null,
  p_close_price   numeric default null,
  p_opened_at     timestamptz default null,
  p_closed_at     timestamptz default null,
  p_stop_loss     numeric default null,
  p_take_profit   numeric default null,
  p_note          text default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_pos  public.open_positions%rowtype;
  v_paid numeric := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.users where id = p_user_id) then raise exception 'User not found'; end if;
  if nullif(trim(p_broker_ref), '') is null then raise exception 'Enter the broker ticket number for this trade.'; end if;
  if upper(p_side) not in ('BUY', 'SELL') then raise exception 'Side must be BUY or SELL'; end if;
  if coalesce(p_lots, 0) <= 0 then raise exception 'Lots must be more than 0'; end if;
  if coalesce(p_open_price, 0) <= 0 then raise exception 'Enter the open price'; end if;
  if p_status not in ('open', 'closed') then raise exception 'Status must be open or closed'; end if;
  if p_status = 'closed' and coalesce(p_close_price, 0) <= 0 then raise exception 'Enter the close price'; end if;
  if exists (select 1 from public.open_positions
              where broker_ref is not null and lower(broker_ref) = lower(trim(p_broker_ref))
                and lower(coalesce(broker_name, '')) = lower(coalesce(nullif(trim(p_broker_name), ''), ''))) then
    raise exception 'Ticket % has already been recorded.', trim(p_broker_ref);
  end if;

  insert into public.open_positions (
    user_id, symbol, trade_type, lots, open_price, current_price, close_price, stop_loss, take_profit,
    profit_loss, status, order_type, approval_status, opened_at, closed_at,
    source, broker_name, broker_ref, entered_by, admin_note
  ) values (
    p_user_id, upper(trim(p_symbol)), upper(p_side), p_lots, p_open_price,
    coalesce(case when p_status = 'closed' then p_close_price end, p_current_price, p_open_price),
    case when p_status = 'closed' then p_close_price end, p_stop_loss, p_take_profit,
    round(coalesce(p_profit_loss, 0), 2), p_status, 'market', 'approved',
    coalesce(p_opened_at, now()), case when p_status = 'closed' then coalesce(p_closed_at, now()) end,
    'broker', nullif(trim(p_broker_name), ''), trim(p_broker_ref), public.current_admin_id(), nullif(trim(p_note), '')
  ) returning * into v_pos;

  if p_status = 'closed' then
    v_paid := public._settle_trade_pnl(v_pos, v_pos.profit_loss, 'close');
  end if;

  perform public._admin_log('record_trade', 'open_positions', v_pos.id::text, null,
    jsonb_build_object('user_id', p_user_id, 'symbol', v_pos.symbol, 'side', v_pos.trade_type, 'lots', v_pos.lots,
                       'open_price', v_pos.open_price, 'close_price', v_pos.close_price, 'profit_loss', v_pos.profit_loss,
                       'status', v_pos.status, 'broker', v_pos.broker_name, 'ticket', v_pos.broker_ref,
                       'paid_to_wallet', v_paid, 'note', v_pos.admin_note));

  perform public._notify_user(p_user_id,
    case when p_status = 'closed' then format('%s trade closed: %s', v_pos.symbol, public._money(v_pos.profit_loss))
         else format('New %s %s position opened', v_pos.trade_type, v_pos.symbol) end,
    format('%s %s lots at %s%s.', v_pos.trade_type, v_pos.lots, v_pos.open_price,
           case when p_status = 'closed' then format(', closed at %s. The result has been added to your wallet', v_pos.close_price) else '' end),
    'ti-chart-candle', '/terminal');

  return json_build_object('id', v_pos.id, 'status', v_pos.status, 'profit_loss', v_pos.profit_loss, 'paid_to_wallet', v_paid);
end $$;
grant execute on function public.admin_record_trade(uuid, text, text, numeric, numeric, numeric, text, text, text, numeric, numeric, timestamptz, timestamptz, numeric, numeric, text) to authenticated;


-- ─── 5. Correct a trade's P/L ───────────────────────────────────────────────
create function public.admin_update_trade_pnl(
  p_position_id   bigint,
  p_profit_loss   numeric,
  p_reason        text,
  p_current_price numeric default null,
  p_close_price   numeric default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_old  public.open_positions%rowtype;
  v_new  public.open_positions%rowtype;
  v_paid numeric := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Give a reason for the change (e.g. the broker statement reference).'; end if;

  select * into v_old from public.open_positions where id = p_position_id for update;
  if not found then raise exception 'Trade not found'; end if;
  if v_old.status not in ('open', 'closed') then raise exception 'This trade was % — there''s no P/L to change.', v_old.status; end if;

  update public.open_positions
     set profit_loss   = round(coalesce(p_profit_loss, 0), 2),
         current_price = case when v_old.status = 'open' then coalesce(p_current_price, current_price) else current_price end,
         close_price   = case when v_old.status = 'closed' then coalesce(p_close_price, close_price) else close_price end
   where id = p_position_id
  returning * into v_new;

  -- A closed trade has already been paid out: post only the difference
  if v_new.status = 'closed' then
    v_paid := public._settle_trade_pnl(v_new, v_new.profit_loss, 'adjust');
  end if;

  perform public._admin_log('update_trade_pnl', 'open_positions', p_position_id::text,
    jsonb_build_object('profit_loss', v_old.profit_loss, 'current_price', v_old.current_price, 'close_price', v_old.close_price, 'pnl_settled', v_old.pnl_settled),
    jsonb_build_object('profit_loss', v_new.profit_loss, 'current_price', v_new.current_price, 'close_price', v_new.close_price,
                       'wallet_adjustment', v_paid, 'reason', trim(p_reason)));

  if v_new.profit_loss is distinct from v_old.profit_loss then
    perform public._notify_user(v_new.user_id,
      format('%s trade result updated', v_new.symbol),
      format('Your %s %s trade%s now shows %s (was %s).%s',
             v_new.trade_type, v_new.symbol,
             case when v_new.broker_ref is not null then ' (ticket ' || v_new.broker_ref || ')' else '' end,
             public._money(v_new.profit_loss), public._money(v_old.profit_loss),
             case when v_paid <> 0 then format(' Your wallet was adjusted by %s.', public._money(v_paid)) else '' end),
      'ti-chart-candle', '/terminal');
  end if;

  return json_build_object('id', v_new.id, 'profit_loss', v_new.profit_loss, 'wallet_adjustment', v_paid);
end $$;
grant execute on function public.admin_update_trade_pnl(bigint, numeric, text, numeric, numeric) to authenticated;


-- ─── 6. Close an open trade ─────────────────────────────────────────────────
create function public.admin_close_trade(
  p_position_id bigint,
  p_close_price numeric,
  p_profit_loss numeric,
  p_pay         boolean default true,
  p_note        text default null
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_old  public.open_positions%rowtype;
  v_new  public.open_positions%rowtype;
  v_paid numeric := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_old from public.open_positions where id = p_position_id for update;
  if not found then raise exception 'Trade not found'; end if;
  if v_old.status <> 'open' then raise exception 'This trade is already %', v_old.status; end if;
  if coalesce(p_close_price, 0) <= 0 then raise exception 'Enter the close price'; end if;

  update public.open_positions
     set status = 'closed', close_price = p_close_price, current_price = p_close_price,
         profit_loss = round(coalesce(p_profit_loss, 0), 2), closed_at = now(),
         admin_note = coalesce(nullif(trim(p_note), ''), admin_note)
   where id = p_position_id
  returning * into v_new;

  if p_pay then
    v_paid := public._settle_trade_pnl(v_new, v_new.profit_loss, 'close');
  else
    -- Not paid out: mark it settled so a later correction only posts the difference
    update public.open_positions set pnl_settled = v_new.profit_loss where id = p_position_id;
  end if;

  perform public._admin_log('close_trade', 'open_positions', p_position_id::text,
    jsonb_build_object('status', v_old.status, 'profit_loss', v_old.profit_loss),
    jsonb_build_object('status', 'closed', 'close_price', p_close_price, 'profit_loss', v_new.profit_loss,
                       'paid_to_wallet', v_paid, 'note', nullif(trim(p_note), '')));

  perform public._notify_user(v_new.user_id,
    format('%s trade closed: %s', v_new.symbol, public._money(v_new.profit_loss)),
    format('%s %s lots closed at %s.%s', v_new.trade_type, v_new.lots, p_close_price,
           case when v_paid <> 0 then ' The result has been added to your wallet.' else '' end),
    'ti-chart-candle', '/terminal');

  return json_build_object('id', v_new.id, 'profit_loss', v_new.profit_loss, 'paid_to_wallet', v_paid);
end $$;
grant execute on function public.admin_close_trade(bigint, numeric, numeric, boolean, text) to authenticated;
