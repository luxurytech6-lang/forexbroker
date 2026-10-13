import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from "../supabase";
import {
  TrendingUp, TrendingDown, Plus, Minus, RefreshCw, Wallet, Briefcase, AlertCircle, Check, Info, X, Search, Star, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";

/* ─── Design tokens (shared with the rest of ProfitGainSignal) ─────────────────── */
const T = {
  bg:  '#07101E', s:   '#0C1A2E', s2:  '#112238', br:  '#1C2C45', br2: '#2A3D5C',
  gr:  '#EEF2F7', nt:  '#8A9AB2', g:   '#E2AE4A', gd:  'rgba(226,174,74,.12)',
  bl:  '#5B8CFF', rd:  '#FF6470', gn:  '#34d399',  pr:  '#B49BFF',
  sans:"'Instrument Sans', system-ui, sans-serif",
  serif:"'Instrument Serif', serif",
  mono:"'Instrument Sans', system-ui, sans-serif",
};


const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];
// How many top-market-cap stocks to show by default when a user hasn't
// added anything to their watchlist yet.
const DEFAULT_WATCHLIST_COUNT = 10;

/* ─── No client-side seed data — everything comes from Supabase ─────────── */

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }

  :root {
    --bg:         #07101E;
    --surface:    #0C1A2E;
    --surface2:   #112238;
    --border:     #1C2C45;
    --border2:    #2A3D5C;
    --text:       #EEF2F7;
    --muted:      #8A9AB2;
    --faint:      #56677F;
    --accent:     #E2AE4A;
    --accent-rgb: 226,174,74;
    --accent-dim: rgba(226,174,74,.12);
    --accent-glow:rgba(226,174,74,.06);
    --green:      #34d399;
    --green-dim:  rgba(52,211,153,.12);
    --red:        #FF6470;
    --red-dim:    rgba(248,113,113,.12);
    --blue:       #5B8CFF;
    --purple:     #B49BFF;
    --sidebar-w:  256px;
    --topbar-h:   60px;
    --sans:  'Instrument Sans', system-ui, sans-serif;
    --serif: 'Instrument Serif', serif;
    --mono:  'Instrument Sans', system-ui, sans-serif;
    --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  }

  body, #root {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    height: 100vh;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; text-decoration: none; }
  button { font-family: var(--sans); cursor: pointer; border: none; background: none; }
  input, select { font-family: var(--sans); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  /* ── Login Screen ── */
  .ct-login-wrap { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg); }
  .ct-login-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 36px; width: 100%; max-width: 380px; }
  .ct-login-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
  .ct-login-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .ct-login-sub { font-size: 12px; color: var(--muted); margin-bottom: 24px; }
  .ct-login-field { margin-bottom: 14px; }
  .ct-login-label { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 6px; }
  .ct-login-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 11px 13px; font-size: 13px; color: var(--text);
    font-family: var(--sans); outline: none; transition: border-color .15s;
  }
  .ct-login-input:focus { border-color: var(--accent); }
  .ct-login-err {
    background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3);
    border-radius: var(--r-sm); padding: 10px 13px; font-size: 12px; color: var(--red); margin-bottom: 14px;
  }
  .ct-login-btn {
    width: 100%; background: var(--accent); color: #000; border-radius: var(--r-sm); padding: 12px 0;
    font-size: 14px; font-weight: 700; font-family: var(--sans); cursor: pointer; border: none;
    margin-top: 6px; transition: opacity .15s;
  }
  .ct-login-btn:hover { opacity: .88; }
  .ct-login-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Shell ── */
  .ct-shell { display: grid; grid-template-columns: var(--sidebar-w) 1fr; grid-template-rows: 1fr; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .ct-sidebar {
    grid-column: 1 !important; grid-row: 1 !important;
    background: var(--surface) !important; border-right: 1px solid var(--border) !important;
    display: flex !important; flex-direction: column !important;
    width: var(--sidebar-w) !important; min-width: var(--sidebar-w) !important;
    height: 100vh !important; overflow-y: auto !important; overflow-x: hidden !important;
    position: relative !important; top: auto !important; left: auto !important;
    transform: none !important; z-index: 100 !important;
    transition: transform .25s cubic-bezier(.4,0,.2,1) !important; flex-shrink: 0 !important;
  }
  .ct-sidebar::after {
    content: ''; position: absolute; top: 0; right: 0; width: 1px; height: 100%;
    background: linear-gradient(180deg, transparent 0%, var(--accent) 30%, var(--border) 60%, transparent 100%);
    opacity: .15; pointer-events: none;
  }
  .ct-brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .ct-sb-pill { margin: 12px 16px; background: var(--accent-dim); border: 1px solid rgba(226,174,74,.18); border-radius: var(--r-md); padding: 10px 14px; flex-shrink: 0; }
  .ct-sb-pill-label { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
  .ct-live-dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: ct-pulse 2s infinite; flex-shrink: 0; }
  @keyframes ct-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .ct-sb-pill-val { font-family: var(--mono); font-size: 19px; font-weight: 600; color: var(--accent); letter-spacing: -.5px; }
  .ct-sb-pill-sub { font-size: 11px; color: var(--green); margin-top: 3px; }
  .ct-sb-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
  .ct-sb-section { padding: 10px 20px 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--faint); }
  .ct-sb-link {
    display: flex; align-items: center; gap: 11px; padding: 9px 20px; font-size: 13px; font-weight: 500;
    color: var(--muted); border-left: 2px solid transparent; transition: all .15s; cursor: pointer;
    position: relative; text-decoration: none;
  }
  .ct-sb-link svg { width: 18px; height: 18px; flex-shrink: 0; }
  .ct-sb-link:hover { color: var(--text); background: var(--accent-glow); border-left-color: var(--border2); }
  .ct-sb-link.active { color: var(--accent); background: var(--accent-dim); border-left-color: var(--accent); }
  .ct-sb-badge { margin-left: auto; font-size: 9px; font-weight: 700; background: var(--accent); color: #000; padding: 2px 6px; border-radius: 5px; letter-spacing: .3px; }
  .ct-sb-user { flex-shrink: 0; border-top: 1px solid var(--border); padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
  .ct-sb-avatar {
    width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; box-shadow: 0 0 12px rgba(226,174,74,.3);
  }
  .ct-sb-user-name { font-size: 13px; font-weight: 700; color: var(--text); }
  .ct-sb-user-role { font-size: 10px; color: var(--accent); margin-top: 1px; }
  .ct-sb-link.ct-sb-logout-link { color: var(--red); width: 100%; text-align: left; font-size: 13px; }
  .ct-sb-link.ct-sb-logout-link:hover { color: var(--red); background: var(--red-dim); border-left-color: var(--red); }

  /* ── User dropdown (topbar) ── */
  .user-menu-wrap { position: relative; flex-shrink: 0; }
  .user-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0; background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px; min-width: 190px; z-index: 400; box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: ct-lang-fade .18s ease both;
  }
  .user-dropdown-header { padding: 8px 10px 10px; margin-bottom: 4px; border-bottom: 1px solid var(--border); }
  .user-dropdown-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-dropdown-role { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .user-dropdown-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--r-sm);
    font-size: 12px; font-weight: 600; color: var(--text); cursor: pointer; transition: background .12s, color .12s;
  }
  .user-dropdown-item svg { width: 16px; height: 16px; flex-shrink: 0; }
  .user-dropdown-item:hover { background: var(--surface2); }
  .user-dropdown-item.danger { color: var(--red); }
  .user-dropdown-item.danger:hover { background: var(--red-dim); }
  .user-dropdown-divider { height: 1px; background: var(--border); margin: 6px 4px; }

  /* ── Right panel ── */
  .ct-right { grid-column: 2; display: flex; flex-direction: column; height: 100vh; overflow: hidden; min-width: 0; }

  /* ── Topbar ── */
  .ct-topbar { height: var(--topbar-h); flex-shrink: 0; display: flex; align-items: center; padding: 0 28px; background: var(--surface); border-bottom: 1px solid var(--border); gap: 16px; z-index: 50; }
  .ct-topbar-title { font-family: var(--serif); font-size: 20px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ct-topbar-title span { color: var(--accent); font-style: italic; }
  .ct-topbar-icon {
    width: 36px; height: 36px; border-radius: var(--r-sm); background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; color: var(--muted); position: relative;
    flex-shrink: 0;
  }
  .ct-topbar-icon svg { width: 18px; height: 18px; }
  .ct-topbar-icon:hover { border-color: var(--border2); color: var(--text); }
  .ct-notif-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: var(--red); border-radius: 50%; border: 1.5px solid var(--surface); }
  .ct-topbar-avatar {
    width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 0 10px rgba(226,174,74,.25); flex-shrink: 0;
  }
  .ct-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; flex-shrink: 0; }
  .ct-hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }
  .ct-lang-wrap { flex-shrink: 0; }

  /* ── Main ── */
  .ct-main { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px 28px 40px; min-width: 0; }
  .ct-main-inner { max-width: 1280px; margin: 0 auto; padding-bottom: 48px; }
  .ct-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
  .ct-page-title { font-family: var(--serif); font-size: 28px; color: var(--text); line-height: 1.2; }
  .ct-page-title em { color: var(--accent); font-style: italic; }
  .ct-page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
  .ct-header-actions { display: flex; gap: 8px; }

  /* Buttons */
  .ct-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: var(--r-sm); font-family: var(--sans); font-weight: 600; cursor: pointer; transition: all .15s; border: none; text-decoration: none; white-space: nowrap; }
  .ct-btn-sm  { font-size: 12px; padding: 7px 14px; }
  .ct-btn-accent { background: var(--accent); color: #000; }
  .ct-btn-accent:hover { opacity: .88; box-shadow: 0 0 20px rgba(226,174,74,.3); }
  .ct-btn-ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-size: 12px; padding: 7px 14px; }
  .ct-btn-ghost:hover { border-color: var(--border2); }

  /* ── Metrics ── */
  .ct-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .ct-metrics > * { min-width: 0; }
  .ct-metric { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px 20px; position: relative; overflow: hidden; transition: border-color .2s, transform .2s; }
  .ct-metric:hover { border-color: var(--border2); transform: translateY(-1px); }
  .ct-metric::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%); opacity: .3; }
  .ct-metric-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .ct-metric-icon svg { width: 16px; height: 16px; }
  .ct-metric-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .ct-metric-value { font-family: var(--mono); font-size: 20px; font-weight: 600; color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: -.5px; }
  .ct-metric-sub { font-size: 11px; color: var(--muted); }

  /* ── Controls bar ── */
  .ct-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .ct-tabs { display: flex; gap: 4px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px; }
  .ct-tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--r-sm); border: none; cursor: pointer; font-family: var(--sans); font-weight: 700; font-size: 12px; background: transparent; color: var(--muted); transition: all .15s; white-space: nowrap; }
  .ct-tab:hover { color: var(--text); }
  .ct-tab.active { background: var(--accent); color: #000; }
  .ct-tab svg { width: 14px; height: 14px; }
  .ct-tab-count { font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 99px; }

  /* Badge */
  .ct-badge { font-size: 10px; font-weight: 700; font-family: var(--sans); padding: 2px 8px; border-radius: 4px; white-space: nowrap; letter-spacing: .2px; }
  .ct-badge-green { background: rgba(52,211,153,.13); color: #34d399; }
  .ct-badge-blue  { background: rgba(96,165,250,.13); color: #5B8CFF; }
  .ct-badge-gold  { background: rgba(226,174,74,.13); color: #E2AE4A; }
  .ct-badge-red   { background: rgba(248,113,113,.13); color: #FF6470; }
  .ct-badge-muted { background: rgba(100,116,139,.13); color: #64748b; }

  /* Avatar */
  .ct-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--sans); font-weight: 700; color: #000; flex-shrink: 0; }

  /* Table */
  .ct-lb-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .ct-table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 12px; }
  .ct-table th { text-align: left; padding: 9px 16px; color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; border-bottom: 1px solid var(--border); background: var(--surface2); }
  .ct-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .ct-table tr:last-child td { border-bottom: none; }
  .ct-table tr:hover td { background: var(--surface2); }
  .ct-table-copy-btn { background: transparent; border: 1px solid var(--border); color: var(--text); border-radius: 7px; padding: 6px 14px; font-size: 11px; font-weight: 700; font-family: var(--sans); cursor: pointer; transition: all .15s; }
  .ct-table-copy-btn:hover { border-color: var(--accent); color: var(--accent); }

  .ct-input-label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 6px; font-weight: 600; }
  .ct-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 10px 12px; font-size: 13px; color: var(--text); font-family: var(--sans); outline: none; transition: border-color .15s; }
  .ct-input:focus { border-color: var(--accent); }
  .ct-disclaimer { background: rgba(200,175,76,.06); border: 1px solid rgba(200,175,76,.18); border-radius: var(--r-sm); padding: 10px; margin-bottom: 16px; font-size: 11px; color: var(--muted); line-height: 1.5; }

  /* Loading state */
  .ct-loading { display: flex; align-items: center; justify-content: center; padding: 60px; flex-direction: column; gap: 12px; color: var(--muted); font-size: 13px; }
  .ct-spinner { width: 28px; height: 28px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: ct-spin 0.7s linear infinite; }
  @keyframes ct-spin { to { transform: rotate(360deg); } }

  /* ── Language switcher ── */
  .lang-switcher { position: relative; display: inline-flex; align-items: center; }
  .lang-btn { display: inline-flex; align-items: center; gap: 5px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 5px 9px; font-size: 11px; font-weight: 600; color: var(--muted); cursor: pointer; font-family: var(--sans); transition: border-color .15s, color .15s; white-space: nowrap; height: 36px; width: 36px; justify-content: center; }
  .lang-btn:hover { border-color: var(--border2); color: var(--text); }
  .lang-dropdown { position: absolute; top: calc(100% + 6px); right: 0; background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-md); padding: 6px; min-width: 176px; z-index: 400; box-shadow: 0 16px 40px rgba(0,0,0,.75); animation: ct-lang-fade .18s ease both; }
  @keyframes ct-lang-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .lang-option { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: var(--r-sm); font-size: 12px; color: var(--muted); cursor: pointer; font-family: var(--sans); transition: background .12s, color .12s; }
  .lang-option:hover { background: var(--surface2); color: var(--text); }
  .lang-option.active { color: var(--accent); background: var(--accent-dim); font-weight: 600; }
  .lang-section-label { font-size: 9px; font-weight: 700; color: var(--faint); letter-spacing: .1em; text-transform: uppercase; padding: 4px 10px 6px; }
  .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
  body { top: 0 !important; }
  .skiptranslate { display: none !important; }

  /* ══════════════════ Stocks-page-specific ══════════════════ */

  /* Ticker tape */
  .st-tape-wrap { background: var(--surface); border-bottom: 1px solid var(--border); overflow: hidden; position: relative; flex-shrink: 0; }
  .st-tape-wrap::before, .st-tape-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; width: 48px; z-index: 2; pointer-events: none; }
  .st-tape-wrap::before { left: 0; background: linear-gradient(90deg, var(--surface) 0%, transparent 100%); }
  .st-tape-wrap::after { right: 0; background: linear-gradient(270deg, var(--surface) 0%, transparent 100%); }
  .st-tape-track { display: flex; width: max-content; animation: st-scroll 42s linear infinite; }
  .st-tape-wrap:hover .st-tape-track { animation-play-state: paused; }
  @keyframes st-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .st-tape-item { display: flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 12px; white-space: nowrap; padding: 9px 16px; border-right: 1px solid var(--border); }
  .st-tape-sym { font-weight: 700; color: var(--text); }
  .st-tape-price { color: var(--muted); }
  .st-tape-chg { font-weight: 700; display: flex; align-items: center; gap: 1px; }

  /* Layout */
  .st-layout { display: grid; grid-template-columns: 1fr 348px; gap: var(--density-gap, 14px); align-items: start; }
  .st-layout > * { min-width: 0; }   /* prevent the grid track from blowing out around the table's min-width */
  .st-ticket { position: sticky; top: 0; }
  .st-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }

  /* Search / add symbol */
  .st-search-bar { position: relative; flex: 1; min-width: 200px; }
  .st-search-bar .st-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
  .st-search-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 8px 12px 8px 32px; font-size: 12px; color: var(--text); font-family: var(--sans); outline: none; transition: border-color .15s; }
  .st-search-input:focus { border-color: var(--accent); }
  .st-search-results { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-md); max-height: 280px; overflow-y: auto; z-index: 90; box-shadow: 0 16px 40px rgba(0,0,0,.5); }
  .st-search-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; cursor: pointer; transition: background .12s; }
  .st-search-row:hover { background: var(--surface2); }
  .st-search-empty { padding: 14px; font-size: 12px; color: var(--muted); text-align: center; }

  /* Table cells */
  .st-sym-cell { display: flex; align-items: center; gap: 10px; }
  .st-sym-name { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .st-chg { font-weight: 700; display: inline-flex; align-items: center; gap: 2px; font-family: var(--mono); }
  .st-row-clickable { cursor: pointer; }
  .st-row-clickable.selected td { background: var(--accent-dim); }
  .st-star-btn { background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 7px; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; }
  .st-star-btn:hover { border-color: var(--border2); color: var(--text); }
  .st-star-btn.active { color: var(--accent); border-color: rgba(226,174,74,.4); background: var(--accent-dim); }

  /* Watchlist heatmap */
  .st-heatmap { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; padding: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); margin-bottom: 16px; }
  .st-heat-tile { position: relative; border-radius: var(--r-md); border: 1px solid var(--border); padding: 12px; cursor: pointer; transition: transform .15s, border-color .15s; min-height: 76px; display: flex; flex-direction: column; justify-content: space-between; }
  .st-heat-tile:hover { transform: translateY(-2px); border-color: var(--border2); }
  .st-heat-tile.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .st-heat-sym { font-family: var(--mono); font-weight: 700; font-size: 13px; }
  .st-heat-price { font-family: var(--mono); font-size: 12px; margin-top: 4px; }
  .st-heat-chg { font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px; margin-top: 2px; font-family: var(--mono); }
  .st-heat-remove { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,.25); border: none; color: var(--text); border-radius: 5px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity .15s; }
  .st-heat-remove.add { color: var(--accent); }
  .st-heat-tile:hover .st-heat-remove { opacity: 1; }
  .st-heatmap-empty { text-align: center; color: var(--muted); padding: 30px; font-size: 13px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); margin-bottom: 16px; }
  .st-heatmap-cap { font-size: 11px; color: var(--muted); margin: -8px 0 12px; }

  /* Trade ticket */
  .st-ticket-head { padding: 18px 18px 14px; border-bottom: 1px solid var(--border); }
  .st-ticket-sym { font-family: var(--serif); font-size: 20px; }
  .st-ticket-name { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .st-ticket-price { font-family: var(--mono); font-size: 26px; font-weight: 700; margin-top: 12px; letter-spacing: -.5px; }
  .st-ticket-chg { font-size: 13px; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
  .st-tf-pills { display: flex; gap: 4px; padding: 10px 14px 0; }
  .st-tf-pill { flex: 1; text-align: center; padding: 5px 0; border-radius: 6px; font-size: 10px; font-weight: 700; color: var(--muted); cursor: pointer; transition: all .15s; }
  .st-tf-pill:hover { color: var(--text); }
  .st-tf-pill.active { background: var(--accent-dim); color: var(--accent); }
  .st-ticket-chart { padding: 12px 18px 4px; }
  .st-ticket-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .st-tstat-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
  .st-tstat-val { font-family: var(--mono); font-size: 12px; font-weight: 600; margin-top: 2px; }
  .st-side-toggle { display: flex; gap: 4px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px; margin: 16px 18px 0; }
  .st-side-btn { flex: 1; padding: 9px 0; border-radius: var(--r-sm); border: none; cursor: pointer; font-family: var(--sans); font-weight: 800; font-size: 12px; background: transparent; color: var(--muted); transition: all .15s; }
  .st-side-btn.buy.active { background: var(--green); color: #06150f; }
  .st-side-btn.sell.active { background: var(--red); color: #1a0707; }
  .st-ticket-body { padding: 14px 18px 18px; }
  .st-qty-row { display: flex; align-items: center; gap: 8px; }
  .st-qty-btn { width: 38px; height: 38px; flex-shrink: 0; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; }
  .st-qty-btn:hover { border-color: var(--border2); }
  .st-est-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; margin-top: 4px; border-top: 1px dashed var(--border); font-size: 12px; color: var(--muted); }
  .st-est-val { font-family: var(--mono); font-weight: 700; color: var(--text); font-size: 14px; }
  .st-place-btn { width: 100%; border-radius: var(--r-sm); padding: 13px 0; font-size: 14px; font-weight: 800; font-family: var(--sans); cursor: pointer; border: none; transition: all .15s; }
  .st-place-btn.buy { background: var(--green); color: #06150f; }
  .st-place-btn.buy:hover { opacity: .88; box-shadow: 0 0 20px rgba(52,211,153,.3); }
  .st-place-btn.sell { background: var(--red); color: #1a0707; }
  .st-place-btn.sell:hover { opacity: .88; box-shadow: 0 0 20px rgba(248,113,113,.3); }
  .st-place-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Light theme overrides ── */
  .ct-light-theme {}

  /* ── Responsive ── */
  @media (max-width: 1200px) { .st-layout { grid-template-columns: 1fr; } .st-ticket { position: static; } }
  @media (max-width: 1100px) { .ct-metrics { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 768px) {
    .ct-shell { grid-template-columns: 1fr !important; }
    .ct-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; transform: translateX(-100%) !important; z-index: 300 !important; }
    .ct-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
    .ct-right { grid-column: 1; }
    .ct-hamburger { display: flex; }
    .ct-page-title { font-size: 22px; }
    .ct-main-inner { margin: 0 auto; text-align: center; }
    .ct-page-header { flex-direction: column; align-items: center; text-align: center; }
    .ct-page-sub { justify-content: center; }
    .ct-header-actions { justify-content: center; }
    .ct-metrics { grid-template-columns: repeat(2, 1fr); margin: 0 auto 20px; max-width: 480px; }
    .ct-controls { justify-content: center; text-align: left; }
    .ct-lb-wrap, .st-layout, .ct-table { text-align: left; }
  }
  @media (max-width: 600px) {
    .ct-main { padding: 16px; }
    .ct-topbar { padding: 0 14px; gap: 10px; }
    .ct-metrics { gap: 10px; grid-template-columns: repeat(2, 1fr); max-width: none; }
    .ct-metric { padding: 14px 16px; }
    .ct-page-header { margin-bottom: 16px; }
    .ct-header-actions { width: 100%; }
    .ct-header-actions .ct-btn { flex: 1; }
    .ct-login-card { padding: 24px; }
  }
  @media (max-width: 480px) {
    .ct-topbar { gap: 6px; }
    .ct-topbar-icon, .ct-topbar-avatar { width: 32px; height: 32px; }
    .ct-theme-icon, .ct-lang-wrap { display: none; }
    .ct-metrics { grid-template-columns: repeat(2, 1fr); }
    .ct-metric { padding: 12px 12px; }
    .ct-metric-value { font-size: 17px; }
    .st-ticket-stats { grid-template-columns: 1fr; }
  }
`;

const LIGHT_OVERRIDES = `
  :root {
    --bg:         #EEF2F7;
    --surface:    #ffffff;
    --surface2:   #f5f7fa;
    --border:     #e2e6ed;
    --border2:    #c8cdd8;
    --text:       #0B1628;
    --muted:      #64748b;
    --faint:      #9aa5b4;
    --accent-glow:rgba(var(--accent-rgb),.06);
  }
  body, #root { background: var(--bg); color: var(--text); }
  .ct-sidebar { background: var(--surface) !important; border-color: var(--border) !important; }
  .ct-topbar  { background: var(--surface); border-color: var(--border); }
  .ct-metric, .ct-lb-wrap, .st-panel, .st-tape-wrap { background: var(--surface); border-color: var(--border); }
  .ct-tabs, .ct-select, .ct-input, .ct-login-input, .st-search-input, .st-side-toggle, .st-qty-btn { background: var(--surface2); border-color: var(--border); color: var(--text); }
  .ct-table th { background: var(--surface2); }
  .ct-table tr:hover td { background: var(--surface2); }
  .ct-login-card { background: var(--surface); border-color: var(--border); }
  .ct-login-wrap { background: var(--bg); }
`;

/* ─── Language Switcher (shared) ─────────────────────────────────────────── */
const LANGUAGES = [
  { code:"en",    label:"English",   flag:"🇬🇧" },
  { code:"fr",    label:"Français",  flag:"🇫🇷" },
  { code:"es",    label:"Español",   flag:"🇪🇸" },
  { code:"de",    label:"Deutsch",   flag:"🇩🇪" },
  { code:"pt",    label:"Português", flag:"🇧🇷" },
  { code:"ar",    label:"العربية",   flag:"🇸🇦" },
  { code:"zh-CN", label:"中文",      flag:"🇨🇳" },
  { code:"ja",    label:"日本語",    flag:"🇯🇵" },
  { code:"ru",    label:"Русский",   flag:"🇷🇺" },
  { code:"hi",    label:"हिन्दी",    flag:"🇮🇳" },
  { code:"yo",    label:"Yoruba",    flag:"🇳🇬" },
  { code:"ha",    label:"Hausa",     flag:"🇳🇬" },
];

const initGoogleTranslate = () => {
  if (window._gtInitDone) return;
  window._gtInitDone = true;
  if (!document.getElementById("google_translate_element")) {
    const el = document.createElement("div");
    el.id = "google_translate_element";
    el.style.cssText = "display:none!important;position:absolute;left:-9999px;";
    document.body.appendChild(el);
  }
  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement({ pageLanguage:"en", autoDisplay:false }, "google_translate_element");
    const saved = localStorage.getItem("tf_lang");
    if (saved && saved !== "en") setTimeout(() => applyGoogleTranslate(saved), 800);
  };
  const script = document.createElement("script");
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
};

const applyGoogleTranslate = (langCode) => {
  if (langCode === "en") {
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
    window.location.reload();
    return;
  }
  const pair = "/en/" + langCode;
  document.cookie = "googtrans=" + pair + "; path=/";
  document.cookie = "googtrans=" + pair + "; path=/; domain=" + window.location.hostname;
  const sel = document.querySelector(".goog-te-combo");
  if (sel) { sel.value = langCode; sel.dispatchEvent(new Event("change")); }
  else window.location.reload();
};

function LanguageSwitcher() {
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState(() => localStorage.getItem("tf_lang") || "en");
  const ref                   = useRef(null);

  useEffect(() => { initGoogleTranslate(); }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = (code) => {
    setCurrent(code);
    localStorage.setItem("tf_lang", code);
    setOpen(false);
    applyGoogleTranslate(code);
  };

  const active = LANGUAGES.find(l => l.code === current) || LANGUAGES[0];

  return (
    <div className="lang-switcher" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen(o => !o)} title="Change language">
        <span style={{ fontSize:"15px" }}>{active.flag}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          <div className="lang-section-label">Language</div>
          {LANGUAGES.map(l => (
            <div
              key={l.code}
              className={"lang-option" + (l.code === current ? " active" : "")}
              onClick={() => select(l.code)}
            >
              <span style={{ fontSize:"15px" }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === current && <span style={{ marginLeft:"auto", fontSize:"10px" }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Charts ──────────────────────────────────────────────────────────────── */
function Spark({ data, color = T.g, h = 32, w = 72 }) {
  if (!data || data.length < 2) return <div style={{ width:w, height:h }} />;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / (mx - mn || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  const fill = `${pts} ${w},${h} 0,${h}`;
  const id = `sg${color.replace(/[^a-z0-9]/gi,'')}${Math.round(mn*100)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PriceChart({ data, color = T.g, height = 120 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:T.nt, fontSize:11 }}>
        No chart data yet
      </div>
    );
  }
  const w = 300, h = height;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / (mx - mn || 1)) * (h - 12) - 6;
    return `${x},${y}`;
  }).join(' ');
  const fill = `${pts} ${w},${h} 0,${h}`;
  const id = `pc${color.replace(/[^a-z0-9]/gi,'')}${data.length}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function sliceForTimeframe(arr, tf) {
  if (!arr || arr.length === 0) return [];
  if (tf === '1D') return arr.slice(-Math.min(8, arr.length));
  if (tf === '1W') return arr.slice(-Math.min(14, arr.length));
  if (tf === '1M') return arr.slice(-Math.min(30, arr.length));
  return arr;
}

// Falls back to a synthetic line built from OHLC when a stock has no
// DB-stored sparkline yet, so the chart never sits blank on a fresh stock.
function chartDataFor(q) {
  if (!q) return [];
  if (Array.isArray(q.sparkline) && q.sparkline.length >= 2) return q.sparkline;
  const pts = [q.prev_close, q.day_open, q.day_low, q.day_high, q.current_price]
    .map(v => parseFloat(v))
    .filter(v => Number.isFinite(v) && v > 0);
  return pts.length >= 2 ? pts : [];
}

function formatCap(n) {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function money(n) {
  return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Login Screen ───────────────────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }

      const userId = authData.user.id;

      // Profile carries the user's *display* currency; the wallet itself is
      // always stored/fetched in USD and converted for display elsewhere.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, first_name, last_name, handle, plan, is_verified, avatar_url, currency')
        .eq('id', userId)
        .single();
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .single();

      if (profileError || !profile) {
        setError('User profile not found. Please contact support.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      onLogin({ ...profile, balance: parseFloat(wallet?.balance ?? 0) || 0.0 });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-login-wrap">
      <div className="ct-login-card">
        <div className="ct-login-brand">
          <BrandMark size={36} />
        </div>
        <div className="ct-login-title">Welcome back</div>
        <div className="ct-login-sub">Sign in to your ProfitGainSignal account</div>
        {error && <div className="ct-login-err"><AlertCircle size={14} style={{ marginRight:6, verticalAlign:-2 }} />{error}</div>}
        <div className="ct-login-field">
          <label className="ct-login-label">Email address</label>
          <input
            type="email" className="ct-login-input" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div className="ct-login-field">
          <label className="ct-login-label">Password</label>
          <input
            type="password" className="ct-login-input" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <button className="ct-login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </div>
    </div>
  );
}

/* ─── Currency helpers ───────────────────────────────────────────────────── */
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', INR: '₹', NGN: '₦', BTC: '₿', ETH: 'Ξ' };
function currencySymbol(code) { return CURRENCY_SYMBOLS[(code || '').toUpperCase()] ?? (code || '$'); }



/* ─── User menu (topbar avatar dropdown) ─────────────────────────────────── */


/* ═════════════════════════════════════════════════════════════════════════
   GLOBAL DESK SHELL — shared sidebar + topbar (matches the dashboard)
   The page keeps its own layout classes (ct-sidebar, ct-topbar) so its
   responsive off-canvas behaviour is unchanged; dk-* classes do the styling.
═════════════════════════════════════════════════════════════════════════ */
const DK_NAV = [
  { title:'Overview', links:[
    { key:'dashboard', href:'/dashboard',    Icon:DkDashboard, label:'Dashboard' },
  ]},
  { title:'Invest', links:[
    { key:'stocks',    href:'/stocks',       Icon:DkLine,      label:'Stocks' },
    { key:'copy',      href:'/copy-trading', Icon:DkCopy,      label:'Copy Trading' },
    { key:'hire',      href:'/hire-trader',  Icon:DkUsers,     label:'Hire a Trader' },
    { key:'realestate',href:'/real-estate',  Icon:DkBuilding,  label:'Real Estate', badge:'NEW' },
    { key:'mining',    href:'/mining',       Icon:DkPickaxe,   label:'Mining',      badge:'NEW' },
    { key:'staking',   href:'/staking',      Icon:DkLayers,    label:'Staking',     badge:'NEW' },
    { key:'swap',      href:'/swap',         Icon:DkRepeat,    label:'Swap',        badge:'NEW' },
    { key:'terminal',  href:'/terminal',     Icon:DkCandle,    label:'Terminal' },
  ]},
  { title:'Discover', links:[
    { key:'market',    href:'/market-place', Icon:DkBot,       label:'Marketplace' },
    { key:'insights',  href:'/insights',     Icon:DkTrend,     label:'Insights' },
  ]},
  { title:'Account', links:[
    { key:'payments',  href:'/payments',     Icon:DkCard,      label:'Payments' },
    { key:'cards',     href:'/cards',        Icon:DkCards,     label:'Cards' },
    { key:'profile',   href:'/profile',      Icon:DkUser,      label:'Profile' },
    { key:'identity',  href:'/verify-identity', Icon:DkShield,  label:'Verify identity' },
    { key:'settings',  href:'/settings',     Icon:DkSettings,  label:'Settings' },
    { key:'support',   href:'/support',      Icon:DkHeadset,   label:'Support' },
  ]},
];
const DK_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', AUD:'A$', CAD:'C$', CHF:'Fr', CNY:'¥', INR:'₹', NGN:'₦', ZAR:'R', KES:'KSh', GHS:'₵', BTC:'₿', ETH:'Ξ' };
const DK_ACTIVE = 'stocks';
const DK_TITLE  = 'Stocks';
const dkInitials = (u) => u?._initials ? u._initials : u ? ((`${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`).toUpperCase() || u.email?.[0]?.toUpperCase() || 'U') : 'U';
const dkName     = (u) => u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Account') : 'Loading…';
const dkPlan     = (u) => u?.plan ? `${u.plan} plan${u.is_verified == null ? '' : u.is_verified ? ', verified' : ', unverified'}` : '';
/* Pages pass user details in different shapes; normalise them once */
const dkUser = (p) => {
  const u = p.user && Object.keys(p.user).length ? p.user : null;
  if (u) return u;
  if (p.userName || p.userInitials || p.userPlan) {
    const [first = '', ...rest] = String(p.userName || '').split(' ');
    return { first_name:first, last_name:rest.join(' '), plan:String(p.userPlan || '').toLowerCase() || undefined, _initials:p.userInitials };
  }
  return null;
};
/* Plan: the active row in user_subscriptions (joined to subscription_plans) is the
   source of truth; users.plan is only a fallback because it can lag behind. */
const dkTier = (name) => {
  const n = String(name || '').toLowerCase();
  if (/elite|vip|enterprise|institution/.test(n)) return 2;
  if (/pro|premium|plus|gold/.test(n)) return 1;
  return 0;
};
const dkPlanLabel = (name) => {
  const n = String(name || '').replace(/\s*plan$/i, '').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};
let dkPlanReq = null;
const dkFetchPlan = () => {
  if (!dkPlanReq) {
    dkPlanReq = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};
      const uid = session.user.id;
      const [{ data: profile }, { data: sub }] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('user_subscriptions').select('status, subscription_plans(name)')
          .eq('user_id', uid).eq('status', 'active').order('created_at', { ascending:false }).limit(1).maybeSingle(),
      ]);
      return { profile: profile || null, subPlan: sub?.subscription_plans?.name || null };
    })().catch(() => ({}));
  }
  return dkPlanReq;
};
function useDkUser(props) {
  const base = dkUser(props);
  const [fetched, setFetched] = useState(null);   // null = still loading
  useEffect(() => {
    let live = true;
    dkFetchPlan().then(d => { if (live) setFetched(d || {}); });
    return () => { live = false; };
  }, []);
  const planRaw = props.sub?.subscription_plans?.name
    || fetched?.subPlan
    || base?.plan
    || fetched?.profile?.plan
    || null;
  const merged = { ...(fetched?.profile || {}), ...(base || {}) };
  if (!Object.keys(merged).length && !planRaw) return null;
  return { ...merged, plan: planRaw ? dkPlanLabel(planRaw) : null, _planReady: fetched !== null || !!props.sub };
}
const dkLogout = async () => { try { await supabase.auth.signOut(); } catch (_) {} window.location.href = '/login'; };

function Sidebar(props) {
  const { open } = props;
  const user = useDkUser(props);
  const onLogout = props.onLogout || dkLogout;
  const planName = user?._planReady ? (user?.plan || 'Free') : null;
  const rank = planName ? dkTier(planName) : null;
  return (
    <aside className={`ct-sidebar dk-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="dk-brand"><a href="/dashboard"><BrandMark /></a></div>
      <nav className="dk-scroll">
        {DK_NAV.map(g => (
          <div key={g.title}>
            <div className="dk-section">{g.title}</div>
            {g.links.map(l => (
              <a key={l.key} href={l.href} className={`dk-link${l.key === DK_ACTIVE ? ' active' : ''}`} aria-current={l.key === DK_ACTIVE ? 'page' : undefined}>
                <l.Icon size={18} />{l.label}
                {l.badge && <span className="dk-badge">{l.badge}</span>}
              </a>
            ))}
          </div>
        ))}
        <button type="button" className="dk-link dk-logout" onClick={onLogout}><DkLogout size={18} />Log out</button>
      </nav>
      {planName && (rank < 2 ? (
        <a href="/payments" className="dk-plan">
          <span className="dk-plan-tag">{planName} plan</span>
          <span className="dk-plan-t">{rank === 0 ? 'Upgrade to Pro' : 'Upgrade to Elite'}</span>
          <span className="dk-plan-s">{rank === 0 ? 'Unlock copy trading and hiring' : 'Priority support and every tool'}</span>
        </a>
      ) : (
        <div className="dk-plan">
          <span className="dk-plan-tag">{planName} plan</span>
          <span className="dk-plan-t">You're on the top tier</span>
          <span className="dk-plan-s">Every tool and priority support</span>
        </div>
      ))}
      <div className="dk-user">
        <div className="dk-avatar">{dkInitials(user)}</div>
        <div style={{ minWidth:0 }}>
          <div className="dk-user-name">{dkName(user)}</div>
          <div className="dk-user-role">{dkPlan(user)}</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar(props) {
  const { onMenu, onRefresh, refreshing } = props;
  const user = useDkUser(props);
  const onLogout = props.onLogout || dkLogout;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const bal = typeof user?.balance === 'number' ? user.balance : null;
  const sym = DK_SYMBOLS[(user?.currency || 'USD').toUpperCase()] ?? (user?.currency || '$');
  return (
    <header className="ct-topbar dk-topbar">
      <button className="ct-hamburger dk-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
      <div className="dk-crumb"><span>{DK_TITLE}</span></div>
      <div style={{ flex:1 }} />
      {bal != null && (
        <a href="/payments" className="dk-balance" title="Available balance">
          <span>Balance</span><strong>{sym}{bal.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}</strong>
        </a>
      )}
      {onRefresh && (
        <button type="button" className="dk-icon" onClick={onRefresh} aria-label="Refresh prices" style={{ background:'none', cursor:'pointer' }}>
          <DkRefresh size={18} style={{ animation: refreshing ? 'dkSpin .8s linear infinite' : 'none' }} />
        </button>
      )}
      <LanguageSwitcher />
      <a href="/notification" className="dk-icon" aria-label="Notifications"><DkBell size={19} /><span className="dk-dot" /></a>
      <a href="/settings" className="dk-icon dk-hide-sm" aria-label="Settings"><DkSettings size={19} /></a>
      <div className="dk-menu" ref={ref}>
        <button type="button" className="dk-avatar" onClick={() => setOpen(o => !o)} aria-label="Account menu" aria-expanded={open}>{dkInitials(user)}</button>
        {open && (
          <div className="dk-drop" role="menu">
            <div className="dk-drop-head"><strong>{dkName(user)}</strong><span>{dkPlan(user)}</span></div>
            <a href="/profile" className="dk-drop-item" role="menuitem"><DkUser size={16} />Profile</a>
            <a href="/payments" className="dk-drop-item" role="menuitem"><DkCard size={16} />Payments</a>
            <button className="dk-drop-item dk-out" role="menuitem" onClick={onLogout}><DkLogout size={16} />Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}

/* Visual layer: palette, type and component polish for the ct- page */
const DESK_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
body, #root { font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Sidebar */
.dk-sidebar { width: var(--sidebar-w, 264px); background: var(--surface) !important; border-right: 1px solid var(--border) !important; display: flex !important; flex-direction: column !important; height: 100vh; height: 100dvh; overflow: hidden; }
.dk-sidebar::after { display: none !important; }
.dk-brand { height: var(--topbar-h, 64px); flex-shrink: 0; display: flex; align-items: center; padding: 0 22px; border-bottom: 1px solid var(--border); }
.dk-brand img { height: 32px; width: auto; }
.dk-scroll { flex: 1; overflow-y: auto; padding: 10px 12px 14px; scrollbar-width: thin; }
.dk-section { font-size: 12px; font-weight: 600; color: var(--faint); padding: 14px 12px 6px; }
.dk-sidebar a, .dk-topbar a { text-decoration: none; color: inherit; }
.dk-link { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 12px; border-radius: 10px; font-size: 14.5px; font-weight: 500; color: var(--muted); background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; transition: background .15s, color .15s; }
.dk-link:hover { background: var(--surface2); color: var(--text); }
.dk-link.active { background: var(--surface2); color: var(--text); font-weight: 600; }
.dk-link.active::before { content: ''; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent); }
.dk-link.active svg { color: var(--accent); }
.dk-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); }
.dk-logout:hover { color: var(--red); }
.dk-plan { display: flex; flex-direction: column; gap: 2px; margin: 0 12px 12px; padding: 14px; border-radius: 14px; border: 1px solid var(--border); background: linear-gradient(160deg, var(--surface2), var(--surface)); transition: border-color .15s; }
.dk-plan:hover { border-color: var(--accent); }
.dk-plan-tag { align-self: flex-start; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--accent-dim); color: var(--accent); margin-bottom: 6px; }
.dk-plan-t { font-size: 14px; font-weight: 600; color: var(--text); }
.dk-plan-s { font-size: 12.5px; color: var(--muted); }
.dk-user { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--border); flex-shrink: 0; }
.dk-user-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.dk-user-role { font-size: 12.5px; color: var(--muted); }
.dk-avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13.5px; font-weight: 700; font-family: inherit; background: linear-gradient(145deg, #1C3A6E, #07101E); color: #E2AE4A; border: 1px solid var(--border2); cursor: pointer; }

/* Topbar */
.dk-topbar { height: var(--topbar-h, 64px); gap: 10px !important; background: var(--bg) !important; border-bottom: 1px solid var(--border); }
.dk-hamburger { background: none; border: none; }
.dk-crumb { font-size: 15px; font-weight: 600; color: var(--text); white-space: nowrap; }
.dk-balance { display: inline-flex; align-items: baseline; gap: 8px; height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; color: var(--muted); white-space: nowrap; line-height: 40px; }
.dk-balance strong { font-size: 14.5px; color: var(--text); font-weight: 600; }
.dk-balance:hover { border-color: var(--accent); }
.dk-icon { position: relative; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--muted); border: 1px solid transparent; }
.dk-icon:hover { background: var(--surface); color: var(--text); border-color: var(--border); }
.dk-dot { position: absolute; top: 9px; right: 10px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--bg); }
.dk-menu { position: relative; }
.dk-drop { position: absolute; right: 0; top: calc(100% + 8px); z-index: 400; min-width: 230px; padding: 6px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 24px 48px -16px rgba(0,0,0,.5); }
.dk-drop-head { padding: 10px 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px; display: flex; flex-direction: column; }
.dk-drop-head strong { font-size: 14.5px; color: var(--text); }
.dk-drop-head span { font-size: 12.5px; color: var(--muted); }
.dk-drop-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: var(--muted); background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; }
.dk-drop-item:hover { background: var(--surface2); color: var(--text); }
.dk-out:hover { color: var(--red); }
.lang-btn { height: 40px; border-radius: 10px !important; border: 1px solid var(--border) !important; background: none !important; color: var(--muted) !important; }
.lang-dropdown { border-radius: 12px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; }
.lang-option.active { background: var(--accent-dim) !important; color: var(--text) !important; }
@keyframes dkSpin { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .dk-balance span, .dk-hide-sm { display: none; } .dk-balance { padding: 0 10px; } }
@media (max-width: 420px) { .dk-balance { display: none; } }

/* Page heading */
.ct-page-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.4vw,46px) !important; line-height: 1.05 !important; letter-spacing: -.01em !important; color: var(--text); }
.ct-page-title em, .ct-page-title span { font-style: normal; color: var(--text) !important; }
.ct-page-sub { font-size: 15px !important; color: var(--muted) !important; margin-top: 8px; }

/* Buttons */
.ct-btn { border-radius: 10px !important; font-family: inherit !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.ct-btn-accent { background: var(--accent) !important; color: #07101E !important; border: 1px solid transparent !important; }
.ct-btn-accent:hover { filter: brightness(1.07); }
.ct-btn-ghost { background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text) !important; }
.ct-btn-ghost:hover { background: var(--surface) !important; }

/* Cards and metrics */
.ct-metric, .ct-card, .ct-trader-card, .ct-copying-card, .ct-item-card, .ct-lb-wrap, .ct-plan-card,
.fc-card, .pr-card, .ev-card, .eco-side-card, .fc-table-wrap {
  border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -36px rgba(0,0,0,.6);
}
.ct-trader-card, .ct-item-card, .ct-copying-card { transition: border-color .15s, transform .2s; }
.ct-trader-card:hover, .ct-item-card:hover { border-color: var(--border2) !important; transform: translateY(-2px); }
.ct-metric-label { font-size: 13.5px !important; color: var(--muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-family: inherit !important; }
.ct-metric-value { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-weight: 600 !important; font-size: 26px !important; letter-spacing: -.01em; }
.ct-metric-sub { font-size: 13px !important; color: var(--muted) !important; font-family: inherit !important; }
.ct-metric-icon { border-radius: 10px !important; }

/* Tabs, selects, inputs */
.ct-tabs { background: var(--surface) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; padding: 4px !important; }
.ct-tab { border-radius: 9px !important; font-family: inherit !important; font-weight: 600 !important; color: var(--muted); }
.ct-tab.active { background: var(--accent) !important; color: #07101E !important; }
.ct-select, .ct-input, .ct-filter-select, .ct-login-input {
  border-radius: 10px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: inherit !important;
}
.ct-select:focus, .ct-input:focus, .ct-filter-select:focus, .ct-login-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); outline: none; }

/* Tables */
.ct-table th, .fc-table-head { font-family: inherit !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; color: var(--faint) !important; }
.ct-table td { font-variant-numeric: tabular-nums; }

/* Badges */
[class^="ct-badge"], [class*=" ct-badge"] { border-radius: 7px !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0 !important; text-transform: none !important; }

/* Modals */
.ct-modal-overlay, .ct-upgrade-overlay { background: rgba(3,8,16,.7) !important; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.ct-modal, .ct-upgrade-modal { border-radius: 20px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8) !important; }

/* Help-centre sub-pages */
.pg-hero { border-radius: 20px !important; border: 1px solid var(--border) !important; background: radial-gradient(120% 140% at 100% 0%, var(--accent-glow) 0%, transparent 55%), var(--surface) !important; }
.pg-hero-grid { display: none !important; }
.pg-hero-label { font-size: 13px !important; font-weight: 600 !important; letter-spacing: 0 !important; text-transform: none !important; color: var(--accent) !important; font-family: inherit !important; }
.pg-hero-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.6vw,48px) !important; line-height: 1.05 !important; }
.pg-hero-title em { font-style: normal; color: var(--accent); }
.pg-hero-sub { font-size: 15.5px !important; color: var(--muted) !important; }
.pg-card { border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important; overflow: hidden; }
.pg-card-title { font-size: 16px !important; font-weight: 600 !important; }
.pg-back { font-size: 14px !important; color: var(--muted) !important; }
.pg-back:hover { color: var(--text) !important; }

/* Live dot */
.ct-live-dot { background: var(--green) !important; }

/* Mono labels become calm sentence-case text */
[class*="-lbl"], [class*="-label"] { letter-spacing: 0 !important; }
`;

/* ─── Ticker tape (signature element) ────────────────────────────────────── */
function TickerTape({ stocks }) {
  if (!stocks || stocks.length === 0) return null;
  const items = stocks.slice(0, 14);
  const loop = [...items, ...items];
  return (
    <div className="st-tape-wrap">
      <div className="st-tape-track">
        {loop.map((s, i) => {
          const q = s.quote || {};
          const chg = (q.current_price || 0) - (q.prev_close || 0);
          const pct = q.prev_close ? (chg / q.prev_close) * 100 : 0;
          const up = chg >= 0;
          return (
            <div className="st-tape-item" key={`${s.symbol}-${i}`}>
              <span className="st-tape-sym">{s.symbol}</span>
              <span className="st-tape-price">${(q.current_price || 0).toFixed(2)}</span>
              <span className="st-tape-chg" style={{ color: up ? T.gn : T.rd }}>
                {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {up ? '+' : ''}{pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Metric Card ─────────────────────────────────────────────────────────── */
function MetricCard({ m }) {
  return (
    <div className="ct-metric">
      <div className="ct-metric-icon" style={{ background: `${m.color}18` }}>
        <m.Icon size={16} style={{ color: m.color }} />
      </div>
      <div className="ct-metric-label">{m.label}</div>
      <div className="ct-metric-value" style={{ color: m.color }}>{m.value}</div>
      <div className="ct-metric-sub">{m.sub}</div>
    </div>
  );
}

/* ─── Add-to-watchlist search ─────────────────────────────────────────────── */
function AddStockSearch({ universe, watchlistSymbols, onAdd, disabled = false }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const results = q.trim() && !disabled
    ? universe
        .filter(s => !watchlistSymbols.includes(s.symbol))
        .filter(s => s.symbol.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 8)
    : [];

  return (
    <div className="st-search-bar" ref={ref}>
      <Search size={14} className="st-search-icon" />
      <input
        className="st-search-input"
        placeholder={disabled ? 'Watchlist full (10/10) — remove a stock to add another' : 'Add a symbol… (e.g. AAPL)'}
        value={q}
        disabled={disabled}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && q.trim() && !disabled && (
        <div className="st-search-results">
          {results.length === 0 ? (
            <div className="st-search-empty">No matching stocks.</div>
          ) : (
            results.map(s => (
              <div key={s.symbol} className="st-search-row" onClick={() => { onAdd(s.symbol); setQ(''); setOpen(false); }}>
                <div className="ct-av" style={{ width:26, height:26, background:s.color_hex, fontSize:9 }}>{s.initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, fontFamily:T.mono }}>{s.symbol}</div>
                  <div style={{ fontSize:10, color:T.nt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
                </div>
                <Plus size={14} style={{ color:T.g, flexShrink:0 }} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Watchlist row ───────────────────────────────────────────────────────── */
function StockRow({ s, selected, onSelect, isWatchlisted, onToggleWatch }) {
  const q = s.quote || {};
  const chg = (q.current_price || 0) - (q.prev_close || 0);
  const chgPct = q.prev_close ? (chg / q.prev_close) * 100 : 0;
  const up = chg >= 0;
  return (
    <tr className={`st-row-clickable${selected ? ' selected' : ''}`} onClick={() => onSelect(s.symbol)}>
      <td>
        <div className="st-sym-cell">
          <div className="ct-av" style={{ width:32, height:32, background:s.color_hex, fontSize:11 }}>{s.initials}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, fontFamily:T.mono }}>{s.symbol}</div>
            <div className="st-sym-name">{s.name}</div>
          </div>
        </div>
      </td>
      <td style={{ fontFamily:T.mono, fontWeight:700 }}>${(q.current_price || 0).toFixed(2)}</td>
      <td>
        <span className="st-chg" style={{ color: up ? T.gn : T.rd }}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {up ? '+' : ''}{chgPct.toFixed(2)}%
        </span>
      </td>
      <td style={{ width:90 }}><Spark data={sliceForTimeframe(chartDataFor(q), '1M')} color={up ? T.gn : T.rd} /></td>
      <td style={{ fontFamily:T.mono, color:T.nt, fontSize:12 }}>{formatCap(q.market_cap)}</td>
      <td onClick={e => e.stopPropagation()}>
        <button
          className={`st-star-btn${isWatchlisted ? ' active' : ''}`}
          onClick={() => onToggleWatch(s.symbol, isWatchlisted)}
          title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star size={14} fill={isWatchlisted ? 'currentColor' : 'none'} />
        </button>
      </td>
    </tr>
  );
}

/* ─── Watchlist heatmap ───────────────────────────────────────────────────── */
function heatColor(chgPct) {
  const intensity = Math.min(Math.abs(chgPct) / 4, 1); // saturates around ±4%
  return chgPct >= 0
    ? `rgba(52,211,153,${0.10 + intensity * 0.45})`
    : `rgba(248,113,113,${0.10 + intensity * 0.45})`;
}

function WatchlistHeatmap({ stocks, selectedSymbol, onSelect, onRemove, watchlistSymbols = [] }) {
  const tiles = stocks.slice(0, 10);
  if (tiles.length === 0) {
    return (
      <div className="st-heatmap-empty">
        No stocks available right now.
      </div>
    );
  }
  return (
    <div className="st-heatmap">
      {tiles.map(s => {
        const q = s.quote || {};
        const chg = (q.current_price || 0) - (q.prev_close || 0);
        const chgPct = q.prev_close ? (chg / q.prev_close) * 100 : 0;
        const up = chgPct >= 0;
        const isSaved = watchlistSymbols.includes(s.symbol);
        return (
          <div
            key={s.symbol}
            className={`st-heat-tile${s.symbol === selectedSymbol ? ' selected' : ''}`}
            style={{ background: heatColor(chgPct) }}
            onClick={() => onSelect(s.symbol)}
          >
            <button
              className={`st-heat-remove${isSaved ? '' : ' add'}`}
              onClick={e => { e.stopPropagation(); isSaved ? onRemove(s.symbol) : onSelect(s.symbol); }}
              title={isSaved ? 'Remove from watchlist' : 'Suggested — not saved to your watchlist'}
            >
              {isSaved ? <X size={12} /> : <Star size={11} />}
            </button>
            <div className="st-heat-sym">{s.symbol}</div>
            <div>
              <div className="st-heat-price">${(q.current_price || 0).toFixed(2)}</div>
              <div className="st-heat-chg" style={{ color: up ? T.gn : T.rd }}>
                {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {up ? '+' : ''}{chgPct.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Holdings row ────────────────────────────────────────────────────────── */
function HoldingsRow({ h, selected, onSelect, onClose }) {
  const [closing, setClosing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const q = h.stock?.quote || {};
  const price = q.current_price || 0;
  const value = price * h.quantity;
  const cost = h.avg_cost * h.quantity;
  const pl = value - cost;
  const plPct = cost ? (pl / cost) * 100 : 0;
  const dayChg = ((q.current_price || 0) - (q.prev_close || 0)) * h.quantity;
  const up = pl >= 0;

  const handleClose = async (e) => {
    e.stopPropagation();
    if (!confirm) { setConfirm(true); return; }
    setClosing(true);
    setConfirm(false);
    try { await onClose(h.symbol, h.quantity); }
    finally { setClosing(false); }
  };

  return (
    <tr className={`st-row-clickable${selected ? ' selected' : ''}`} onClick={() => onSelect(h.symbol)}>
      <td>
        <div className="st-sym-cell">
          <div className="ct-av" style={{ width:32, height:32, background:h.stock?.color_hex || T.bl, fontSize:11 }}>
            {h.stock?.initials || h.symbol.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, fontFamily:T.mono }}>{h.symbol}</div>
            <div className="st-sym-name">{h.quantity} share{h.quantity !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </td>
      <td style={{ fontFamily:T.mono }}>${h.avg_cost.toFixed(2)}</td>
      <td style={{ fontFamily:T.mono, fontWeight:700 }}>${price.toFixed(2)}</td>
      <td style={{ fontFamily:T.mono, fontWeight:700 }}>${money(value)}</td>
      <td>
        <span className="st-chg" style={{ color: up ? T.gn : T.rd }}>
          {up ? '+' : '-'}${money(Math.abs(pl))} ({up ? '+' : ''}{plPct.toFixed(2)}%)
        </span>
      </td>
      <td style={{ fontFamily:T.mono, color: dayChg >= 0 ? T.gn : T.rd, fontSize:12 }}>
        {dayChg >= 0 ? '+' : '-'}${money(Math.abs(dayChg))}
      </td>
      <td onClick={e => e.stopPropagation()}>
        <button
          className="ct-table-copy-btn"
          onClick={handleClose}
          disabled={closing}
          style={{
            borderColor: confirm ? 'rgba(248,113,113,.6)' : undefined,
            color: confirm ? T.rd : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {closing ? 'Closing…' : confirm ? 'Confirm?' : 'Close Position'}
        </button>
      </td>
    </tr>
  );
}

/* ─── Order row ───────────────────────────────────────────────────────────── */
function OrderRow({ o, onCancel }) {
  const badge = o.status === 'filled' ? 'green' : o.status === 'cancelled' ? 'red' : 'blue';
  return (
    <tr>
      <td style={{ fontFamily:T.mono, fontWeight:700 }}>{o.symbol}</td>
      <td><span className={`ct-badge ct-badge-${o.side === 'buy' ? 'green' : 'red'}`}>{o.side.toUpperCase()}</span></td>
      <td style={{ textTransform:'capitalize', fontSize:12 }}>{o.order_type}</td>
      <td style={{ fontFamily:T.mono }}>{o.quantity}</td>
      <td style={{ fontFamily:T.mono }}>
        {o.order_type === 'limit'
          ? `$${parseFloat(o.limit_price).toFixed(2)}`
          : (o.filled_price ? `$${parseFloat(o.filled_price).toFixed(2)}` : 'Market')}
      </td>
      <td><span className={`ct-badge ct-badge-${badge}`}>{o.status}</span></td>
      <td style={{ fontSize:11, color:T.nt }}>{new Date(o.created_at).toLocaleDateString()}</td>
      <td>{o.status === 'open' && <button className="ct-table-copy-btn" onClick={() => onCancel(o.id)}>Cancel</button>}</td>
    </tr>
  );
}

/* ─── Trade Ticket ────────────────────────────────────────────────────────── */
function TradeTicket({ stock, holding, cashBalance, onPlaceOrder, userCurrency = "USD", fxRate = 1 }) {
  const [side, setSide]           = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity]   = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [tf, setTf]               = useState('1M');
  const [placing, setPlacing]     = useState(false);
  const [placeErr, setPlaceErr]   = useState('');
  const [placeOk, setPlaceOk]     = useState(false);

  useEffect(() => { setPlaceOk(false); setPlaceErr(''); setQuantity('1'); setLimitPrice(''); }, [stock?.symbol]);

  if (!stock) {
    return (
      <div className="st-panel st-ticket">
        <div className="ct-loading" style={{ padding:'60px 20px' }}>
          <span>Select a stock to trade</span>
        </div>
      </div>
    );
  }

  const q = stock.quote || {};
  const price = q.current_price || 0;
  const chg = price - (q.prev_close || 0);
  const chgPct = q.prev_close ? (chg / q.prev_close) * 100 : 0;
  const up = chg >= 0;
  const qty = parseFloat(quantity) || 0;
  const execPrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : price;
  const estTotal = qty * execPrice;
  const maxSellQty = holding?.quantity || 0;
  const cashSymbol = currencySymbol(userCurrency);

  const handlePlace = async () => {
    setPlaceErr('');
    if (!qty || qty <= 0) { setPlaceErr('Enter a valid quantity.'); return; }
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) { setPlaceErr('Enter a valid limit price.'); return; }
    if (side === 'buy' && estTotal > cashBalance) { setPlaceErr('Insufficient cash balance.'); return; } // both in USD
    if (side === 'sell' && qty > maxSellQty) { setPlaceErr(`You only own ${maxSellQty} share${maxSellQty !== 1 ? 's' : ''}.`); return; }
    setPlacing(true);
    try {
      await onPlaceOrder({
        symbol: stock.symbol, side, orderType, quantity: qty,
        limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : null, execPrice,
      });
      setPlaceOk(true);
    } catch (err) {
      setPlaceErr(err.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const statRows = [
    ['Open',  q.day_open  != null ? `$${parseFloat(q.day_open).toFixed(2)}`  : '—'],
    ['Prev Close', q.prev_close != null ? `$${parseFloat(q.prev_close).toFixed(2)}` : '—'],
    ['High',  q.day_high  != null ? `$${parseFloat(q.day_high).toFixed(2)}`  : '—'],
    ['Low',   q.day_low   != null ? `$${parseFloat(q.day_low).toFixed(2)}`   : '—'],
    ['Volume', q.volume ? q.volume.toLocaleString() : '—'],
    ['Mkt Cap', formatCap(q.market_cap)],
    ['P/E', q.pe_ratio != null ? parseFloat(q.pe_ratio).toFixed(2) : '—'],
    ['52W Range', (q.week52_low != null && q.week52_high != null) ? `$${parseFloat(q.week52_low).toFixed(0)}–$${parseFloat(q.week52_high).toFixed(0)}` : '—'],
  ];

  return (
    <div className="st-panel st-ticket">
      <div className="st-ticket-head">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div>
            <div className="st-ticket-sym">{stock.symbol}</div>
            <div className="st-ticket-name">{stock.name} · {stock.exchange}</div>
          </div>
          <div className="ct-av" style={{ width:36, height:36, background:stock.color_hex, fontSize:12, flexShrink:0 }}>{stock.initials}</div>
        </div>
        <div className="st-ticket-price">${price.toFixed(2)}</div>
        <div className="st-ticket-chg" style={{ color: up ? T.gn : T.rd }}>
          {up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          {up ? '+' : ''}{chg.toFixed(2)} ({up ? '+' : ''}{chgPct.toFixed(2)}%) today
        </div>
      </div>

      <div className="st-tf-pills">
        {TIMEFRAMES.map(t => (
          <div key={t} className={`st-tf-pill${tf === t ? ' active' : ''}`} onClick={() => setTf(t)}>{t}</div>
        ))}
      </div>
      <div className="st-ticket-chart">
        <PriceChart data={sliceForTimeframe(chartDataFor(q), tf)} color={up ? T.gn : T.rd} />
      </div>

      <div className="st-ticket-stats">
        {statRows.map(([lbl, val]) => (
          <div key={lbl}>
            <div className="st-tstat-lbl">{lbl}</div>
            <div className="st-tstat-val">{val}</div>
          </div>
        ))}
      </div>

      <div className="st-side-toggle">
        <button className={`st-side-btn buy${side === 'buy' ? ' active' : ''}`} onClick={() => setSide('buy')}>Buy</button>
        <button className={`st-side-btn sell${side === 'sell' ? ' active' : ''}`} onClick={() => setSide('sell')}>Sell</button>
      </div>

      <div className="st-ticket-body">
        {placeOk ? (
          <div style={{ background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.3)', borderRadius:10, padding:18, textAlign:'center', color:T.gn, fontSize:13, fontWeight:600 }}>
            <Check size={18} style={{ display:'block', margin:'0 auto 6px' }} />
            Order {orderType === 'market' ? 'filled' : 'placed'} for {stock.symbol}
          </div>
        ) : (
          <>
            <label className="ct-input-label">Order type</label>
            <select className="ct-input" value={orderType} onChange={e => setOrderType(e.target.value)} style={{ marginBottom:12 }}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>

            <label className="ct-input-label">Quantity (shares)</label>
            <div className="st-qty-row" style={{ marginBottom:12 }}>
              <button className="st-qty-btn" onClick={() => setQuantity(v => String(Math.max(1, (parseFloat(v) || 1) - 1)))}><Minus size={14} /></button>
              <input className="ct-input" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ textAlign:'center' }} />
              <button className="st-qty-btn" onClick={() => setQuantity(v => String((parseFloat(v) || 0) + 1))}><Plus size={14} /></button>
            </div>

            {orderType === 'limit' && (
              <>
                <label className="ct-input-label">Limit price (USD)</label>
                <input
                  className="ct-input" type="number" placeholder={price.toFixed(2)}
                  value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={{ marginBottom:12 }}
                />
              </>
            )}

            <div className="st-est-row">
              <span>Estimated total</span>
              <span className="st-est-val">{cashSymbol}{money(estTotal * fxRate)}</span>
            </div>
            <div style={{ fontSize:11, color:T.nt, marginBottom:14 }}>
              {side === 'buy' ? `Cash available: ${cashSymbol}${money(cashBalance * fxRate)}` : `Shares owned: ${maxSellQty}`}
            </div>

            {placeErr && <div className="ct-login-err" style={{ marginBottom:12 }}>{placeErr}</div>}

            <button className={`st-place-btn ${side}`} onClick={handlePlace} disabled={placing}>
              {placing ? 'Placing…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol} →`}
            </button>
            <div className="ct-disclaimer" style={{ marginTop:12, marginBottom:0 }}>
              <Info size={13} style={{ color:T.g, verticalAlign:-2, marginRight:5, display:'inline' }} />
              Investing involves risk, including loss of principal. Past performance is not a guarantee of future results.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Settings helpers (shared) ───────────────────────────────────────────── */
const DENSITY_PADDING = { compact: '12px 16px', comfortable: '18px 20px', spacious: '24px 28px' };
const DENSITY_GAP     = { compact: '8px',  comfortable: '14px', spacious: '20px' };
const DENSITY_FONT    = { compact: '13px', comfortable: '14px', spacious: '15px' };

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '226,174,74';
}

function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return theme;
}

function applySettings(settings, rootEl = document.documentElement) {
  if (!settings || !rootEl) return;
  const accent = settings.accent_color || '#E2AE4A';
  const rgb    = hexToRgb(accent);
  const theme  = resolveTheme(settings.theme || 'dark');
  const density = settings.layout_density || 'comfortable';

  rootEl.style.setProperty('--accent',      accent);
  rootEl.style.setProperty('--accent-rgb',  rgb);
  rootEl.style.setProperty('--accent-dim',  `rgba(${rgb},.12)`);
  rootEl.style.setProperty('--accent-glow', `rgba(${rgb},.06)`);
  rootEl.style.setProperty('--density-pad', DENSITY_PADDING[density] || DENSITY_PADDING.comfortable);
  rootEl.style.setProperty('--density-gap', DENSITY_GAP[density]     || DENSITY_GAP.comfortable);
  rootEl.style.fontSize = DENSITY_FONT[density] || '14px';

  return theme;
}

/* ─── Supabase row helpers ────────────────────────────────────────────────── */
function pickQuote(row) {
  const sq = row?.stock_quotes;
  if (!sq) return null;
  return Array.isArray(sq) ? (sq[0] || null) : sq;
}

/* ─── Live quotes — fetched directly from Finnhub in the browser ─────────────
   NOTE: this calls Finnhub straight from the client, so FINNHUB_API_KEY ships
   inside the JS bundle and is visible to anyone who opens devtools/network.
   Finnhub's free tier is rate-limited to 60 req/min, which is fine for a
   small watchlist but will throttle a large universe — fine for now. */
const FINNHUB_API_KEY = 'd98nl7hr01qugfuvt5mgd98nl7hr01qugfuvt5n0'; // TODO: replace with your key

/* ─── Currency conversion ─────────────────────────────────────────────────── */
/* Wallet balances are always stored/fetched in USD (the base currency). We
   pull live USD → X rates and convert only at render time for whatever
   currency the user has selected in their profile (users.currency). */

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) return null;
    return data.rates; // e.g. { USD: 1, NGN: 1530.2, EUR: 0.92, ... }
  } catch (err) {
    console.error('fetchExchangeRates error:', err);
    return null;
  }
}

// Finnhub's free tier allows ~60 requests/min, which also permits short
// bursts. Fetching one symbol at a time with a 1.1s gap made even a 10-stock
// default watchlist take 10+ seconds to light up. Instead we fire each batch
// of QUOTE_BATCH_SIZE requests in parallel, then pause briefly between
// batches — a 10-symbol batch now resolves in ~1 request's round trip.
const QUOTE_CACHE = new Map(); // symbol -> { data, ts }
const QUOTE_CACHE_TTL_MS = 30_000;  // don't re-fetch a symbol more than every 30s
const QUOTE_BATCH_SIZE = 8;         // symbols fetched concurrently per batch
const QUOTE_BATCH_DELAY_MS = 250;   // gap between batches, keeps us under 60/min

async function fetchLiveQuote(symbol) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
    );
    if (res.status === 429) {
      return { rateLimited: true };
    }
    if (!res.ok) return null;
    const q = await res.json();
    // Finnhub returns c:0, pc:0 for an unknown/unsupported symbol.
    if (q.c == null || (q.c === 0 && q.pc === 0)) return null;
    return { current_price: q.c, prev_close: q.pc, day_open: q.o, day_high: q.h, day_low: q.l };
  } catch (err) {
    console.error(`fetchLiveQuote(${symbol}) error:`, err);
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchLiveQuotes(symbols) {
  const now = Date.now();
  const result = {};
  const toFetch = [];

  for (const symbol of symbols) {
    const cached = QUOTE_CACHE.get(symbol);
    if (cached && now - cached.ts < QUOTE_CACHE_TTL_MS) {
      result[symbol] = cached.data;
    } else {
      toFetch.push(symbol);
    }
  }

  let rateLimited = false;
  for (let i = 0; i < toFetch.length && !rateLimited; i += QUOTE_BATCH_SIZE) {
    const batch = toFetch.slice(i, i + QUOTE_BATCH_SIZE);
    const quotes = await Promise.all(batch.map(fetchLiveQuote));
    batch.forEach((symbol, idx) => {
      const quote = quotes[idx];
      if (quote?.rateLimited) { rateLimited = true; return; }
      if (quote) {
        QUOTE_CACHE.set(symbol, { data: quote, ts: Date.now() });
        result[symbol] = quote;
      }
    });
    if (rateLimited) {
      console.warn('Finnhub rate limit hit — stopping this refresh cycle early, using DB/cached quotes for the rest.');
      break; // don't keep hammering a server that's already rejecting us
    }
    if (i + QUOTE_BATCH_SIZE < toFetch.length) await sleep(QUOTE_BATCH_DELAY_MS);
  }

  return result;
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function Stocks() {
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab,         setTab]         = useState('watchlist');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings,    setSettings]    = useState(null);
  const [activeTheme, setActiveTheme] = useState('dark');

  // Supabase-backed data
  const [stocksUniverse,   setStocksUniverse]   = useState([]); // all active stocks + quotes
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [holdings,         setHoldings]         = useState([]);
  const [orders,           setOrders]           = useState([]);
  const [cashBalance,      setCashBalance]      = useState(0);
  const [selectedSymbol,   setSelectedSymbol]   = useState(null);

  const [userCurrency, setUserCurrency] = useState('USD'); // display currency from user profile
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 }); // USD → X live rates

  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [fetchErr,    setFetchErr]    = useState('');

  // cashBalance (and all internal math) always stays in USD, since that's how
  // the wallet is stored and how stock prices come back from Finnhub. Only
  // convert to the user's chosen currency at the point of display.
  const fxRate = exchangeRates[userCurrency] || 1;
  const toDisplayCurrency = useCallback((usdAmount) => (usdAmount || 0) * fxRate, [fxRate]);

  /* ── Sync userCurrency from profile whenever user changes ── */
  useEffect(() => {
    if (user?.currency) setUserCurrency(user.currency);
  }, [user?.currency]);

  /* ── Fetch live USD → X rates once, and whenever userCurrency changes if we
     don't have a rate for it yet ── */
  useEffect(() => {
    if (exchangeRates[userCurrency]) return;
    fetchExchangeRates().then(rates => { if (rates) setExchangeRates(rates); });
  }, [userCurrency, exchangeRates]);

  /* ── Fetch this user's USD wallet balance ── */
  const fetchWalletBalance = useCallback(async (uid) => {
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', uid)
        .eq('currency', 'USD')
        .single();
      setCashBalance(parseFloat(wallet?.balance ?? 0) || 0);
    } catch (err) {
      console.error('fetchWalletBalance error:', err);
    }
  }, []);

  /* ── Re-fetch balance whenever the user changes ── */
  useEffect(() => {
    if (!user?.id) return;
    fetchWalletBalance(user.id);
  }, [user?.id, fetchWalletBalance]);

  /* ── Apply settings to CSS vars whenever settings change ── */
  useEffect(() => {
    if (!settings) return;
    const theme = applySettings(settings);
    setActiveTheme(theme);
  }, [settings]);

  useEffect(() => {
    if (settings?.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => setActiveTheme(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings?.theme]);

  const fetchSettings = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
      if (!error && data) setSettings(data);
    } catch (_) { /* non-critical */ }
  }, []);

  /* ── 1. Restore session ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userId = session.user.id;
        // profile.currency is the *display* currency; the wallet row itself
        // is always the USD one.
        const { data: profile } = await supabase
          .from('users').select('id, first_name, last_name, handle, plan, is_verified, currency').eq('id', userId).single();
        if (profile) {
          const { data: wallet } = await supabase
            .from('wallets').select('balance').eq('user_id', userId).eq('currency', 'USD').single();
          setUser({ ...profile, balance: parseFloat(wallet?.balance ?? 0) || 0.0 });
          await fetchSettings(userId);
          setUserCurrency(profile.currency || 'USD');
        }
      }
      setAuthLoading(false);
    });
  }, [fetchSettings]);

  /* ── 2. Fetch the full tradable universe (symbol + name + live quote) ── */
  const fetchMarketData = useCallback(async () => {
    const { data, error } = await supabase
      .from('stocks')
      .select(`
        symbol, name, exchange, sector, currency, color_hex, initials, is_active,
        stock_quotes ( current_price, prev_close, day_open, day_high, day_low, volume, market_cap, pe_ratio, week52_high, week52_low, sparkline, updated_at )
      `)
      .eq('is_active', true);
    if (error) throw error;
    return (data || [])
      .map(s => ({ ...s, quote: pickQuote(s) }))
      .sort((a, b) => (b.quote?.market_cap || 0) - (a.quote?.market_cap || 0));
  }, []);

  /* ── 3. Fetch this user's watchlist, holdings, orders, and cash balance ── */
  const fetchUserData = useCallback(async (uid) => {
    // Also re-fetch the profile to pick up any display-currency change made in Settings
    const [
      { data: wl,      error: wlErr   },
      { data: hold,    error: holdErr },
      { data: ord,     error: ordErr  },
      { data: profile                 },
      { data: wallet                  },
    ] = await Promise.all([
      supabase.from('watchlist_items').select('id, symbol, created_at').eq('user_id', uid),
      supabase.from('portfolio_holdings').select('id, symbol, quantity, avg_cost').eq('user_id', uid),
      supabase.from('stock_orders').select('id, symbol, side, order_type, quantity, limit_price, status, filled_price, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
      supabase.from('users').select('currency').eq('id', uid).single(),
      // Wallet is always the USD row — it's the single source of truth for balance.
      supabase.from('wallets').select('balance').eq('user_id', uid).eq('currency', 'USD').single(),
    ]);
    if (wlErr)   throw wlErr;
    if (holdErr) throw holdErr;
    if (ordErr)  throw ordErr;

    return {
      watchlistSymbols: (wl || []).map(w => w.symbol),
      holdings:   hold || [],
      orders:     ord  || [],
      cashBalance: parseFloat(wallet?.balance ?? 0) || 0, // raw USD
      currency:    profile?.currency || 'USD',            // display currency only
    };
  }, []);

  const loadAll = useCallback(async (showSpinner = true) => {
    if (!user) return;
    if (showSpinner) setDataLoading(true); else setRefreshing(true);
    setFetchErr('');
    try {
      const [market, ud] = await Promise.all([fetchMarketData(), fetchUserData(user.id)]);
      // Live-fetching every symbol in the universe on every load is what was
      // blowing through Finnhub's free-tier rate limit. Only the symbols the
      // user actually cares about right now need a live price; everything
      // else can fall back to the DB-stored quote until it's watchlisted,
      // held, or selected.
      const priority = [
        ...new Set([
          ...ud.watchlistSymbols,
          ...ud.holdings.map(h => h.symbol),
          selectedSymbol,
          // Default top-cap symbols so the ticker tape and chart have live
          // prices immediately even before the user has watchlisted or
          // selected anything.
          ...market.slice(0, DEFAULT_WATCHLIST_COUNT).map(s => s.symbol),
        ].filter(Boolean)),
      ].slice(0, 20); // hard cap so one load can never exceed the rate budget
      const liveQuotes = await fetchLiveQuotes(priority);
      const marketWithLivePrices = market.map(s => {
        const live = liveQuotes[s.symbol];
        return live ? { ...s, quote: { ...s.quote, ...live } } : s;
      });
      setStocksUniverse(marketWithLivePrices);
      setWatchlistSymbols(ud.watchlistSymbols);
      setHoldings(ud.holdings);
      setOrders(ud.orders);
      setCashBalance(ud.cashBalance);
      // Keep userCurrency in sync with whatever the DB says right now
      if (ud.currency) setUserCurrency(ud.currency);
      setSelectedSymbol(prev => prev || ud.watchlistSymbols[0] || marketWithLivePrices[0]?.symbol || null);
    } catch (err) {
      console.error('loadAll error:', err);
      setFetchErr(err.message || 'Failed to load market data.');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchMarketData, fetchUserData]);

  /* ── Whenever the selection changes, top up its live price if we don't
     already have a fresh one. Goes through the same cache + rate limiting
     as everything else, so this never adds an unbounded burst of calls. ── */
  useEffect(() => {
    if (!selectedSymbol) return;
    fetchLiveQuotes([selectedSymbol]).then(quotes => {
      const live = quotes[selectedSymbol];
      if (!live) return;
      setStocksUniverse(prev => prev.map(s => (
        s.symbol === selectedSymbol ? { ...s, quote: { ...s.quote, ...live } } : s
      )));
    });
  }, [selectedSymbol]);

  useEffect(() => {
    if (!user) return;
    loadAll(true);
    fetchSettings(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ── Keep prices live: quietly re-fetch whatever's currently on screen
     every 30s (matching the quote cache TTL) without a full reload/spinner. ── */
  useEffect(() => {
    if (!user || stocksUniverse.length === 0) return;
    const interval = setInterval(() => {
      const symbols = [...new Set([
        ...watchlistSymbols,
        ...holdings.map(h => h.symbol),
        selectedSymbol,
        ...stocksUniverse.slice(0, DEFAULT_WATCHLIST_COUNT).map(s => s.symbol),
      ].filter(Boolean))].slice(0, 20);
      if (symbols.length === 0) return;
      fetchLiveQuotes(symbols).then(quotes => {
        if (Object.keys(quotes).length === 0) return;
        setStocksUniverse(prev => prev.map(s => (
          quotes[s.symbol] ? { ...s, quote: { ...s.quote, ...quotes[s.symbol] } } : s
        )));
      });
    }, QUOTE_CACHE_TTL_MS);
    return () => clearInterval(interval);
  }, [user, watchlistSymbols, holdings, selectedSymbol, stocksUniverse.length]);

  /* ── Handlers ── */
  const handleToggleWatch = async (symbol, isOn) => {
    if (!user) return;
    try {
      if (isOn) {
        await supabase.from('watchlist_items').delete().eq('user_id', user.id).eq('symbol', symbol);
        setWatchlistSymbols(ws => ws.filter(s => s !== symbol));
      } else {
        await supabase.from('watchlist_items').insert({ user_id: user.id, symbol });
        setWatchlistSymbols(ws => [...ws, symbol]);
      }
    } catch (err) {
      console.error('handleToggleWatch error:', err);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await supabase.from('stock_orders').update({ status: 'cancelled' }).eq('id', orderId);
      setOrders(os => os.map(o => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
    } catch (err) {
      console.error('handleCancelOrder error:', err);
    }
  };

  const handleClosePosition = async (symbol, quantity) => {
    const live = await fetchLiveQuote(symbol);
    if (!live?.current_price) throw new Error('Could not fetch live price to close position.');
    const fillPrice = live.current_price;

    // Only apply the P&L (gain or loss) to the balance — not the full proceeds
    const holding = holdings.find(h => h.symbol === symbol);
    const avgCost = holding?.avg_cost || 0;
    const pnl = (fillPrice - avgCost) * quantity; // positive = profit, negative = loss

    await supabase.from('portfolio_holdings').delete().eq('user_id', user.id).eq('symbol', symbol);
    const { error: walletErr } = await supabase.from('wallets')
      .update({ balance: cashBalance + pnl }) // pnl is in USD, matching stored balance
      .eq('user_id', user.id)
      .eq('currency', 'USD');
    if (walletErr) throw walletErr;
    const { error: orderErr } = await supabase.from('stock_orders').insert({
      user_id: user.id, symbol, side: 'sell', order_type: 'market',
      quantity, status: 'filled', filled_price: fillPrice,
    });
    if (orderErr) throw orderErr;
    await loadAll(false);
  };

  const handlePlaceOrder = async ({ symbol, side, orderType, quantity, limitPrice, execPrice }) => {
    const status = orderType === 'market' ? 'filled' : 'open';

    // Market orders fill against a live price pulled fresh from Finnhub right
    // now — never trust the price the client had cached when the ticket opened.
    let fillPrice = execPrice;
    if (orderType === 'market') {
      const live = await fetchLiveQuote(symbol);
      if (!live?.current_price) {
        throw new Error('Could not fetch a live price for this order. Try again.');
      }
      fillPrice = live.current_price;
    }

    const { error: orderErr } = await supabase.from('stock_orders').insert({
      user_id: user.id, symbol, side, order_type: orderType, quantity,
      limit_price: limitPrice, status, filled_price: status === 'filled' ? fillPrice : null,
    });
    if (orderErr) throw orderErr;

    if (status === 'filled') {
      const existing = holdings.find(h => h.symbol === symbol);
      if (side === 'buy') {
        const cost = quantity * fillPrice;
        if (cost > cashBalance) throw new Error('Insufficient cash balance at the live price.');
        const newQty = (existing?.quantity || 0) + quantity;
        const newAvgCost = existing
          ? ((existing.avg_cost * existing.quantity) + (fillPrice * quantity)) / newQty
          : fillPrice;
        const { error: holdErr } = await supabase
          .from('portfolio_holdings')
          .upsert({ user_id: user.id, symbol, quantity: newQty, avg_cost: newAvgCost }, { onConflict: 'user_id,symbol' });
        if (holdErr) throw holdErr;
        const { error: walletErr } = await supabase.from('wallets').update({ balance: cashBalance - cost }).eq('user_id', user.id).eq('currency', 'USD');
        if (walletErr) throw walletErr;
      } else {
        if (!existing || existing.quantity < quantity) throw new Error('Insufficient shares to sell.');
        const newQty = existing.quantity - quantity;
        if (newQty <= 0) {
          const { error: delErr } = await supabase.from('portfolio_holdings').delete().eq('user_id', user.id).eq('symbol', symbol);
          if (delErr) throw delErr;
        } else {
          const { error: updErr } = await supabase.from('portfolio_holdings').update({ quantity: newQty }).eq('user_id', user.id).eq('symbol', symbol);
          if (updErr) throw updErr;
        }
        const { error: walletErr } = await supabase.from('wallets').update({ balance: cashBalance + quantity * fillPrice }).eq('user_id', user.id).eq('currency', 'USD');
        if (walletErr) throw walletErr;
      }
    }
    await loadAll(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStocksUniverse([]);
    setHoldings([]);
    setOrders([]);
    setWatchlistSymbols([]);
  };

  /* ── Derived data ── */
  const holdingsEnriched = holdings.map(h => ({ ...h, stock: stocksUniverse.find(s => s.symbol === h.symbol) || null }));
  const totalMarketVal   = holdingsEnriched.reduce((s, h) => s + (h.stock?.quote?.current_price || 0) * h.quantity, 0);
  const totalCost        = holdingsEnriched.reduce((s, h) => s + h.avg_cost * h.quantity, 0);
  const totalReturn      = totalMarketVal - totalCost;
  const totalReturnPct   = totalCost ? (totalReturn / totalCost) * 100 : 0;
  const todaysPL         = holdingsEnriched.reduce((s, h) => s + (((h.stock?.quote?.current_price || 0) - (h.stock?.quote?.prev_close || 0)) * h.quantity), 0);
  const yestVal           = totalMarketVal - todaysPL;
  const todaysPLPct      = yestVal ? (todaysPL / yestVal) * 100 : 0;
  const portfolioValue   = cashBalance + totalReturn; // still raw USD here

  // Everything above (cashBalance, totalReturn, todaysPL, portfolioValue) is
  // computed in USD, since that's the wallet's storage currency and Finnhub's
  // quote currency. Convert only at the point of display.
  const ccy = currencySymbol(userCurrency);
  const METRICS = [
    { label:'Portfolio Value', value:`${ccy}${money(toDisplayCurrency(portfolioValue))}`, sub:`${holdings.length} position${holdings.length !== 1 ? 's' : ''}`, color:T.g, Icon:Briefcase },
    { label:"Today's P&L",     value:`${todaysPL >= 0 ? '+' : '-'}${ccy}${money(Math.abs(toDisplayCurrency(todaysPL)))}`, sub:`${todaysPL >= 0 ? '+' : ''}${todaysPLPct.toFixed(2)}% today`, color: todaysPL >= 0 ? T.gn : T.rd, Icon: todaysPL >= 0 ? TrendingUp : TrendingDown },
    { label:'Cash Available',  value:`${ccy}${money(toDisplayCurrency(cashBalance))}`, sub:`Buying power`, color:T.bl, Icon:Wallet },
    { label:'Total Return',    value:`${totalReturn >= 0 ? '+' : '-'}${ccy}${money(Math.abs(toDisplayCurrency(totalReturn)))}`, sub:`${totalReturn >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}% all-time`, color: totalReturn >= 0 ? T.gn : T.rd, Icon:TrendingUp },
  ];

  const watchlistStocks = stocksUniverse.filter(s => watchlistSymbols.includes(s.symbol));
  // Nothing saved yet? Show the top stocks by market cap so the page never
  // opens on an empty state. These aren't in the user's real watchlist —
  // clicking the star on one of them adds it for real.
  const displayWatchlistStocks = watchlistSymbols.length > 0
    ? watchlistStocks
    : stocksUniverse.slice(0, DEFAULT_WATCHLIST_COUNT);
  const selectedStock   = stocksUniverse.find(s => s.symbol === selectedSymbol) || null;
  const selectedHolding = holdingsEnriched.find(h => h.symbol === selectedSymbol) || null;
  const openOrdersCount = orders.filter(o => o.status === 'open').length;

  /* ── Render ── */
  if (authLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
        {activeTheme === 'light' && <style dangerouslySetInnerHTML={{ __html: LIGHT_OVERRIDES }} />}
        <div className="ct-loading"><div className="ct-spinner" /><span>Loading…</span></div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
        {activeTheme === 'light' && <style dangerouslySetInnerHTML={{ __html: LIGHT_OVERRIDES }} />}
        <LoginScreen onLogin={async (u) => { setUser(u); await fetchSettings(u.id); }} />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      {activeTheme === 'light' && <style dangerouslySetInnerHTML={{ __html: LIGHT_OVERRIDES }} />}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:299 }} />
      )}

      <div className="ct-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} portfolioValue={toDisplayCurrency(cashBalance)} userCurrency={userCurrency} />

        <div className="ct-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} onRefresh={() => loadAll(false)} user={user} settings={settings} refreshing={refreshing} onLogout={handleLogout} />
          <TickerTape stocks={stocksUniverse} />

          <main className="ct-main" style={{ padding:`24px var(--density-pad, 28px) 40px` }}>
            <div className="ct-main-inner">
            <div className="ct-page-header">
              <div>
                <div className="ct-page-title"><em>Markets</em></div>
                <div className="ct-page-sub">
                  <span className="ct-live-dot" />
                  Trade equities and ETFs in real time. Build your watchlist, track holdings, place orders.
                </div>
              </div>
              <div className="ct-header-actions">
                <a href="/payment" className="ct-btn ct-btn-ghost ct-btn-sm"><Wallet size={13} /> Deposit</a>
                <button className="ct-btn ct-btn-accent ct-btn-sm" onClick={() => loadAll(false)}><RefreshCw size={13} /> Refresh</button>
              </div>
            </div>

            {fetchErr && (
              <div className="ct-login-err" style={{ marginBottom:14 }}>
                <AlertCircle size={14} style={{ marginRight:6, verticalAlign:-2 }} />{fetchErr}
              </div>
            )}

            <div className="ct-metrics" style={{ gap:`var(--density-gap, 14px)`, marginBottom:20 }}>
              {METRICS.map(m => <MetricCard key={m.label} m={m} />)}
            </div>

            {dataLoading ? (
              <div className="ct-loading"><div className="ct-spinner" /><span>Fetching market data…</span></div>
            ) : (
              <div className="st-layout">
                <div>
                  <div className="ct-controls">
                    <div className="ct-tabs">
                      {[
                        { key:'watchlist', label:'Watchlist', count: watchlistStocks.length },
                        { key:'holdings',  label:'Holdings',  count: holdings.length },
                        { key:'orders',    label:'Orders',    count: openOrdersCount },
                      ].map(({ key, label, count }) => (
                        <button key={key} className={`ct-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                          {label}
                          {count > 0 && (
                            <span className="ct-tab-count" style={{
                              background: tab === key ? 'rgba(0,0,0,.2)' : 'rgba(52,211,153,.2)',
                              color: tab === key ? '#000' : T.gn,
                            }}>{count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {tab === 'watchlist' && (
                      <AddStockSearch
                        universe={stocksUniverse}
                        watchlistSymbols={watchlistSymbols}
                        onAdd={(sym) => handleToggleWatch(sym, false)}
                        disabled={watchlistSymbols.length >= 10}
                      />
                    )}
                  </div>

                  {tab === 'watchlist' && (
                    <>
                      {watchlistSymbols.length === 0 && displayWatchlistStocks.length > 0 && (
                        <div className="st-heatmap-cap" style={{ marginBottom:10 }}>
                          Showing top stocks by market cap — tap the star to save one to your watchlist.
                        </div>
                      )}
                      <WatchlistHeatmap
                        stocks={displayWatchlistStocks}
                        selectedSymbol={selectedSymbol}
                        onSelect={setSelectedSymbol}
                        onRemove={(sym) => handleToggleWatch(sym, true)}
                        watchlistSymbols={watchlistSymbols}
                      />
                      {watchlistSymbols.length >= 10 && (
                        <div className="st-heatmap-cap">Watchlist is full (10/10) — remove a stock to add another.</div>
                      )}
                      <div className="ct-lb-wrap">
                        {displayWatchlistStocks.length === 0 ? (
                          <div style={{ textAlign:'center', color:T.nt, padding:40, fontSize:13 }}>
                            No stocks available right now.
                          </div>
                        ) : (
                          <table className="ct-table">
                            <thead>
                              <tr>{['Symbol', 'Price', 'Chg %', '30D', 'Mkt Cap', ''].map(h => <th key={h}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {displayWatchlistStocks.map(s => (
                                <StockRow
                                  key={s.symbol} s={s} selected={s.symbol === selectedSymbol}
                                  onSelect={setSelectedSymbol} isWatchlisted={watchlistSymbols.includes(s.symbol)} onToggleWatch={handleToggleWatch}
                                />
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}

                  {tab === 'holdings' && (
                    <div className="ct-lb-wrap">
                      {holdingsEnriched.length === 0 ? (
                        <div style={{ textAlign:'center', color:T.nt, padding:40, fontSize:13 }}>
                          You don't own any positions yet. Select a stock and place an order to get started.
                        </div>
                      ) : (
                        <table className="ct-table">
                          <thead>
                            <tr>{['Position', 'Avg Cost', 'Price', 'Market Value', 'Total P&L', 'Today', ''].map(h => <th key={h}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {holdingsEnriched.map(h => (
                              <HoldingsRow key={h.symbol} h={h} selected={h.symbol === selectedSymbol} onSelect={setSelectedSymbol} onClose={handleClosePosition} />
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {tab === 'orders' && (
                    <div className="ct-lb-wrap">
                      {orders.length === 0 ? (
                        <div style={{ textAlign:'center', color:T.nt, padding:40, fontSize:13 }}>
                          No orders yet. Orders you place will show up here.
                        </div>
                      ) : (
                        <table className="ct-table">
                          <thead>
                            <tr>{['Symbol', 'Side', 'Type', 'Qty', 'Price', 'Status', 'Date', ''].map(h => <th key={h}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {orders.map(o => <OrderRow key={o.id} o={o} onCancel={handleCancelOrder} />)}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                <TradeTicket stock={selectedStock} holding={selectedHolding} cashBalance={cashBalance} onPlaceOrder={handlePlaceOrder} userCurrency={userCurrency} fxRate={fxRate} />
              </div>
            )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}


/* ── Brand wordmark (replaces logo.png) ── */
function BrandMark({ size = 26 }) {
  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap');"}</style>
      <span aria-label="ProfitGainSignal" style={{ display:'inline-block', fontFamily:"'Instrument Serif', Georgia, serif", fontWeight:400, fontSize:size, lineHeight:1, letterSpacing:'-.01em', color:'#EEF2F7', whiteSpace:'nowrap' }}>
        Profit<span style={{ color:'#E2AE4A' }}>Gain</span>Signal
      </span>
    </>
  );
}
