import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from "../supabase";
import CryptoCheckout from "../payment/CryptoCheckout";
import {
  Copy, Users, TrendingUp, Download, Plus, Wallet, Trophy, AlertCircle, Lock, Check, Info, X,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";

/* ─── Fetch USD → target-currency exchange rate (cached 1hr in localStorage) ─── */
async function getUsdRate(targetCurrency) {
  if (!targetCurrency || targetCurrency === 'USD') return 1;
  const ONE_HOUR = 60 * 60 * 1000;
  const cacheKey = `tf_fx_rate_${targetCurrency}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && typeof cached.rate === 'number' && Date.now() - cached.ts < ONE_HOUR) {
      return cached.rate;
    }
  } catch (_) {}

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await res.json();
    const rate = Number(json?.rates?.[targetCurrency]);
    if (!rate || Number.isNaN(rate)) return 1; // fall back to 1:1 if the API doesn't have this currency
    try { localStorage.setItem(cacheKey, JSON.stringify({ rate, ts: Date.now() })); } catch (_) {}
    return rate;
  } catch (_) {
    // Network/API failure — fall back to a stale cached rate if we have one, else 1:1
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && typeof cached.rate === 'number') return cached.rate;
    } catch (_) {}
    return 1;
  }
}

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  bg:  '#07101E', s:   '#0C1A2E', s2:  '#112238', br:  '#1C2C45', br2: '#2A3D5C',
  gr:  '#EEF2F7', nt:  '#8A9AB2', g:   '#E2AE4A', gd:  'rgba(226,174,74,.12)',
  bl:  '#5B8CFF', rd:  '#FF6470', gn:  '#34d399',  pr:  '#B49BFF',
  sans:"'Instrument Sans', system-ui, sans-serif",
  serif:"'Instrument Serif', serif",
  mono:"'Instrument Sans', system-ui, sans-serif",
};

/* ─── Static visual data ─────────────────────────────────────────────────── */
const RISK_COLOR = { Low: '#34d399', Medium: '#f59e0b', High: '#FF6470' };
const RISK_BG    = { Low: 'rgba(52,211,153,.12)', Medium: 'rgba(245,158,11,.12)', High: 'rgba(248,113,113,.12)' };

/* Plans that can use copy trading — anything above 'basic' */
const COPY_ALLOWED_PLANS = ['pro', 'elite', 'premium', 'enterprise', 'vip'];
const canUseCopyTrading = (plan) => COPY_ALLOWED_PLANS.includes((plan || '').toLowerCase());


/* ─── No client-side seed data — all data comes from Supabase (seeded via SQL) ── */

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
    height: 100dvh;
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
  .ct-login-wrap {
    display: flex; align-items: center; justify-content: center;
    height: 100vh; height: 100dvh; background: var(--bg);
  }
  .ct-login-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 36px; width: 100%; max-width: 380px;
  }
  .ct-login-brand {
    display: flex; align-items: center; gap: 10px; margin-bottom: 28px;
  }
  .ct-login-brand-icon {
    width: 36px; height: 36px; background: var(--accent); border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
  }
  .ct-login-brand-icon svg { width: 18px; height: 18px; color: #000; }
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
    border-radius: var(--r-sm); padding: 10px 13px; font-size: 12px; color: var(--red);
    margin-bottom: 14px;
  }
  .ct-login-btn {
    width: 100%; background: var(--accent); color: #000;
    border-radius: var(--r-sm); padding: 12px 0; font-size: 14px; font-weight: 700;
    font-family: var(--sans); cursor: pointer; border: none; margin-top: 6px;
    transition: opacity .15s;
  }
  .ct-login-btn:hover { opacity: .88; }
  .ct-login-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Shell ── */
  .ct-shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    grid-template-rows: 1fr;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .ct-sidebar {
    grid-column: 1 !important; grid-row: 1 !important;
    background: var(--surface) !important; border-right: 1px solid var(--border) !important;
    display: flex !important; flex-direction: column !important;
    width: var(--sidebar-w) !important; min-width: var(--sidebar-w) !important;
    height: 100vh !important; height: 100dvh !important; overflow-y: auto !important; overflow-x: hidden !important;
    position: relative !important; top: auto !important; left: auto !important;
    transform: none !important; z-index: 100 !important;
    transition: transform .25s cubic-bezier(.4,0,.2,1) !important;
    flex-shrink: 0 !important;
  }
  .ct-sidebar::after {
    content: ''; position: absolute; top: 0; right: 0;
    width: 1px; height: 100%;
    background: linear-gradient(180deg, transparent 0%, var(--accent) 30%, var(--border) 60%, transparent 100%);
    opacity: .15; pointer-events: none;
  }
  .ct-brand {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .ct-brand-icon {
    width: 34px; height: 34px; background: var(--accent); border-radius: 9px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ct-brand-icon svg { width: 18px; height: 18px; color: #000; }
  .ct-brand-name { font-size: 16px; font-weight: 700; letter-spacing: -.3px; color: var(--text); }
  .ct-brand-name em { color: var(--accent); font-style: normal; }
  .ct-sb-pill {
    margin: 12px 16px; background: var(--accent-dim);
    border: 1px solid rgba(226,174,74,.18); border-radius: var(--r-md); padding: 10px 14px; flex-shrink: 0;
  }
  .ct-sb-pill-label {
    font-size: 10px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .ct-live-dot {
    width: 6px; height: 6px; background: var(--green);
    border-radius: 50%; animation: ct-pulse 2s infinite; flex-shrink: 0;
  }
  @keyframes ct-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .ct-sb-pill-val { font-family: var(--mono); font-size: 19px; font-weight: 600; color: var(--accent); letter-spacing: -.5px; }
  .ct-sb-pill-sub { font-size: 11px; color: var(--green); margin-top: 3px; }
  .ct-sb-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
  .ct-sb-section {
    padding: 10px 20px 4px; font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.5px; color: var(--faint);
  }
  .ct-sb-link {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 20px; font-size: 13px; font-weight: 500;
    color: var(--muted); border-left: 2px solid transparent;
    transition: all .15s; cursor: pointer; position: relative; text-decoration: none;
  }
  .ct-sb-link svg { width: 18px; height: 18px; flex-shrink: 0; }
  .ct-sb-link:hover { color: var(--text); background: var(--accent-glow); border-left-color: var(--border2); }
  .ct-sb-link.active { color: var(--accent); background: var(--accent-dim); border-left-color: var(--accent); }
  .ct-sb-badge {
    margin-left: auto; font-size: 9px; font-weight: 700;
    background: var(--accent); color: #000; padding: 2px 6px; border-radius: 5px; letter-spacing: .3px;
  }
  .ct-sb-user {
    flex-shrink: 0; border-top: 1px solid var(--border);
    padding: 14px 16px; display: flex; align-items: center; gap: 10px; min-width: 0;
  }
  .ct-sb-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 0 12px rgba(226,174,74,.3);
  }
  .ct-sb-user-name { font-size: 13px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ct-sb-user-role { font-size: 10px; color: var(--accent); margin-top: 1px; }
  .ct-sb-link.logout { color: var(--red); }
  .ct-sb-link.logout:hover { background: var(--red-dim); border-left-color: var(--red); color: var(--red); }
  .ct-sb-link.logout svg { color: var(--red); }

  /* ── Profile dropdown ── */
  .ct-avatar-wrap { position: relative; display: inline-flex; }
  .ct-topbar-avatar { flex-shrink: 0; }
  .ct-profile-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 190px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: ct-lang-fade .18s ease both;
  }
  .ct-profile-head {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px 10px; border-bottom: 1px solid var(--border); margin-bottom: 6px;
  }
  .ct-profile-head-name { font-size: 12px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ct-profile-head-role { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .ct-profile-option {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: var(--r-sm);
    font-size: 12px; color: var(--muted); font-weight: 500;
    cursor: pointer; font-family: var(--sans);
    transition: background .12s, color .12s; text-decoration: none;
  }
  .ct-profile-option svg { width: 15px; height: 15px; flex-shrink: 0; }
  .ct-profile-option:hover { background: var(--surface2); color: var(--text); }
  .ct-profile-option.logout { color: var(--red); }
  .ct-profile-option.logout:hover { background: var(--red-dim); color: var(--red); }

  /* ── Right panel ── */
  .ct-right { grid-column: 2; display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; }

  /* ── Topbar ── */
  .ct-topbar {
    height: var(--topbar-h); flex-shrink: 0;
    display: flex; align-items: center;
    padding: 0 28px; background: var(--surface);
    border-bottom: 1px solid var(--border); gap: 16px; z-index: 50;
  }
  .ct-topbar-title { font-family: var(--serif); font-size: 15px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ct-topbar-title span { color: var(--accent); font-style: italic; }
  .ct-topbar-actions { display: flex; align-items: center; gap: 16px; margin-left: auto; flex-shrink: 0; }
  .ct-topbar-icon {
    width: 36px; height: 36px; border-radius: var(--r-sm);
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; color: var(--muted); position: relative;
  }
  .ct-topbar-icon svg { width: 18px; height: 18px; }
  .ct-topbar-icon:hover { border-color: var(--border2); color: var(--text); }
  .ct-notif-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; background: var(--red); border-radius: 50%;
    border: 1.5px solid var(--surface);
  }
  .ct-topbar-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 0 10px rgba(226,174,74,.25);
  }
  .ct-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; }
  .ct-hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }

  /* ── Main ── */
  .ct-main { flex: 1; overflow-y: auto; overflow-x: hidden; overscroll-behavior-y: contain; padding: 24px 28px calc(40px + env(safe-area-inset-bottom)); -webkit-overflow-scrolling: touch; }
  .ct-page-header {
    display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;
  }
  .ct-page-title { font-family: var(--serif); font-size: 28px; color: var(--text); line-height: 1.2; }
  .ct-page-title em { color: var(--accent); font-style: italic; }
  .ct-page-sub {
    font-size: 13px; color: var(--muted); margin-top: 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .ct-header-actions { display: flex; gap: 8px; }

  /* Buttons */
  .ct-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; border-radius: var(--r-sm); font-family: var(--sans); font-weight: 600;
    cursor: pointer; transition: all .15s; border: none; text-decoration: none; white-space: nowrap;
  }
  .ct-btn-sm  { font-size: 12px; padding: 7px 14px; }
  .ct-btn-accent { background: var(--accent); color: #000; }
  .ct-btn-accent:hover { opacity: .88; box-shadow: 0 0 20px rgba(226,174,74,.3); }
  .ct-btn-ghost {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); font-size: 12px; padding: 7px 14px;
  }
  .ct-btn-ghost:hover { border-color: var(--border2); }

  /* ── Metrics ── */
  .ct-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .ct-metric {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 18px 20px; position: relative; overflow: hidden;
    transition: border-color .2s, transform .2s;
  }
  .ct-metric:hover { border-color: var(--border2); transform: translateY(-1px); }
  .ct-metric::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
    opacity: .3;
  }
  .ct-metric-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
  }
  .ct-metric-icon svg { width: 16px; height: 16px; }
  .ct-metric-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .ct-metric-value { font-family: var(--mono); font-size: 20px; font-weight: 600; color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: -.5px; }
  .ct-metric-sub { font-size: 11px; color: var(--muted); }

  /* ── Controls bar ── */
  .ct-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .ct-tabs { display: flex; gap: 4px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px; }
  .ct-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: var(--r-sm); border: none; cursor: pointer;
    font-family: var(--sans); font-weight: 700; font-size: 12px;
    background: transparent; color: var(--muted); transition: all .15s; white-space: nowrap;
  }
  .ct-tab:hover { color: var(--text); }
  .ct-tab.active { background: var(--accent); color: #000; }
  .ct-tab svg { width: 14px; height: 14px; }
  .ct-tab-count { font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 99px; }
  .ct-filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .ct-select {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); border-radius: var(--r-sm); padding: 7px 10px;
    font-size: 12px; font-family: var(--sans); cursor: pointer; outline: none; transition: border-color .15s;
  }
  .ct-select:hover { border-color: var(--border2); }

  /* ── Cards grid ── */
  .ct-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .ct-grid-1 { display: grid; gap: 14px; }

  /* Trader Card */
  .ct-trader-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 18px; cursor: pointer;
    transition: all .18s; position: relative; overflow: hidden;
  }
  .ct-trader-card:hover { background: var(--surface2); }
  .ct-trader-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .ct-trader-name { font-family: var(--serif); font-size: 15px; font-weight: 600; margin-bottom: 2px; }
  .ct-trader-handle { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
  .ct-trader-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px; }
  .ct-stat-val { font-family: var(--mono); font-size: 13px; font-weight: 700; text-align: center; }
  .ct-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; text-align: center; }
  .ct-trader-footer { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
  .ct-hover-cta { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .ct-cta-btn { border-radius: 7px; padding: 6px 20px; font-size: 12px; font-weight: 700; font-family: var(--sans); cursor: pointer; border: none; background: var(--accent); color: #000; }

  /* Badge */
  .ct-badge { font-size: 10px; font-weight: 700; font-family: var(--sans); padding: 2px 8px; border-radius: 4px; white-space: nowrap; letter-spacing: .2px; }
  .ct-badge-green { background: rgba(52,211,153,.13); color: #34d399; }
  .ct-badge-blue  { background: rgba(96,165,250,.13); color: #5B8CFF; }
  .ct-badge-gold  { background: rgba(226,174,74,.13); color: #E2AE4A; }
  .ct-badge-red   { background: rgba(248,113,113,.13); color: #FF6470; }
  .ct-badge-muted { background: rgba(100,116,139,.13); color: #64748b; }

  /* Pill tag */
  .ct-pill { font-size: 10px; font-weight: 700; font-family: var(--sans); padding: 2px 8px; border-radius: 4px; white-space: nowrap; }

  /* Avatar */
  .ct-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--sans); font-weight: 700; color: #000; flex-shrink: 0; }

  /* Copying Card */
  .ct-copying-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }
  .ct-copy-actions { display: flex; gap: 8px; margin-top: 14px; }
  .ct-copy-btn { flex: 1; border-radius: var(--r-sm); padding: 8px 0; font-size: 12px; font-weight: 700; font-family: var(--sans); cursor: pointer; transition: all .15s; }
  .ct-copy-btn-pause { background: transparent; border: 1px solid var(--border); color: var(--text); }
  .ct-copy-btn-pause:hover { border-color: var(--border2); }
  .ct-copy-btn-stop { background: transparent; border: 1px solid rgba(248,113,113,.35); color: var(--red); }
  .ct-copy-btn-stop:hover { background: var(--red-dim); }

  /* Progress bar */
  .ct-progress { height: 5px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .ct-progress-fill { height: 100%; border-radius: 99px; transition: width .4s ease; }

  /* Mini stat box */
  .ct-mini-stat { background: var(--surface2); border-radius: var(--r-sm); padding: 10px 12px; }
  .ct-mini-stat-val { font-family: var(--mono); font-size: 13px; font-weight: 700; }
  .ct-mini-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* Leaderboard */
  .ct-lb-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
  .ct-lb-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .ct-lb-title { font-family: var(--serif); font-size: 16px; }
  .ct-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .ct-table th { text-align: left; padding: 9px 16px; color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; border-bottom: 1px solid var(--border); background: var(--surface2); }
  .ct-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .ct-table tr:last-child td { border-bottom: none; }
  .ct-table tr:hover td { background: var(--surface2); }
  .ct-table-copy-btn { background: transparent; border: 1px solid var(--border); color: var(--text); border-radius: 7px; padding: 6px 14px; font-size: 11px; font-weight: 700; font-family: var(--sans); cursor: pointer; transition: all .15s; }
  .ct-table-copy-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Modal */
  .ct-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); display: flex; align-items: center; justify-content: center; z-index: 600; padding: 16px; }
  .ct-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; padding: 24px; position: relative; }
  .ct-modal-close { position: absolute; top: 14px; right: 14px; background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  .ct-modal-close:hover { border-color: var(--red); color: var(--red); }
  .ct-modal-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; background: var(--surface2); border-radius: 10px; padding: 14px; }
  .ct-modal-stat-val { font-family: var(--mono); font-size: 16px; font-weight: 700; text-align: center; }
  .ct-modal-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 3px; text-align: center; }
  .ct-input-label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 6px; font-weight: 600; }
  .ct-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 10px 12px; font-size: 13px; color: var(--text); font-family: var(--sans); outline: none; transition: border-color .15s; }
  .ct-input:focus { border-color: var(--accent); }
  .ct-proj-return { background: rgba(226,174,74,.07); border: 1px solid rgba(226,174,74,.2); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .ct-disclaimer { background: rgba(200,175,76,.06); border: 1px solid rgba(200,175,76,.18); border-radius: var(--r-sm); padding: 10px; margin-bottom: 16px; font-size: 11px; color: var(--muted); line-height: 1.5; }

  /* Loading state */
  .ct-loading { display: flex; align-items: center; justify-content: center; padding: 60px; flex-direction: column; gap: 12px; color: var(--muted); font-size: 13px; }
  .ct-spinner { width: 28px; height: 28px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: ct-spin 0.7s linear infinite; }
  @keyframes ct-spin { to { transform: rotate(360deg); } }

  /* ── Upgrade gate ── */
  .ct-upgrade-modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    width: 100%; max-width: 420px; padding: 32px; position: relative; text-align: center;
  }
  .ct-upgrade-icon {
    width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 18px;
    background: linear-gradient(135deg, #f59e0b22 0%, #f59e0b44 100%);
    border: 1px solid rgba(245,158,11,.3);
    display: flex; align-items: center; justify-content: center; font-size: 26px;
  }
  .ct-upgrade-title { font-family: var(--serif); font-size: 22px; margin-bottom: 8px; }
  .ct-upgrade-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.6; }
  .ct-upgrade-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }
  .ct-plan-card {
    border-radius: var(--r-md); padding: 16px 14px; text-align: left; position: relative;
    border: 1px solid var(--border); background: var(--surface2); cursor: pointer;
    transition: all .15s;
  }
  .ct-plan-card:hover { border-color: var(--border2); transform: translateY(-1px); }
  .ct-plan-card.recommended {
    border-color: rgba(226,174,74,.4); background: rgba(226,174,74,.05);
  }
  .ct-plan-rec-badge {
    position: absolute; top: -9px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: #000; font-size: 9px; font-weight: 800;
    padding: 2px 8px; border-radius: 99px; white-space: nowrap; letter-spacing: .5px;
  }
  .ct-plan-name { font-size: 13px; font-weight: 800; margin-bottom: 4px; color: var(--text); }
  .ct-plan-price { font-family: var(--mono); font-size: 20px; font-weight: 700; color: var(--accent); }
  .ct-plan-price span { font-size: 11px; color: var(--muted); font-family: var(--sans); font-weight: 400; }
  .ct-plan-features { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }
  .ct-plan-feat { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 5px; }
  .ct-plan-feat svg { color: var(--green); width: 12px; height: 12px; }
  .ct-upgrade-cta {
    width: 100%; background: var(--accent); color: #000;
    border-radius: var(--r-sm); padding: 13px 0; font-size: 14px; font-weight: 700;
    font-family: var(--sans); cursor: pointer; border: none; transition: opacity .15s;
    margin-bottom: 10px;
  }
  .ct-upgrade-cta:hover { opacity: .88; box-shadow: 0 0 20px rgba(226,174,74,.3); }
  .ct-upgrade-skip { font-size: 12px; color: var(--muted); cursor: pointer; background: none; border: none; }
  .ct-upgrade-skip:hover { color: var(--text); }

  /* Locked trader card overlay */
  .ct-card-locked-overlay {
    position: absolute; inset: 0; border-radius: var(--r-lg);
    background: rgba(8,11,16,.72); backdrop-filter: blur(2px);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  }
  .ct-lock-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.3);
    display: flex; align-items: center; justify-content: center; color: #f59e0b;
  }
  .ct-lock-icon svg { width: 16px; height: 16px; }
  .ct-lock-label { font-size: 11px; font-weight: 700; color: var(--text); }
  .ct-lock-sub { font-size: 10px; color: var(--muted); }

  /* ── Language switcher ── */
  .lang-switcher { position: relative; display: inline-flex; align-items: center; }
  .lang-btn {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 5px 9px;
    font-size: 11px; font-weight: 600; color: var(--muted);
    cursor: pointer; font-family: var(--sans);
    transition: border-color .15s, color .15s; white-space: nowrap;
    height: 36px; width: 36px; justify-content: center;
  }
  .lang-btn:hover { border-color: var(--border2); color: var(--text); }
  .lang-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 176px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: ct-lang-fade .18s ease both;
  }
  @keyframes ct-lang-fade {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lang-option {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: var(--r-sm);
    font-size: 12px; color: var(--muted);
    cursor: pointer; font-family: var(--sans);
    transition: background .12s, color .12s;
  }
  .lang-option:hover { background: var(--surface2); color: var(--text); }
  .lang-option.active { color: var(--accent); background: var(--accent-dim); font-weight: 600; }
  .lang-section-label {
    font-size: 9px; font-weight: 700; color: var(--faint);
    letter-spacing: .1em; text-transform: uppercase; padding: 4px 10px 6px;
  }
  /* Hide Google's default toolbar */
  .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
  body { top: 0 !important; }
  .skiptranslate { display: none !important; }

  /* ── Responsive ── */
  @media (min-width: 1600px) {
    .ct-main > * { max-width: 1440px; margin-left: auto; margin-right: auto; }
  }
  @media (max-width: 1100px) { .ct-metrics { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 768px) {
    .ct-shell { grid-template-columns: 1fr !important; }
    .ct-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; transform: translateX(-100%) !important; z-index: 300 !important; }
    .ct-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
    .ct-right { grid-column: 1; }
    .ct-hamburger { display: flex; }
    .ct-grid-3 { grid-template-columns: 1fr 1fr; }
    .ct-metrics { grid-template-columns: repeat(2, 1fr); }
    .ct-topbar { gap: 8px; }
    .ct-topbar-title { font-size: 13px; }
    .ct-topbar-actions { gap: 8px; }
  }
  @media (max-width: 600px) {
    .ct-grid-3 { grid-template-columns: 1fr; }
    .ct-main { padding: 16px 16px calc(24px + env(safe-area-inset-bottom)); }
    .ct-topbar { padding: 0 12px; gap: 6px; }
    .ct-topbar-actions { gap: 6px; }
    .ct-metrics { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .ct-metric { padding: 14px 14px; }
    .ct-metric-icon { width: 28px; height: 28px; margin-bottom: 10px; }
    .ct-metric-icon svg { width: 14px; height: 14px; }
    .ct-metric-label { font-size: 9px; margin-bottom: 5px; }
    .ct-metric-value { font-size: 16px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ct-metric-sub { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ct-page-header { flex-direction: column; align-items: stretch; gap: 14px; margin-bottom: 18px; }
    .ct-page-title { font-size: 22px; }
    .ct-page-sub { font-size: 12px; flex-wrap: wrap; }
    .ct-header-actions { width: 100%; gap: 8px; }
    .ct-header-actions .ct-btn { flex: 1; padding: 9px 0; }
    .ct-profile-dropdown { right: -12px; }
  }
  @media (max-width: 420px) {
    .ct-topbar-title { display: none; }
  }
`;

/* ─── Language Switcher ───────────────────────────────────────────────────── */
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

/* ─── Spark ───────────────────────────────────────────────────────────────── */
function Spark({ data, color = T.g, h = 32, w = 72 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / (mx - mn || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  const fill = `${pts} ${w},${h} 0,${h}`;
  const id = `sg${color.replace(/[^a-z0-9]/gi,'')}`;
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
      // 1. Sign in via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }

      const userId = authData.user.id;

      // 2. Fetch user profile + USD wallet balance in parallel
      const [{ data: profile, error: profileError }, { data: wallet }] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, handle, plan, is_verified, avatar_url, currency')
          .eq('id', userId)
          .single(),
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .eq('currency', 'USD')
          .single(),
      ]);

      if (profileError || !profile) {
        setError('User profile not found. Please contact support.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const balanceUsd = parseFloat(wallet?.balance ?? 0) || 0.0;
      const fxRate = await getUsdRate(profile.currency);
      onLogin({ ...profile, balance: balanceUsd * fxRate });
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

/* ─── Currency symbol map ─────────────────────────────────────────────────── */
const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$',
  CHF: 'Fr', CNY: '¥', INR: '₹', NGN: '₦', BTC: '₿', ETH: 'Ξ',
};
function currencySymbol(code) {
  return CURRENCY_SYMBOLS[(code || '').toUpperCase()] ?? (code || '$');
}



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
const DK_ACTIVE = 'copy';
const DK_TITLE  = 'Copy Trading';
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

/* ─── Trader Card ─────────────────────────────────────────────────────────── */
function TraderCard({ t, onCopy, userPlan, settings }) {
  const [hov, setHov] = useState(false);
  const spark = t.perf?.sparkline || [];
  const allowed = canUseCopyTrading(userPlan);
  const chartLabel = settings?.chart_type ? settings.chart_type.charAt(0).toUpperCase() + settings.chart_type.slice(1) : 'Candle';
  const showVol = settings ? settings.show_volume : true;

  const handleClick = () => {
    if (allowed) onCopy(t);
  };

  return (
    <div
      className="ct-trader-card"
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ borderColor: hov ? `${t.color_hex}55` : undefined, cursor: allowed ? 'pointer' : 'default' }}
    >
      <div className="ct-trader-card-header">
        <div className="ct-av" style={{ width:42, height:42, background:t.color_hex, fontSize:14 }}>{t.initials}</div>
        <span className={`ct-badge ct-badge-${t.badge_type}`}>{t.badge_label}</span>
      </div>
      <div className="ct-trader-name">{t.display_name}</div>
      <div className="ct-trader-handle">{t.handle} · {t.market}</div>
      <div style={{ marginBottom: 12, display:'flex', alignItems:'flex-end', gap:8 }}>
        <Spark data={spark} color={t.color_hex} />
        {showVol && t.perf?.roi_pct != null && (
          <span style={{ fontSize:9, color:T.nt, marginBottom:2 }}>{chartLabel}</span>
        )}
      </div>
      <div className="ct-trader-stats">
        {[
          { label:'30D ROI',  val:`+${t.perf?.roi_pct ?? t.roi_pct ?? 0}%`, color: T.gn },
          { label:'Win Rate', val:`${t.perf?.win_rate_pct ?? t.win_rate_pct ?? 0}%`, color: T.gr },
          { label:'Copiers',  val: (t.total_copiers || 0).toLocaleString(), color: T.gr },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div className="ct-stat-val" style={{ color }}>{val}</div>
            <div className="ct-stat-lbl">{label}</div>
          </div>
        ))}
      </div>
      <div className="ct-trader-footer">
        <span className="ct-pill" style={{ background: RISK_BG[t.risk_level], color: RISK_COLOR[t.risk_level] }}>{t.risk_level} Risk</span>
        <span className="ct-pill" style={{ background: 'rgba(96,165,250,.1)', color: T.bl }}>{t.years_active}Y Active</span>
      </div>
      {!allowed && (
        <div className="ct-card-locked-overlay">
          <div className="ct-lock-icon"><Lock size={16} /></div>
          <div className="ct-lock-label">Pro Plan Required</div>
          <div className="ct-lock-sub">Upgrade to copy this trader</div>
        </div>
      )}
      {allowed && hov && (
        <div className="ct-hover-cta" style={{ background: `linear-gradient(transparent, ${t.color_hex || T.g}22)` }}>
          <button className="ct-cta-btn" style={{ background: t.color_hex || T.g, color: '#000' }}>Copy Trader →</button>
        </div>
      )}
    </div>
  );
}

/* ─── Copying Card ────────────────────────────────────────────────────────── */
function CopyingCard({ rel, symbol = '$' }) {
  const t = rel.trader_profiles;
  if (!t) return null;
  const allocated = parseFloat(rel.allocated_amount) || 0;
  const gain      = parseFloat(rel.realised_gain) || 0;
  const pct       = allocated > 0 ? ((gain / allocated) * 100).toFixed(1) : '0.0';
  const since     = rel.started_at ? new Date(rel.started_at).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : '—';

  return (
    <div className="ct-copying-card">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div className="ct-av" style={{ width:38, height:38, background:t.color_hex, fontSize:13 }}>{t.initials}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily: T.serif, fontSize:14, fontWeight:600 }}>{t.display_name}</div>
          <div style={{ fontSize:11, color:T.nt }}>{t.handle}</div>
        </div>
        <span className={`ct-badge ct-badge-${rel.status === 'active' ? 'green' : rel.status === 'pending' ? 'gold' : rel.status === 'paused' ? 'muted' : 'red'}`}>
          {rel.status === 'pending' ? 'Confirming payment' : rel.status.charAt(0).toUpperCase() + rel.status.slice(1)}
        </span>
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:T.nt, marginBottom:6 }}>
          <span>Allocated</span>
          <span style={{ color: T.gn }}>+{pct}% gain</span>
        </div>
        <div className="ct-progress">
          <div className="ct-progress-fill" style={{ width:`${Math.min(parseFloat(pct) * 3, 100)}%`, background: t.color_hex }} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
        {[
          { label:'Allocated', val:`${symbol}${allocated.toLocaleString()}` },
          { label:'Gain',      val:`+${symbol}${gain.toLocaleString()}`,    color: T.gn },
          { label:'Ratio',     val: rel.copy_ratio === 'proportional' ? 'Prop.' : 'Fixed' },
          { label:'Since',     val: since },
        ].map(({ label, val, color }) => (
          <div key={label} className="ct-mini-stat">
            <div className="ct-mini-stat-val" style={{ color: color || T.gr }}>{val}</div>
            <div className="ct-mini-stat-lbl">{label}</div>
          </div>
        ))}
      </div>
      {rel.status === 'pending' ? (
        <div style={{ fontSize:12, color:T.nt, lineHeight:1.5, padding:'10px 12px', background:T.s2, borderRadius:8 }}>
          We've received your payment. Copying starts as soon as we confirm it, usually within a few hours.
        </div>
      ) : (
        <div className="ct-copy-actions">
          <button className="ct-copy-btn ct-copy-btn-pause">⏸ Pause</button>
          <button className="ct-copy-btn ct-copy-btn-stop">✕ Stop</button>
        </div>
      )}
    </div>
  );
}

/* ─── Leaderboard ─────────────────────────────────────────────────────────── */
function Leaderboard({ traders, onCopy, userPlan, settings }) {
  const sorted = [...traders].sort((a, b) => (b.perf?.roi_pct ?? b.roi_pct ?? 0) - (a.perf?.roi_pct ?? a.roi_pct ?? 0));
  const medals = ['🥇','🥈','🥉'];
  const allowed = canUseCopyTrading(userPlan);
  return (
    <div className="ct-lb-wrap">
      <div className="ct-lb-head">
        <span className="ct-lb-title">30-Day Leaderboard</span>
        <span className="ct-badge ct-badge-gold">Live Rankings</span>
      </div>
      <table className="ct-table">
        <thead>
          <tr>
            {['#','Trader','Market','30D ROI','Win Rate','Copiers',''].map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            const roi = t.perf?.roi_pct ?? t.roi_pct ?? 0;
            const wr  = t.perf?.win_rate_pct ?? t.win_rate_pct ?? 0;
            return (
              <tr key={t.handle}>
                <td style={{ fontFamily: T.mono, fontWeight:800, fontSize:14, color: i < 3 ? T.g : T.nt }}>{medals[i] || i+1}</td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="ct-av" style={{ width:30, height:30, background:t.color_hex, fontSize:10 }}>{t.initials}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{t.display_name}</div>
                      <div style={{ fontSize:11, color:T.nt }}>{t.handle}</div>
                    </div>
                  </div>
                </td>
                <td><span className="ct-badge ct-badge-blue">{t.market}</span></td>
                <td style={{ fontFamily:T.mono, fontWeight:800, color: T.gn }}>+{roi}%</td>
                <td style={{ fontFamily:T.mono }}>{wr}%</td>
                <td style={{ fontFamily:T.mono }}>{(t.total_copiers||0).toLocaleString()}</td>
                <td><button
                  className="ct-table-copy-btn"
                  onClick={() => allowed && onCopy(t)}
                  disabled={!allowed}
                  title={!allowed ? 'Upgrade to Pro to copy traders' : undefined}
                  style={!allowed ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  {allowed ? 'Copy' : '🔒 Pro'}
                </button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Copy Modal ──────────────────────────────────────────────────────────── */
function CopyModal({ trader: t, onClose, userId, userPlan }) {
  const [amount, setAmount]     = useState('');
  const [stopLoss, setStopLoss] = useState('15');
  const [ratio, setRatio]       = useState('proportional');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveErr, setSaveErr]   = useState('');
  const [paying, setPaying]     = useState(false);   // crypto payment step
  const estReturn = amount ? ((parseFloat(amount) * (t.perf?.roi_pct ?? t.roi_pct ?? 0)) / 100).toFixed(2) : null;
  const allowed = canUseCopyTrading(userPlan);

  /* Step 1: check the amount, then open the payment modal */
  const handleStartCopying = () => {
    if (!amount || parseFloat(amount) <= 0) { setSaveErr('Please enter a valid amount.'); return; }
    setSaveErr('');
    setPaying(true);
  };

  /* Step 2: called by the payment modal once the proof is uploaded — file a pending copy.
     An admin checks the payment (Admin → Copy trading → Requests) and switches it on. */
  const submitPayment = async (pay) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('copy_relationships').insert({
        copier_id:        userId,
        trader_id:        t.id,
        allocated_amount: parseFloat(amount),
        currency:         'USD',
        copy_ratio:       ratio,
        stop_loss_pct:    parseFloat(stopLoss) || null,
        status:           'pending',
        realised_gain:    0,
        pay_coin:         pay.coin,
        pay_network:      pay.network,
        pay_tx_hash:      pay.txHash,
        proof_url:        pay.proofPath,
        payment_tx_id:    pay.transactionId,
      });
      if (error) {
        // copy_relationships allows one row per copier and trader
        if (error.code === '23505') throw new Error(`You already have a copy of ${t.display_name.split(' ')[0]} running or waiting for confirmation.`);
        throw error;
      }
      setPaying(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="ct-modal" onClick={e => e.stopPropagation()} >
        <button className="ct-modal-close" onClick={onClose}><X size={14} /></button>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <div className="ct-av" style={{ width:50, height:50, background:t.color_hex, fontSize:16 }}>{t.initials}</div>
          <div>
            <div style={{ fontFamily:T.serif, fontSize:19, fontWeight:600, marginBottom:4 }}>{t.display_name}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:12, color:T.nt }}>{t.handle} · {t.market}</span>
              <span className={`ct-badge ct-badge-${t.badge_type}`}>{t.badge_label}</span>
            </div>
          </div>
        </div>
        <div className="ct-modal-stats">
          {[
            { label:'30D ROI',  val:`+${t.perf?.roi_pct ?? t.roi_pct ?? 0}%`, color: T.gn },
            { label:'Win Rate', val:`${t.perf?.win_rate_pct ?? t.win_rate_pct ?? 0}%`,   color: T.gr },
            { label:'Copiers',  val: (t.total_copiers||0).toLocaleString(), color: T.gr },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div className="ct-modal-stat-val" style={{ color }}>{val}</div>
              <div className="ct-modal-stat-lbl">{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:T.nt, marginBottom:20, lineHeight:1.6, padding:'10px 12px', background: T.s2, borderRadius:8 }}>
          {t.strategy_desc}
        </div>
        {!allowed ? (
          /* ── Upgrade wall for Basic plan users ── */
          <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
            <div style={{
              width:56, height:56, borderRadius:14, margin:'0 auto 16px',
              background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.35)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#f59e0b',
            }}>
              <Lock size={24} />
            </div>
            <div style={{ fontFamily:T.serif, fontSize:18, fontWeight:600, marginBottom:8 }}>Pro Plan Required</div>
            <div style={{ fontSize:13, color:T.nt, lineHeight:1.6, marginBottom:20 }}>
              Copy trading is available on <strong style={{ color:T.gr }}>Pro</strong> and above plans.<br />
              Upgrade your account to mirror elite traders automatically.
            </div>
            <div style={{ background: T.s2, borderRadius:10, padding:'14px 16px', marginBottom:20, textAlign:'left' }}>
              {['Mirror verified top traders', 'Set custom stop-loss levels', 'Proportional & fixed ratio copying', 'Real-time performance tracking'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:T.gr, marginBottom:8 }}>
                  <Check size={14} style={{ color:T.gn, flexShrink:0 }} />{f}
                </div>
              ))}
            </div>
            <button
              className="ct-upgrade-cta"
              style={{ width:'100%', background:T.g, color:'#000', borderRadius:10, padding:'13px 0', fontSize:14, fontWeight:700, fontFamily:T.sans, cursor:'pointer', border:'none', marginBottom:10 }}
              onClick={() => { /* navigate to upgrade page */ }}
            >
              Upgrade to Pro →
            </button>
            <button className="ct-upgrade-skip" onClick={onClose}>Maybe later</button>
          </div>
        ) : saved ? (
          <div style={{ background:'rgba(226,174,74,.08)', border:'1px solid rgba(226,174,74,.3)', borderRadius:10, padding:'18px', textAlign:'center' }}>
            <Check size={20} style={{ display:'block', margin:'0 auto 6px', color:T.g }} />
            <div style={{ fontSize:14, fontWeight:600, color:T.gr, marginBottom:6 }}>Payment submitted</div>
            <div style={{ fontSize:12.5, color:T.nt, lineHeight:1.6 }}>
              We've received your ${parseFloat(amount).toLocaleString()} payment to copy {t.display_name.split(' ')[0]}.
              Copying starts as soon as we confirm it, usually within a few hours. You'll see it under <strong style={{ color:T.gr }}>Copying</strong>, marked as confirming until then.
            </div>
          </div>
        ) : (
          <>
            {[
              { label:'Amount to copy (USD)', ph:'e.g. 1000', val:amount,   set:setAmount,   type:'number' },
              { label:'Stop loss (%)',         ph:'e.g. 15',   val:stopLoss, set:setStopLoss, type:'number' },
            ].map(({ label, ph, val, set, type }) => (
              <div key={label} style={{ marginBottom:14 }}>
                <label className="ct-input-label">{label}</label>
                <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} className="ct-input" />
              </div>
            ))}
            <div style={{ marginBottom:16 }}>
              <label className="ct-input-label">Copy ratio</label>
              <select value={ratio} onChange={e => setRatio(e.target.value)} className="ct-input">
                <option value="proportional">Proportional (recommended)</option>
                <option value="fixed">Fixed lot size</option>
              </select>
            </div>
            {estReturn && (
              <div className="ct-proj-return">
                <span style={{ fontSize:12, color:T.nt }}>Projected 30D return (at {t.perf?.roi_pct ?? t.roi_pct ?? 0}%)</span>
                <span style={{ fontFamily:T.mono, fontWeight:800, color:T.g, fontSize:16 }}>+${estReturn}</span>
              </div>
            )}
            {saveErr && <div className="ct-login-err" style={{ marginBottom:12 }}>{saveErr}</div>}
            <div className="ct-disclaimer">
              <Info size={13} style={{ color:T.g, verticalAlign:-2, marginRight:5, display:'inline' }} />
              Copy trading involves risk. Past performance is not a guarantee of future results.
            </div>
            <button
              className="ct-btn ct-btn-accent"
              style={{ width:'100%', padding:'13px 0', fontSize:14, borderRadius:10, fontWeight:700 }}
              onClick={handleStartCopying}
              disabled={saving}
            >
              {`Start Copying ${t.display_name.split(' ')[0]} →`}
            </button>
          </>
        )}
      </div>
      {paying && (
        <CryptoCheckout
          title="Copy trading payment"
          amount={parseFloat(amount)}
          label={`Amount to copy ${t.display_name}`}
          confirmLabel="Confirm copy trading payment"
          userId={userId}
          context={`copy-${t.id}`}
          transaction={{ type: 'copy_trading', description: `Copy trading: ${t.display_name}` }}
          onSubmit={submitPayment}
          onClose={() => setPaying(false)}
        />
      )}
    </div>
  );
}

/* ─── Settings helpers ────────────────────────────────────────────────────── */
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
  .ct-metric, .ct-trader-card, .ct-copying-card, .ct-lb-wrap, .ct-modal { background: var(--surface); border-color: var(--border); }
  .ct-tabs, .ct-select, .ct-input, .ct-login-input { background: var(--surface2); border-color: var(--border); color: var(--text); }
  .ct-mini-stat { background: var(--surface2); }
  .ct-table th { background: var(--surface2); }
  .ct-table tr:hover td { background: var(--surface2); }
  .ct-login-card { background: var(--surface); border-color: var(--border); }
  .ct-login-wrap { background: var(--bg); }
`;

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

  // density
  rootEl.style.setProperty('--density-pad', DENSITY_PADDING[density] || DENSITY_PADDING.comfortable);
  rootEl.style.setProperty('--density-gap', DENSITY_GAP[density]     || DENSITY_GAP.comfortable);
  rootEl.style.fontSize = DENSITY_FONT[density] || '14px';

  return theme;
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function CopyTrading() {
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab,         setTab]         = useState('top');
  const [modal,       setModal]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters,     setFilters]     = useState({ market:'', risk:'', sort:'roi' });
  const [settings,    setSettings]    = useState(null);   // user_settings row
  const [activeTheme, setActiveTheme] = useState('dark'); // resolved theme

  // Data from Supabase
  const [traders,     setTraders]     = useState([]);
  const [copyingRels, setCopyingRels] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [fetchErr,    setFetchErr]    = useState('');

  /* ── Apply settings to CSS vars whenever settings change ── */
  useEffect(() => {
    if (!settings) return;
    const theme = applySettings(settings);
    setActiveTheme(theme);
  }, [settings]);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  /* ── Watch system colour-scheme changes when theme === 'system' ── */
  useEffect(() => {
    if (settings?.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => setActiveTheme(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings?.theme]);

  /* ── Fetch user_settings from Supabase ── */
  const fetchSettings = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('fetchSettings error:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // No row yet for this user — create one with defaults.
        // Use upsert + ignoreDuplicates so a race with another
        // in-flight call (e.g. React StrictMode double-invoke,
        // re-render, multiple tabs) doesn't throw a 409.
        const { data: created, error: insertError } = await supabase
          .from('user_settings')
          .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
          .select()
          .maybeSingle();

        if (created) {
          setSettings(created);
        } else {
          // Either ignoreDuplicates silently skipped the insert (conflict,
          // no error) or we hit 23505 directly — either way, someone else
          // already created the row, so just re-fetch it.
          const { data: existing } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (existing) setSettings(existing);
          else if (insertError) console.error('fetchSettings insert error:', insertError);
        }
      }
    } catch (_) {
      // non-critical; silently fall back to defaults
    }
  }, []);

  /* ── 1. On mount: restore session ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userId = session.user.id;

        const [{ data: profile }, { data: wallet }] = await Promise.all([
          supabase
            .from('users')
            .select('id, first_name, last_name, handle, plan, is_verified, currency')
            .eq('id', userId)
            .single(),
          supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single(),
        ]);

        if (profile) {
          const balanceUsd = parseFloat(wallet?.balance ?? 0) || 0.0;
          const fxRate = await getUsdRate(profile.currency);
          setUser({
            ...profile,
            balance: balanceUsd * fxRate,
          });
          await fetchSettings(userId);
        }
      }
      setAuthLoading(false);
    });
  }, []);

  /* ── 2. Fetch data + settings whenever the logged-in user changes ── */
  useEffect(() => {
    if (!user) return;
    fetchData();
    fetchSettings(user.id);
  }, [user]);

  /* ── Fetch trader_profiles + trader_performance + copy_relationships ── */
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setFetchErr('');
    try {
      // Fetch all active trader profiles with their 30D performance row
      const { data: profileData, error: profileErr } = await supabase
        .from('trader_profiles')
        .select(`
          id, handle, display_name, market, risk_level,
          total_copiers, years_active, color_hex, badge_label, badge_type,
          initials, strategy_desc, is_verified, is_active,
          trader_performance (
            roi_pct, win_rate_pct, max_drawdown_pct, sparkline, period
          )
        `)
        .eq('is_active', true)
        .order('total_copiers', { ascending: false });

      if (profileErr) throw profileErr;

      const enriched = (profileData || []).map(tp => {
        const perf30 = (tp.trader_performance || []).find(p => p.period === '30D');
        return {
          ...tp,
          perf: perf30
            ? { ...perf30, sparkline: perf30.sparkline || [] }
            : null,
        };
      });
      setTraders(enriched);

      // Fetch this user's active/paused copy relationships
      const { data: relData, error: relErr } = await supabase
        .from('copy_relationships')
        .select(`
          id, allocated_amount, currency, copy_ratio, stop_loss_pct,
          status, realised_gain, started_at,
          trader_profiles (
            id, handle, display_name, color_hex, initials, market, badge_type
          )
        `)
        .eq('copier_id', user.id)
        .in('status', ['active', 'paused', 'pending']);   // pending = paid, waiting for an admin to confirm

      if (relErr) throw relErr;
      const fxRate = await getUsdRate(user.currency);
      const relConverted = (relData || []).map(r => ({
        ...r,
        allocated_amount: (parseFloat(r.allocated_amount) || 0) * fxRate,
        realised_gain:    (parseFloat(r.realised_gain) || 0) * fxRate,
      }));
      setCopyingRels(relConverted);

    } catch (err) {
      console.error('fetchData error:', err);
      setFetchErr(err.message || 'Failed to load data.');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  /* ── Derived metrics ── */
  const liveRels       = copyingRels.filter(r => r.status !== 'pending');
  const pendingRels    = copyingRels.filter(r => r.status === 'pending');
  const totalAllocated = liveRels.reduce((s, r) => s + parseFloat(r.allocated_amount || 0), 0);
  const totalGain      = liveRels.reduce((s, r) => s + parseFloat(r.realised_gain || 0), 0);
  const metricsSymbol  = currencySymbol(user?.currency);
  const bestPerformer  = traders.reduce((best, t) => {
    const roi = t.perf?.roi_pct ?? 0;
    return roi > (best?.perf?.roi_pct ?? 0) ? t : best;
  }, null);

  const METRICS = [
    { label:'Copying',        value:`${liveRels.length} Trader${liveRels.length !== 1 ? 's' : ''}`, sub: pendingRels.length ? `${pendingRels.length} awaiting payment confirmation` : 'Active now', color: T.g,  Icon:Copy },
    { label:'Copy Gains',     value:totalGain >= 0 ? `+${metricsSymbol}${totalGain.toLocaleString()}` : `-${metricsSymbol}${Math.abs(totalGain).toLocaleString()}`, sub:`▲ Total realised gain`, color: '#34d399', Icon:TrendingUp },
    { label:'Allocated',      value:`${metricsSymbol}${totalAllocated.toLocaleString()}`, sub:'Total in copy trades', color: T.bl, Icon:Wallet },
    { label:'Best Performer', value: bestPerformer ? bestPerformer.handle : '—', sub: bestPerformer ? `+${bestPerformer.perf?.roi_pct ?? 0}% / 30D` : 'No data yet', color: T.g,  Icon:Trophy },
  ];

  /* ── Filters ── */
  const filtered = traders
    .filter(t => !filters.market || t.market === filters.market)
    .filter(t => !filters.risk   || t.risk_level === filters.risk)
    .sort((a, b) => {
      if (filters.sort === 'wr')      return (b.perf?.win_rate_pct ?? b.win_rate_pct ?? 0) - (a.perf?.win_rate_pct ?? a.win_rate_pct ?? 0);
      if (filters.sort === 'copiers') return (b.total_copiers || 0) - (a.total_copiers || 0);
      return (b.perf?.roi_pct ?? b.roi_pct ?? 0) - (a.perf?.roi_pct ?? a.roi_pct ?? 0);
    });

  const sel = key => e => setFilters(f => ({ ...f, [key]: e.target.value }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTraders([]);
    setCopyingRels([]);
  };

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
      {/* Grid-lines toggle: hide SVG grid elements when show_grid_lines is false */}
      {settings?.show_grid_lines === false && (
        <style dangerouslySetInnerHTML={{ __html: `.recharts-cartesian-grid { display: none; }` }} />
      )}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:299 }} />
      )}

      <div className="ct-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />

        <div className="ct-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} settings={settings} onLogout={handleLogout} />

          <main className="ct-main" style={{ padding: `24px var(--density-pad, 28px) 40px` }}>
            {/* Page header */}
            <div className="ct-page-header">
              <div>
                <div className="ct-page-title"><em>Copy Trading</em></div>
                <div className="ct-page-sub">
                  <span className="ct-live-dot" />
                  Mirror elite traders automatically. Start, pause, or stop anytime.
                </div>
              </div>
              <div className="ct-header-actions">
                <a href="#" className="ct-btn ct-btn-ghost ct-btn-sm"><Download size={13} /> Export</a>
                <a href="/copy-trading" className="ct-btn ct-btn-accent ct-btn-sm"><Plus size={13} /> New Copy</a>
              </div>
            </div>

            {/* Fetch error */}
            {fetchErr && (
              <div className="ct-login-err" style={{ marginBottom:14 }}>
                <AlertCircle size={14} style={{ marginRight:6, verticalAlign:-2 }} />{fetchErr}
              </div>
            )}

            {/* Metrics */}
            <div className="ct-metrics" style={{ gap: `var(--density-gap, 14px)`, marginBottom: 20 }}>
              {METRICS.map(m => <MetricCard key={m.label} m={m} />)}
            </div>

            {/* Controls */}
            <div className="ct-controls">
              <div className="ct-tabs">
                {[
                  { key:'top',     label:'Top Traders', Icon:Users },
                  { key:'copying', label:'Copying',     Icon:Copy, count: copyingRels.length },
                  { key:'leaders', label:'Leaderboard', Icon:Trophy },
                ].map(({ key, label, Icon, count }) => (
                  <button key={key} className={`ct-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                    <Icon size={14} />
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

              {tab === 'top' && (
                <div className="ct-filters">
                  <select value={filters.market} onChange={sel('market')} className="ct-select">
                    <option value="">All Markets</option>
                    <option>Crypto</option><option>Forex</option><option>Stocks</option>
                  </select>
                  <select value={filters.risk} onChange={sel('risk')} className="ct-select">
                    <option value="">All Risk</option>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                  <select value={filters.sort} onChange={sel('sort')} className="ct-select">
                    <option value="roi">Sort: ROI</option>
                    <option value="wr">Win Rate</option>
                    <option value="copiers">Copiers</option>
                  </select>
                </div>
              )}
            </div>

            {/* Content */}
            {dataLoading ? (
              <div className="ct-loading"><div className="ct-spinner" /><span>Fetching traders…</span></div>
            ) : (
              <>
                {tab === 'top' && (
                  <div className="ct-grid-3" style={{ gap: `var(--density-gap, 14px)` }}>
                    {filtered.map(t => <TraderCard key={t.handle} t={t} onCopy={setModal} userPlan={user?.plan} settings={settings} />)}
                    {filtered.length === 0 && (
                      <div style={{ gridColumn:'1/-1', textAlign:'center', color:T.nt, padding:40, fontSize:13 }}>
                        No traders match those filters.
                      </div>
                    )}
                  </div>
                )}

                {tab === 'copying' && (
                  <div className="ct-grid-3" style={{ gap: `var(--density-gap, 14px)` }}>
                    {copyingRels.length === 0
                      ? <div style={{ gridColumn:'1/-1', textAlign:'center', color:T.nt, padding:40, fontSize:13 }}>You are not copying any traders yet.</div>
                      : copyingRels.map(rel => <CopyingCard key={rel.id} rel={rel} symbol={currencySymbol(user?.currency)} />)
                    }
                  </div>
                )}

                {tab === 'leaders' && (
                  <div className="ct-grid-1">
                    <Leaderboard traders={traders} onCopy={setModal} userPlan={user?.plan} settings={settings} />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {modal && (
        <CopyModal
          trader={modal}
          onClose={() => { setModal(null); fetchData(); }}
          userId={user.id}
          userPlan={user?.plan}
        />
      )}
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
