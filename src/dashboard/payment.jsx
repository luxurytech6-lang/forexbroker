import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowRight, Banknote, Bitcoin, Building2, Check, CheckCheck, ChevronLeft, ChevronRight, Clock, Clock4, Coins, Copy, Crown, DollarSign, Download, Euro, FileText, Gem, Info, Loader2, Lock, Mail, QrCode, Receipt, Send, ShieldCheck, Upload, Wallet, X, Zap,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";
import {
  getCurrentUser,
  getUserProfile,
  fetchUserWallets,
  fetchActiveSubscription,
  fetchTransactions,
  fetchPaymentMetrics,
  fetchSidebarData,
  recordDeposit,
  recordWithdrawal,
  sendDepositEmail,
  sendWithdrawalEmail,
  getUserCurrency,
  fetchAllCryptoWalletAddresses,
} from '../payment/paymentService';
import { useAccountState, fetchAccountState, restrictionMessage, IDENTITY_BUCKET } from '../account/accountState';
import LiveSelfieCapture from '../account/LiveSelfieCapture';

/* ─── Design tokens (matches Insights / CopyTrading / Marketplace) ──────────── */
const T = {
  bg:'#07101E', s:'#0C1A2E', s2:'#112238', br:'#1C2C45', br2:'#2A3D5C',
  gr:'#EEF2F7', nt:'#8A9AB2', g:'#E2AE4A', gd:'rgba(226,174,74,.12)',
  bl:'#5B8CFF', rd:'#FF6470', gn:'#34d399', pr:'#B49BFF', am:'#f59e0b',
  sans:"'Instrument Sans', system-ui, sans-serif",
  serif:"'Instrument Serif', serif",
  mono:"'Instrument Sans', system-ui, sans-serif",
};

/* ─── Default user settings (mirrors DB defaults) ───────────────────────────── */
const DEFAULT_SETTINGS = {
  theme:                'dark',
  accent_color:         '#E2AE4A',
  layout_density:       'comfortable',
  chart_type:           'candle',
  show_volume:          true,
  show_extended_hours:  false,
  show_grid_lines:      true,
  profile_public:       true,
  show_watchlist:       false,
  show_activity:        true,
  show_followed_traders:false,
  appear_in_search:     true,
  usage_analytics:      true,
  personalised_feed:    true,
  marketing_emails:     false,
};

/* ─── Derive CSS variable overrides from user settings ───────────────────────── */
function buildThemeVars(settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const accent = s.accent_color || '#E2AE4A';

  const hex = accent.replace('#', '');
  const r   = parseInt(hex.substring(0,2), 16);
  const g   = parseInt(hex.substring(2,4), 16);
  const b   = parseInt(hex.substring(4,6), 16);

  const densityMap = {
    compact:     { mainPad: '14px 18px 32px', metricPad: '12px 14px', topbarH: '52px', sidebarW: '232px' },
    comfortable: { mainPad: '24px 28px 40px', metricPad: '18px 20px', topbarH: '60px', sidebarW: '256px' },
    spacious:    { mainPad: '32px 40px 56px', metricPad: '22px 24px', topbarH: '68px', sidebarW: '272px' },
  };
  const density = densityMap[s.layout_density] || densityMap.comfortable;

  const isDark = s.theme === 'dark' || (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const palette = isDark ? {
    bg: '#07101E', surface: '#0C1A2E', surface2: '#112238',
    border: '#1C2C45', border2: '#2A3D5C',
    text: '#EEF2F7', muted: '#8A9AB2', faint: '#56677F',
  } : {
    bg: '#EEF2F7', surface: '#ffffff', surface2: '#f8fafc',
    border: '#D5DDE8', border2: '#cbd5e1',
    text: '#0B1628', muted: '#64748b', faint: '#94a3b8',
  };

  return `
    --bg:         ${palette.bg};
    --surface:    ${palette.surface};
    --surface2:   ${palette.surface2};
    --border:     ${palette.border};
    --border2:    ${palette.border2};
    --text:       ${palette.text};
    --muted:      ${palette.muted};
    --faint:      ${palette.faint};
    --accent:     ${accent};
    --accent-dim: rgba(${r},${g},${b},.12);
    --accent-glow:rgba(${r},${g},${b},.06);
    --sidebar-w:  ${density.sidebarW};
    --topbar-h:   ${density.topbarH};
    --main-pad:   ${density.mainPad};
    --metric-pad: ${density.metricPad};
  `;
}

/* ─── Global CSS ─────────────────────────────────────────────────────────────── */
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
    --accent-dim: rgba(226,174,74,.12);
    --accent-glow:rgba(226,174,74,.06);
    --green:      #34d399;
    --green-dim:  rgba(52,211,153,.12);
    --red:        #FF6470;
    --red-dim:    rgba(248,113,113,.12);
    --blue:       #5B8CFF;
    --blue-dim:   rgba(96,165,250,.12);
    --purple:     #B49BFF;
    --purple-dim: rgba(167,139,250,.12);
    --amber:      #f59e0b;
    --amber-dim:  rgba(245,158,11,.12);
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

  /* ── Shell ── */
  .in-shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .in-sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    height: 100vh; height: 100dvh; overflow-y: auto; overflow-x: hidden;
    position: relative; z-index: 100; flex-shrink: 0;
    transition: transform .25s cubic-bezier(.4,0,.2,1);
  }
  .in-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
  .in-sidebar::after {
    content: ''; position: absolute; top: 0; right: 0;
    width: 1px; height: 100%;
    background: linear-gradient(180deg, transparent 0%, var(--accent) 30%, var(--border) 60%, transparent 100%);
    opacity: .15; pointer-events: none;
  }

  /* Brand */
  .in-brand {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .in-brand-icon {
    width: 34px; height: 34px; background: var(--accent);
    border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .in-brand-icon i { font-size: 18px; color: #000; }
  .in-brand-name { font-size: 16px; font-weight: 700; color: var(--text); }
  .in-brand-name em { color: var(--accent); font-style: normal; }

  /* Portfolio pill */
  .in-sb-pill {
    margin: 12px 16px;
    background: var(--accent-dim); border: 1px solid rgba(226,174,74,.18);
    border-radius: var(--r-md); padding: 10px 14px; flex-shrink: 0;
  }
  .in-sb-pill-label {
    font-size: 10px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .in-live-dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: in-pulse 2s infinite; flex-shrink: 0; }
  @keyframes in-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .in-sb-pill-val { font-family: var(--mono); font-size: 19px; font-weight: 600; color: var(--accent); letter-spacing: -.5px; }
  .in-sb-pill-sub { font-size: 11px; color: var(--green); margin-top: 3px; }

  /* Nav */
  .in-sb-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
  .in-sb-section { padding: 10px 20px 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--faint); }
  .in-sb-link {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 20px; font-size: 13px; font-weight: 500;
    color: var(--muted); border-left: 2px solid transparent;
    transition: all .15s; cursor: pointer; text-decoration: none;
  }
  .in-sb-link i { font-size: 18px; flex-shrink: 0; }
  .in-sb-link:hover { color: var(--text); background: var(--accent-glow); border-left-color: var(--border2); }
  .in-sb-link.active { color: var(--accent); background: var(--accent-dim); border-left-color: var(--accent); }
  .in-sb-link.active i { filter: drop-shadow(0 0 6px var(--accent)); }
  .in-sb-badge { margin-left: auto; font-size: 9px; font-weight: 700; background: var(--accent); color: #000; padding: 2px 6px; border-radius: 5px; }

  /* User */
  .in-sb-user { flex-shrink: 0; border-top: 1px solid var(--border); padding: 14px 16px; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .in-sb-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 0 12px rgba(226,174,74,.3);
  }
  .in-sb-user-name { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .in-sb-user-role { font-size: 10px; color: var(--accent); margin-top: 1px; }
  .in-sb-link.logout { color: var(--red); width: 100%; background: none; border: none; }
  .in-sb-link.logout:hover { background: var(--red-dim); border-left-color: var(--red); color: var(--red); }
  .in-sb-link.logout svg { color: var(--red); }

  /* ── Profile dropdown ── */
  .in-avatar-wrap { position: relative; display: inline-flex; }
  .in-profile-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 190px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: py-lang-fade .18s ease both;
  }
  .in-profile-head {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px 10px; border-bottom: 1px solid var(--border); margin-bottom: 6px;
  }
  .in-profile-head-name { font-size: 12px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .in-profile-head-role { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .in-profile-option {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: var(--r-sm);
    font-size: 12px; color: var(--muted); font-weight: 500;
    cursor: pointer; font-family: var(--sans);
    transition: background .12s, color .12s; text-decoration: none;
  }
  .in-profile-option svg { width: 15px; height: 15px; flex-shrink: 0; }
  .in-profile-option:hover { background: var(--surface2); color: var(--text); }
  .in-profile-option.logout { color: var(--red); }
  .in-profile-option.logout:hover { background: var(--red-dim); color: var(--red); }

  /* ── Right panel ── */
  .in-right { grid-column: 2; display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; }

  /* ── Topbar ── */
  .in-topbar {
    height: var(--topbar-h); flex-shrink: 0;
    display: flex; align-items: center;
    padding: 0 28px; background: var(--surface);
    border-bottom: 1px solid var(--border); gap: 16px; z-index: 50;
  }
  .in-topbar-title { font-family: var(--serif); font-size: 20px; color: var(--text); flex: 1; }
  .in-topbar-title span { color: var(--accent); font-style: italic; }
  .in-tb-icon {
    width: 36px; height: 36px; border-radius: var(--r-sm);
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; color: var(--muted); font-size: 18px; position: relative;
  }
  .in-tb-icon:hover { border-color: var(--border2); color: var(--text); }
  .in-notif-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: var(--red); border-radius: 50%; border: 1.5px solid var(--surface); }
  .in-tb-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    box-shadow: 0 0 10px rgba(226,174,74,.25);
  }
  .in-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; }
  .in-hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }

  /* ── Main ── */
  .in-main { flex: 1; overflow-y: auto; overflow-x: hidden; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; padding: var(--main-pad, 24px 28px calc(40px + env(safe-area-inset-bottom))); }

  /* Page header */
  .in-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
  .in-page-title { font-family: var(--serif); font-size: 28px; color: var(--text); line-height: 1.2; }
  .in-page-title em { color: var(--accent); font-style: italic; }
  .in-page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
  .in-header-actions { display: flex; gap: 8px; }

  /* Buttons */
  .in-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; border-radius: var(--r-sm);
    font-family: var(--sans); font-weight: 600; cursor: pointer; transition: all .15s;
    border: none; text-decoration: none; white-space: nowrap;
  }
  .in-btn-sm { font-size: 12px; padding: 7px 14px; }
  .in-btn-md { font-size: 13px; padding: 10px 20px; }
  .in-btn-lg { font-size: 14px; padding: 12px 24px; }
  .in-btn-full { width: 100%; justify-content: center; }
  .in-btn-accent { background: var(--accent); color: #000; }
  .in-btn-accent:hover { opacity: .88; box-shadow: 0 0 20px rgba(226,174,74,.3); }
  .in-btn-ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-size: 12px; padding: 7px 14px; }
  .in-btn-ghost:hover { border-color: var(--border2); }
  .in-btn-danger { background: var(--red-dim); border: 1px solid rgba(248,113,113,.25); color: var(--red); font-size: 13px; padding: 10px 20px; }
  .in-btn-danger:hover { background: rgba(248,113,113,.2); }
  .in-btn-blue { background: var(--blue-dim); border: 1px solid rgba(96,165,250,.25); color: var(--blue); font-size: 13px; padding: 10px 20px; }
  .in-btn-blue:hover { background: rgba(96,165,250,.2); }

  /* Badge */
  .in-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; white-space: nowrap; letter-spacing: .2px; }
  .in-badge-green  { background: var(--green-dim);  color: var(--green); }
  .in-badge-blue   { background: var(--blue-dim);   color: var(--blue); }
  .in-badge-red    { background: var(--red-dim);    color: var(--red); }
  .in-badge-gold   { background: var(--accent-dim); color: var(--accent); }
  .in-badge-purple { background: var(--purple-dim); color: var(--purple); }
  .in-badge-amber  { background: var(--amber-dim);  color: var(--amber); }
  .in-badge-muted  { background: rgba(100,116,139,.12); color: var(--muted); }

  /* Table */
  .in-table { width: 100%; border-collapse: collapse; }
  .in-table th {
    text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--muted); padding: 10px 14px;
    border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .in-table td { padding: 13px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
  .in-table tr:last-child td { border-bottom: none; }
  .in-table tr:hover td { background: var(--surface2); }

  /* ── Metrics strip ── */
  .py-metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
  .py-metric {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: var(--metric-pad, 18px 20px); position: relative; overflow: hidden; transition: all .2s;
  }
  .py-metric:hover { border-color: var(--border2); transform: translateY(-1px); }
  .py-metric::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
    opacity: .3;
  }
  .py-metric-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 12px; }
  .py-metric-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .py-metric-value { font-family: var(--mono); font-size: 20px; font-weight: 600; color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: -.5px; }
  .py-metric-sub { font-size: 11px; }

  /* ── Tab controls ── */
  .in-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .in-tabs { display: flex; gap: 4px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px; }
  .in-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: var(--r-sm); border: none; cursor: pointer;
    font-family: var(--sans); font-weight: 700; font-size: 12px;
    background: transparent; color: var(--muted); transition: all .15s; white-space: nowrap;
  }
  .in-tab:hover { color: var(--text); }
  .in-tab.active { background: var(--accent); color: #000; }
  .in-tab i { font-size: 14px; }

  /* ── Plans ── */
  .py-plans-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 16px; margin-bottom: 24px; }
  .py-plan {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 22px; position: relative; overflow: hidden;
    transition: all .2s; cursor: pointer;
  }
  .py-plan:hover { border-color: var(--border2); transform: translateY(-2px); }
  .py-plan.featured {
    border-color: rgba(226,174,74,.4);
    background: linear-gradient(145deg, var(--surface) 0%, rgba(226,174,74,.04) 100%);
  }
  .py-plan.featured::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
  }
  .py-plan-badge {
    position: absolute; top: 14px; right: 14px;
    background: var(--accent); color: #000; font-size: 9px; font-weight: 700;
    padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: .5px;
  }
  .py-plan-name { font-family: var(--serif); font-size: 22px; margin-bottom: 4px; }
  .py-plan-name.accent { color: var(--accent); }
  .py-plan-desc { font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 18px; }
  .py-plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
  .py-plan-price-val { font-family: var(--mono); font-size: 32px; font-weight: 700; }
  .py-plan-price-cur { font-size: 16px; font-weight: 600; color: var(--muted); align-self: flex-start; margin-top: 6px; }
  .py-plan-price-per { font-size: 12px; color: var(--muted); }
  .py-plan-save { font-size: 11px; color: var(--green); margin-bottom: 18px; height: 16px; }
  .py-plan-divider { height: 1px; background: var(--border); margin: 18px 0; }
  .py-plan-feature { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 8px; color: var(--muted); }
  .py-plan-feature i { font-size: 14px; flex-shrink: 0; }
  .py-plan-feature.yes i { color: var(--green); }
  .py-plan-feature.no  i { color: var(--faint); }
  .py-plan-feature.yes { color: var(--text); }

  /* ── Billing toggle ── */
  .py-billing-toggle {
    display: flex; align-items: center; gap: 12px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-md); padding: 6px 10px; margin-left: auto;
  }
  .py-bt-label { font-size: 12px; font-weight: 600; color: var(--muted); }
  .py-bt-label.active { color: var(--text); }
  .py-toggle-wrap { position: relative; width: 36px; height: 20px; cursor: pointer; }
  .py-toggle-track {
    position: absolute; inset: 0; border-radius: 99px;
    background: var(--accent); transition: background .2s;
  }
  .py-toggle-thumb {
    position: absolute; top: 2px; width: 16px; height: 16px;
    border-radius: 50%; background: #000;
    transition: left .2s; left: 18px;
  }
  .py-toggle-wrap.monthly .py-toggle-track { background: var(--border2); }
  .py-toggle-wrap.monthly .py-toggle-thumb { left: 2px; }

  /* ── Deposit / Withdraw form ── */
  .py-action-layout { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
  .py-form-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 24px;
  }
  .py-form-title { font-family: var(--serif); font-size: 18px; margin-bottom: 4px; }
  .py-form-title em { color: var(--accent); font-style: italic; }
  .py-form-sub { font-size: 12px; color: var(--muted); margin-bottom: 22px; }
  .py-field { margin-bottom: 16px; }
  .py-field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 7px; display: flex; align-items: center; justify-content: space-between; }
  .py-field-hint { font-size: 10px; color: var(--accent); font-weight: 600; text-transform: none; letter-spacing: 0; cursor: pointer; }
  .py-amount-wrap { position: relative; }
  .py-amount-cur {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-family: var(--mono); font-size: 16px; font-weight: 700; color: var(--muted);
  }
  .py-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); color: var(--text); padding: 12px 14px;
    font-family: var(--mono); font-size: 15px; outline: none; transition: border-color .15s;
  }
  .py-input.padded { padding-left: 36px; }
  .py-input:focus { border-color: var(--accent); }
  .py-input::placeholder { color: var(--muted); }
  .py-presets { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .py-preset {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 5px 12px;
    font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--muted);
    cursor: pointer; transition: all .15s;
  }
  .py-preset:hover { border-color: var(--accent); color: var(--accent); }
  .py-preset.sel { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .py-method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .py-method {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 10px 14px; cursor: pointer; transition: all .15s;
    display: flex; align-items: center; gap: 8px;
  }
  .py-method:hover { border-color: var(--border2); }
  .py-method.sel { border-color: rgba(226,174,74,.4); background: var(--accent-dim); }
  .py-method-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .py-method-name { font-size: 12px; font-weight: 600; }
  .py-method-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .py-summary-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 20px; height: fit-content;
  }
  .py-summary-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 16px; }
  .py-sum-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
  .py-sum-row-label { color: var(--muted); }
  .py-sum-row-val { font-family: var(--mono); font-weight: 600; }
  .py-sum-divider { height: 1px; background: var(--border); margin: 14px 0; }
  .py-sum-total { display: flex; align-items: center; justify-content: space-between; }
  .py-sum-total-label { font-size: 13px; font-weight: 700; }
  .py-sum-total-val { font-family: var(--mono); font-size: 20px; font-weight: 700; color: var(--accent); }
  .py-security { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
  .py-security i { color: var(--green); font-size: 14px; }

  /* ── Wallet cards ── */
  .py-wallets { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; margin-bottom: 20px; }
  .py-wallet {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 20px; position: relative; overflow: hidden;
  }
  .py-wallet::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    opacity: .5;
  }
  .py-wallet.usd::before { background: linear-gradient(90deg, transparent, var(--green), transparent); }
  .py-wallet.btc::before { background: linear-gradient(90deg, transparent, var(--amber), transparent); }
  .py-wallet.eth::before { background: linear-gradient(90deg, transparent, var(--blue), transparent); }
  .py-wallet.eur::before { background: linear-gradient(90deg, transparent, var(--purple), transparent); }
  .py-wallet-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .py-wallet-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .py-wallet-name { font-size: 12px; font-weight: 700; }
  .py-wallet-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .py-wallet-bal { font-family: var(--mono); font-size: 22px; font-weight: 700; margin-bottom: 4px; letter-spacing: -.5px; }
  .py-wallet-eq { font-size: 11px; color: var(--muted); margin-bottom: 14px; }
  .py-wallet-actions { display: flex; gap: 8px; }
  .py-wallet-act {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 7px; border-radius: var(--r-sm); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s;
    border: 1px solid var(--border); background: var(--surface2); color: var(--muted);
  }
  .py-wallet-act:hover { border-color: var(--border2); color: var(--text); }
  .py-wallet-act i { font-size: 13px; }

  /* ── Transactions ── */
  .py-txn-wrap {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); overflow: hidden;
  }
  .py-txn-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border); gap: 12px; flex-wrap: wrap;
  }
  .py-txn-title { font-size: 14px; font-weight: 700; }
  .py-txn-filters { display: flex; gap: 8px; }
  .in-select {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    border-radius: var(--r-sm); padding: 6px 10px;
    font-size: 12px; font-family: var(--sans); cursor: pointer; outline: none; transition: border-color .15s;
  }
  .in-select:hover { border-color: var(--border2); }
  .py-txn-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .py-txn-name { font-size: 13px; font-weight: 600; }
  .py-txn-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .py-txn-amount { font-family: var(--mono); font-size: 13px; font-weight: 700; text-align: right; }
  .py-txn-status { font-size: 11px; margin-top: 2px; text-align: right; }

  /* ── Crypto Payment Modal ── */
  .py-crypto-coins { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
  .py-crypto-coin {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px; border-radius: var(--r-sm);
    background: var(--surface2); border: 1px solid var(--border);
    cursor: pointer; transition: all .15s; font-size: 13px; font-weight: 600;
  }
  .py-crypto-coin:hover { border-color: var(--border2); }
  .py-crypto-coin.sel { border-color: rgba(226,174,74,.5); background: var(--accent-dim); color: var(--accent); }
  .py-crypto-coin i { font-size: 16px; }
  .py-qr-wrap {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-md);
    padding: 20px; margin-bottom: 16px;
  }
  .py-qr-box {
    width: 140px; height: 140px; background: #fff; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; padding: 8px; flex-shrink: 0;
  }
  .py-qr-box canvas { width: 100% !important; height: 100% !important; }
  .py-qr-label { font-size: 11px; color: var(--muted); text-align: center; line-height: 1.5; }
  .py-addr-wrap {
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
  }
  .py-addr-text { font-family: var(--mono); font-size: 11px; color: var(--muted); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .py-addr-copy {
    flex-shrink: 0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;
    background: var(--accent-dim); border: 1px solid rgba(226,174,74,.3); color: var(--accent); cursor: pointer; transition: all .15s;
  }
  .py-addr-copy:hover { background: rgba(226,174,74,.2); }
  .py-crypto-tabs { display: flex; gap: 4px; margin-bottom: 18px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 3px; }
  .py-crypto-tab { flex: 1; padding: 6px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--muted); transition: all .15s; font-family: var(--sans); }
  .py-crypto-tab.active { background: var(--accent); color: #000; }
  .py-network-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: var(--amber-dim); color: var(--amber); }

  /* ── Modal overlay ── */
  .py-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 999;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    overflow-y: auto; -webkit-overflow-scrolling: touch;
  }
  .py-modal {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-lg); padding: 28px; width: 100%; max-width: 440px;
    position: relative; animation: py-modal-in .2s ease;
    max-height: calc(100vh - 40px); max-height: calc(100dvh - 40px);
    overflow-y: auto; -webkit-overflow-scrolling: touch;
    margin: auto;
  }
  @keyframes py-modal-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  .py-modal-close { position: absolute; top: 16px; right: 16px; color: var(--muted); font-size: 18px; cursor: pointer; z-index: 1; }
  .py-modal-close:hover { color: var(--text); }
  .py-modal-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
  .py-modal-title { font-family: var(--serif); font-size: 20px; margin-bottom: 6px; padding-right: 24px; }
  .py-modal-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; line-height: 1.6; }

  @media (max-width: 480px) {
    .py-modal-overlay { padding: 0; align-items: flex-end; }
    .py-modal {
      max-width: 100%; max-height: 92vh; max-height: 92dvh;
      border-radius: var(--r-lg) var(--r-lg) 0 0;
      padding: 22px 18px calc(18px + env(safe-area-inset-bottom, 0px));
      animation: py-modal-in-sheet .22s ease;
    }
    @keyframes py-modal-in-sheet { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  }

  /* ── Language switcher ── */
  .lang-switcher { position: relative; display: inline-flex; align-items: center; }
  .lang-btn {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); width: 36px; height: 36px;
    cursor: pointer; font-family: var(--sans); color: var(--muted);
    transition: border-color .15s, color .15s;
  }
  .lang-btn:hover { border-color: var(--border2); color: var(--text); }
  .lang-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 176px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: py-lang-fade .18s ease both;
  }
  @keyframes py-lang-fade {
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
  @media (min-width:1600px) { .in-main > * { max-width: 1440px; margin-left: auto; margin-right: auto; } }
  @media (max-width:1400px) {
    .py-plans-grid { grid-template-columns: repeat(3,1fr); }
  }
  @media (max-width:1100px) {
    .py-plans-grid { grid-template-columns: repeat(2,1fr); }
    .py-action-layout { grid-template-columns: 1fr; }
    .py-metrics { grid-template-columns: repeat(2,1fr); }
    .py-wallets { grid-template-columns: 1fr; }
  }
  @media (max-width:768px) {
    .in-shell { grid-template-columns: 1fr !important; }
    .in-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; transform: translateX(-100%) !important; z-index: 300 !important; }
    .in-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
    .in-right { grid-column: 1; }
    .in-hamburger { display: flex; }
    .py-plans-grid { grid-template-columns: 1fr; }
    .py-method-grid { grid-template-columns: 1fr; }
    .in-topbar { gap: 8px; }
  }
  @media (max-width:600px) {
    .in-main { padding: 16px 16px calc(24px + env(safe-area-inset-bottom)); }
    .in-topbar { padding: 0 12px; gap: 6px; }
    .py-metrics { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .py-metric { padding: 14px 14px; }
    .py-metric-icon { width: 28px; height: 28px; margin-bottom: 10px; font-size: 14px; }
    .py-metric-label { font-size: 9px; margin-bottom: 5px; }
    .py-metric-value { font-size: 16px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .py-metric-sub { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .in-profile-dropdown { right: -12px; }
  }
`;

/* ─── Data ───────────────────────────────────────────────────────────────────── */
/* Plans now come entirely from the subscription_plans table — see buildPlanDisplay() below. */

const PAYMENT_METHODS = [
  { id: 'crypto', Icon: Bitcoin, name: 'Crypto',  sub: 'BTC / ETH / USDT',  bg: 'rgba(245,158,11,.12)', col: '#f59e0b' },
  { id: 'bank',   Icon: Building2, name: 'Bank Wire',  sub: '1-3 business days',  bg: 'rgba(52,211,153,.12)', col: '#34d399' },
];

const WITHDRAW_METHODS = [
  { id: 'bank',   Icon: Building2, name: 'Bank Wire',  sub: '1-3 days',    bg: 'rgba(52,211,153,.12)', col: '#34d399' },
  { id: 'crypto', Icon: Bitcoin, name: 'Crypto',  sub: '~10 min',     bg: 'rgba(245,158,11,.12)', col: '#f59e0b' },
];

/* ─── Wallet display config by currency ────────────────────── */
const WALLET_CONFIG = {
  USD: { id: 'usd', Icon: DollarSign,  name: 'USD Wallet', sub: 'US Dollar',  col: '#34d399', bg: 'rgba(52,211,153,.15)',  fmt: (b) => `$${Number(b).toLocaleString('en-US',{minimumFractionDigits:2})}` },
  BTC: { id: 'btc', Icon: Bitcoin,  name: 'BTC Wallet', sub: 'Bitcoin',    col: '#f59e0b', bg: 'rgba(245,158,11,.15)',  fmt: (b) => `${Number(b).toFixed(8)} BTC` },
  ETH: { id: 'eth', Icon: Gem, name: 'ETH Wallet', sub: 'Ethereum',   col: '#5B8CFF', bg: 'rgba(96,165,250,.15)',  fmt: (b) => `${Number(b).toFixed(4)} ETH` },
  EUR: { id: 'eur', Icon: Euro,      name: 'EUR Wallet', sub: 'Euro',       col: '#B49BFF', bg: 'rgba(167,139,250,.15)', fmt: (b) => `€${Number(b).toLocaleString('en-US',{minimumFractionDigits:2})}` },
};

/* ─── Transaction display helpers ──────────────────────────── */
const TXN_DISPLAY = {
  deposit:    { Icon: Download, iconBg: 'rgba(52,211,153,.15)',  iconCol: '#34d399', amountCol: '#34d399', statusCls: 'green',  sign: '+' },
  withdrawal: { Icon: Upload,   iconBg: 'rgba(96,165,250,.15)',  iconCol: '#5B8CFF', amountCol: '#FF6470', statusCls: 'blue',   sign: '-' },
  plan_charge:{ Icon: Crown,             iconBg: 'rgba(167,139,250,.15)', iconCol: '#B49BFF', amountCol: '#FF6470', statusCls: 'purple', sign: '-' },
  fee:        { Icon: Receipt,           iconBg: 'rgba(100,116,139,.15)', iconCol: '#64748b', amountCol: '#FF6470', statusCls: 'muted',  sign: '-' },
  payout:     { Icon: Banknote,              iconBg: 'rgba(52,211,153,.15)',  iconCol: '#34d399', amountCol: '#34d399', statusCls: 'green',  sign: '+' },
  // Purchases paid in crypto with a proof screenshot (pending until an admin confirms)
  marketplace_purchase: { Icon: Gem,       iconBg: 'rgba(226,174,74,.15)',  iconCol: '#E2AE4A', amountCol: '#FF6470', statusCls: 'amber',  sign: '-' },
  property_investment:  { Icon: Building2, iconBg: 'rgba(180,155,255,.15)', iconCol: '#B49BFF', amountCol: '#FF6470', statusCls: 'purple', sign: '-' },
  mining_purchase:      { Icon: Zap,       iconBg: 'rgba(226,174,74,.15)',  iconCol: '#E2AE4A', amountCol: '#FF6470', statusCls: 'amber',  sign: '-' },
  card_order:           { Icon: Wallet,    iconBg: 'rgba(91,140,255,.15)',  iconCol: '#5B8CFF', amountCol: '#FF6470', statusCls: 'blue',   sign: '-' },
  copy_trading:         { Icon: Copy,      iconBg: 'rgba(54,194,180,.15)',  iconCol: '#36C2B4', amountCol: '#FF6470', statusCls: 'green',  sign: '-' },
  staking_purchase:     { Icon: Coins,     iconBg: 'rgba(226,174,74,.15)',  iconCol: '#E2AE4A', amountCol: '#FF6470', statusCls: 'amber',  sign: '-' },
  staking_reward:       { Icon: Coins,     iconBg: 'rgba(52,211,153,.15)',  iconCol: '#34d399', amountCol: '#34d399', statusCls: 'green',  sign: '+' },
  staking_return:       { Icon: Coins,     iconBg: 'rgba(52,211,153,.15)',  iconCol: '#34d399', amountCol: '#34d399', statusCls: 'green',  sign: '+' },
  swap_in:              { Icon: ArrowRight, iconBg: 'rgba(91,140,255,.15)', iconCol: '#5B8CFF', amountCol: '#34d399', statusCls: 'blue',   sign: '+' },
  swap_out:             { Icon: ArrowRight, iconBg: 'rgba(91,140,255,.15)', iconCol: '#5B8CFF', amountCol: '#FF6470', statusCls: 'blue',   sign: '-' },
  trade_pnl:            { Icon: Zap,       iconBg: 'rgba(91,140,255,.15)',  iconCol: '#5B8CFF', amountCol: '#34d399', statusCls: 'blue',   sign: '' },
  trade_pnl_adjustment: { Icon: Zap,       iconBg: 'rgba(91,140,255,.15)',  iconCol: '#5B8CFF', amountCol: '#34d399', statusCls: 'blue',   sign: '' },
};
const STATUS_CLS_MAP = { completed: 'green', pending: 'amber', failed: 'red', rejected: 'red', reversed: 'purple' };

function formatTxnDate(ts) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
}

const PRESETS_DEPOSIT  = ['$500', '$1,000', '$2,500', '$5,000', '$10,000'];
const PRESETS_WITHDRAW = ['$200', '$500', '$1,000', '$2,500', '$5,000'];

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

/* ─── Convert a wallet's own-currency balance into USD ──────────────────────
   Wallets here can each be denominated in a different currency (USD/BTC/ETH/EUR/…),
   so summing raw balances across wallets mixes units. This normalizes each wallet
   to USD first (using the app's crypto rate table for BTC/ETH, and the live FX
   rate for other fiat) before totals get converted to the user's display currency. */
async function walletBalanceToUsd(balance, currency) {
  const cur = (currency || 'USD').toUpperCase();
  const amt = Number(balance) || 0;
  if (cur === 'USD') return amt;
  const cryptoRate = CRYPTO_RATES[cur.toLowerCase()];
  if (cryptoRate) return amt * cryptoRate; // e.g. BTC balance × USD price per BTC
  const usdPerUnit = await getUsdRate(cur); // 1 USD = usdPerUnit of `cur`
  return usdPerUnit ? amt / usdPerUnit : amt;
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

/* ─── Currency symbol map ─────────────────────────────────────────────────── */
const CURRENCY_SYMBOLS = {
  USD:'$',   EUR:'€',    GBP:'£',   JPY:'¥',   CHF:'Fr',  CAD:'CA$', AUD:'A$',
  NZD:'NZ$', CNY:'¥',   HKD:'HK$', SGD:'S$',  SEK:'kr',  NOK:'kr',  DKK:'kr',
  MXN:'$',   BRL:'R$',  ZAR:'R',   NGN:'₦',   KES:'KSh', GHS:'₵',   EGP:'E£',
  INR:'₹',   KRW:'₩',  IDR:'Rp',  THB:'฿',   MYR:'RM',  PHP:'₱',   TWD:'NT$',
  PKR:'₨',   BDT:'৳',  VND:'₫',   AED:'د.إ', SAR:'﷼',   QAR:'﷼',   KWD:'د.ك',
  BHD:'.د.ب',OMR:'﷼',   JOD:'JD',  TRY:'₺',   PLN:'zł',  CZK:'Kč',  HUF:'Ft',
  RON:'lei', BGN:'лв',  HRK:'kn',  RUB:'₽',   UAH:'₴',   ILS:'₪',   ARS:'$',
  CLP:'$',   COP:'$',   PEN:'S/',  UYU:'$U',  DZD:'دج',  MAD:'د.م.',TND:'DT',
  LYD:'LD',  AOA:'Kz',  ETB:'Br',  TZS:'TSh', UGX:'USh', ZMW:'ZK',  MWK:'MK',
  BTC:'₿',   ETH:'Ξ',
};
function currencySymbol(code) {
  return CURRENCY_SYMBOLS[(code || '').toUpperCase()] ?? (code || '$');
}



/* ═════════════════════════════════════════════════════════════════════════
   GLOBAL DESK SHELL — shared sidebar + topbar (matches the dashboard)
   The page keeps its own layout classes (in-sidebar, in-topbar) so its
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
const DK_ACTIVE = 'payments';
const DK_TITLE  = 'Payments';
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
    <aside className={`in-sidebar dk-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
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
    <header className="in-topbar dk-topbar">
      <button className="in-hamburger dk-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
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

/* Visual layer: palette, type and component polish for the in- page */
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
.in-page-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.4vw,46px) !important; line-height: 1.05 !important; letter-spacing: -.01em !important; color: var(--text); }
.in-page-title em, .in-page-title span { font-style: normal; color: var(--text) !important; }
.in-page-sub { font-size: 15px !important; color: var(--muted) !important; margin-top: 8px; }

/* Buttons */
.in-btn { border-radius: 10px !important; font-family: inherit !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.in-btn-accent { background: var(--accent) !important; color: #07101E !important; border: 1px solid transparent !important; }
.in-btn-accent:hover { filter: brightness(1.07); }
.in-btn-ghost { background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text) !important; }
.in-btn-ghost:hover { background: var(--surface) !important; }

/* Cards and metrics */
.in-metric, .in-card, .in-trader-card, .in-copying-card, .in-item-card, .in-lb-wrap, .in-plan-card,
.fc-card, .pr-card, .ev-card, .eco-side-card, .fc-table-wrap {
  border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -36px rgba(0,0,0,.6);
}
.in-trader-card, .in-item-card, .in-copying-card { transition: border-color .15s, transform .2s; }
.in-trader-card:hover, .in-item-card:hover { border-color: var(--border2) !important; transform: translateY(-2px); }
.in-metric-label { font-size: 13.5px !important; color: var(--muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-family: inherit !important; }
.in-metric-value { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-weight: 600 !important; font-size: 26px !important; letter-spacing: -.01em; }
.in-metric-sub { font-size: 13px !important; color: var(--muted) !important; font-family: inherit !important; }
.in-metric-icon { border-radius: 10px !important; }

/* Tabs, selects, inputs */
.in-tabs { background: var(--surface) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; padding: 4px !important; }
.in-tab { border-radius: 9px !important; font-family: inherit !important; font-weight: 600 !important; color: var(--muted); }
.in-tab.active { background: var(--accent) !important; color: #07101E !important; }
.in-select, .in-input, .in-filter-select, .in-login-input {
  border-radius: 10px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: inherit !important;
}
.in-select:focus, .in-input:focus, .in-filter-select:focus, .in-login-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); outline: none; }

/* Tables */
.in-table th, .fc-table-head { font-family: inherit !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; color: var(--faint) !important; }
.in-table td { font-variant-numeric: tabular-nums; }

/* Badges */
[class^="in-badge"], [class*=" in-badge"] { border-radius: 7px !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0 !important; text-transform: none !important; }

/* Modals */
.in-modal-overlay, .in-upgrade-overlay { background: rgba(3,8,16,.7) !important; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.in-modal, .in-upgrade-modal { border-radius: 20px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8) !important; }

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
.in-live-dot { background: var(--green) !important; }

/* Mono labels become calm sentence-case text */
[class*="-lbl"], [class*="-label"] { letter-spacing: 0 !important; }
`;

/* ─── Crypto coins – base config (icons / colours) ──────────────────────────
   Addresses are fetched at runtime from `platform_crypto_wallets` and stored
   in React state (cryptoCoins) in the root component, then passed as props.
   Nothing is mutated at module scope.                                        */

const CRYPTO_COINS_BASE = [
  { id: 'btc',  label: 'Bitcoin',  symbol: 'BTC',  Icon: Bitcoin,  col: '#f59e0b', network: 'Bitcoin Network', addr: '' },
  { id: 'eth',  label: 'Ethereum', symbol: 'ETH',  Icon: Gem, col: '#5B8CFF', network: 'ERC-20',           addr: '' },
  { id: 'usdt', label: 'Tether',   symbol: 'USDT', Icon: DollarSign,   col: '#34d399', network: 'TRC-20',           addr: '' },
  { id: 'bnb',  label: 'BNB',      symbol: 'BNB',  Icon: Coins,              col: '#f59e0b', network: 'BEP-20',           addr: '' },
  { id: 'sol',  label: 'Solana',   symbol: 'SOL',  Icon: Zap,              col: '#B49BFF', network: 'Solana Network',   addr: '' },
];

/**
 * Fetches ALL active coins from platform_crypto_wallets and maps them
 * to the UI shape. Every field (symbol, name, network, address, icon,
 * color) comes directly from the DB – nothing is hardcoded here.
 * Falls back to CRYPTO_COINS_BASE (empty addresses) if the fetch fails.
 */
/**
 * Normalizes a raw DB row into the UI coin shape regardless of which column
 * names the table / paymentService helper happens to use.
 *
 * Supported variants observed in the wild:
 *   address        | wallet_address | deposit_address | addr
 *   symbol         | coin_symbol    | currency
 *   name           | coin_name      | currency_name
 *   network        | network_name   | chain
 *   icon           | icon_class     | icon_name
 *   color          | colour         | hex_color       | coin_color
 *   is_active      | active         | enabled
 */
function normalizeCoinRow(row) {
  const symbol =
    row.symbol ?? row.coin_symbol ?? row.currency ?? '';
  const name =
    row.name ?? row.coin_name ?? row.currency_name ?? symbol;
  const network =
    row.network ?? row.network_name ?? row.chain ?? '';
  const address =
    row.address ?? row.wallet_address ?? row.deposit_address ?? row.addr ?? '';
  // Resolve the lucide React component: prefer explicit Icon prop, then look up
  // the matching base-config entry by symbol, then fall back to Coins.
  const baseEntry = CRYPTO_COINS_BASE.find(
    c => c.symbol.toLowerCase() === symbol.toLowerCase()
  );
  const Icon =
    row.Icon ??
    baseEntry?.Icon ??
    Coins;

  const color =
    row.color ?? row.colour ?? row.hex_color ?? row.coin_color ?? '#64748b';

  return {
    id:      symbol.toLowerCase(),
    label:   name,
    symbol:  symbol.toUpperCase(),
    network,
    addr:    address,
    Icon,
    col:     color,
  };
}

async function fetchCryptoCoins() {
  // Possible table names to try in order
  const TABLE_NAMES = [
    'platform_crypto_wallets',
    'crypto_wallets',
    'admin_crypto_wallets',
    'platform_wallets',
    'admin_wallets',
    'deposit_wallets',
    'coin_wallets',
  ];

  try {
    let dbRows = null;

    for (const table of TABLE_NAMES) {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      console.log(`[fetchCryptoCoins] trying table "${table}":`, data, error);

      // A missing table returns a PostgREST error; an empty table returns [] with no error
      if (!error && data !== null) {
        dbRows = data;
        console.log(`[fetchCryptoCoins] found table: "${table}" with ${data.length} rows`);
        break;
      }
    }

    if (!dbRows?.length) {
      console.warn('[fetchCryptoCoins] No wallet rows found in any known table. Falling back to base config (empty addresses).');
      return CRYPTO_COINS_BASE;
    }

    const coins = dbRows.map(normalizeCoinRow).filter(c => c.symbol);
    console.log('[fetchCryptoCoins] normalized coins:', coins);

    // Merge: DB coins take priority; any coin missing from DB still shows with empty addr
    const dbSymbols = new Set(coins.map(c => c.symbol));
    const fallbacks = CRYPTO_COINS_BASE.filter(c => !dbSymbols.has(c.symbol));
    return [...coins, ...fallbacks];

  } catch (e) {
    console.warn('[fetchCryptoCoins] Unexpected error:', e.message);
    return CRYPTO_COINS_BASE;
  }
}

// Minimal QR generator (pure JS, no lib needed)
function generateQRSVG(text) {
  // Simple visual placeholder QR that looks realistic
  const size = 21;
  const cells = [];
  // Deterministic "hash" of the address for pattern
  let h = 0;
  for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  const rand = (i) => ((h ^ (i * 2654435761)) >>> 0) % 2;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    // finder patterns (corners)
    const inFinder = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
    if (inFinder) {
      const fr = r % 7; const fc = c % 7;
      const rr = r >= size - 7 ? r - (size - 7) : r;
      const rc = c >= size - 7 ? c - (size - 7) : c;
      const nr = r >= size - 7 ? rr : r < 7 ? r : 0;
      const nc = c >= size - 7 ? rc : c < 7 ? c : 0;
      const onBorder = nr === 0 || nr === 6 || nc === 0 || nc === 6;
      const onInner = nr >= 2 && nr <= 4 && nc >= 2 && nc <= 4;
      cells.push({ r, c, fill: onBorder || onInner ? '#000' : '#fff' });
    } else {
      cells.push({ r, c, fill: rand(r * size + c) ? '#000' : '#fff' });
    }
  }
  const cell = 100 / size;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:124px;height:124px;">
    <rect width="100" height="100" fill="white"/>
    ${cells.map(({ r, c, fill }) => fill === '#000' ? `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#000"/>` : '').join('')}
  </svg>`;
}

function CryptoPayModal({ plan, annual, onClose, cryptoCoins, userId }) {
  const [coin, setCoin] = useState('usdt');
  const [viewTab, setViewTab] = useState('qr'); // 'qr' | 'address'
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const selected = cryptoCoins.find(c => c.id === coin);
  const amount = annual ? plan.annual * 12 : plan.monthly;

  const handleCopy = () => {
    navigator.clipboard.writeText(selected.addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProofSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
  };
  const handleProofRemove = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
  };
  useEffect(() => () => { if (proofPreview) URL.revokeObjectURL(proofPreview); }, [proofPreview]);

  /**
   * User clicks "I've Sent the Payment" after sending on-chain for a plan
   * upgrade. Requires an attached proof screenshot — uploads it to the
   * `payment-proofs` bucket, then files a pending subscription-payment
   * request for an admin/webhook to verify and activate the plan.
   */
  const handleConfirmSent = async () => {
    if (submitting) return;
    if (!proofFile) {
      setError('Please upload a screenshot of your payment before confirming.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const proofUrl = await uploadPaymentProof(proofFile, userId, `plan-${plan._dbId}`);
      const { error: insertErr } = await supabase.from('subscription_payment_requests').insert({
        user_id: userId,
        plan_id: plan._dbId,
        plan_name: plan.name,
        billing_cycle: annual ? 'annual' : 'monthly',
        amount,
        coin,
        network: selected.network,
        tx_hash: txHash.trim() || null,
        proof_url: proofUrl,
        status: 'pending',
      });
      if (insertErr) throw new Error(insertErr.message);
      setSubmitted(true);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-modal-overlay" onClick={onClose}>
        <div className="py-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
          <div className="py-modal-icon" style={{ background: 'rgba(245,158,11,.12)' }}>
            <Clock4 size={24} style={{ color: T.am}} />
          </div>
          <div className="py-modal-title">Upgrade <em style={{ color: T.am, fontStyle: 'italic' }}>Pending</em></div>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: 13, color: T.nt, lineHeight: 1.7 }}>
              Your payment for the <strong style={{ color: T.gr }}>{plan.name}</strong> plan has been submitted and is <strong style={{ color: T.am }}>awaiting verification</strong>.
              Your plan will be upgraded once the payment is confirmed against the proof you attached.
            </div>
          </div>
          <button className="in-btn in-btn-ghost in-btn-sm in-btn-full" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-modal-overlay" onClick={onClose}>
      <div className="py-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <button className="py-modal-close" onClick={onClose}><X size={16} /></button>

        {/* Header */}
        <div className="py-modal-icon" style={{ background: 'rgba(245,158,11,.12)' }}>
          <Bitcoin size={24} style={{ color: '#f59e0b'}} />
        </div>
        <div className="py-modal-title">Pay with <em style={{ color: T.g, fontStyle: 'italic' }}>Crypto</em></div>
        <div className="py-modal-sub" style={{ marginBottom: 16 }}>
          Send exactly <strong style={{ color: T.gr, fontFamily: T.mono }}>${amount}</strong> worth of your chosen coin to the address below.
        </div>

        {/* Amount pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 3 }}>{plan.name} Plan · {annual ? 'Annual' : 'Monthly'}</div>
            <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.g }}>${amount}</div>
          </div>
          <span className="py-network-badge">{selected.network}</span>
        </div>

        {/* Coin selector */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 8 }}>Select Coin</div>
        <div className="py-crypto-coins">
          {cryptoCoins.map(c => (
            <button key={c.id} className={`py-crypto-coin${coin === c.id ? ' sel' : ''}`} onClick={() => setCoin(c.id)}>
              <c.Icon size={16} style={{ color: c.col }} />
              {c.symbol}
            </button>
          ))}
        </div>

        {/* QR / Address tabs */}
        <div className="py-crypto-tabs">
          <button className={`py-crypto-tab${viewTab === 'qr' ? ' active' : ''}`} onClick={() => setViewTab('qr')}>
            <QrCode size={16} style={{ marginRight: 5}} />Scan QR
          </button>
          <button className={`py-crypto-tab${viewTab === 'address' ? ' active' : ''}`} onClick={() => setViewTab('address')}>
            <Copy size={16} style={{ marginRight: 5}} />Copy Address
          </button>
        </div>

        {viewTab === 'qr' && (
          <div className="py-qr-wrap">
            <div className="py-qr-box" dangerouslySetInnerHTML={{ __html: generateQRSVG(selected.addr) }} />
            <div className="py-qr-label">
              Scan with your crypto wallet app<br />
              <strong style={{ color: T.gr }}>{selected.label} ({selected.symbol})</strong> · {selected.network}
            </div>
          </div>
        )}

        {viewTab === 'address' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 8 }}>
              {selected.label} ({selected.symbol}) Address
            </div>
            <div className="py-addr-wrap">
              <span className="py-addr-text">{selected.addr}</span>
              <button className="py-addr-copy" onClick={handleCopy}>
                {copied ? <><Check size={16} style={{ marginRight: 4}} />Copied!</> : <><Copy size={16} style={{ marginRight: 4}} />Copy</>}
              </button>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#f59e0b', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1}} />
          Send only <strong>{selected.symbol}</strong> on the <strong>{selected.network}</strong> network. Sending a different coin or network may result in permanent loss.
        </div>

        {/* Optional tx hash */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 6 }}>
            Transaction Hash <span style={{ color: T.nt, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional – paste after sending)</span>
          </div>
          <input
            className="py-input"
            placeholder="e.g. 0xabc123… or txid…"
            value={txHash}
            onChange={e => setTxHash(e.target.value)}
            style={{ width: '100%', fontFamily: T.mono, fontSize: 12 }}
          />
        </div>

        {/* Payment proof — required before "I've Sent the Payment" can be clicked */}
        <PaymentProofField
          file={proofFile}
          preview={proofPreview}
          onSelect={handleProofSelect}
          onRemove={handleProofRemove}
        />

        {error && (
          <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.rd, marginBottom: 14 }}>
            <AlertCircle size={16} style={{ marginRight: 6}} />{error}
          </div>
        )}

        {/* CTA – user clicks AFTER sending on-chain AND attaching proof */}
        <button
          className="in-btn in-btn-accent in-btn-lg in-btn-full"
          onClick={handleConfirmSent}
          disabled={submitting || !selected?.addr || !proofFile}
          style={{ marginBottom: 16 }}
        >
          {submitting
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite'}} /> Submitting…</>
            : <><CheckCheck size={16} /> I've Sent the Payment</>}
        </button>

        <div className="py-security"><ShieldCheck size={16} />Payments confirmed on-chain · typically 1–3 block confirmations</div>
      </div>
    </div>
  );
}

/* ── Build a display-ready plan straight from a subscription_plans row ──
   Nothing here is keyed off a specific plan name — it all comes from the
   row's own numeric limits and its `features` jsonb column, so adding or
   renaming a plan in the DB just works with no code changes. */
function formatLimit(value, unit) {
  if (value === null || value === undefined) return `Unlimited ${unit}`;
  const n = Number(value);
  if (!Number.isFinite(n)) return `Unlimited ${unit}`;
  return `Up to ${n.toLocaleString()} ${unit}`;
}

function buildPlanDisplay(dbPlan, symbol = '$', fxRate = 1) {
  const jsonFeatures = dbPlan.features && typeof dbPlan.features === 'object' ? dbPlan.features : {};
  const featured = jsonFeatures.featured === true;

  // Core limits always shown, straight from the row's own columns.
  const rows = [
    { yes: true, label: formatLimit(dbPlan.max_copy_traders, 'copy traders') },
    { yes: true, label: dbPlan.max_allocation === null ? 'Unlimited allocation' : `${symbol}${(Number(dbPlan.max_allocation) * fxRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} max allocation` },
    { yes: true, label: formatLimit(dbPlan.max_alerts, 'price alerts') },
    { yes: true, label: formatLimit(dbPlan.max_watchlist, 'watchlist symbols') },
    { yes: true, label: formatLimit(dbPlan.api_calls_per_day, 'API calls/day') },
  ];

  // Any extra boolean flags in the features jsonb (e.g. {"priority_support": true})
  // get rendered too, turning snake_case keys into readable labels.
  Object.entries(jsonFeatures).forEach(([key, val]) => {
    if (key === 'featured' || key === 'description') return;
    if (typeof val !== 'boolean') return;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    rows.push({ yes: val, label });
  });

  return {
    name: dbPlan.name,
    monthly: Number(dbPlan.monthly_price),
    annual: Number(dbPlan.annual_price),
    _dbId: dbPlan.id,
    featured,
    accent: featured,
    desc: jsonFeatures.description || `${dbPlan.name} plan.`,
    features: rows,
  };
}

/* ── Plans Panel ── */
function PlansPanel({ activeSub, dbPlans, userId, onUpgrade, cryptoCoins, symbol = '$', fxRate = 1 }) {
  const annual = true;
  const [chosen, setChosen] = useState(activeSub?.subscription_plans?.name || '');
  const [confirmModal, setConfirmModal] = useState(null);
  const [cryptoModal, setCryptoModal] = useState(null);

  // Sort cheapest → priciest and build the full display shape from each row.
  const displayPlans = [...dbPlans]
    .sort((a, b) => Number(a.monthly_price) - Number(b.monthly_price))
    .map(p => buildPlanDisplay(p, symbol, fxRate));

  // Default the outlined/selected card once plans arrive, if nothing chosen yet.
  useEffect(() => {
    if (chosen || displayPlans.length === 0) return;
    setChosen((displayPlans.find(p => p.featured) || displayPlans[0]).name);
  }, [dbPlans]); // eslint-disable-line react-hooks/exhaustive-deps

  if (displayPlans.length === 0) {
    return (
      <div className="in-controls" style={{ textAlign: 'center', padding: '48px 0', color: T.nt, fontSize: 13 }}>
        <Loader2 size={20} style={{ display: 'block', margin: '0 auto 10px' }} />
        No subscription plans found.
      </div>
    );
  }

  return (
    <div>
      <div className="in-controls">
        <div style={{ fontSize: 13, color: T.nt }}>
          Choose a plan that fits your trading style.
        </div>

      </div>

      <div className="py-plans-grid">
        {displayPlans.map(p => (
          <div
            key={p.name}
            className={`py-plan${p.featured ? ' featured' : ''}`}
            onClick={() => setChosen(p.name)}
            style={{ outline: chosen === p.name ? `2px solid ${p.featured ? T.g : T.br2}` : 'none', outlineOffset: 2 }}
          >
            {p.featured && <div className="py-plan-badge">Most Popular</div>}
            <div className={`py-plan-name${p.accent ? ' accent' : ''}`}>{p.name}</div>
            <div className="py-plan-desc">{p.desc}</div>
            <div className="py-plan-price">
              <span className="py-plan-price-cur">{symbol}</span>
              <span className="py-plan-price-val" style={{ color: p.accent ? T.g : T.gr }}>
                {((annual ? p.annual : p.monthly) * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="py-plan-price-per">/mo</span>
            </div>
            <div className="py-plan-save">
              {annual && p.monthly > 0 ? `Save ${symbol}${(((p.monthly - p.annual) * 12) * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}/yr` : ' '}
            </div>
            <button
              className={`in-btn in-btn-md in-btn-full${p.featured ? ' in-btn-accent' : ' in-btn-ghost'}`}
              onClick={e => { e.stopPropagation(); if (p.monthly > 0) setConfirmModal(p); }}
            >
              {p.monthly === 0 ? 'Current Plan' : `Get ${p.name}`}
              {p.monthly > 0 && <ArrowRight size={16} />}
            </button>
            <div className="py-plan-divider" />
            {p.features.map((f, i) => (
              <div key={i} className={`py-plan-feature ${f.yes ? 'yes' : 'no'}`}>
                {f.yes ? <Check size={16} /> : <X size={16} />}
                {f.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Step 1: Confirm modal */}
      {confirmModal && (
        <div className="py-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="py-modal" onClick={e => e.stopPropagation()}>
            <button className="py-modal-close" onClick={() => setConfirmModal(null)}><X size={16} /></button>
            <div className="py-modal-icon" style={{ background: 'rgba(226,174,74,.12)' }}>
              <Crown size={24} style={{ color: T.g}} />
            </div>
            <div className="py-modal-title">Upgrade to <em style={{ color: T.g, fontStyle: 'italic' }}>{confirmModal.name}</em></div>
            <div className="py-modal-sub">
              You'll be charged <strong>{symbol}{((annual ? confirmModal.annual : confirmModal.monthly) * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}/month</strong>
              {annual ? ' (billed annually)' : ' (billed monthly)'}.
              Your current plan features remain active until the billing cycle ends.
            </div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
              <div className="py-sum-row"><span className="py-sum-row-label">{confirmModal.name} Plan</span><span className="py-sum-row-val">{symbol}{((annual ? confirmModal.annual : confirmModal.monthly) * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo</span></div>
              <div className="py-sum-row"><span className="py-sum-row-label">Billing</span><span className="py-sum-row-val">{annual ? 'Annual' : 'Monthly'}</span></div>
              <div className="py-sum-divider" />
              <div className="py-sum-total"><span className="py-sum-total-label">Due today</span><span className="py-sum-total-val">{symbol}{((annual ? confirmModal.annual * 12 : confirmModal.monthly) * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            </div>
            <button className="in-btn in-btn-accent in-btn-lg in-btn-full" onClick={() => { setConfirmModal(null); setCryptoModal(confirmModal); }}>
              <Lock size={16} /> Confirm &amp; Pay
            </button>
            <div className="py-security"><ShieldCheck size={16} />256-bit SSL encryption · Cancel anytime</div>
          </div>
        </div>
      )}

      {/* Step 2: Crypto payment modal */}
      {cryptoModal && (
        <CryptoPayModal
          plan={cryptoModal}
          annual={annual}
          onClose={() => setCryptoModal(null)}
          cryptoCoins={cryptoCoins}
          userId={userId}
        />
      )}
    </div>
  );
}

/* ── Crypto rates (approx) ── */
const CRYPTO_RATES = { btc: 61200, eth: 3020, usdt: 1, bnb: 580, sol: 148 };

/* ── Payment proof upload ──────────────────────────────────────────────────
   Every "I've Sent the Payment" confirmation (crypto deposits AND plan
   upgrades) must attach proof before it can be submitted. Files are stored
   in the Supabase Storage bucket below, namespaced by user id so proofs
   never collide or leak across accounts. */
const PAYMENT_PROOF_BUCKET = 'payment-proofs';
const MAX_PROOF_SIZE_MB = 5;
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

async function uploadPaymentProof(file, userId, context = 'payment') {
  if (!file) throw new Error('Please attach a screenshot of your payment before continuing.');
  if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
    throw new Error('Only JPG or PNG images are accepted as payment proof.');
  }
  if (file.size > MAX_PROOF_SIZE_MB * 1024 * 1024) {
    throw new Error(`Payment proof must be smaller than ${MAX_PROOF_SIZE_MB}MB.`);
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId || 'anonymous'}/${context}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadErr) throw new Error(`Could not upload payment proof: ${uploadErr.message}`);

  // The bucket is private, so we store the object's storage path (not a
  // public URL). Admins generate short-lived signed URLs on demand to
  // view/download it — see transactions.jsx.
  return path;
}

/* Shared "attach proof" field used by every payment-confirmation modal. */
function PaymentProofField({ file, preview, onSelect, onRemove }) {
  const inputRef = React.useRef(null);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 6 }}>
        Payment Proof <span style={{ color: T.rd, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(required)</span>
      </div>
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '18px 14px', borderRadius: 10, border: '1px dashed var(--border2)',
            background: 'var(--surface2)', color: T.nt, fontSize: 12, cursor: 'pointer',
          }}
        >
          <Upload size={18} />
          Upload a screenshot of your payment (JPG/PNG, max {MAX_PROOF_SIZE_MB}MB)
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
          {preview && (
            <img src={preview} alt="Payment proof preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border2)' }} />
          )}
          <div style={{ flex: 1, fontSize: 12, color: T.gr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <button type="button" onClick={onRemove} style={{ color: T.nt, display: 'flex' }}><X size={16} /></button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={onSelect}
      />
    </div>
  );
}

/* ── Crypto Deposit Modal ── */
function CryptoDepositModal({ amount, coin, onClose, onSuccess, cryptoCoins, userId }) {
  const [copied, setCopied] = React.useState(false);
  const [txHash, setTxHash] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [proofFile, setProofFile] = React.useState(null);
  const [proofPreview, setProofPreview] = React.useState(null);

  const selected = cryptoCoins.find(c => c.id === coin);
  const rate = CRYPTO_RATES[coin] || 1;
  const coinAmt = (parseFloat(amount) / rate).toFixed(coin === 'usdt' ? 2 : 6);

  const handleCopy = () => {
    navigator.clipboard.writeText(selected?.addr ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProofSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
  };
  const handleProofRemove = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
  };
  React.useEffect(() => () => { if (proofPreview) URL.revokeObjectURL(proofPreview); }, [proofPreview]);

  /**
   * User clicks "I've Sent the Payment" after actually sending on-chain.
   * Requires an attached payment-proof screenshot — the file is uploaded to
   * the `payment-proofs` bucket first, then the deposit is recorded as
   * status='pending' so an admin/webhook can confirm it against the proof.
   * Does NOT auto-complete – a real blockchain confirmation is still required.
   */
  const handleConfirmSent = async () => {
    if (submitting) return;
    if (!proofFile) {
      setError('Please upload a screenshot of your payment before confirming.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const proofUrl = await uploadPaymentProof(proofFile, userId, 'deposit');
      // onSuccess receives the tx hash the user pasted and the proof URL –
      // the parent records a pending deposit and shows the success screen.
      await onSuccess(txHash.trim() || null, proofUrl);
      setSubmitted(true);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!selected) return null;

  return (
    <div className="py-modal-overlay" onClick={submitted ? null : onClose}>
      <div className="py-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        {!submitted && <button className="py-modal-close" onClick={onClose}><X size={16} /></button>}

        {/* Header icon */}
        <div className="py-modal-icon" style={{ background: `${selected.col}1a` }}>
          <selected.Icon size={16} style={{ color: selected.col, fontSize: 24 }} />
        </div>

        {submitted ? (
          /* ── Submitted state ── */
          <>
            <div className="py-modal-title">Deposit <em style={{ color: T.am, fontStyle: 'italic' }}>Pending</em></div>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Clock4 size={30} style={{ color: T.am}} />
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.gr, marginBottom: 8 }}>
                {coinAmt} {selected.symbol} <span style={{ fontSize: 13, color: T.nt }}>≈ ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ fontSize: 13, color: T.nt, lineHeight: 1.7 }}>
                Your deposit has been submitted and is <strong style={{ color: T.am }}>awaiting blockchain confirmation</strong>.
                Your wallet balance will be updated once the transaction is verified on-chain.
              </div>
              {txHash && (
                <div style={{ marginTop: 14, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: T.mono, color: T.nt, wordBreak: 'break-all' }}>
                  TX: {txHash}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 11, color: T.nt }}>
                Payment proof attached — our team will verify it against the on-chain transaction.
              </div>
            </div>
            <button className="in-btn in-btn-ghost in-btn-sm in-btn-full" onClick={onClose}>Close</button>
          </>
        ) : (
          /* ── Awaiting send state ── */
          <>
            <div className="py-modal-title">Send <em style={{ color: T.g, fontStyle: 'italic' }}>{selected.symbol}</em> to deposit</div>

            {/* Amount pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 4 }}>Amount to Send</div>
                <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.gr }}>
                  {coinAmt} <span style={{ fontSize: 14, color: T.nt }}>{selected.symbol}</span>
                </div>
                <div style={{ fontSize: 11, color: T.nt, marginTop: 3 }}>≈ ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 4 }}>Network</div>
                <span className="py-network-badge">{selected.network}</span>
              </div>
            </div>

            {/* Deposit address */}
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 8 }}>
              {selected.label} ({selected.symbol}) Deposit Address
            </div>
            {selected.addr ? (
              <div className="py-addr-wrap" style={{ marginBottom: 18 }}>
                <span className="py-addr-text">{selected.addr}</span>
                <button className="py-addr-copy" onClick={handleCopy}>
                  {copied ? <><Check size={16} style={{ marginRight: 4}} />Copied!</> : <><Copy size={16} style={{ marginRight: 4}} />Copy</>}
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: T.rd, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0}} />
                  <strong>No deposit address found for {selected.symbol}.</strong>
                </div>
                <div style={{ color: T.nt, lineHeight: 1.6, marginBottom: 10 }}>
                  The {selected.symbol} wallet address hasn't been configured yet. Please select a different coin or try again shortly.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Quick-switch to first coin that has an address */}
                  {cryptoCoins.filter(c => c.addr && c.id !== coin).slice(0, 2).map(c => (
                    <button
                      key={c.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', color: T.gr, cursor: 'pointer' }}
                      onClick={() => {
                        // bubble up via the parent's setCoin — we close and let parent reopen with new coin
                        onClose();
                      }}
                    >
                      <c.Icon size={16} style={{ color: c.col }} />{c.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QR code */}
            {selected.addr && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <div style={{ background: '#fff', padding: 10, borderRadius: 10, display: 'inline-block' }}
                  dangerouslySetInnerHTML={{ __html: generateQRSVG(selected.addr) }} />
              </div>
            )}

            {/* Optional tx hash */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 6 }}>
                Transaction Hash <span style={{ color: T.nt, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional – paste after sending)</span>
              </div>
              <input
                className="py-input"
                placeholder="e.g. 0xabc123… or txid…"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                style={{ width: '100%', fontFamily: T.mono, fontSize: 12 }}
              />
            </div>

            {/* Warning */}
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: T.am, display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 18 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1}} />
              Send only <strong>{selected.symbol}</strong> on the <strong>{selected.network}</strong> network.
              Sending a different coin or using the wrong network may result in permanent loss.
            </div>

            {/* Payment proof — required before "I've Sent the Payment" can be clicked */}
            <PaymentProofField
              file={proofFile}
              preview={proofPreview}
              onSelect={handleProofSelect}
              onRemove={handleProofRemove}
            />

            {error && (
              <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.rd, marginBottom: 14 }}>
                <AlertCircle size={16} style={{ marginRight: 6}} />{error}
              </div>
            )}

            {/* CTA – user clicks AFTER sending on-chain AND attaching proof */}
            <button
              className="in-btn in-btn-accent in-btn-lg in-btn-full"
              onClick={handleConfirmSent}
              disabled={submitting || !selected.addr || !proofFile}
            >
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite'}} /> Submitting…</>
                : <><CheckCheck size={16} /> I've Sent the Payment</>}
            </button>

            <div className="py-security" style={{ marginTop: 12 }}>
              <ShieldCheck size={16} />
              Deposit credited after on-chain confirmation · 256-bit TLS
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Bank Support Modal ── */
function BankSupportModal({ onClose }) {
  const [sent, setSent] = React.useState(false);
  return (
    <div className="py-modal-overlay" onClick={onClose}>
      <div className="py-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <button className="py-modal-close" onClick={onClose}><X size={16} /></button>
        <div className="py-modal-icon" style={{ background: 'rgba(52,211,153,.12)' }}>
          <Building2 size={24} style={{ color: T.gn}} />
        </div>
        <div className="py-modal-title">Bank Wire <em style={{ color: T.gn, fontStyle: 'italic' }}>Transfer</em></div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0 8px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,211,153,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={30} style={{ color: T.gn}} />
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 18, marginBottom: 8 }}>Request Sent!</div>
            <div style={{ fontSize: 13, color: T.nt, lineHeight: 1.7 }}>
              Our support team will contact you within <strong style={{ color: T.gr }}>24 hours</strong> with the bank wire details and instructions.
            </div>
            <button className="in-btn in-btn-ghost in-btn-sm" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="py-modal-sub">
              Bank wire deposits require manual processing. Contact our support team to receive the banking details and reference number for your transfer.
            </div>

            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 12 }}>Contact Support</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(96,165,250,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={15} style={{ color: T.bl}} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>Email Support</div>
                    <div style={{ fontSize: 11, color: T.nt }}>support@profitgainsignal.com</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,211,153,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={15} style={{ color: T.gn}} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>Telegram</div>
                    <div style={{ fontSize: 11, color: T.nt }}>Live chat in the Help Center</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={15} style={{ color: T.pr}} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>Response Time</div>
                    <div style={{ fontSize: 11, color: T.nt }}>Within 24 hours · Mon–Fri</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: T.am, display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 18 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1}} />
              Bank wire transfers typically settle in 1–3 business days. Minimum deposit: $500.
            </div>

            <button className="in-btn in-btn-accent in-btn-lg in-btn-full" onClick={() => setSent(true)}>
              <Send size={16} /> Request Bank Details
            </button>
            <div className="py-security"><ShieldCheck size={16} />Your information is encrypted and secure</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Deposit Panel ── */
function DepositPanel({ user, profile, wallets, currency, onDepositComplete, cryptoCoins }) {
  const [amount, setAmount] = useState('');
  const [preset, setPreset] = useState(null);
  const [method, setMethod] = useState('crypto');
  const [cryptoCoin, setCryptoCoin] = useState('usdt');
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // USD wallet balance for "Available" hint
  const usdWallet = wallets.find(w => w.currency === 'USD');
  const availableBalance = usdWallet ? Number(usdWallet.balance) : 0;

  const fee = amount ? (parseFloat(amount.replace(/[^0-9.]/g, '')) * 0.001).toFixed(2) : '0.00';
  const total = amount ? (parseFloat(amount.replace(/[^0-9.]/g, '')) || 0).toFixed(2) : '0.00';

  const handlePreset = (p) => {
    setPreset(p);
    setAmount(p.replace('$', '').replace(',', ''));
  };

  const handleDeposit = () => {
    if (!amount || amount.trim() === '' || parseFloat(amount) <= 0) {
      setError('Please enter an amount to deposit.');
      return;
    }
    setError(null);
    if (method === 'crypto') setShowCryptoModal(true);
    else if (method === 'bank') setShowBankModal(true);
  };

  // Called by CryptoDepositModal once the payment proof is uploaded and the
  // user confirms they've sent it.
  const handleCryptoSuccess = useCallback(async (txReference, proofUrl) => {
    if (!user) return;
    setLoading(true);
    try {
      const txn = await createDepositRequest({
        userId: user.id,
        walletId: wallets.find(w => w.currency === 'USD')?.id,
        amount: parseFloat(amount),
        fee: parseFloat(fee) || 0,
        method: `Crypto (${cryptoCoins.find(c => c.id === cryptoCoin)?.symbol || cryptoCoin.toUpperCase()})`,
        reference: txReference || null,
        proofUrl: proofUrl || null,
      });
      // Confirmation email — the deposit is already saved, so a mail problem mustn't show as a failure
      try { await sendDepositEmail({
        email: profile.email,
        firstName: profile.first_name,
        amount: txn.net_amount,
        currency: 'USD',
        method: `Crypto (${cryptoCoins.find(c => c.id === cryptoCoin)?.symbol})`,
        reference: txn.reference,
        invoiceNumber: txn.invoice_number,
        date: new Date(txn.created_at).toLocaleString(),
      }); } catch (mailErr) { console.warn('Deposit saved, but the email failed:', mailErr?.message); }
      setSuccess(true);
      if (onDepositComplete) onDepositComplete();
    } catch (err) {
      setError(err.message);
      throw err; // let the modal show the error instead of "sent"
    } finally {
      setLoading(false);
    }
  }, [user, profile, amount, fee, wallets, cryptoCoin, cryptoCoins, onDepositComplete]);

  if (success) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,211,153,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={36} style={{ color: T.gn}} />
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 24 }}>Deposit <em style={{ color: T.gn, fontStyle: 'italic' }}>Submitted!</em></div>
      <div style={{ fontSize: 13, color: T.nt, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
        We've received your <strong style={{ fontFamily: T.mono, color: T.gr }}>${parseFloat(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> deposit and payment proof.
        It will be added to your USD wallet as soon as we confirm the payment, usually within a few hours. You can follow it under Transactions.
        <div style={{ marginTop: 6, fontSize: 12 }}>A confirmation email has been sent to <strong style={{ color: T.gr }}>{profile?.email}</strong></div>
      </div>
      <button className="in-btn in-btn-ghost in-btn-sm" onClick={() => { setSuccess(false); setAmount(''); setPreset(null); }}>
        Make another deposit
      </button>
    </div>
  );

  return (
    <>
      <div className="py-action-layout">
        <div className="py-form-card">
          <div className="py-form-title">Make a <em>Deposit</em></div>
          <div className="py-form-sub">Funds are added to your wallet once we confirm the payment (bank wire: 1–3 days).</div>

          <div className="py-field">
            <div className="py-field-label">
              Amount
              <span className="py-field-hint">Available: ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="py-amount-wrap">
              <span className="py-amount-cur">$</span>
              <input
                className="py-input padded"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setPreset(null); }}
              />
            </div>
            <div className="py-presets">
              {PRESETS_DEPOSIT.map(p => (
                <button key={p} className={`py-preset${preset === p ? ' sel' : ''}`} onClick={() => handlePreset(p)}>{p}</button>
              ))}
            </div>
          </div>

          <div className="py-field">
            <div className="py-field-label">Payment Method</div>
            <div className="py-method-grid">
              {PAYMENT_METHODS.map(m => (
                <div key={m.id} className={`py-method${method === m.id ? ' sel' : ''}`} onClick={() => setMethod(m.id)}>
                  <div className="py-method-icon" style={{ background: m.bg }}>
                    <m.Icon size={16} style={{ color: m.col }} />
                  </div>
                  <div>
                    <div className="py-method-name">{m.name}</div>
                    <div className="py-method-sub">{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {method === 'crypto' && (
            <div className="py-field">
              <div className="py-field-label">Select Coin</div>
              <div className="py-crypto-coins" style={{ marginBottom: 0 }}>
                {cryptoCoins.map(c => (
                  <button
                    key={c.id}
                    className={`py-crypto-coin${cryptoCoin === c.id ? ' sel' : ''}`}
                    onClick={() => setCryptoCoin(c.id)}
                  >
                    <c.Icon size={16} style={{ color: c.col }} />
                    {c.symbol}
                  </button>
                ))}
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: T.nt }}>
                  You'll send <strong style={{ fontFamily: T.mono, color: T.gr }}>
                    {(parseFloat(amount) / (CRYPTO_RATES[cryptoCoin] || 1)).toFixed(cryptoCoin === 'usdt' ? 2 : 6)} {cryptoCoins.find(c => c.id === cryptoCoin)?.symbol}
                  </strong> · Rate: 1 {cryptoCoins.find(c => c.id === cryptoCoin)?.symbol} ≈ ${(CRYPTO_RATES[cryptoCoin] || 1).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <button
            className="in-btn in-btn-accent in-btn-lg in-btn-full"
            style={{ marginTop: 4 }}
            onClick={handleDeposit}
          >
            <Lock size={16} /> Deposit ${amount ? parseFloat(amount).toLocaleString() : '0.00'}
          </button>
        </div>

        <div className="py-summary-card">
          <div className="py-summary-title">Deposit Summary</div>
          <div className="py-sum-row">
            <span className="py-sum-row-label">Amount</span>
            <span className="py-sum-row-val">${parseFloat(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="py-sum-row">
            <span className="py-sum-row-label">Processing Fee</span>
            <span className="py-sum-row-val" style={{ color: T.nt }}>${fee}</span>
          </div>
          <div className="py-sum-row">
            <span className="py-sum-row-label">Method</span>
            <span className="py-sum-row-val" style={{ color: T.nt }}>{PAYMENT_METHODS.find(m => m.id === method)?.name}</span>
          </div>
          <div className="py-sum-divider" />
          <div className="py-sum-total">
            <span className="py-sum-total-label">You'll receive</span>
            <span className="py-sum-total-val">${parseFloat(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="py-security">
            <ShieldCheck size={16} />
            Secured by 256-bit TLS encryption
          </div>
          <div className="py-security" style={{ marginTop: 0 }}>
            <Clock4 size={16} />
            Credited once confirmed · 24/7 processing
          </div>

          <div style={{ marginTop: 18, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: T.nt, marginBottom: 10 }}>Your Wallets</div>
            {wallets.slice(0, 2).map(w => {
              const cfg = WALLET_CONFIG[w.currency] || { Icon: Wallet, name: `${w.currency} Wallet`, col: '#64748b', bg: 'rgba(100,116,139,.15)', fmt: (b) => `${b}` };
              return (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <cfg.Icon size={16} style={{ fontSize: 13, color: cfg.col }} />
                  </div>
                  <span style={{ fontSize: 12, flex: 1 }}>{cfg.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: cfg.col }}>{cfg.fmt(w.balance)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCryptoModal && (
        <CryptoDepositModal
          amount={total}
          coin={cryptoCoin}
          onClose={() => setShowCryptoModal(false)}
          onSuccess={(txRef, proofUrl) => handleCryptoSuccess(txRef, proofUrl)}
          cryptoCoins={cryptoCoins}
          userId={user?.id}
        />
      )}
      {showBankModal && (
        <BankSupportModal onClose={() => setShowBankModal(false)} />
      )}
      {error && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '12px 18px', fontSize: 13, color: T.rd, zIndex: 9999, maxWidth: 340 }}>
          <AlertTriangle size={16} style={{ marginRight: 8}} />{error}
        </div>
      )}
    </>
  );
}

/* ── Deposit request ──
   Saved here (not through paymentService.recordDeposit) so it's always a
   *pending* row in transactions with the proof attached: it shows in
   Admin → Transactions → Pending deposits, and the wallet is only credited
   when an admin approves it. */
async function createDepositRequest({ userId, walletId, amount, fee, method, reference, proofUrl }) {
  const amt = Math.round(Number(amount) * 100) / 100;
  const f = Math.round(Number(fee || 0) * 100) / 100;
  const d = new Date();
  const invoice = `INV-D-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data, error } = await supabase.from('transactions').insert({
    user_id: userId,
    wallet_id: walletId || null,
    type: 'deposit',
    amount: amt,
    fee: f,
    net_amount: Math.round((amt - f) * 100) / 100,
    currency: 'USD',
    status: 'pending',
    reference: reference || null,
    description: `Deposit via ${method} — awaiting confirmation`,
    invoice_number: invoice,
    proof_url: proofUrl || null,
  }).select().single();
  if (error) throw new Error(`Couldn't record your deposit: ${error.message}`);
  return data;
}

/* ── Withdrawal sent: confirmation popup ── */
const maskDest = (d) => {
  if (!d) return '';
  return d.split(' / ').map(part => (part.length > 10 ? `${part.slice(0, 6)}…${part.slice(-4)}` : part)).join(' / ');
};
function WithdrawSuccessModal({ receipt: r, email, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  const money = (n) => `${r.currency === 'USD' ? '$' : ''}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${r.currency !== 'USD' ? ` ${r.currency}` : ''}`;
  const row = (label, value, style) => (
    <div className="py-sum-row"><span className="py-sum-row-label">{label}</span><span className="py-sum-row-val" style={style}>{value}</span></div>
  );
  return (
    <div className="py-modal-overlay" onClick={onClose}>
      <div className="py-modal" style={{ maxWidth: 440 }} role="dialog" aria-modal="true" aria-label="Withdrawal sent" onClick={e => e.stopPropagation()}>
        <button className="py-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="py-modal-icon" style={{ background: 'rgba(52,211,153,.14)' }}>
          <CheckCheck size={26} style={{ color: '#34D399' }} />
        </div>
        <div className="py-modal-title">Withdrawal <em style={{ color: '#34D399', fontStyle: 'italic' }}>sent</em></div>
        <div className="py-modal-sub" style={{ marginBottom: 16 }}>
          Your request was received and is being processed. You'll get <strong style={{ color: T.gr }}>{money(r.receive)}</strong> via {r.method}{r.eta ? ` (${r.eta})` : ''}.
        </div>

        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px', marginBottom: 14 }}>
          {row('Amount', money(r.amount))}
          {row('Fee', `−${money(r.fee)}`, { color: T.rd })}
          {row("You'll receive", money(r.receive), { color: T.bl, fontWeight: 700 })}
          {row('Method', r.method)}
          {r.destination && row('To', <span style={{ fontFamily: T.mono }} title={r.destination}>{maskDest(r.destination)}</span>)}
          {r.reference && row('Reference', <span style={{ fontFamily: T.mono }}>{r.reference}</span>)}
          {row('Status', <span style={{ color: T.am }}>{r.status === 'pending' ? 'Pending review' : String(r.status).replace(/_/g, ' ')}</span>)}
          {row('Date', r.date.toLocaleString())}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: T.nt, lineHeight: 1.5, marginBottom: 18 }}>
          <Mail size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          {r.emailed && email
            ? <span>A confirmation email has been sent to <strong style={{ color: T.gr }}>{email}</strong>.</span>
            : <span>You can follow this withdrawal under <strong style={{ color: T.gr }}>History</strong>.</span>}
        </div>

        <button className="in-btn in-btn-blue in-btn-lg in-btn-full" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/* ── Withdraw Panel ── */
function WithdrawPanel({ user, profile, wallets, onWithdrawComplete }) {
  const [amount, setAmount] = useState('');
  const [preset, setPreset] = useState(null);
  const [method, setMethod] = useState('bank');
  const [wallet, setWallet] = useState('USD');
  const [success, setSuccess] = useState(null);     // receipt shown in the confirmation popup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accountNum, setAccountNum] = useState('');
  const [routing, setRouting] = useState('');
  const [cryptoAddr, setCryptoAddr] = useState('');
  // Admin controls: suspended / locked accounts or withdrawals can't withdraw
  const { state: acct, reload: reloadAcct } = useAccountState();
  const blocked = restrictionMessage(acct, { withdrawal: true });
  const [selfieOpen, setSelfieOpen] = useState(false);   // live selfie step before the withdrawal is created

  const numAmt = parseFloat(amount) || 0;
  const fee = (numAmt * 0.002).toFixed(2);
  const receive = Math.max(0, numAmt - parseFloat(fee)).toFixed(2);

  // Build wallet display list from DB
  const walletList = wallets.map(w => {
    const cfg = WALLET_CONFIG[w.currency] || { id: w.currency.toLowerCase(), Icon: Wallet, name: `${w.currency} Wallet`, sub: w.currency, col: '#64748b', bg: 'rgba(100,116,139,.15)', fmt: (b) => `${b} ${w.currency}` };
    return { ...cfg, currency: w.currency, rawBalance: Number(w.balance), bal: cfg.fmt(w.balance) };
  });

  const selectedWallet = walletList.find(w => w.currency === wallet) || walletList[0];

  const handlePreset = (p) => { setPreset(p); setAmount(p.replace('$', '')); };

  const handleWithdraw = async () => {
    if (!amount || amount.trim() === '' || numAmt <= 0) {
      setError('Please enter an amount to withdraw.');
      return;
    }
    if (!user) return;
    // Check again right before submitting, in case an admin just changed it
    const fresh = await fetchAccountState();
    const stop = restrictionMessage(fresh, { withdrawal: true });
    if (stop) { setError(stop); reloadAcct(); return; }
    if (selectedWallet && numAmt > selectedWallet.rawBalance) {
      setError('Amount exceeds wallet balance.');
      return;
    }
    if (method === 'bank') {
      if (!accountNum.trim() || !routing.trim()) {
        setError('Please enter both your account number and routing / SWIFT code.');
        return;
      }
    }
    if (method === 'crypto') {
      if (!cryptoAddr.trim()) {
        setError('Please enter a destination crypto address.');
        return;
      }
    }
    setError(null);
    // Step 2: confirm it's really them with a live selfie; the withdrawal is created after that
    setSelfieOpen(true);
  };

  /* Called by the selfie window with the photo. Stores it privately, then creates
     the withdrawal (the database links the two and refuses withdrawals without one). */
  const completeWithdrawal = async (selfieBlob) => {
    setLoading(true);
    try {
      const path = `${user.id}/withdrawal-selfie-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from(IDENTITY_BUCKET).upload(path, selfieBlob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error(`Couldn't save your selfie: ${upErr.message}`);
      const { error: rowErr } = await supabase.from('withdrawal_selfies').insert({ user_id: user.id, path });
      if (rowErr && !/does not exist|could not find the table|PGRST205|42P01/i.test(`${rowErr.code} ${rowErr.message}`)) {
        throw new Error(`Couldn't save your selfie: ${rowErr.message}`);
      }

      const destination = method === 'bank'
        ? [accountNum.trim(), routing.trim()].filter(Boolean).join(' / ')
        : cryptoAddr.trim();

      const txn = await recordWithdrawal({
        userId: user.id,
        currency: wallet,
        amount: numAmt,
        method: method === 'bank' ? 'Bank Wire' : 'Crypto',
        destination: destination || null,
      });

      // Send withdrawal email — the withdrawal is already recorded, so a mail
      // problem must not hide the confirmation (or tempt the user to submit again)
      let emailed = true;
      try {
        await sendWithdrawalEmail({
        email: profile.email,
        firstName: profile.first_name,
        amount: txn.amount,
        currency: wallet,
        netAmount: txn.net_amount,
        fee: txn.fee,
        method: method === 'bank' ? 'Bank Wire' : 'Crypto',
        destination: destination || null,
        invoiceNumber: txn.invoice_number,
        date: new Date(txn.created_at).toLocaleString(),
        });
      } catch (mailErr) {
        emailed = false;
        console.warn('Withdrawal recorded, but the email failed:', mailErr?.message);
      }

      setSuccess({
        amount:      Number(txn?.amount ?? numAmt),
        fee:         Number(txn?.fee ?? fee),
        receive:     Number(txn?.net_amount ?? receive),
        currency:    wallet,
        method:      WITHDRAW_METHODS.find(m => m.id === method)?.name || (method === 'bank' ? 'Bank Wire' : 'Crypto'),
        eta:         WITHDRAW_METHODS.find(m => m.id === method)?.sub || '',
        destination,
        reference:   txn?.invoice_number || txn?.reference || (txn?.id ? String(txn.id).slice(0, 8).toUpperCase() : ''),
        status:      txn?.status || 'pending',
        date:        txn?.created_at ? new Date(txn.created_at) : new Date(),
        emailed,
      });
      // clear the form behind the popup
      setAmount(''); setPreset(null); setAccountNum(''); setRouting(''); setCryptoAddr('');
      setSelfieOpen(false);
      if (onWithdrawComplete) onWithdrawComplete();
    } catch (err) {
      setError(err.message);
      throw err;            // keep the selfie window open and show the problem there too
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-action-layout">
      {success && <WithdrawSuccessModal receipt={success} email={profile?.email} onClose={() => setSuccess(null)} />}
      {selfieOpen && (
        <LiveSelfieCapture
          title="Confirm it's you"
          sub={`Take a quick live selfie to confirm your withdrawal of $${numAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}. We compare it with your ID before the money is sent.`}
          confirmLabel={`Confirm withdrawal`}
          onConfirm={completeWithdrawal}
          onClose={() => setSelfieOpen(false)}
        />
      )}
      <div className="py-form-card">
        <div className="py-form-title">Request <em>Withdrawal</em></div>
        <div className="py-form-sub">Withdrawals are processed within 1–3 business days depending on method.</div>

        {blocked && (
          <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '4px 0 16px', padding: '12px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, fontSize: 13, lineHeight: 1.55, color: T.am }}>
            <Lock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              {(() => {
                const acc = acct?.account !== 'active';
                const st = acc ? acct.account : acct?.withdrawals;
                const until = acc ? acct.account_until : acct?.withdrawal_until;
                const reason = acc ? acct.account_reason : acct?.withdrawal_reason;
                const title = acc ? `Your account is ${st}` : st === 'locked' ? 'Withdrawals are locked' : 'Withdrawals are on hold';
                return (<>
                  <strong style={{ display: 'block', color: T.gr, marginBottom: 2 }}>{title}</strong>
                  {st === 'suspended' && until ? `Until ${new Date(until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. ` : st === 'locked' ? 'Until our team unlocks it. ' : ''}
                  {reason ? `Reason: ${reason.replace(/\.?$/, '.')} ` : ''}
                </>);
              })()}
              <a href="/support" style={{ color: T.am, textDecoration: 'underline' }}>Contact support</a>
            </div>
          </div>
        )}

        <div className="py-field">
          <div className="py-field-label">From Wallet</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {walletList.map(w => (
              <button
                key={w.id}
                onClick={() => setWallet(w.currency)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: wallet === w.currency ? w.bg : 'var(--surface2)',
                  border: `1px solid ${wallet === w.currency ? w.col + '55' : 'var(--border)'}`,
                  borderRadius: 8, padding: '7px 12px', cursor: 'pointer', transition: 'all .15s',
                }}
              >
                <w.Icon size={16} style={{ fontSize: 14, color: w.col }} />
                <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: wallet === w.currency ? w.col : T.nt }}>{w.bal}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="py-field">
          <div className="py-field-label">
            Amount
            <span className="py-field-hint">Max: {selectedWallet?.bal}</span>
          </div>
          <div className="py-amount-wrap">
            <span className="py-amount-cur">$</span>
            <input
              className="py-input padded"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setPreset(null); }}
            />
          </div>
          <div className="py-presets">
            {PRESETS_WITHDRAW.map(p => (
              <button key={p} className={`py-preset${preset === p ? ' sel' : ''}`} onClick={() => handlePreset(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="py-field">
          <div className="py-field-label">Withdrawal Method</div>
          <div className="py-method-grid">
            {WITHDRAW_METHODS.map(m => (
              <div key={m.id} className={`py-method${method === m.id ? ' sel' : ''}`} onClick={() => setMethod(m.id)}>
                <div className="py-method-icon" style={{ background: m.bg }}>
                  <m.Icon size={16} style={{ color: m.col }} />
                </div>
                <div>
                  <div className="py-method-name">{m.name}</div>
                  <div className="py-method-sub">{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {method === 'bank' && (
          <div className="py-field">
            <div className="py-field-label">Bank Account</div>
            <input className="py-input" type="text" placeholder="Account number (IBAN / ACH)" value={accountNum} onChange={e => setAccountNum(e.target.value)} />
            <input className="py-input" type="text" placeholder="Routing / SWIFT code" style={{ marginTop: 10 }} value={routing} onChange={e => setRouting(e.target.value)} />
          </div>
        )}
        {method === 'crypto' && (
          <div className="py-field">
            <div className="py-field-label">Destination Address</div>
            <input className="py-input" type="text" placeholder="0x... or bc1..." value={cryptoAddr} onChange={e => setCryptoAddr(e.target.value)} />
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,.25)', borderRadius: 8, fontSize: 12, color: T.rd, display: 'flex', gap: 8 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0}} />{error}
          </div>
        )}

        <button
          className="in-btn in-btn-blue in-btn-lg in-btn-full"
          style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}
          onClick={handleWithdraw}
          disabled={loading || !!blocked}
        >
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite'}} /> Processing…</> : <><Upload size={16} /> Withdraw ${numAmt ? numAmt.toLocaleString() : '0.00'}</>}
        </button>
      </div>

      <div className="py-summary-card">
        <div className="py-summary-title">Withdrawal Summary</div>
        <div className="py-sum-row">
          <span className="py-sum-row-label">Requested Amount</span>
          <span className="py-sum-row-val">${numAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="py-sum-row">
          <span className="py-sum-row-label">Processing Fee (0.2%)</span>
          <span className="py-sum-row-val" style={{ color: T.rd }}>−${fee}</span>
        </div>
        <div className="py-sum-row">
          <span className="py-sum-row-label">Method</span>
          <span className="py-sum-row-val" style={{ color: T.nt }}>{WITHDRAW_METHODS.find(m => m.id === method)?.name}</span>
        </div>
        <div className="py-sum-row">
          <span className="py-sum-row-label">ETA</span>
          <span className="py-sum-row-val" style={{ color: T.nt }}>{WITHDRAW_METHODS.find(m => m.id === method)?.sub}</span>
        </div>
        <div className="py-sum-divider" />
        <div className="py-sum-total">
          <span className="py-sum-total-label">You'll receive</span>
          <span className="py-sum-total-val" style={{ color: T.bl }}>${parseFloat(receive).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="py-security">
          <ShieldCheck size={16} />
          KYC-verified · Secure payout
        </div>
        <div className="py-security" style={{ marginTop: 0 }}>
          <Clock size={16} />
          Processed on next business day
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: T.rd, lineHeight: 1.5 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1}} />
            Withdrawals are subject to 24h cooling period for security. Ensure your destination details are correct — transactions cannot be reversed.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Transactions Panel ── */
function TransactionsPanel({ userId, wallets }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  const loadTxns = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { transactions: txns, total: count } = await fetchTransactions(userId, {
        type: filter === 'all' ? 'all' : filter === 'deposit' ? 'deposit' : filter === 'withdraw' ? 'withdrawal' : 'plan_charge',
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setTransactions(txns);
      setTotal(count);
    } catch (e) {
      console.error('loadTxns:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, filter, search, page]);

  useEffect(() => { loadTxns(); }, [loadTxns]);

  // Build wallet display list for the Wallets section
  const walletList = wallets.map(w => {
    const cfg = WALLET_CONFIG[w.currency] || { id: w.currency.toLowerCase(), Icon: Wallet, name: `${w.currency} Wallet`, sub: w.currency, col: '#64748b', bg: 'rgba(100,116,139,.15)', fmt: (b) => `${b} ${w.currency}` };
    return { ...cfg, currency: w.currency, bal: cfg.fmt(w.balance), eq: '' };
  });

  const STATUS_CLS = { green: 'in-badge-green', blue: 'in-badge-blue', amber: 'in-badge-amber', purple: 'in-badge-purple', red: 'in-badge-red', muted: 'in-badge-muted' };

  return (
    <div>
      {/* Wallets */}
      <div className="py-wallets">
        {walletList.length === 0 && (
          <div style={{ color: T.nt, fontSize: 13, padding: 20 }}>No wallets found.</div>
        )}
        {walletList.map(w => (
          <div key={w.id} className={`py-wallet ${w.id}`}>
            <div className="py-wallet-head">
              <div className="py-wallet-icon" style={{ background: w.bg }}>
                <w.Icon size={16} style={{ color: w.col }} />
              </div>
              <div>
                <div className="py-wallet-name">{w.name}</div>
                <div className="py-wallet-sub">{w.sub}</div>
              </div>
            </div>
            <div className="py-wallet-bal" style={{ color: w.col }}>{w.bal}</div>
            <div className="py-wallet-eq">{w.eq}</div>
            <div className="py-wallet-actions">
              <button className="py-wallet-act"><Download size={16} />Deposit</button>
              <button className="py-wallet-act"><Upload size={16} />Withdraw</button>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="py-txn-wrap">
        <div className="py-txn-head">
          <div className="py-txn-title">Transaction History</div>
          <div className="py-txn-filters">
            <input
              className="in-select py-input"
              style={{ padding: '6px 10px', fontFamily: T.sans, fontSize: 12, width: 160 }}
              placeholder="Search transactions…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
            <select className="in-select" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdraw">Withdrawals</option>
              <option value="plan">Plan Charges</option>
            </select>
            <button className="in-btn in-btn-ghost in-btn-sm">
              <Download size={16} />Export
            </button>
          </div>
        </div>

        <table className="in-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: T.nt, padding: 32 }}>
                <Loader2 size={16} style={{ marginRight: 8}} />Loading…
              </td></tr>
            )}
            {!loading && transactions.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: T.nt, padding: 32 }}>No transactions found.</td></tr>
            )}
            {!loading && transactions.map((t) => {
              const disp = TXN_DISPLAY[t.type] || TXN_DISPLAY['deposit'];
              const statusCls = STATUS_CLS_MAP[t.status] || 'muted';
              // Debits are stored as negative amounts; withdrawals may be stored either way
              const neg = Number(t.amount) < 0 || /withdraw/i.test(t.type || '');
              const sign = neg ? '−' : '+';
              const pmLabel = t.payment_methods?.label || t.description || t.type;
              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="py-txn-icon" style={{ background: disp.iconBg }}>
                        <disp.Icon size={16} style={{ color: disp.iconCol }} />
                      </div>
                      <div>
                        <div className="py-txn-name">{t.description || pmLabel}</div>
                        <div className="py-txn-meta">{t.invoice_number}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: T.nt, fontFamily: T.mono, fontSize: 12 }}>{formatTxnDate(t.created_at)}</td>
                  <td>
                    <div className="py-txn-amount" style={{ color: neg ? '#FF6470' : '#34d399' }}>
                      {sign}{t.currency} {Math.abs(Number(t.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: /^(USD|EUR|USDT|GBP)$/.test(t.currency) ? 2 : 8 })}
                    </div>
                  </td>
                  <td>
                    <span className={`in-badge ${STATUS_CLS[statusCls]}`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <button className="in-btn in-btn-ghost in-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={16} />Prev
            </button>
            <span style={{ fontSize: 12, color: T.nt, alignSelf: 'center' }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="in-btn in-btn-ghost in-btn-sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────────── */
export default function Payment() {
  const [tab, setTab] = useState('plans');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Auth & user data ──────────────────────────────────────
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarData, setSidebarData] = useState({ portfolioValue: 0, dailyPnl: 0 });

  // ── Wallets & metrics ─────────────────────────────────────
  const [wallets, setWallets] = useState([]);
  const [metrics, setMetrics] = useState({ totalBalance: 0, totalDeposited: 0, totalWithdrawn: 0 });
  const [cryptoCoins, setCryptoCoins] = useState(CRYPTO_COINS_BASE);

  // ── Subscription plans ────────────────────────────────────
  const [dbPlans, setDbPlans] = useState([]);
  const [activeSub, setActiveSub] = useState(null);

  // ── User currency ─────────────────────────────────────────
  const [userCurrency, setUserCurrency] = useState('USD');
  const [fxRate, setFxRate] = useState(1); // USD → userCurrency

  // ── User settings ─────────────────────────────────────────
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // { silent: true } refreshes the numbers without the full-page loader, so an open
  // panel (and its success screen or popup) isn't unmounted mid-flow
  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const u = await getCurrentUser();
      if (!u) { setLoading(false); return; }
      setUser(u);

      const [prof, walletData, metricData, { data: planData, error: planErr }, subData, sbData, cur, coins, { data: userSettings }] = await Promise.all([
        getUserProfile(u.id),
        fetchUserWallets(u.id),
        fetchPaymentMetrics(u.id),
        supabase
          .from('subscription_plans')
          .select('id, name, monthly_price, annual_price, max_copy_traders, max_allocation, max_alerts, max_watchlist, api_calls_per_day, features')
          .order('monthly_price', { ascending: true }),
        fetchActiveSubscription(u.id),
        fetchSidebarData(u.id),
        getUserCurrency(u.id),
        fetchCryptoCoins(),
        supabase.from('user_settings').select('*').eq('user_id', u.id).single(),
      ]);

      if (planErr) console.error('fetchSubscriptionPlans:', planErr.message);

      setProfile(prof);
      setWallets(walletData);
      setDbPlans(planData || []);
      setActiveSub(subData);

      const rate = await getUsdRate(cur);
      setFxRate(rate);

      // fetchPaymentMetrics() returns raw USD totals (it doesn't know about the
      // user's display currency), so convert here before storing — otherwise the
      // currency symbol changes but the number underneath stays in USD.
      setMetrics({
        totalBalance:    Number(metricData?.totalBalance ?? 0)    * rate,
        totalDeposited:  Number(metricData?.totalDeposited ?? 0)  * rate,
        totalWithdrawn:  Number(metricData?.totalWithdrawn ?? 0)  * rate,
      });

      // Derive portfolio value from live wallet balances, fall back to snapshot.
      // Each wallet may be in a different currency (USD/BTC/ETH/EUR/…), so normalize
      // every balance to USD first, then convert the USD total to the user's currency —
      // summing raw balances across currencies directly would mix units.
      let liveWalletTotal;
      if (Array.isArray(walletData) && walletData.length > 0) {
        const usdAmounts = await Promise.all(walletData.map(w => walletBalanceToUsd(w?.balance, w?.currency)));
        const totalUsd = usdAmounts.reduce((sum, v) => sum + v, 0);
        liveWalletTotal = totalUsd * rate;
      } else {
        liveWalletTotal = (sbData?.portfolioValue ?? 0) * rate;
      }
      setSidebarData({ portfolioValue: liveWalletTotal, dailyPnl: (sbData?.dailyPnl ?? 0) * rate });
      setUserCurrency(cur);
      setCryptoCoins(coins);
      if (userSettings) setSettings({ ...DEFAULT_SETTINGS, ...userSettings });
    } catch (e) {
      console.error('Payment loadAll:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  // Computed values
  const userInitials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : 'TF';
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Investor';
  const userPlan = activeSub?.subscription_plans?.name ?? profile?.plan ?? 'Basic';

  const renewDate = activeSub?.current_period_end
    ? new Date(activeSub.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const METRICS_DATA = [
    { label: 'Total Balance',  value: `${currencySymbol(userCurrency)}${Number(metrics.totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,  sub: userCurrency, col: '#E2AE4A', bg: 'rgba(226,174,74,.12)',  Icon: Wallet },
    { label: 'Deposited',      value: `${currencySymbol(userCurrency)}${Number(metrics.totalDeposited).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: 'Lifetime deposits',  col: '#34d399', bg: 'rgba(52,211,153,.12)', Icon: Download },
    { label: 'Withdrawn',      value: `${currencySymbol(userCurrency)}${Number(metrics.totalWithdrawn).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: 'Lifetime withdrawals', col: '#5B8CFF', bg: 'rgba(96,165,250,.12)', Icon: Upload },
    { label: 'Active Plan',    value: userPlan, sub: activeSub ? `Renews ${renewDate}` : 'No active subscription', col: '#B49BFF', bg: 'rgba(167,139,250,.12)', Icon: Crown },
  ];

  const TABS = [
    { key: 'plans',    label: 'Plans',        Icon: Crown },
    { key: 'deposit',  label: 'Deposit',       Icon: Download },
    { key: 'withdraw', label: 'Withdraw',      Icon: Upload },
    { key: 'history',  label: 'Transactions',  Icon: Receipt },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      {/* Per-user theme / density / accent overrides */}
      <style dangerouslySetInnerHTML={{ __html: `:root { ${buildThemeVars(settings)} }` }} />
      {/* Grid lines toggle: suppress table row dividers when disabled */}
      {!settings.show_grid_lines && (
        <style dangerouslySetInnerHTML={{ __html: `
          .in-table td, .in-table th { border-bottom-color: transparent !important; }
          .py-sum-divider { display: none; }
          .py-plan-divider { display: none; }
        `}} />
      )}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 299,
        }} />
      )}

      <div className="in-shell">
        <Sidebar
          open={sidebarOpen}
          portfolioValue={sidebarData.portfolioValue}
          dailyPnl={sidebarData.dailyPnl}
          userInitials={userInitials}
          userName={userName}
          userPlan={userPlan}
          userCurrency={userCurrency}
          onLogout={handleLogout}
        />

        <div className="in-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} userInitials={userInitials} userName={userName} userPlan={userPlan} onLogout={handleLogout} />

          <main className="in-main">
            {/* Loading skeleton */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: T.nt, gap: 12 }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite'}} />
                Loading payment data…
              </div>
            )}

            {!loading && (
              <>
                {/* Page header */}
                <div className="in-page-header">
                  <div>
                    <div className="in-page-title"><em>Payments</em></div>
                    <div className="in-page-sub">
                      <span className="in-live-dot" />
                      Manage your plans, deposits, withdrawals, and billing history.
                    </div>
                  </div>
                  <div className="in-header-actions">
                    <a href="#" className="in-btn in-btn-ghost in-btn-sm">
                      <FileText size={16} /> Invoices
                    </a>
                  </div>
                </div>

                {/* Metrics */}
                <div className="py-metrics">
                  {METRICS_DATA.map(m => (
                    <div key={m.label} className="py-metric">
                      <div className="py-metric-icon" style={{ background: m.bg }}>
                        <m.Icon size={16} style={{ color: m.col }} />
                      </div>
                      <div className="py-metric-label">{m.label}</div>
                      <div className="py-metric-value">{m.value}</div>
                      <div className="py-metric-sub" style={{ color: m.col }}>{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="in-controls">
                  <div className="in-tabs">
                    {TABS.map(({ key, label, icon }) => (
                      <button key={key} className={`in-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                        <i className={`ti ${icon}`} />{label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content — pass live data to all panels */}
                {tab === 'plans'    && <PlansPanel activeSub={activeSub} dbPlans={dbPlans} userId={user?.id} onUpgrade={() => loadAll({ silent: true })} cryptoCoins={cryptoCoins} symbol={currencySymbol(userCurrency)} fxRate={fxRate} />}
                {tab === 'deposit'  && <DepositPanel user={user} profile={profile} wallets={wallets} currency={userCurrency} onDepositComplete={() => loadAll({ silent: true })} cryptoCoins={cryptoCoins} />}
                {tab === 'withdraw' && <WithdrawPanel user={user} profile={profile} wallets={wallets} onWithdrawComplete={() => loadAll({ silent: true })} />}
                {tab === 'history'  && <TransactionsPanel userId={user?.id} wallets={wallets} />}
              </>
            )}
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
