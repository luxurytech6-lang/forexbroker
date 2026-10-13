import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, TrendingUp, Loader2, Download, Plus, Receipt, Target, Lock, Zap, Check, AlertCircle, Search, ShieldCheck,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }

  :root {
    --bg:          #07101E;
    --surface:     #0C1A2E;
    --surface2:    #112238;
    --border:      #1C2C45;
    --border2:     #2A3D5C;
    --text:        #EEF2F7;
    --muted:       #8A9AB2;
    --faint:       #56677F;
    --accent:      #E2AE4A;
    --accent-rgb:  226,174,74;
    --accent-dim:  rgba(226,174,74,.12);
    --accent-glow: rgba(226,174,74,.06);
    --green:       #34d399;
    --green-dim:   rgba(52,211,153,.12);
    --red:         #FF6470;
    --red-dim:     rgba(248,113,113,.12);
    --blue:        #5B8CFF;
    --purple:      #B49BFF;
    --orange:      #fb923c;
    --sidebar-w:   256px;
    --topbar-h:    60px;
    --sans:   'Instrument Sans', system-ui, sans-serif;
    --serif:  'Instrument Serif', serif;
    --mono:   'Instrument Sans', system-ui, sans-serif;
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
  input, select, textarea { font-family: var(--sans); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  /* ── Shell ── */
  .ht-shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .ht-sidebar {
    grid-column: 1 !important;
    grid-row: 1 !important;
    background: var(--surface) !important;
    border-right: 1px solid var(--border) !important;
    display: flex !important;
    flex-direction: column !important;
    width: var(--sidebar-w) !important;
    min-width: var(--sidebar-w) !important;
    height: 100vh !important;
    height: 100dvh !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    position: relative !important;
    top: auto !important; left: auto !important;
    transform: none !important;
    z-index: 100 !important;
    transition: transform .25s cubic-bezier(.4,0,.2,1) !important;
    flex-shrink: 0 !important;
  }
  .ht-sidebar::after {
    content: '';
    position: absolute; top: 0; right: 0;
    width: 1px; height: 100%;
    background: linear-gradient(180deg, transparent 0%, var(--accent) 30%, var(--border) 60%, transparent 100%);
    opacity: .15; pointer-events: none;
  }

  /* Brand */
  .ht-brand {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .ht-brand-icon {
    width: 34px; height: 34px; background: var(--accent); border-radius: 9px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ht-brand-icon svg { width: 18px; height: 18px; color: #000; }
  .ht-brand-name { font-size: 16px; font-weight: 700; letter-spacing: -.3px; }
  .ht-brand-name em { color: var(--accent); font-style: normal; }

  /* Portfolio pill */
  .ht-sb-pill {
    margin: 12px 16px;
    background: var(--accent-dim);
    border: 1px solid rgba(226,174,74,.18);
    border-radius: var(--r-md); padding: 10px 14px; flex-shrink: 0;
  }
  .ht-sb-pill-label {
    font-size: 10px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .ht-live-dot {
    width: 6px; height: 6px; background: var(--green);
    border-radius: 50%; animation: ht-pulse 2s infinite; flex-shrink: 0;
  }
  @keyframes ht-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .ht-sb-pill-val { font-family: var(--mono); font-size: 19px; font-weight: 600; color: var(--accent); letter-spacing: -.5px; }
  .ht-sb-pill-sub { font-size: 11px; color: var(--green); margin-top: 3px; }

  /* Nav */
  .ht-sb-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
  .ht-sb-section {
    padding: 10px 20px 4px; font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.5px; color: var(--faint);
  }
  .ht-sb-link {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 20px; font-size: 13px; font-weight: 500;
    color: var(--muted); border-left: 2px solid transparent;
    transition: all .15s; cursor: pointer; text-decoration: none;
  }
  .ht-sb-link svg { flex-shrink: 0; width:18px; height:18px; }
  .ht-sb-link:hover { color: var(--text); background: var(--accent-glow); border-left-color: var(--border2); }
  .ht-sb-link.active { color: var(--accent); background: var(--accent-dim); border-left-color: var(--accent); }
  .ht-sb-link.active svg { filter: drop-shadow(0 0 6px var(--accent)); }
  .ht-sb-badge {
    margin-left: auto; font-size: 9px; font-weight: 700;
    background: var(--accent); color: #000; padding: 2px 6px; border-radius: 5px;
  }

  /* User block */
  .ht-sb-user {
    flex-shrink: 0; border-top: 1px solid var(--border);
    padding: 14px 16px; display: flex; align-items: center; gap: 10px; min-width: 0;
  }
  .ht-sb-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 0 12px rgba(226,174,74,.3);
  }
  .ht-sb-user-name { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ht-sb-user-role { font-size: 10px; color: var(--accent); margin-top: 1px; }
  .ht-sb-link.logout { color: var(--red); }
  .ht-sb-link.logout:hover { background: var(--red-dim); border-left-color: var(--red); color: var(--red); }
  .ht-sb-link.logout svg { color: var(--red); }

  /* ── Profile dropdown ── */
  .ht-avatar-wrap { position: relative; display: inline-flex; }
  .ht-profile-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 190px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: ht-lang-fade .18s ease both;
  }
  .ht-profile-head {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px 10px; border-bottom: 1px solid var(--border); margin-bottom: 6px;
  }
  .ht-profile-head-name { font-size: 12px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ht-profile-head-role { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .ht-profile-option {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: var(--r-sm);
    font-size: 12px; color: var(--muted); font-weight: 500;
    cursor: pointer; font-family: var(--sans);
    transition: background .12s, color .12s; text-decoration: none;
  }
  .ht-profile-option svg { width: 15px; height: 15px; flex-shrink: 0; }
  .ht-profile-option:hover { background: var(--surface2); color: var(--text); }
  .ht-profile-option.logout { color: var(--red); }
  .ht-profile-option.logout:hover { background: var(--red-dim); color: var(--red); }

  /* ── Right panel ── */
  .ht-right {
    grid-column: 2;
    display: flex; flex-direction: column;
    height: 100vh; height: 100dvh; overflow: hidden;
  }

  /* ── Topbar ── */
  .ht-topbar {
    height: var(--topbar-h); flex-shrink: 0;
    display: flex; align-items: center;
    padding: 0 28px; background: var(--surface);
    border-bottom: 1px solid var(--border); gap: 16px; z-index: 50;
  }
  .ht-topbar-title { font-family: var(--serif); font-size: 15px; color: var(--text); flex: 1; }
  .ht-topbar-title span { color: var(--accent); font-style: italic; }
  .ht-topbar-icon {
    width: 36px; height: 36px; border-radius: var(--r-sm);
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; color: var(--muted); font-size: 18px; position: relative;
  }
  .ht-topbar-icon:hover { border-color: var(--border2); color: var(--text); }
  .ht-notif-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; background: var(--red); border-radius: 50%;
    border: 1.5px solid var(--surface);
  }
  .ht-topbar-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 0 10px rgba(226,174,74,.25);
  }
  .ht-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; flex-shrink: 0; }
  .ht-hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }
  .ht-topbar-actions { display: flex; align-items: center; gap: 16px; margin-left: auto; flex-shrink: 0; }

  /* ── Main scroll area ── */
  .ht-main { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px 28px calc(40px + env(safe-area-inset-bottom, 0px)); }

  /* Page header */
  .ht-page-header {
    display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;
  }
  .ht-page-title { font-family: var(--serif); font-size: 28px; line-height: 1.2; }
  .ht-page-title em { color: var(--accent); font-style: italic; }
  .ht-page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
  .ht-header-actions { display: flex; gap: 8px; }

  /* ── Buttons ── */
  .ht-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; border-radius: var(--r-sm); font-family: var(--sans); font-weight: 600;
    cursor: pointer; transition: all .15s; border: none; white-space: nowrap; text-decoration: none;
  }
  .ht-btn-sm  { font-size: 12px; padding: 7px 14px; }
  .ht-btn-md  { font-size: 13px; padding: 9px 18px; }
  .ht-btn-accent { background: var(--accent); color: #000; }
  .ht-btn-accent:hover { opacity: .88; box-shadow: 0 0 20px rgba(226,174,74,.3); }
  .ht-btn-ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text); }
  .ht-btn-ghost:hover { border-color: var(--border2); }
  .ht-btn-full { width: 100%; justify-content: center; }

  /* ── Metrics row ── */
  .ht-metrics {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px;
  }
  .ht-metric {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 18px 20px;
    position: relative; overflow: hidden; transition: border-color .2s, transform .2s;
  }
  .ht-metric:hover { border-color: var(--border2); transform: translateY(-1px); }
  .ht-metric::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
    opacity: .3;
  }
  .ht-metric-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; margin-bottom: 12px;
  }
  .ht-metric-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .ht-metric-value { font-family: var(--mono); font-size: 20px; font-weight: 600; line-height: 1; margin-bottom: 5px; letter-spacing: -.5px; }
  .ht-metric-sub { font-size: 11px; color: var(--muted); }

  /* ── Two column layout ── */
  .ht-grid-2 { display: grid; grid-template-columns: 1fr 360px; gap: 18px; margin-bottom: 22px; }

  /* ── Card ── */
  .ht-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 22px; transition: border-color .2s;
  }
  .ht-card:hover { border-color: var(--border2); }
  .ht-card-title {
    font-size: 11px; font-weight: 700; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
  }
  .ht-card-subtitle { font-size: 13px; color: var(--muted); margin-bottom: 18px; }

  /* Form */
  .ht-form-group { margin-bottom: 14px; }
  .ht-form-label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 6px; font-weight: 600; }
  .ht-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 10px 12px; font-size: 13px; color: var(--text);
    font-family: var(--sans); outline: none; transition: border-color .15s; resize: none;
  }
  .ht-input:focus { border-color: var(--accent); }

  /* How it works */
  .ht-how-step {
    display: flex; gap: 14px; padding-bottom: 18px; margin-bottom: 18px;
    border-bottom: 1px solid var(--border); position: relative;
  }
  .ht-how-step:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
  .ht-how-num {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: var(--accent-dim); border: 1px solid rgba(226,174,74,.25);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--accent);
  }
  .ht-how-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .ht-how-desc { font-size: 12px; color: var(--muted); line-height: 1.55; }

  /* Security card */
  .ht-security {
    background: rgba(52,211,153,.05); border: 1px solid rgba(52,211,153,.2);
    border-radius: var(--r-lg); padding: 16px 18px; margin-top: 14px;
    display: flex; gap: 14px; align-items: flex-start;
  }
  .ht-security svg { width:22px; height:22px; color: var(--green); flex-shrink: 0; margin-top: 1px; }
  .ht-security-title { font-size: 13px; font-weight: 700; color: var(--green); margin-bottom: 4px; }
  .ht-security-body { font-size: 12px; color: var(--muted); line-height: 1.55; }

  /* ── Professionals grid ── */
  .ht-pros-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 18px; flex-wrap: wrap; gap: 10px;
  }
  .ht-filter-select {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    border-radius: var(--r-sm); padding: 7px 12px; font-size: 12px;
    font-family: var(--sans); outline: none; cursor: pointer; transition: border-color .15s;
  }
  .ht-filter-select:hover { border-color: var(--border2); }

  .ht-traders-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }

  .ht-trader-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-md); padding: 14px;
    transition: all .18s; cursor: default;
  }
  .ht-trader-card:hover { border-color: var(--border2); transform: translateY(-1px); }

  .ht-trader-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .ht-trader-av {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 12px; color: #000; flex-shrink: 0;
  }
  .ht-trader-name { font-size: 12px; font-weight: 700; color: var(--text); }
  .ht-trader-handle { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .ht-specialty-badge {
    margin-left: auto; font-size: 9px; font-weight: 700; padding: 2px 7px;
    border-radius: 5px; background: var(--accent-dim); color: var(--accent); white-space: nowrap;
  }

  .ht-trader-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
  .ht-stat-box { background: var(--surface); border-radius: var(--r-sm); padding: 8px 10px; }
  .ht-stat-val { font-family: var(--mono); font-size: 13px; font-weight: 700; }
  .ht-stat-lbl { font-size: 9px; color: var(--muted); margin-top: 2px; }

  .ht-trader-meta { font-size: 10px; color: var(--muted); margin-bottom: 10px; display: flex; flex-direction: column; gap: 3px; }
  .ht-trader-meta strong { color: var(--text); }
  .ht-trader-meta .gold { color: var(--accent); }

  /* ── Modal ── */
  .ht-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 600; padding: 16px;
  }
  .ht-modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
    width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto;
    padding: 24px; position: relative;
  }
  .ht-modal-close {
    position: absolute; top: 14px; right: 14px;
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); border-radius: 8px; width: 28px; height: 28px;
    cursor: pointer; font-size: 14px;
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .ht-modal-close:hover { border-color: var(--red); color: var(--red); }
  .ht-modal-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
  .ht-modal-av {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 16px; color: #000; flex-shrink: 0;
  }
  .ht-modal-name { font-family: var(--serif); font-size: 20px; margin-bottom: 4px; }
  .ht-modal-sub { font-size: 12px; color: var(--muted); }
  .ht-modal-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    background: var(--surface2); border-radius: 10px; padding: 14px; margin-bottom: 20px;
  }
  .ht-modal-stat-val { font-family: var(--mono); font-size: 14px; font-weight: 700; text-align: center; }
  .ht-modal-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 3px; text-align: center; }
  .ht-modal-notice {
    background: rgba(52,211,153,.06); border: 1px solid rgba(52,211,153,.2);
    border-radius: var(--r-sm); padding: 10px 12px; margin-bottom: 16px;
    font-size: 12px; color: var(--muted); line-height: 1.5;
    display: flex; gap: 8px; align-items: flex-start;
  }
  .ht-modal-notice i { color: var(--green); font-size: 14px; flex-shrink: 0; margin-top: 1px; }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .ht-metrics { grid-template-columns: repeat(2, 1fr); }
    .ht-grid-2 { grid-template-columns: 1fr; }
  }
  /* ── Upgrade Gate ── */
  .ht-upgrade-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.78);
    display: flex; align-items: center; justify-content: center;
    z-index: 700; padding: 16px;
  }
  .ht-upgrade-modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; width: 100%; max-width: 430px;
    padding: 32px; text-align: center; position: relative;
  }
  .ht-upgrade-modal-close {
    position: absolute; top: 14px; right: 14px;
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); border-radius: 8px; width: 28px; height: 28px;
    cursor: pointer; font-size: 14px;
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .ht-upgrade-modal-close:hover { border-color: var(--red); color: var(--red); }
  .ht-upgrade-icon-wrap {
    width: 60px; height: 60px; border-radius: 18px; margin: 0 auto 20px;
    background: linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.3));
    border: 1px solid rgba(245,158,11,.35);
    display: flex; align-items: center; justify-content: center; font-size: 28px;
  }
  .ht-upgrade-title { font-family: var(--serif); font-size: 22px; margin-bottom: 8px; color: var(--text); }
  .ht-upgrade-sub { font-size: 13px; color: var(--muted); margin-bottom: 26px; line-height: 1.65; }
  .ht-upgrade-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }
  .ht-plan-card {
    border-radius: var(--r-md); padding: 16px 14px; text-align: left;
    border: 1px solid var(--border); background: var(--surface2);
    cursor: pointer; transition: all .15s; position: relative;
  }
  .ht-plan-card:hover { border-color: var(--border2); transform: translateY(-1px); }
  .ht-plan-card.ht-plan-recommended { border-color: rgba(226,174,74,.45); background: rgba(226,174,74,.05); }
  .ht-plan-rec-badge {
    position: absolute; top: -9px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: #000; font-size: 9px; font-weight: 800;
    padding: 2px 10px; border-radius: 99px; white-space: nowrap; letter-spacing: .5px;
  }
  .ht-plan-name { font-size: 13px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
  .ht-plan-price { font-family: var(--mono); font-size: 22px; font-weight: 700; color: var(--accent); }
  .ht-plan-price span { font-size: 11px; font-family: var(--sans); font-weight: 400; color: var(--muted); }
  .ht-plan-feats { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }
  .ht-plan-feat { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 5px; }
  .ht-plan-feat i { color: var(--green); font-size: 12px; flex-shrink: 0; }
  .ht-upgrade-cta {
    width: 100%; background: var(--accent); color: #000; border-radius: var(--r-sm);
    padding: 13px 0; font-size: 14px; font-weight: 700; font-family: var(--sans);
    cursor: pointer; border: none; transition: opacity .15s; margin-bottom: 10px;
  }
  .ht-upgrade-cta:hover { opacity: .88; box-shadow: 0 0 22px rgba(226,174,74,.3); }
  .ht-upgrade-dismiss { font-size: 12px; color: var(--muted); cursor: pointer; background: none; border: none; font-family: var(--sans); }
  .ht-upgrade-dismiss:hover { color: var(--text); }
  /* locked card */
  .ht-trader-card-wrap { position: relative; }
  .ht-card-lock-overlay {
    position: absolute; inset: 0; border-radius: var(--r-lg);
    background: rgba(8,11,16,.75); backdrop-filter: blur(2px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 7px; cursor: pointer; transition: background .15s;
  }
  .ht-card-lock-overlay:hover { background: rgba(8,11,16,.85); }
  .ht-lock-icon-box {
    width: 38px; height: 38px; border-radius: 11px;
    background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.35);
    display: flex; align-items: center; justify-content: center; font-size: 17px; color: #f59e0b;
  }
  .ht-lock-label { font-size: 12px; font-weight: 700; color: var(--text); }
  .ht-lock-sub   { font-size: 10px; color: var(--muted); }
  /* form gate */
  .ht-form-gate {
    background: rgba(245,158,11,.07); border: 1px solid rgba(245,158,11,.25);
    border-radius: var(--r-md); padding: 22px 20px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .ht-form-gate-icon { font-size: 30px; color: #f59e0b; }
  .ht-form-gate-title { font-size: 14px; font-weight: 700; color: var(--text); }
  .ht-form-gate-sub { font-size: 12px; color: var(--muted); line-height: 1.65; max-width: 280px; }
  .ht-form-gate-btn {
    background: var(--accent); color: #000; border-radius: var(--r-sm);
    padding: 9px 22px; font-size: 13px; font-weight: 700;
    font-family: var(--sans); border: none; cursor: pointer; transition: opacity .15s; margin-top: 4px;
  }
  .ht-form-gate-btn:hover { opacity: .88; }

  /* ── Language switcher ── */
  .lang-switcher { position: relative; display: inline-flex; align-items: center; }
  .lang-btn {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 5px 9px;
    font-size: 11px; font-weight: 600; color: var(--muted);
    cursor: pointer; font-family: var(--sans);
    transition: border-color .15s, color .15s; white-space: nowrap;
    height: 36px; width: 36px;
  }
  .lang-btn:hover { border-color: var(--border2); color: var(--text); }
  .lang-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 176px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: ht-lang-fade .18s ease both;
  }
  @keyframes ht-lang-fade {
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

  @media (min-width: 1600px) {
    .ht-main > * { max-width: 1440px; margin-left: auto; margin-right: auto; }
  }
  @media (max-width: 768px) {
    .ht-shell { grid-template-columns: 1fr !important; }
    .ht-sidebar {
      position: fixed !important; top: 0 !important; left: 0 !important;
      transform: translateX(-100%) !important; z-index: 300 !important;
    }
    .ht-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
    .ht-right { grid-column: 1; }
    .ht-hamburger { display: flex; }
    .ht-topbar { gap: 8px; }
    .ht-topbar-title { font-size: 13px; }
  }
  @media (max-width: 600px) {
    .ht-main { padding: 16px 16px calc(28px + env(safe-area-inset-bottom, 0px)) 16px; }
    .ht-topbar { padding: 0 12px; gap: 6px; }
    .ht-topbar-actions { gap: 10px; }
    .ht-metrics { grid-template-columns: 1fr 1fr; }
    .ht-page-header { flex-direction: column; align-items: stretch; gap: 12px; }
    .ht-page-title { font-size: 22px; }
    .ht-header-actions { width: 100%; }
    .ht-header-actions .ht-btn { flex: 1; }
    .ht-profile-dropdown { right: -12px; }
    .ht-card { padding: 16px; }
    .ht-pros-header { align-items: stretch; }
    .ht-pros-header > *:last-child { width: 100%; }
    .ht-filter-select { width: 100%; }
    .ht-trader-header { flex-wrap: wrap; }
    .ht-specialty-badge { margin-left: 0; }

    /* Modals: fewer stat columns + tighter padding so nothing crowds or clips */
    .ht-modal, .ht-upgrade-modal { padding: 18px; max-width: 100%; }
    .ht-modal-overlay, .ht-upgrade-overlay { padding: 10px; }
    .ht-modal-stats { grid-template-columns: repeat(2, 1fr); gap: 10px 8px; }
    .ht-modal-head { gap: 10px; }
    .ht-modal-name { font-size: 17px; }
    .ht-upgrade-plans { grid-template-columns: 1fr; }
    .ht-upgrade-icon-wrap { width: 50px; height: 50px; margin-bottom: 14px; }
    .ht-upgrade-title { font-size: 19px; }
  }
  @media (max-width: 420px) {
    .ht-topbar-title { display: none; }
    .ht-topbar-actions { gap: 8px; }
    .ht-metrics { grid-template-columns: 1fr 1fr; gap: 10px; }
    .ht-metric { padding: 14px 12px; }
    .ht-metric-value { font-size: 17px; }
    .ht-trader-stats { gap: 6px; }
    .ht-stat-box { padding: 8px 10px; }
  }
  @media (max-width: 360px) {
    .ht-modal-stats { grid-template-columns: 1fr 1fr; }
    .ht-modal-stat-val { font-size: 13px; }
  }
`;

/* ─── Data ────────────────────────────────────────────────────────────────── */
/* PROFESSIONALS now fetched from Supabase — see FeaturedProfessionals component */

/* METRICS_DATA now computed from hire_agreements — see HireTrader root component */

const HOW_STEPS = [
  { num:1, title:'Post your request',           desc:'Set your capital, risk tolerance, and budget. Takes about 2 minutes.' },
  { num:2, title:'Get matched',                 desc:'We surface verified traders who fit your profile. Review their track records.' },
  { num:3, title:'Agree on terms',              desc:'Sign a digital agreement. Trader gets limited trading access to your account.' },
  { num:4, title:'Monitor & withdraw anytime',  desc:'Track performance in real time. Cancel with one click. No penalties.' },
];


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

/* ─── Currency symbol map ─────────────────────────────────────────────────── */
const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$',
  CHF: 'Fr', CNY: '¥', INR: '₹', NGN: '₦', BTC: '₿', ETH: 'Ξ',
};
function currencySymbol(code) {
  return CURRENCY_SYMBOLS[(code || '').toUpperCase()] ?? (code || '$');
}

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



/* ═════════════════════════════════════════════════════════════════════════
   GLOBAL DESK SHELL — shared sidebar + topbar (matches the dashboard)
   The page keeps its own layout classes (ht-sidebar, ht-topbar) so its
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
const DK_ACTIVE = 'hire';
const DK_TITLE  = 'Hire a Trader';
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
    <aside className={`ht-sidebar dk-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
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
    <header className="ht-topbar dk-topbar">
      <button className="ht-hamburger dk-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
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

/* Visual layer: palette, type and component polish for the ht- page */
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
.ht-page-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.4vw,46px) !important; line-height: 1.05 !important; letter-spacing: -.01em !important; color: var(--text); }
.ht-page-title em, .ht-page-title span { font-style: normal; color: var(--text) !important; }
.ht-page-sub { font-size: 15px !important; color: var(--muted) !important; margin-top: 8px; }

/* Buttons */
.ht-btn { border-radius: 10px !important; font-family: inherit !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.ht-btn-accent { background: var(--accent) !important; color: #07101E !important; border: 1px solid transparent !important; }
.ht-btn-accent:hover { filter: brightness(1.07); }
.ht-btn-ghost { background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text) !important; }
.ht-btn-ghost:hover { background: var(--surface) !important; }

/* Cards and metrics */
.ht-metric, .ht-card, .ht-trader-card, .ht-copying-card, .ht-item-card, .ht-lb-wrap, .ht-plan-card,
.fc-card, .pr-card, .ev-card, .eco-side-card, .fc-table-wrap {
  border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -36px rgba(0,0,0,.6);
}
.ht-trader-card, .ht-item-card, .ht-copying-card { transition: border-color .15s, transform .2s; }
.ht-trader-card:hover, .ht-item-card:hover { border-color: var(--border2) !important; transform: translateY(-2px); }
.ht-metric-label { font-size: 13.5px !important; color: var(--muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-family: inherit !important; }
.ht-metric-value { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-weight: 600 !important; font-size: 26px !important; letter-spacing: -.01em; }
.ht-metric-sub { font-size: 13px !important; color: var(--muted) !important; font-family: inherit !important; }
.ht-metric-icon { border-radius: 10px !important; }

/* Tabs, selects, inputs */
.ht-tabs { background: var(--surface) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; padding: 4px !important; }
.ht-tab { border-radius: 9px !important; font-family: inherit !important; font-weight: 600 !important; color: var(--muted); }
.ht-tab.active { background: var(--accent) !important; color: #07101E !important; }
.ht-select, .ht-input, .ht-filter-select, .ht-login-input {
  border-radius: 10px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: inherit !important;
}
.ht-select:focus, .ht-input:focus, .ht-filter-select:focus, .ht-login-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); outline: none; }

/* Tables */
.ht-table th, .fc-table-head { font-family: inherit !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; color: var(--faint) !important; }
.ht-table td { font-variant-numeric: tabular-nums; }

/* Badges */
[class^="ht-badge"], [class*=" ht-badge"] { border-radius: 7px !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0 !important; text-transform: none !important; }

/* Modals */
.ht-modal-overlay, .ht-upgrade-overlay { background: rgba(3,8,16,.7) !important; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.ht-modal, .ht-upgrade-modal { border-radius: 20px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8) !important; }

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
.ht-live-dot { background: var(--green) !important; }

/* Mono labels become calm sentence-case text */
[class*="-lbl"], [class*="-label"] { letter-spacing: 0 !important; }
`;

/* ─── Metric Card ─────────────────────────────────────────────────────────── */
function MetricCard({ m }) {
  const Icon = m.icon;
  return (
    <div className="ht-metric">
      <div className="ht-metric-icon" style={{ background:`${m.color}18` }}>
        <Icon size={16} style={{ color: m.color }} />
      </div>
      <div className="ht-metric-label">{m.label}</div>
      <div className="ht-metric-value" style={{ color: m.color }}>{m.value}</div>
      <div className="ht-metric-sub">{m.sub}</div>
    </div>
  );
}

/* ─── Upgrade Modal ───────────────────────────────────────────────────────── */
const PLANS = [
  {
    key: 'pro', name: 'Pro', price: '$29', period: '/mo', recommended: true,
    feats: ['Hire up to 3 traders', 'Copy trading access', 'Advanced analytics', 'Priority support'],
  },
  {
    key: 'elite', name: 'Elite', price: '$79', period: '/mo', recommended: false,
    feats: ['Unlimited hiring', 'Unlimited copy trading', 'API access', 'Dedicated account manager'],
  },
];

function UpgradeModal({ onClose, feature = 'hire traders' }) {
  return (
    <div className="ht-upgrade-overlay" onClick={onClose}>
      <div className="ht-upgrade-modal" onClick={e => e.stopPropagation()}>
        <button className="ht-upgrade-modal-close" onClick={onClose}>✕</button>

        <div className="ht-upgrade-icon-wrap">🔒</div>
        <div className="ht-upgrade-title">Upgrade to {feature === 'post' ? 'Post Requests' : 'Hire Traders'}</div>
        <div className="ht-upgrade-sub">
          Your <strong style={{ color:'var(--text)' }}>Basic</strong> plan doesn't include the ability to {feature === 'post' ? 'post hiring requests' : 'hire professional traders'}.
          Upgrade to <strong style={{ color:'var(--accent)' }}>Pro</strong> or <strong style={{ color:'var(--accent)' }}>Elite</strong> to unlock full access.
        </div>

        <div className="ht-upgrade-plans">
          {PLANS.map(p => (
            <div key={p.key} className={`ht-plan-card${p.recommended ? ' ht-plan-recommended' : ''}`}>
              {p.recommended && <span className="ht-plan-rec-badge">RECOMMENDED</span>}
              <div className="ht-plan-name">{p.name}</div>
              <div className="ht-plan-price">{p.price}<span>{p.period}</span></div>
              <div className="ht-plan-feats">
                {p.feats.map(f => (
                  <div key={f} className="ht-plan-feat">
                    <Check size={13} />{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="ht-upgrade-cta">
          <Zap size={14} style={{ marginRight: 6 }} /> Upgrade Now →
        </button>
        <button className="ht-upgrade-dismiss" onClick={onClose}>Maybe later</button>
      </div>
    </div>
  );
}

/* ─── Post Request Form ───────────────────────────────────────────────────── */
function PostRequestForm({ userId, userPlan, onUpgrade }) {
  const [form, setForm] = useState({
    capital:    '',
    specialty:  'Crypto',
    risk:       'conservative',
    feePref:    'performance',
    budget:     '',
    notes:      '',
  });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveErr,  setSaveErr]  = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!userId)             return setSaveErr('You must be logged in to post a request.');
    if (!form.capital || isNaN(parseFloat(form.capital))) return setSaveErr('Please enter a valid capital amount.');
    setSaving(true); setSaveErr('');
    const { error } = await supabase.from('hire_requests').insert({
      client_id:          userId,
      capital_amount:     parseFloat(form.capital),
      currency:           'USD',
      specialty:          form.specialty,
      risk_appetite:      form.risk,
      fee_preference:     form.feePref,
      max_monthly_budget: form.budget || null,
      notes:              form.notes  || null,
      status:             'open',
    });
    setSaving(false);
    if (error) { setSaveErr(error.message); return; }
    setSaved(true);
    setForm({ capital:'', specialty:'Crypto', risk:'conservative', feePref:'performance', budget:'', notes:'' });
    setTimeout(() => setSaved(false), 4000);
  };

  const isBasic = userPlan === 'basic';

  return (
    <div className="ht-card">
      <div className="ht-card-title">Post a Request</div>
      <div className="ht-card-subtitle">Get matched with professionals who fit your goals</div>

      {isBasic ? (
        /* ── Basic plan gate ── */
        <div className="ht-form-gate">
          <div className="ht-form-gate-icon"><Lock size={24} /></div>
          <div className="ht-form-gate-title">Pro feature</div>
          <div className="ht-form-gate-sub">
            Posting hire requests is available on the <strong style={{ color:'var(--accent)' }}>Pro</strong> and <strong style={{ color:'var(--accent)' }}>Elite</strong> plans.
            Upgrade to get matched with verified professional traders.
          </div>
          <button className="ht-form-gate-btn" onClick={onUpgrade}>
            <Zap size={14} style={{ marginRight:6 }} /> Upgrade Plan →
          </button>
        </div>
      ) : (
        <>
          {saved && (
            <div style={{ background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.25)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#34d399', display:'flex', alignItems:'center', gap:8 }}>
              <Check size={14} /> Request posted! We'll match you with traders shortly.
            </div>
          )}
          {saveErr && (
            <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.25)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#FF6470', display:'flex', alignItems:'center', gap:8 }}>
              <AlertCircle size={14} /> {saveErr}
            </div>
          )}
          <div className="ht-form-group">
            <label className="ht-form-label">Capital to manage (USD)</label>
            <input type="number" className="ht-input" placeholder="e.g. 10000" value={form.capital} onChange={set('capital')} />
          </div>
          <div className="ht-form-group">
            <label className="ht-form-label">Trading specialty</label>
            <select className="ht-input" value={form.specialty} onChange={set('specialty')}>
              <option>Crypto</option><option>Forex</option><option>Stocks &amp; ETFs</option>
              <option>Options</option><option>Commodities</option><option>Multi-asset</option>
            </select>
          </div>
          <div className="ht-form-group">
            <label className="ht-form-label">Risk appetite</label>
            <select className="ht-input" value={form.risk} onChange={set('risk')}>
              <option value="conservative">Conservative (10–20% annual)</option>
              <option value="moderate">Moderate (20–40% annual)</option>
              <option value="aggressive">Aggressive (40%+ annual)</option>
            </select>
          </div>
          <div className="ht-form-group">
            <label className="ht-form-label">Fee preference</label>
            <select className="ht-input" value={form.feePref} onChange={set('feePref')}>
              <option value="performance">Performance only (% of profits)</option>
              <option value="fixed_monthly">Fixed monthly</option>
              <option value="hybrid">Hybrid (base + performance)</option>
            </select>
          </div>
          <div className="ht-form-group">
            <label className="ht-form-label">Max monthly budget</label>
            <input type="text" className="ht-input" placeholder="e.g. $200/mo or 20% profits" value={form.budget} onChange={set('budget')} />
          </div>
          <div className="ht-form-group">
            <label className="ht-form-label">Notes for trader</label>
            <textarea className="ht-input" rows={3} placeholder="Goals, restrictions, or anything else…" value={form.notes} onChange={set('notes')} />
          </div>
          <button className="ht-btn ht-btn-accent ht-btn-full ht-btn-md" style={{ marginTop:4 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Posting…' : <><Search size={14} /> Find Matching Traders</>}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── How it works + Security ─────────────────────────────────────────────── */
function RightColumn() {
  return (
    <div>
      <div className="ht-card" style={{ marginBottom: 14 }}>
        <div className="ht-card-title">How it works</div>
        <div style={{ marginTop: 14 }}>
          {HOW_STEPS.map((s, i) => (
            <div key={s.num} className="ht-how-step" style={i === HOW_STEPS.length - 1 ? { borderBottom:'none', paddingBottom:0, marginBottom:0 } : {}}>
              <div className="ht-how-num">{s.num}</div>
              <div>
                <div className="ht-how-title">{s.title}</div>
                <div className="ht-how-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ht-security">
        <ShieldCheck size={22} />
        <div>
          <div className="ht-security-title">Your funds stay protected</div>
          <div className="ht-security-body">
            Hired traders get trading-only access — they cannot withdraw your funds.
            All trades are recorded and auditable. You retain full custody at all times.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Professionals ─────────────────────────────────────────────── */
function FeaturedProfessionals({ onHire, userPlan, onUpgrade, settings, symbol = '$', fxRate = 1 }) {
  const isBasic = userPlan === 'basic';
  const [traders,  setTraders]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [filter,   setFilter]   = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setFetchErr('');
      // Left join trader_profiles with their 1Y performance row (if any exists).
      // Using a plain (non-!inner) embed means traders with no trader_performance
      // row — or none tagged period='1Y' — still show up, just with 0% stats,
      // instead of being silently excluded by the inner join.
      const { data, error } = await supabase
        .from('trader_profiles')
        .select(`
          id, display_name, handle, market, min_capital, fee_structure,
          total_clients, color_hex, initials, is_verified,
          trader_performance(roi_pct, win_rate_pct, period)
        `)
        .eq('is_active', true)
        .eq('trader_performance.period', '1Y')
        .order('total_clients', { ascending: false })
        .limit(8);

      setLoading(false);
      if (error) { setFetchErr(error.message); return; }
      console.log('[FeaturedProfessionals] fetched traders:', data);
      setTraders(data || []);
    };
    load();
  }, []);

  const visible = filter
    ? traders.filter(t => t.market?.toLowerCase() === filter.toLowerCase())
    : traders;

  if (loading) return (
    <div className="ht-card" style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)', fontSize:13 }}>
      <Loader2 size={22} style={{ display:'block', marginBottom:8 }} /> Loading professionals…
    </div>
  );

  if (fetchErr) return (
    <div className="ht-card" style={{ textAlign:'center', padding:'32px 0', color:'#FF6470', fontSize:13 }}>
      <AlertCircle size={20} style={{ display:'block', marginBottom:8 }} /> {fetchErr}
    </div>
  );

  return (
    <div className="ht-card">
      <div className="ht-pros-header">
        <div>
          <div className="ht-card-title">Featured Professionals</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Verified traders with proven performance</div>
        </div>
        <select className="ht-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Specialties</option>
          <option value="Crypto">Crypto</option>
          <option value="Forex">Forex</option>
          <option value="Stocks">Stocks</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:13 }}>
          No traders found{filter ? ` for ${filter}` : ''}.
        </div>
      ) : (
        <div className="ht-traders-grid" style={{ gap:`var(--density-gap, 12px)` }}>
          {visible.map(t => {
            const perf      = t.trader_performance?.[0] || {};
            const roiPct    = parseFloat(perf.roi_pct   || 0).toFixed(1);
            const winRate   = parseFloat(perf.win_rate_pct || 0).toFixed(1);
            const minCap    = t.min_capital ? `${symbol}${(parseFloat(t.min_capital) * fxRate).toLocaleString()}` : '—';
            const firstName = t.display_name?.split(' ')[0] || 'Trader';
            return (
              <div key={t.id} className="ht-trader-card-wrap">
                <div className="ht-trader-card">
                  <div className="ht-trader-header">
                    <div className="ht-trader-av" style={{ background: t.color_hex || '#E2AE4A' }}>
                      {t.initials || t.display_name?.slice(0,2).toUpperCase() || '??'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="ht-trader-name">{t.display_name}</div>
                      <div className="ht-trader-handle">{t.handle}</div>
                    </div>
                    <span className="ht-specialty-badge">{t.market}</span>
                  </div>

                  <div className="ht-trader-stats">
                    <div className="ht-stat-box">
                      <div className="ht-stat-val" style={{ color:'#34d399' }}>+{roiPct}%</div>
                      <div className="ht-stat-lbl">1Y Return</div>
                    </div>
                    <div className="ht-stat-box">
                      <div className="ht-stat-val">{winRate}%</div>
                      <div className="ht-stat-lbl">Win Rate</div>
                    </div>
                  </div>

                  <div className="ht-trader-meta">
                    <span>Min. Capital: <strong>{minCap}</strong></span>
                    <span>Fee: <strong className="gold">{t.fee_structure || '—'}</strong></span>
                    <span>Clients: <strong>{t.total_clients || 0}</strong></span>
                  </div>

                  <button
                    className="ht-btn ht-btn-accent ht-btn-full ht-btn-sm"
                    onClick={() => isBasic ? onUpgrade() : onHire(t)}
                  >
                    {isBasic ? <><Lock size={14} /> Unlock to Hire</> : `Hire ${firstName} →`}
                  </button>
                </div>

                {/* Lock overlay for basic users */}
                {isBasic && (
                  <div className="ht-card-lock-overlay" onClick={onUpgrade}>
                    <div className="ht-lock-icon-box"><Lock size={20} /></div>
                    <div className="ht-lock-label">Pro Feature</div>
                    <div className="ht-lock-sub">Tap to upgrade</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */
// Max concurrent active hires per plan. 'basic' never reaches this modal
// (gated upstream), so it's excluded here; unlisted/unknown plans default to 0.
const HIRE_LIMITS = { pro: 3, elite: Infinity };

function HireModal({ trader: t, onClose, userId, userPlan, onUpgrade, symbol = '$', fxRate = 1 }) {
  const [amount,   setAmount]   = useState('5000');
  const [duration, setDuration] = useState('1');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [limitReached,  setLimitReached]  = useState(false);
  const [activeCount,   setActiveCount]   = useState(0);

  const perf     = t.trader_performance?.[0] || {};
  const roiPct   = parseFloat(perf.roi_pct     || 0).toFixed(1);
  const winRate  = parseFloat(perf.win_rate_pct || 0).toFixed(1);
  const minCap   = t.min_capital ? `${symbol}${(parseFloat(t.min_capital) * fxRate).toLocaleString()}` : '—';
  const firstName = t.display_name?.split(' ')[0] || 'Trader';
  const limit = HIRE_LIMITS[userPlan] ?? 0;

  /* ── Check how many active hires the user already has, against their plan cap ── */
  useEffect(() => {
    let cancelled = false;
    const checkLimit = async () => {
      if (!userId) { setCheckingLimit(false); return; }
      setCheckingLimit(true);
      const { count, error } = await supabase
        .from('hire_agreements')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId)
        .eq('status', 'active');
      if (cancelled) return;
      if (!error) {
        setActiveCount(count || 0);
        setLimitReached((count || 0) >= limit);
      }
      setCheckingLimit(false);
    };
    checkLimit();
    return () => { cancelled = true; };
  }, [userId, limit]);

  const handleConfirm = async () => {
    if (!userId) return setSaveErr('You must be logged in.');
    if (limitReached) return setSaveErr(`Your plan allows up to ${limit} active trader${limit === 1 ? '' : 's'}.`);
    const cap = parseFloat(amount);
    if (!cap || cap <= 0) return setSaveErr('Please enter a valid capital amount.');
    setSaving(true); setSaveErr('');

    // Re-check the count right before inserting to close the race window
    // (e.g. two hires submitted from different tabs at once).
    const { count } = await supabase
      .from('hire_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', userId)
      .eq('status', 'active');
    if ((count || 0) >= limit) {
      setSaving(false);
      setLimitReached(true);
      setSaveErr(`Your plan allows up to ${limit} active trader${limit === 1 ? '' : 's'}.`);
      return;
    }

    const { error } = await supabase.from('hire_agreements').insert({
      client_id:      userId,
      trader_id:      t.id,
      capital_amount: cap,
      currency:       'USD',
      duration_months: parseInt(duration) || null,
      fee_structure:  t.fee_structure || null,
      status:         'active',
    });

    setSaving(false);
    if (error) { setSaveErr(error.message); return; }
    setSaved(true);
  };

  return (
    <div className="ht-modal-overlay" onClick={onClose}>
      <div className="ht-modal" onClick={e => e.stopPropagation()}>
        <button className="ht-modal-close" onClick={onClose}>✕</button>

        <div className="ht-modal-head">
          <div className="ht-modal-av" style={{ background: t.color_hex || '#E2AE4A' }}>
            {t.initials || t.display_name?.slice(0,2).toUpperCase() || '??'}
          </div>
          <div>
            <div className="ht-modal-name">Hire {t.display_name}</div>
            <div className="ht-modal-sub">{t.handle} · {t.market}</div>
          </div>
        </div>

        <div className="ht-modal-stats">
          {[
            { label:'1Y Return',   val:`+${roiPct}%`, color:'#34d399' },
            { label:'Win Rate',    val:`${winRate}%`, color:'var(--text)' },
            { label:'Min Capital', val: minCap,        color:'var(--text)' },
            { label:'Fee',         val: t.fee_structure || '—', color:'#E2AE4A' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div className="ht-modal-stat-val" style={{ color }}>{val}</div>
              <div className="ht-modal-stat-lbl">{label}</div>
            </div>
          ))}
        </div>

        {checkingLimit ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:13 }}>
            <Loader2 size={20} style={{ display:'block', marginBottom:8 }} /> Checking your plan…
          </div>
        ) : saved ? (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ width:52, height:52, borderRadius:12, background:'rgba(52,211,153,.15)', border:'1px solid rgba(52,211,153,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:'#34d399' }}>
              <Check size={22} />
            </div>
            <div style={{ fontFamily:'var(--serif)', fontSize:18, marginBottom:6 }}>Agreement Created!</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>
              {firstName} has been hired. Your agreement is now active.
            </div>
            <button className="ht-btn ht-btn-accent ht-btn-full ht-btn-md" onClick={onClose}>Done</button>
          </div>
        ) : limitReached ? (
          <div className="ht-form-gate">
            <div className="ht-form-gate-icon"><Lock size={24} /></div>
            <div className="ht-form-gate-title">Trader limit reached</div>
            <div className="ht-form-gate-sub">
              You've hired {activeCount} of {limit === Infinity ? 'unlimited' : limit} traders on your{' '}
              <strong style={{ color:'var(--accent)' }}>{userPlan === 'pro' ? 'Pro' : userPlan || 'current'}</strong> plan.
              Upgrade to hire {firstName} too.
            </div>
            <button className="ht-form-gate-btn" onClick={onUpgrade}>Upgrade Plan</button>
          </div>
        ) : (
          <>
            {saveErr && (
              <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.25)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#FF6470', display:'flex', alignItems:'center', gap:8 }}>
                <AlertCircle size={14} /> {saveErr}
              </div>
            )}

            <div className="ht-form-group">
              <label className="ht-form-label">Capital to allocate (USD)</label>
              <input type="number" className="ht-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" />
            </div>

            <div className="ht-form-group" style={{ marginBottom: 16 }}>
              <label className="ht-form-label">Duration</label>
              <select className="ht-input" value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="1">1 Month (trial)</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="0">Open-ended</option>
              </select>
            </div>

            <div className="ht-modal-notice">
              <ShieldCheck size={22} />
              Trader gets trading access only. You retain full custody. Cancel anytime.
            </div>

            <button
              className="ht-btn ht-btn-accent ht-btn-full ht-btn-md"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? 'Creating agreement…' : `Confirm & Hire ${firstName} →`}
            </button>
          </>
        )}
      </div>
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
  return theme || 'dark';
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
  .ht-sidebar { background: var(--surface) !important; border-color: var(--border) !important; }
  .ht-topbar  { background: var(--surface); border-color: var(--border); }
  .ht-metric, .ht-trader-card, .ht-card, .ht-modal { background: var(--surface); border-color: var(--border); }
  .ht-filter-select, .ht-input { background: var(--surface2); border-color: var(--border); color: var(--text); }
  .ht-stat-box { background: var(--surface2); }
`;

function applySettings(settings, rootEl = document.documentElement) {
  if (!settings || !rootEl) return;
  const accent  = settings.accent_color || '#E2AE4A';
  const rgb     = hexToRgb(accent);
  const theme   = resolveTheme(settings.theme);
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

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function HireTrader() {
  const [user,           setUser]           = useState(null);
  const [authLoading,    setAuthLoading]    = useState(true);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [modal,          setModal]          = useState(null);
  const [upgradeOpen,    setUpgradeOpen]    = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('hire');
  const [settings,       setSettings]       = useState(null);
  const [fxRate,         setFxRate]         = useState(1);
  const [activeTheme,    setActiveTheme]    = useState('dark');
  const [metrics,     setMetrics]     = useState([
    { label:'Active Traders', value:'—',    sub:'Loading…',            color:'#E2AE4A', icon:Users },
    { label:'Total Return',   value:'—',    sub:'Since account start', color:'#34d399', icon:TrendingUp },
    { label:'Fees Paid',      value:'—',    sub:'This year',           color:'#5B8CFF', icon:Receipt },
    { label:'Avg Win Rate',   value:'—',    sub:'Across hired traders',color:'#B49BFF', icon:Target },
  ]);

  /* ── Apply CSS vars whenever settings change ── */
  useEffect(() => {
    if (!settings) return;
    const theme = applySettings(settings);
    setActiveTheme(theme);
  }, [settings]);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  /* ── Watch system colour-scheme when theme === 'system' ── */
  useEffect(() => {
    if (settings?.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => setActiveTheme(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings?.theme]);

  /* ── Fetch user_settings ── */
  const fetchSettings = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error && data) setSettings(data);
    } catch (_) { /* non-critical */ }
  }, []);

  /* ── Auth: restore session on mount ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userId = session.user.id;
        const [{ data: profile }, { data: wallet }] = await Promise.all([
          supabase.from('users')
            .select('id, first_name, last_name, handle, plan, is_verified, currency')
            .eq('id', userId).single(),
          supabase.from('wallets')
            .select('balance')
            .eq('user_id', userId).single(),
        ]);
        if (profile) {
          const balanceUsd = parseFloat(wallet?.balance ?? 0) || 0.0;
          const rate = await getUsdRate(profile.currency);
          setFxRate(rate);
          setUser({ ...profile, balance: balanceUsd * rate });
          await fetchSettings(userId);
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Fetch hire_agreements metrics whenever user changes ── */
  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    const sym = currencySymbol(user?.currency);
    const { data: agreements } = await supabase
      .from('hire_agreements')
      .select('capital_amount, total_return, fees_paid, status, trader_id')
      .eq('client_id', user.id)
      .eq('status', 'active');

    if (!agreements || agreements.length === 0) {
      setMetrics([
        { label:'Active Traders', value:'0 Traders', sub:'None hired yet',          color:'#E2AE4A', icon:Users },
        { label:'Total Return',   value:`+${sym}0`,   sub:'Since account start',     color:'#34d399', icon:TrendingUp },
        { label:'Fees Paid',      value:`${sym}0`,    sub:'This year',               color:'#5B8CFF', icon:Receipt },
        { label:'Avg Win Rate',   value:'—',          sub:'No active agreements',    color:'#B49BFF', icon:Target },
      ]);
      return;
    }

    const activeCount   = agreements.length;
    const totalCapital  = agreements.reduce((s, a) => s + parseFloat(a.capital_amount || 0), 0) * fxRate;
    const totalReturn   = agreements.reduce((s, a) => s + parseFloat(a.total_return  || 0), 0) * fxRate;
    const totalFees     = agreements.reduce((s, a) => s + parseFloat(a.fees_paid     || 0), 0) * fxRate;
    const returnSign    = totalReturn >= 0 ? '+' : '';

    // Fetch avg win rate from trader_performance for these traders
    const traderIds = [...new Set(agreements.map(a => a.trader_id))];
    const { data: perfs } = await supabase
      .from('trader_performance')
      .select('win_rate_pct')
      .in('trader_id', traderIds)
      .eq('period', '1Y');
    const avgWinRate = perfs?.length
      ? (perfs.reduce((s, p) => s + parseFloat(p.win_rate_pct || 0), 0) / perfs.length).toFixed(0)
      : null;

    setMetrics([
      { label:'Active Traders', value:`${activeCount} Trader${activeCount !== 1 ? 's' : ''}`, sub:`Managing ${sym}${totalCapital.toLocaleString()}`,  color:'#E2AE4A', icon:Users },
      { label:'Total Return',   value:`${returnSign}${sym}${Math.abs(totalReturn).toLocaleString()}`,              sub:'Since account start',           color:'#34d399', icon:TrendingUp },
      { label:'Fees Paid',      value:`${sym}${totalFees.toLocaleString()}`,                                       sub:'This year',                      color:'#5B8CFF', icon:Receipt },
      { label:'Avg Win Rate',   value: avgWinRate ? `${avgWinRate}%` : '—',                                       sub:'Across hired traders',           color:'#B49BFF', icon:Target },
    ]);
  }, [user, fxRate]);

  useEffect(() => { if (user) { fetchMetrics(); fetchSettings(user.id); } }, [fetchMetrics]);

  const openUpgrade = (feature = 'hire') => {
    setUpgradeFeature(feature);
    setUpgradeOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (authLoading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      {activeTheme === 'light' && <style dangerouslySetInnerHTML={{ __html: LIGHT_OVERRIDES }} />}
      <div style={{ height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', color:'var(--muted)', fontSize:14, gap:10 }}>
        <Loader2 size={20} /> Loading…
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      {activeTheme === 'light' && <style dangerouslySetInnerHTML={{ __html: LIGHT_OVERRIDES }} />}

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:299 }}
        />
      )}

      <div className="ht-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />

        <div className="ht-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} settings={settings} onLogout={handleLogout} />

          <main className="ht-main" style={{ padding:`24px var(--density-pad, 28px) 40px` }}>
            <div className="ht-page-header">
              <div>
                <div className="ht-page-title"><em>Hire a Trader</em></div>
                <div className="ht-page-sub">
                  <span className="ht-live-dot" />
                  Delegate to verified experts. Full transparency. Cancel anytime.
                </div>
              </div>
              <div className="ht-header-actions">
                <button className="ht-btn ht-btn-ghost ht-btn-sm">
                  <Download size={14} /> Export
                </button>
                <button className="ht-btn ht-btn-accent ht-btn-sm" onClick={() => document.querySelector('.ht-main').scrollTo({ top: 9999, behavior:'smooth' })}>
                  <Plus size={14} /> Post Request
                </button>
              </div>
            </div>

            <div className="ht-metrics" style={{ gap:`var(--density-gap, 14px)`, marginBottom:22 }}>
              {metrics.map(m => <MetricCard key={m.label} m={m} />)}
            </div>

            <div className="ht-grid-2" style={{ gap:`var(--density-gap, 18px)`, marginBottom:22 }}>
              <PostRequestForm
                userId={user?.id}
                userPlan={user?.plan}
                onUpgrade={() => openUpgrade('post')}
              />
              <RightColumn />
            </div>

            <FeaturedProfessionals
              onHire={setModal}
              userPlan={user?.plan}
              onUpgrade={() => openUpgrade('hire')}
              settings={settings}
              symbol={currencySymbol(user?.currency)}
              fxRate={fxRate}
            />
          </main>
        </div>
      </div>

      {upgradeOpen && (
        <UpgradeModal
          onClose={() => setUpgradeOpen(false)}
          feature={upgradeFeature}
        />
      )}

      {modal && user?.plan !== 'basic' && (
        <HireModal
          trader={modal}
          onClose={() => { setModal(null); fetchMetrics(); }}
          userId={user?.id}
          userPlan={user?.plan}
          onUpgrade={() => { setModal(null); openUpgrade('hire'); }}
          symbol={currencySymbol(user?.currency)}
          fxRate={fxRate}
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
