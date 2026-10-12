-- ============================================================
-- Supabase SQL Schema
-- Generated from table_scema.txt
-- Order respects foreign-key dependencies (parents before children)
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- LEVEL 0: Independent base tables
-- ============================================================

create table admins (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  password_hash   text,
  full_name       text,
  is_active       boolean not null default true,
  last_login      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table users (
  id              uuid primary key default gen_random_uuid(),
  email           varchar not null unique,
  password_hash   text not null,
  first_name      varchar not null,
  last_name       varchar not null,
  handle          varchar unique,
  bio             text,
  location        varchar,
  website         varchar,
  timezone        varchar,
  phone           varchar,
  avatar_url      text,
  plan            varchar not null default 'free',
  is_verified     boolean not null default false,
  is_public       boolean not null default true,
  trading_goal    varchar,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  country_code    char(2),
  country_name    varchar,
  currency        char(3),
  dial_code       varchar,
  otp_code        varchar,
  otp_expires_at  timestamptz,
  otp_verified    boolean not null default false,
  status          text not null default 'active'
);

create table stocks (
  symbol      text primary key,
  name        text not null,
  exchange    text not null,
  sector      text,
  currency    text not null,
  color_hex   text not null,
  initials    text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table subscription_plans (
  id                  integer generated always as identity primary key,
  name                varchar not null unique,
  monthly_price       numeric not null,
  annual_price        numeric not null,
  max_copy_traders    integer not null,
  max_allocation      numeric,
  max_alerts          integer not null,
  max_watchlist       integer not null,
  api_calls_per_day   integer not null,
  features            jsonb not null default '{}'
);

create table platform_crypto_wallets (
  id          integer generated always as identity primary key,
  symbol      varchar not null unique,
  name        varchar not null,
  network     varchar not null,
  address     text not null,
  icon        varchar not null,
  color       varchar not null,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table ai_predictions (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  source            varchar,
  badge_label       varchar,
  probability_pct   numeric not null,
  color_hex         varchar,
  factors           jsonb not null default '{}',
  created_at        timestamptz not null default now()
);

create table asset_forecasts (
  id              uuid primary key default gen_random_uuid(),
  asset           varchar not null,
  period          varchar not null,
  category        varchar not null,
  title           text not null,
  range_low       numeric,
  range_high      numeric,
  bullish_pct     numeric,
  confidence_pct  numeric,
  source          varchar,
  color_hex       varchar,
  created_at      timestamptz not null default now()
);

create table market_events (
  id              uuid primary key default gen_random_uuid(),
  title           varchar not null,
  description     text,
  event_time      timestamptz not null,
  impact_level    integer not null,
  badge_label     varchar,
  badge_type      varchar,
  affected_assets text[],
  source          varchar,
  forecast_value  varchar,
  previous_value  varchar,
  actual_value    varchar,
  created_at      timestamptz not null default now()
);

create table news_articles (
  id                uuid primary key default gen_random_uuid(),
  category          varchar not null,
  tab               varchar not null,
  title             text not null,
  body              text,
  source            varchar,
  impact_level      varchar,
  badge_label       varchar,
  badge_type        varchar,
  published_at      timestamptz not null,
  markets_affected  text[]
);

create table marketplace_items (
  id                uuid primary key default gen_random_uuid(),
  slug              varchar not null unique,
  type              varchar not null,
  name              varchar not null,
  tag               varchar,
  description       text,
  price_monthly     numeric not null,
  badge_label       varchar,
  badge_type        varchar,
  icon_class        varchar,
  color_hex         varchar,
  delivery_method   varchar,
  markets           text[],
  roi_12m_pct       numeric,
  win_rate_pct      numeric,
  total_trades      integer,
  accuracy_pct      numeric,
  subscriber_count  integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- LEVEL 1: Depend on users / stocks / admins / marketplace_items
-- ============================================================

create table admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid not null references admins(id) on delete cascade,
  action        text not null,
  target_table  text not null,
  target_id     text not null,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create table api_keys (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  key_hash          text not null unique,
  label             varchar,
  last_used_at      timestamptz,
  calls_today       integer not null default 0,
  calls_this_month  integer not null default 0,
  avg_latency_ms    integer,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  revoked_at        timestamptz
);

create table broker_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  broker_id         varchar not null,
  broker_name       varchar not null,
  server_name       varchar not null,
  platform          varchar not null,
  account_type      varchar not null,
  login_ref         varchar,
  balance           numeric not null default 0,
  equity            numeric not null default 0,
  leverage          varchar,
  currency          varchar not null,
  is_active         boolean not null default true,
  connected_at      timestamptz not null default now(),
  disconnected_at   timestamptz
);

create table connected_apps (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  app_name          varchar not null,
  is_connected      boolean not null default false,
  access_token      text,
  metadata          jsonb not null default '{}',
  connected_at      timestamptz,
  disconnected_at   timestamptz,
  unique (user_id, app_name)
);

create table copy_traders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  bio           text,
  win_rate      numeric,
  total_trades  integer,
  followers     integer default 0,
  status        text,
  created_at    timestamptz default now()
);

create table drawing_objects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  symbol      varchar not null,
  timeframe   varchar not null,
  type        varchar not null,
  x1          numeric,
  y1          numeric,
  x2          numeric,
  y2          numeric,
  label       text,
  style_json  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table hire_requests (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references users(id) on delete cascade,
  capital_amount      numeric not null,
  currency            varchar not null,
  specialty           varchar not null,
  risk_appetite       varchar not null,
  fee_preference      varchar not null,
  max_monthly_budget  varchar,
  notes               text,
  status              varchar not null default 'pending',
  created_at          timestamptz not null default now()
);

create table notification_delivery_settings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references users(id) on delete cascade,
  quiet_hours_enabled   boolean not null default false,
  quiet_start           time not null default '22:00',
  quiet_end             time not null default '08:00',
  sound_alerts          boolean not null default true,
  digest_frequency      varchar not null default 'daily',
  language              varchar not null default 'en'
);

create table notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  category          varchar not null,
  is_enabled        boolean not null default true,
  channel_email     boolean not null default true,
  channel_push      boolean not null default true,
  channel_telegram  boolean not null default false,
  unique (user_id, category)
);

create table notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  category        varchar not null,
  title           varchar not null,
  description     text,
  icon_class      varchar,
  icon_bg_css     varchar,
  icon_color_css  varchar,
  dot_color_css   varchar,
  is_read         boolean not null default false,
  is_dismissed    boolean not null default false,
  tags            jsonb not null default '[]',
  action_url      text,
  created_at      timestamptz not null default now()
);

create table password_reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        varchar not null,
  label       varchar,
  details     jsonb not null default '{}',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table performance_bars (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  period_label  varchar not null,
  period_start  date not null,
  height_pct    numeric not null,
  is_negative   boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, period_start)
);

create table portfolio_holdings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  symbol      text not null references stocks(symbol),
  quantity    numeric not null,
  avg_cost    numeric not null,
  updated_at  timestamptz not null default now(),
  unique (user_id, symbol)
);

create table portfolio_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  total_value         numeric not null,
  invested            numeric not null,
  cash                numeric not null,
  total_pnl           numeric not null,
  total_pnl_pct       numeric not null,
  daily_pnl           numeric not null,
  open_positions      integer not null,
  win_rate_pct        numeric not null,
  alloc_crypto_pct    numeric not null,
  alloc_forex_pct     numeric not null,
  alloc_stocks_pct    numeric not null,
  alloc_cash_pct      numeric not null,
  snapped_at          timestamptz not null default now()
);

create table portfolio_watchlist (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  symbol          varchar not null,
  name            varchar,
  position_order  integer not null,
  added_at        timestamptz not null default now(),
  unique (user_id, symbol)
);

create table price_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  symbol        varchar not null,
  condition     varchar not null,
  target_price  numeric not null,
  is_active     boolean not null default true,
  triggered_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  token_hash      text not null unique,
  device          varchar,
  ip_address      inet,
  location        varchar,
  user_agent      text,
  is_current      boolean not null default false,
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now(),
  expires_at      timestamptz not null
);

create table stock_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  symbol        text not null references stocks(symbol),
  side          text not null,
  order_type    text not null,
  quantity      numeric not null,
  limit_price   numeric,
  status        text not null default 'pending',
  filled_price  numeric,
  created_at    timestamptz not null default now()
);

create table stock_quotes (
  stock_symbol    text primary key references stocks(symbol),
  current_price   numeric not null,
  prev_close      numeric not null,
  day_open        numeric,
  day_high        numeric,
  day_low         numeric,
  volume          bigint,
  market_cap      numeric,
  pe_ratio        numeric,
  week52_high     numeric,
  week52_low      numeric,
  sparkline       jsonb not null default '[]',
  updated_at      timestamptz not null default now()
);

create table support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  ticket_ref    varchar not null unique,
  subject       varchar not null,
  category      varchar not null,
  priority      varchar not null,
  status        varchar not null default 'open',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create table trader_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references users(id) on delete cascade,
  handle          varchar not null unique,
  display_name    varchar not null,
  market          varchar not null,
  risk_level      varchar not null,
  strategy_desc   text,
  min_capital     numeric,
  fee_structure   varchar,
  fee_type        varchar,
  is_verified     boolean not null default false,
  is_active       boolean not null default true,
  years_active    integer not null default 0,
  total_copiers   integer not null default 0,
  total_clients   integer not null default 0,
  badge_label     varchar,
  badge_type      varchar,
  color_hex       varchar,
  initials        varchar,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  country         text,
  bio             text,
  strategy        text,
  verified        boolean,
  status          text
);

create table two_factor_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  method      varchar not null,
  is_enabled  boolean not null default false,
  secret      text,
  phone       varchar,
  created_at  timestamptz not null default now(),
  unique (user_id, method)
);

create table usage_metrics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  period_start    date not null,
  alerts_used     integer not null default 0,
  watchlist_used  integer not null default 0,
  signal_saves    integer not null default 0,
  api_calls       integer not null default 0,
  unique (user_id, period_start)
);

create table user_activity_feed (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  activity_type   varchar not null,
  title           text not null,
  icon_class      varchar,
  icon_bg_css     varchar,
  icon_color_css  varchar,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create table user_followers (
  follower_id   uuid not null references users(id) on delete cascade,
  following_id  uuid not null references users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table user_settings (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references users(id) on delete cascade,
  theme                   varchar not null default 'dark',
  accent_color            varchar not null default '#6366f1',
  layout_density          varchar not null default 'comfortable',
  chart_type              varchar not null default 'candlestick',
  show_volume             boolean not null default true,
  show_extended_hours     boolean not null default false,
  show_grid_lines         boolean not null default true,
  profile_public          boolean not null default true,
  show_watchlist          boolean not null default true,
  show_activity           boolean not null default true,
  show_followed_traders   boolean not null default true,
  appear_in_search        boolean not null default true,
  usage_analytics         boolean not null default true,
  personalised_feed       boolean not null default true,
  marketing_emails        boolean not null default false,
  updated_at              timestamptz not null default now(),
  language                text
);

create table wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  currency    varchar not null,
  balance     numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (user_id, currency)
);

create table watchlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  symbol      text not null references stocks(symbol),
  created_at  timestamptz not null default now(),
  unique (user_id, symbol)
);

create table watchlists (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  symbol          varchar not null,
  position_order  integer not null,
  added_at        timestamptz not null default now(),
  unique (user_id, symbol)
);

create table marketplace_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  item_id       uuid not null references marketplace_items(id) on delete cascade,
  status        varchar not null default 'active',
  pnl_30d       numeric not null default 0,
  renews_at     timestamptz,
  started_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  item_type     text,
  unique (user_id, item_id)
);

create table user_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id) on delete cascade,
  plan_id                 integer not null references subscription_plans(id),
  billing_cycle           varchar not null,
  status                  varchar not null default 'active',
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- LEVEL 2: Depend on trader_profiles / wallets / payment_methods /
--          support_tickets / broker_connections / hire_requests
-- ============================================================

create table copy_relationships (
  id                  uuid primary key default gen_random_uuid(),
  copier_id           uuid not null references users(id) on delete cascade,
  trader_id           uuid not null references trader_profiles(id) on delete cascade,
  allocated_amount    numeric not null,
  currency            varchar not null,
  copy_ratio          varchar not null,
  stop_loss_pct       numeric,
  status              varchar not null default 'active',
  realised_gain       numeric not null default 0,
  started_at          timestamptz not null default now(),
  paused_at           timestamptz,
  stopped_at          timestamptz,
  unique (copier_id, trader_id)
);

create table hire_agreements (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid references hire_requests(id) on delete set null,
  client_id         uuid not null references users(id) on delete cascade,
  trader_id         uuid not null references trader_profiles(id) on delete cascade,
  capital_amount    numeric not null,
  currency          varchar not null,
  duration_months   integer,
  fee_structure     varchar,
  status            varchar not null default 'active',
  total_return      numeric not null default 0,
  fees_paid         numeric not null default 0,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz
);

create table trader_follows (
  user_id     uuid not null references users(id) on delete cascade,
  trader_id   uuid not null references trader_profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, trader_id)
);

create table trader_performance (
  id                 uuid primary key default gen_random_uuid(),
  trader_id          uuid not null references trader_profiles(id) on delete cascade,
  period             varchar not null,
  roi_pct            numeric not null,
  win_rate_pct       numeric not null,
  max_drawdown_pct   numeric not null,
  total_trades       integer not null,
  sparkline          jsonb,
  recorded_at        date not null,
  unique (trader_id, period, recorded_at)
);

create table transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  wallet_id           uuid references wallets(id) on delete set null,
  type                varchar not null,
  amount              numeric not null,
  currency            varchar not null,
  fee                 numeric not null default 0,
  net_amount          numeric not null,
  payment_method_id   uuid references payment_methods(id) on delete set null,
  status              varchar not null default 'pending',
  reference           varchar,
  description         text,
  invoice_number      varchar unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  sender_id   uuid references users(id) on delete set null,
  is_agent    boolean not null default false,
  body        text not null,
  attachments jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

create table open_positions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references users(id) on delete cascade,
  broker_conn_id  uuid references broker_connections(id) on delete set null,
  symbol          varchar not null,
  trade_type      varchar not null,
  lots            numeric not null,
  open_price      numeric not null,
  current_price   numeric not null,
  stop_loss       numeric,
  take_profit     numeric,
  profit_loss     numeric not null default 0,
  pips            numeric not null default 0,
  status          varchar not null default 'open',
  order_type      varchar not null,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  close_price     numeric
);

-- ============================================================
-- LEVEL 3: Depend on copy_relationships
-- ============================================================

create table copy_trades (
  id                  uuid primary key default gen_random_uuid(),
  copy_rel_id         uuid not null references copy_relationships(id) on delete cascade,
  original_trade_id   uuid,
  symbol              varchar not null,
  trade_type          varchar not null,
  lots                numeric not null,
  open_price          numeric not null,
  close_price         numeric,
  stop_loss           numeric,
  take_profit         numeric,
  profit_loss         numeric not null default 0,
  pips                numeric not null default 0,
  status              varchar not null default 'open',
  opened_at           timestamptz not null default now(),
  closed_at           timestamptz
);

-- ============================================================
-- Indexes on foreign keys (Postgres does not auto-index FKs)
-- ============================================================

create index on admin_audit_log (admin_id);
create index on api_keys (user_id);
create index on broker_connections (user_id);
create index on connected_apps (user_id);
create index on copy_traders (user_id);
create index on drawing_objects (user_id);
create index on hire_requests (client_id);
create index on notification_preferences (user_id);
create index on notifications (user_id);
create index on password_reset_tokens (user_id);
create index on payment_methods (user_id);
create index on performance_bars (user_id);
create index on portfolio_holdings (symbol);
create index on portfolio_snapshots (user_id);
create index on portfolio_watchlist (user_id);
create index on price_alerts (user_id);
create index on sessions (user_id);
create index on stock_orders (user_id);
create index on stock_orders (symbol);
create index on support_tickets (user_id);
create index on trader_profiles (user_id);
create index on two_factor_methods (user_id);
create index on usage_metrics (user_id);
create index on user_activity_feed (user_id);
create index on user_followers (following_id);
create index on wallets (user_id);
create index on watchlist_items (symbol);
create index on watchlists (user_id);
create index on marketplace_subscriptions (item_id);
create index on user_subscriptions (user_id);
create index on user_subscriptions (plan_id);
create index on copy_relationships (copier_id);
create index on copy_relationships (trader_id);
create index on hire_agreements (client_id);
create index on hire_agreements (trader_id);
create index on hire_agreements (request_id);
create index on trader_follows (trader_id);
create index on trader_performance (trader_id);
create index on transactions (user_id);
create index on transactions (wallet_id);
create index on transactions (payment_method_id);
create index on ticket_messages (ticket_id);
create index on ticket_messages (sender_id);
create index on open_positions (user_id);
create index on open_positions (broker_conn_id);
create index on copy_trades (copy_rel_id);