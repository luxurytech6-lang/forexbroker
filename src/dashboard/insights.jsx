import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../supabase';
import {
  Users, Bell, Loader2, AlertCircle, RefreshCw, Newspaper, CalendarDays, BarChart2, Cpu, Building2, Clock, ExternalLink, Download, Database, Sparkles, CandlestickChart, AreaChart, BarChart, LineChart, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
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

  // Parse accent hex → rgb components for dim/glow variants
  const hex = accent.replace('#', '');
  const r   = parseInt(hex.substring(0,2), 16);
  const g   = parseInt(hex.substring(2,4), 16);
  const b   = parseInt(hex.substring(4,6), 16);

  // Density → spacing scale
  const densityMap = {
    compact:      { mainPad: '14px 18px 32px', metricPad: '12px 14px', topbarH: '52px', sidebarW: '232px' },
    comfortable:  { mainPad: '24px 28px 40px', metricPad: '18px 20px', topbarH: '60px', sidebarW: '256px' },
    spacious:     { mainPad: '32px 40px 56px', metricPad: '22px 24px', topbarH: '68px', sidebarW: '272px' },
  };
  const density = densityMap[s.layout_density] || densityMap.comfortable;

  // Theme palette
  const isDark   = s.theme === 'dark'  || (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isLight  = s.theme === 'light' || (s.theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches);

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

/* ─── CSS ────────────────────────────────────────────────────────────────────── */
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
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; text-decoration: none; }
  button { font-family: var(--sans); cursor: pointer; border: none; background: none; }
  input, select { font-family: var(--sans); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  .in-shell { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .in-sidebar {
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    height: 100vh; overflow-y: auto; overflow-x: hidden;
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
  .in-brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .in-brand-icon { width: 34px; height: 34px; background: var(--accent); border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .in-brand-icon svg { width:18px; height:18px; color: #000; }
  .in-brand-name { font-size: 16px; font-weight: 700; color: var(--text); }
  .in-brand-name em { color: var(--accent); font-style: normal; }
  .in-sb-pill { margin: 12px 16px; background: var(--accent-dim); border: 1px solid rgba(226,174,74,.18); border-radius: var(--r-md); padding: 10px 14px; flex-shrink: 0; }
  .in-sb-pill-label { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
  .in-live-dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: in-pulse 2s infinite; flex-shrink: 0; }
  @keyframes in-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .in-sb-pill-val { font-family: var(--mono); font-size: 19px; font-weight: 600; color: var(--accent); letter-spacing: -.5px; }
  .in-sb-pill-sub { font-size: 11px; color: var(--green); margin-top: 3px; }
  .in-sb-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
  .in-sb-section { padding: 10px 20px 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--faint); }
  .in-sb-link {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 20px; font-size: 13px; font-weight: 500;
    color: var(--muted); border-left: 2px solid transparent;
    transition: all .15s; cursor: pointer; text-decoration: none;
  }
  .in-sb-link svg { width:18px; height:18px; flex-shrink: 0; }
  .in-sb-link:hover { color: var(--text); background: var(--accent-glow); border-left-color: var(--border2); }
  .in-sb-link.active { color: var(--accent); background: var(--accent-dim); border-left-color: var(--accent); }
  .in-sb-link.active svg { filter: drop-shadow(0 0 6px var(--accent)); }
  .in-sb-badge { margin-left: auto; font-size: 9px; font-weight: 700; background: var(--accent); color: #000; padding: 2px 6px; border-radius: 5px; }
  .in-sb-user { flex-shrink: 0; border-top: 1px solid var(--border); padding: 14px 16px; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .in-sb-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%); color: #000; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 12px rgba(226,174,74,.3); }
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
    animation: in-lang-fade .18s ease both;
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
  .in-right { grid-column: 2; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  /* ── Topbar ── */
  .in-topbar { height: var(--topbar-h); flex-shrink: 0; display: flex; align-items: center; padding: 0 28px; background: var(--surface); border-bottom: 1px solid var(--border); gap: 16px; z-index: 50; }
  .in-topbar-title { font-family: var(--serif); font-size: 15px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .in-topbar-title span { color: var(--accent); font-style: italic; }
  .in-topbar-actions { display: flex; align-items: center; gap: 16px; margin-left: auto; flex-shrink: 0; }
  .in-tb-icon { width: 36px; height: 36px; border-radius: var(--r-sm); background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; color: var(--muted); font-size: 18px; position: relative; }
  .in-tb-icon:hover { border-color: var(--border2); color: var(--text); }
  .in-notif-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: var(--red); border-radius: 50%; border: 1.5px solid var(--surface); }
  .in-tb-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%); color: #000; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 10px rgba(226,174,74,.25); }
  .in-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; }
  .in-hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }

  /* ── Main ── */
  .in-main { flex: 1; overflow-y: auto; overflow-x: hidden; padding: var(--main-pad, 24px 28px 40px); }
  .in-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
  .in-page-title { font-family: var(--serif); font-size: 28px; color: var(--text); line-height: 1.2; }
  .in-page-title em { color: var(--accent); font-style: italic; }
  .in-page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
  .in-header-actions { display: flex; gap: 8px; }

  /* Buttons */
  .in-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: var(--r-sm); font-family: var(--sans); font-weight: 600; cursor: pointer; transition: all .15s; border: none; text-decoration: none; white-space: nowrap; }
  .in-btn-sm { font-size: 12px; padding: 7px 14px; }
  .in-btn-accent { background: var(--accent); color: #000; }
  .in-btn-accent:hover { opacity: .88; box-shadow: 0 0 20px rgba(226,174,74,.3); }
  .in-btn-ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-size: 12px; padding: 7px 14px; }
  .in-btn-ghost:hover { border-color: var(--border2); }

  /* ── Metrics ── */
  .in-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .in-metric { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: var(--metric-pad, 18px 20px); position: relative; overflow: hidden; transition: all .2s; }
  .in-metric:hover { border-color: var(--border2); transform: translateY(-1px); }
  .in-metric::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%); opacity: .3; }
  .in-metric-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 12px; }
  .in-metric-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .in-metric-value { font-family: var(--mono); font-size: 20px; font-weight: 600; color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: -.5px; }
  .in-metric-sub { font-size: 11px; color: var(--muted); }

  /* ── Controls ── */
  .in-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .in-tabs { display: flex; gap: 4px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px; }
  .in-tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--r-sm); border: none; cursor: pointer; font-family: var(--sans); font-weight: 700; font-size: 12px; background: transparent; color: var(--muted); transition: all .15s; white-space: nowrap; }
  .in-tab:hover { color: var(--text); }
  .in-tab.active { background: var(--accent); color: #000; }
  .in-tab svg { width:14px; height:14px; }
  .in-filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .in-select { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 7px 10px; font-size: 12px; font-family: var(--sans); cursor: pointer; outline: none; transition: border-color .15s; }
  .in-select:hover { border-color: var(--border2); }

  /* ── Badge ── */
  .in-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; white-space: nowrap; letter-spacing: .2px; }
  .in-badge-green  { background: var(--green-dim);  color: var(--green); }
  .in-badge-blue   { background: var(--blue-dim);   color: var(--blue); }
  .in-badge-red    { background: var(--red-dim);    color: var(--red); }
  .in-badge-gold   { background: var(--accent-dim); color: var(--accent); }
  .in-badge-purple { background: var(--purple-dim); color: var(--purple); }
  .in-badge-amber  { background: var(--amber-dim);  color: var(--amber); }
  .in-badge-muted  { background: rgba(100,116,139,.12); color: var(--muted); }

  /* ── Loading / Error ── */
  .in-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 48px; color: var(--muted); font-size: 13px; }
  .in-error { display: flex; align-items: center; gap: 8px; padding: 16px 20px; background: var(--red-dim); border: 1px solid rgba(248,113,113,.2); border-radius: var(--r-md); color: var(--red); font-size: 13px; margin-bottom: 16px; }
  .in-empty { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }

  /* ── ECONOMIC ── */
  .eco-layout { display: grid; grid-template-columns: 1fr 340px; gap: 14px; margin-bottom: 14px; }
  .eco-hero { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 22px; position: relative; overflow: hidden; cursor: pointer; transition: all .18s; }
  .eco-hero:hover { border-color: var(--border2); }
  .eco-hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(226,174,74,.04) 0%, transparent 60%); pointer-events: none; }
  .eco-hero-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .eco-hero-title { font-family: var(--serif); font-size: 22px; line-height: 1.35; color: var(--text); margin-bottom: 12px; }
  .eco-hero-title em { color: var(--accent); font-style: italic; }
  .eco-hero-body { font-size: 13px; color: var(--muted); line-height: 1.7; margin-bottom: 16px; }
  .eco-hero-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--muted); }
  .eco-hero-impact { display: flex; align-items: center; gap: 8px; margin-top: 16px; background: var(--surface2); border-radius: var(--r-sm); padding: 10px 14px; }
  .eco-hero-impact-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
  .eco-side { display: flex; flex-direction: column; gap: 14px; }
  .eco-side-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 16px; cursor: pointer; transition: all .18s; flex: 1; }
  .eco-side-card:hover { background: var(--surface2); border-color: var(--border2); }
  .eco-side-cat { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 8px; }
  .eco-side-title { font-family: var(--serif); font-size: 14px; line-height: 1.4; margin-bottom: 8px; }
  .eco-side-meta { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
  .eco-indicators { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .eco-ind { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 14px 16px; }
  .eco-ind-name { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin-bottom: 6px; }
  .eco-ind-val { font-family: var(--mono); font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .eco-ind-chg { font-size: 11px; display: flex; align-items: center; gap: 4px; }

  /* ── EVENTS ── */
  .ev-timeline { position: relative; padding-left: 28px; }
  .ev-timeline::before { content: ''; position: absolute; left: 10px; top: 0; bottom: 0; width: 1px; background: var(--border); }
  .ev-item { position: relative; margin-bottom: 14px; }
  .ev-dot { position: absolute; left: -22px; top: 18px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--bg); }
  .ev-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 16px 18px; cursor: pointer; transition: all .18s; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: start; }
  .ev-card:hover { background: var(--surface2); border-color: var(--border2); }
  .ev-card-time { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 6px; letter-spacing: .5px; }
  .ev-card-title { font-family: var(--serif); font-size: 15px; line-height: 1.4; margin-bottom: 6px; }
  .ev-card-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }
  .ev-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .ev-impact-bar { display: flex; gap: 3px; }
  .ev-impact-seg { width: 6px; height: 16px; border-radius: 2px; }
  .ev-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
  .ev-calendar { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; margin-bottom: 20px; }
  .ev-cal-day { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 8px; text-align: center; cursor: pointer; transition: all .15s; }
  .ev-cal-day:hover { border-color: var(--border2); }
  .ev-cal-day.today { border-color: var(--accent); background: var(--accent-dim); }
  .ev-cal-day-name { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 4px; }
  .ev-cal-day-num { font-family: var(--mono); font-size: 16px; font-weight: 600; }
  .ev-cal-day.today .ev-cal-day-num { color: var(--accent); }
  .ev-cal-dots { display: flex; gap: 3px; justify-content: center; margin-top: 5px; }
  .ev-cal-dot { width: 4px; height: 4px; border-radius: 50%; }

  /* ── FORECAST ── */
  .fc-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 14px; }
  .fc-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; position: relative; overflow: hidden; cursor: pointer; transition: all .18s; }
  .fc-card:hover { border-color: var(--border2); transform: translateY(-1px); }
  .fc-card-accent-line { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .fc-card-cat { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 10px; }
  .fc-card-title { font-family: var(--serif); font-size: 15px; line-height: 1.4; margin-bottom: 10px; }
  .fc-card-range { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; background: var(--surface2); border-radius: var(--r-sm); padding: 8px 10px; }
  .fc-card-range-label { font-size: 10px; color: var(--muted); font-weight: 600; flex-shrink: 0; }
  .fc-card-range-vals { font-family: var(--mono); font-size: 12px; font-weight: 700; }
  .fc-gauge { margin-bottom: 12px; }
  .fc-gauge-track { height: 5px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .fc-gauge-fill { height: 100%; border-radius: 99px; transition: width .4s ease; }
  .fc-gauge-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: var(--muted); }
  .fc-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 12px; font-size: 11px; }
  .fc-card-source { color: var(--muted); }
  .fc-card-confidence { font-family: var(--mono); font-weight: 700; }
  .fc-table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; margin-bottom: 14px; }
  .fc-table-head { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .fc-table-title { font-family: var(--serif); font-size: 16px; }
  .in-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .in-table th { text-align: left; padding: 9px 16px; color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; border-bottom: 1px solid var(--border); background: var(--surface2); }
  .in-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .in-table tr:last-child td { border-bottom: none; }
  .in-table tr:hover td { background: var(--surface2); }
  .in-spark { display: flex; align-items: flex-end; gap: 2px; height: 22px; }
  .in-spark-bar { width: 5px; border-radius: 2px; }

  /* ── PREDICT ── */
  .pr-hero { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 22px; margin-bottom: 14px; position: relative; overflow: hidden; }
  .pr-hero::after { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(167,139,250,.08) 0%, transparent 70%); pointer-events: none; }
  .pr-hero-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--purple); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .pr-hero-title { font-family: var(--serif); font-size: 20px; line-height: 1.4; margin-bottom: 8px; }
  .pr-hero-sub { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 18px; }
  .pr-consensus { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .pr-con-box { background: var(--surface2); border-radius: var(--r-md); padding: 14px; text-align: center; border: 1px solid var(--border); }
  .pr-con-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin-bottom: 8px; }
  .pr-con-val { font-family: var(--mono); font-size: 22px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .pr-con-sub { font-size: 11px; color: var(--muted); }
  .pr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pr-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; cursor: pointer; transition: all .18s; }
  .pr-card:hover { background: var(--surface2); border-color: var(--border2); }
  .pr-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .pr-card-title { font-family: var(--serif); font-size: 15px; line-height: 1.4; margin-bottom: 4px; }
  .pr-card-src { font-size: 11px; color: var(--muted); }
  .pr-meter { margin: 14px 0 10px; }
  .pr-meter-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin-bottom: 8px; display: flex; justify-content: space-between; }
  .pr-meter-track { height: 8px; background: var(--surface2); border-radius: 99px; overflow: hidden; position: relative; }
  .pr-meter-fill { height: 100%; border-radius: 99px; }
  .pr-factors { border-top: 1px solid var(--border); padding-top: 12px; }
  .pr-factor { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 12px; }
  .pr-factor svg { width:14px; height:14px; flex-shrink: 0; }
  .pr-factor-val { margin-left: auto; font-family: var(--mono); font-size: 11px; font-weight: 700; }
  .pr-ai-tag { display: inline-flex; align-items: center; gap: 5px; background: var(--purple-dim); border: 1px solid rgba(167,139,250,.2); border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: var(--purple); }
  .pr-ai-tag svg { width:11px; height:11px; }

  /* ── Language switcher ── */
  .lang-switcher { position: relative; display: inline-flex; align-items: center; }
  .lang-btn {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); width: 36px; height: 36px;
    font-size: 11px; color: var(--muted);
    cursor: pointer; font-family: var(--sans);
    transition: border-color .15s, color .15s;
  }
  .lang-btn:hover { border-color: var(--border2); color: var(--text); }
  .lang-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 176px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: in-lang-fade .18s ease both;
  }
  @keyframes in-lang-fade {
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
  @media (max-width:1200px) { .eco-layout { grid-template-columns: 1fr; } .eco-side { flex-direction: row; } .pr-grid { grid-template-columns: 1fr; } .fc-grid { grid-template-columns: repeat(2,1fr); } }
  @media (max-width:1100px) { .in-metrics { grid-template-columns: repeat(2,1fr); } }
  @media (max-width:768px) {
    .in-shell { grid-template-columns: 1fr !important; }
    .in-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; transform: translateX(-100%) !important; z-index: 300 !important; }
    .in-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
    .in-right { grid-column: 1; }
    .in-hamburger { display: flex; }
    .eco-indicators { grid-template-columns: repeat(2,1fr); }
    .ev-calendar { grid-template-columns: repeat(4,1fr); }
    .fc-grid { grid-template-columns: 1fr; }
    .in-topbar { gap: 8px; }
    .in-topbar-title { font-size: 13px; }
    .in-topbar-actions { gap: 8px; }
  }
  @media (max-width:600px) {
    .in-main { padding: 16px; }
    .in-topbar { padding: 0 12px; gap: 6px; }
    .in-topbar-actions { gap: 6px; }
    .in-metrics { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .in-metric { padding: 14px 14px; }
    .in-metric-icon { width: 28px; height: 28px; margin-bottom: 10px; font-size: 14px; }
    .in-metric-label { font-size: 9px; margin-bottom: 5px; }
    .in-metric-value { font-size: 16px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .in-metric-sub { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .in-profile-dropdown { right: -12px; }
  }
  @media (max-width:420px) {
    .in-topbar-title { display: none; }
  }
`;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function fmtRelative(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtEventTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const dayStr = isToday
    ? 'TODAY'
    : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }).toUpperCase();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
  return `${dayStr} · ${timeStr}`;
}

// Map impact_level string → integer for ImpactBar
function impactInt(level) {
  const map = { high: 5, medium: 3, low: 1 };
  if (typeof level === 'number') return level;
  return map[String(level).toLowerCase()] ?? 2;
}

// Dot color based on impact
function impactDotColor(level) {
  const n = typeof level === 'number' ? level : impactInt(level);
  if (n >= 5) return T.rd;
  if (n >= 4) return T.am;
  if (n >= 3) return T.bl;
  return T.gn;
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

/* ─── Currency symbol map ─────────────────────────────────────────────────── */


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
const DK_ACTIVE = 'insights';
const DK_TITLE  = 'Insights';
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

/* ─── MetricCard ─────────────────────────────────────────────────────────────── */
function MetricCard({ m }) {
  return (
    <div className="in-metric">
      <div className="in-metric-icon" style={{ background: m.bg, color: m.col }}>
        <m.icon size={16} />
      </div>
      <div className="in-metric-label">{m.label}</div>
      <div className="in-metric-value">{m.value}</div>
      <div className="in-metric-sub">{m.sub}</div>
    </div>
  );
}

/* ─── ImpactBar ──────────────────────────────────────────────────────────────── */
function ImpactBar({ level }) {
  const n = typeof level === 'number' ? level : impactInt(level);
  return (
    <div className="ev-impact-bar">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="ev-impact-seg" style={{
          background: i <= n ? (n >= 4 ? T.rd : n >= 3 ? T.am : T.bl) : T.br,
        }} />
      ))}
    </div>
  );
}

/* ─── Sparkline ──────────────────────────────────────────────────────────────── */
function Sparkline({ bars, dir }) {
  if (!bars?.length) return null;
  const max = Math.max(...bars);
  return (
    <div className="in-spark">
      {bars.map((v, i) => (
        <div key={i} className="in-spark-bar" style={{
          height: `${Math.round((v / max) * 22)}px`,
          background: dir ? T.gn : T.rd,
          opacity: 0.4 + (i / bars.length) * 0.6,
        }} />
      ))}
    </div>
  );
}

/* ─── EconomicPanel ──────────────────────────────────────────────────────────── */
function EconomicPanel({ marketFilter, impactFilter }) {
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [hero,    setHero]    = useState(null);
  const [side,    setSide]    = useState([]);
  const [more,    setMore]    = useState([]);
  const [inds,    setInds]    = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr('');

      // Build base query
      let q = supabase
        .from('news_articles')
        .select('id, category, title, body, source, impact_level, badge_label, badge_type, published_at, markets_affected')
        .eq('tab', 'economic')
        .order('published_at', { ascending: false });

      if (impactFilter !== 'All Impact') {
        const lvl = impactFilter === 'High Impact' ? 'high' : 'medium';
        q = q.eq('impact_level', lvl);
      }
      if (marketFilter !== 'All Markets') {
        q = q.contains('markets_affected', [marketFilter]);
      }

      const { data, error } = await q.limit(20);
      setLoading(false);
      if (error) { setErr(error.message); return; }

      const rows = data || [];
      setHero(rows[0] || null);
      setSide(rows.slice(1, 3));
      setMore(rows.slice(3));
      // Derive indicator strip from hero + side articles (static fallback displayed as-is from DB)
      // You can replace this with a dedicated market_indicators table if available
      setInds([]);
    };
    load();
  }, [marketFilter, impactFilter]);

  if (loading) return <div className="in-loading"><Loader2 size={20} /> Loading economic news…</div>;
  if (err)     return <div className="in-error"><AlertCircle size={16} /> {err}</div>;
  if (!hero)   return <div className="in-empty">No economic news found.</div>;

  return (
    <div>
      {/* Hero + side */}
      <div className="eco-layout">
        <div className="eco-hero">
          <div className="eco-hero-cat">
            <Building2 size={13} />
            {hero.category}
            {hero.badge_label && (
              <span className={`in-badge in-badge-${hero.badge_type || 'gold'}`} style={{ marginLeft: 4 }}>
                {hero.badge_label}
              </span>
            )}
          </div>
          <div className="eco-hero-title">{hero.title}</div>
          {hero.body && <div className="eco-hero-body">{hero.body}</div>}
          <div className="eco-hero-meta">
            <Clock size={13} />
            {fmtRelative(hero.published_at)}
            {hero.source && <><span style={{ color: T.br2 }}>·</span>{hero.source}</>}
          </div>
          {hero.markets_affected?.length > 0 && (
            <div className="eco-hero-impact">
              <div className="eco-hero-impact-label">Markets Affected</div>
              {hero.markets_affected.map(m => (
                <div key={m} style={{ marginLeft: 14 }}>
                  <span style={{ fontSize: 10, color: T.nt }}>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {side.length > 0 && (
          <div className="eco-side">
            {side.map(s => (
              <div key={s.id} className="eco-side-card">
                <div className="eco-side-cat">
                  {s.category}
                  {s.badge_label && (
                    <span className={`in-badge in-badge-${s.badge_type || 'blue'}`} style={{ marginLeft: 8 }}>
                      {s.badge_label}
                    </span>
                  )}
                </div>
                <div className="eco-side-title">{s.title}</div>
                <div className="eco-side-meta">
                  <Clock size={12} />{fmtRelative(s.published_at)}
                  {s.source && <><span style={{ color: T.br2 }}>·</span>{s.source}</>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* More headlines */}
      {more.length > 0 && (
        <div style={{ background: T.s, border: `1px solid ${T.br}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.br}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: T.serif, fontSize: 16 }}>
              More <em style={{ color: T.g, fontStyle: 'italic' }}>Economic</em> Headlines
            </div>
            <a href="#" className="in-btn in-btn-ghost in-btn-sm"><ExternalLink size={13} /> View All</a>
          </div>
          <table className="in-table">
            <thead>
              <tr><th>Category</th><th>Headline</th><th>Impact</th><th>Time</th></tr>
            </thead>
            <tbody>
              {more.map(r => (
                <tr key={r.id}>
                  <td style={{ color: T.nt, fontSize: 11 }}>{r.category}</td>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td>
                    {r.badge_label && (
                      <span className={`in-badge in-badge-${r.badge_type || 'muted'}`}>{r.badge_label}</span>
                    )}
                  </td>
                  <td style={{ color: T.nt, fontFamily: T.mono, fontSize: 11 }}>{fmtRelative(r.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── EventsPanel ────────────────────────────────────────────────────────────── */
function EventsPanel({ marketFilter, impactFilter }) {
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [events,  setEvents]  = useState([]);
  const [calDays, setCalDays] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr('');

      let q = supabase
        .from('market_events')
        .select('id, title, description, event_time, impact_level, badge_label, badge_type, affected_assets, forecast_value, previous_value')
        .gte('event_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('event_time', { ascending: true })
        .limit(20);

      if (impactFilter === 'High Impact')   q = q.gte('impact_level', 4);
      if (impactFilter === 'Medium Impact') q = q.gte('impact_level', 2).lt('impact_level', 4);
      if (marketFilter !== 'All Markets')   q = q.contains('affected_assets', [marketFilter]);

      const { data, error } = await q;
      setLoading(false);
      if (error) { setErr(error.message); return; }

      const rows = data || [];
      setEvents(rows);

      // Build calendar strip from event timestamps
      const now  = new Date();
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - 3 + i);
        const isToday = d.toDateString() === now.toDateString();
        const dayEvents = rows.filter(ev => {
          const ed = new Date(ev.event_time);
          return ed.toDateString() === d.toDateString();
        });
        const dots = [...new Set(dayEvents.map(ev => impactDotColor(ev.impact_level)))];
        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          num:  d.getDate(),
          dots,
          today: isToday,
        };
      });
      setCalDays(days);
    };
    load();
  }, [marketFilter, impactFilter]);

  if (loading) return <div className="in-loading"><Loader2 size={20} /> Loading events…</div>;
  if (err)     return <div className="in-error"><AlertCircle size={16} /> {err}</div>;

  return (
    <div>
      {/* Calendar strip */}
      <div className="ev-calendar">
        {calDays.map(d => (
          <div key={d.num} className={`ev-cal-day${d.today ? ' today' : ''}`}>
            <div className="ev-cal-day-name">{d.name}</div>
            <div className="ev-cal-day-num">{d.num}</div>
            <div className="ev-cal-dots">
              {d.dots.map((c, i) => <div key={i} className="ev-cal-dot" style={{ background: c }} />)}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0
        ? <div className="in-empty">No upcoming events found.</div>
        : (
          <div className="ev-timeline">
            {events.map(ev => (
              <div key={ev.id} className="ev-item">
                <div className="ev-dot" style={{ background: impactDotColor(ev.impact_level) }} />
                <div className="ev-card">
                  <div>
                    <div className="ev-card-time">{fmtEventTime(ev.event_time)}</div>
                    <div className="ev-card-title">{ev.title}</div>
                    {ev.description && <div className="ev-card-desc">{ev.description}</div>}
                    {ev.affected_assets?.length > 0 && (
                      <div className="ev-tags">
                        {ev.affected_assets.map(t => (
                          <span key={t} style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px',
                            background: T.s2, border: `1px solid ${T.br}`,
                            borderRadius: 4, color: T.nt,
                          }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {(ev.forecast_value || ev.previous_value) && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        {ev.forecast_value && (
                          <span style={{ fontSize: 11, color: T.nt }}>
                            Forecast: <span style={{ color: T.bl, fontFamily: T.mono, fontWeight: 700 }}>{ev.forecast_value}</span>
                          </span>
                        )}
                        {ev.previous_value && (
                          <span style={{ fontSize: 11, color: T.nt }}>
                            Previous: <span style={{ color: T.gr, fontFamily: T.mono, fontWeight: 700 }}>{ev.previous_value}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ev-card-right">
                    {ev.badge_label && (
                      <span className={`in-badge in-badge-${ev.badge_type || 'blue'}`}>{ev.badge_label}</span>
                    )}
                    <ImpactBar level={ev.impact_level} />
                    <span style={{ fontSize: 10, color: T.nt }}>Impact</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ─── ForecastPanel ──────────────────────────────────────────────────────────── */
function ForecastPanel({ marketFilter, settings = DEFAULT_SETTINGS }) {
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState('');
  const [gauges,   setGauges]   = useState([]);
  const [tableQ3,  setTableQ3]  = useState([]);
  const [tableQ4,  setTableQ4]  = useState([]);
  const [periods,  setPeriods]  = useState(['', '']);   // the two latest forecast periods, e.g. ['Q3 2026', 'Q4 2026']

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr('');

      let q = supabase
        .from('asset_forecasts')
        .select('id, asset, category, period, title, range_low, range_high, bullish_pct, confidence_pct, source, color_hex')
        .order('category', { ascending: true });

      if (marketFilter !== 'All Markets') q = q.eq('category', marketFilter);

      const { data, error } = await q;
      setLoading(false);
      if (error) { setErr(error.message); return; }

      const rows = data || [];
      // Gauge cards: rows with confidence_pct populated (the 3 main forecasts)
      setGauges(rows.filter(r => r.confidence_pct != null));
      // Use the two most recent periods in the data instead of fixed quarters
      const rank = (p) => { const m = /Q([1-4])\s*(\d{4})/i.exec(p || ''); return m ? Number(m[2]) * 10 + Number(m[1]) : 0; };
      const latest = [...new Set(rows.map(r => r.period).filter(Boolean))].sort((a, b) => rank(a) - rank(b)).slice(-2);
      const [p1 = '', p2 = ''] = latest.length === 1 ? ['', latest[0]] : latest;
      setPeriods([p1, p2]);
      setTableQ3(rows.filter(r => p1 && r.period === p1));
      setTableQ4(rows.filter(r => p2 && r.period === p2));
    };
    load();
  }, [marketFilter]);

  if (loading) return <div className="in-loading"><Loader2 size={20} /> Loading forecasts…</div>;
  if (err)     return <div className="in-error"><AlertCircle size={16} /> {err}</div>;

  // Build table rows by merging Q3 and Q4 on asset
  const tableAssets = [...new Set([...tableQ3, ...tableQ4].map(r => r.asset))];
  const tableRows = tableAssets.map(asset => {
    const q3 = tableQ3.find(r => r.asset === asset);
    const q4 = tableQ4.find(r => r.asset === asset);
    return { asset, color_hex: q3?.color_hex || q4?.color_hex, q3, q4 };
  });

  const fmtRange = (low, high, asset) => {
    if (low == null || high == null) return '—';
    // Format based on magnitude
    const fmt = v => v >= 1000
      ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : v < 10
        ? v.toFixed(4)
        : v.toFixed(2);
    // Add % for bond/rate assets
    const pct = asset?.includes('10Y') || asset?.includes('Treasury') ? '%' : '';
    return `${fmt(low)}${pct} – ${fmt(high)}${pct}`;
  };

  return (
    <div>
      {/* Gauge cards */}
      {gauges.length > 0 && (
        <div className="fc-grid">
          {gauges.map(f => (
            <div key={f.id} className="fc-card">
              <div className="fc-card-accent-line" style={{ background: f.color_hex || T.g }} />
              <div className="fc-card-cat">{f.category}</div>
              <div className="fc-card-title">{f.title}</div>
              <div className="fc-card-range">
                <span className="fc-card-range-label">Target range</span>
                <span className="fc-card-range-vals" style={{ color: f.color_hex || T.g }}>
                  {fmtRange(f.range_low, f.range_high, f.asset)}
                </span>
              </div>
              <div className="fc-gauge">
                  <div className="fc-gauge-track">
                    <div className="fc-gauge-fill" style={{ width: `${f.bullish_pct || 50}%`, background: f.color_hex || T.g }} />
                  </div>
                  <div className="fc-gauge-labels"><span>Bearish</span><span>Bullish</span></div>
                </div>
                <div className="fc-card-footer">
                  <span className="fc-card-source">
                    {f.source && <><Users size={11} style={{ marginRight: 4 }} />{f.source}</>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Chart type badge from user settings */}
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 4, padding: '2px 6px', color: 'var(--muted)',
                    }}>
                      {(() => { const C = settings.chart_type === 'line' ? LineChart : settings.chart_type === 'area' ? AreaChart : settings.chart_type === 'bar' ? BarChart : CandlestickChart; return <C size={10} style={{ marginRight: 3 }} />; })()}
                      {settings.chart_type}
                    </span>
                    {settings.show_volume && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px',
                        background: 'var(--blue-dim)', borderRadius: 4, padding: '2px 6px', color: 'var(--blue)',
                      }}>VOL</span>
                    )}
                    <span className="fc-card-confidence" style={{ color: f.color_hex || T.g }}>
                      {f.confidence_pct}% confidence
                    </span>
                  </div>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Q3/Q4 table */}
      {tableRows.length > 0 && (
        <div className="fc-table-wrap">
          <div className="fc-table-head">
            <div className="fc-table-title">
              <em style={{ color: T.g, fontStyle: 'italic' }}>Asset</em> Forecast Table{periods.filter(Boolean).length ? ` — ${periods.filter(Boolean).join(' / ')}` : ''}
            </div>
            <a href="#" className="in-btn in-btn-ghost in-btn-sm"><Download size={13} /> Export</a>
          </div>
          <table className="in-table">
            <thead>
              <tr><th>Asset</th><th>{periods[0] || '—'} Range</th><th>{periods[1] || '—'} Range</th></tr>
            </thead>
            <tbody>
              {tableRows.map(r => (
                <tr key={r.asset}>
                  <td style={{ fontWeight: 600 }}>{r.asset}</td>
                  <td style={{ fontFamily: T.mono, fontSize: 11, color: T.bl }}>
                    {r.q3 ? fmtRange(r.q3.range_low, r.q3.range_high, r.asset) : '—'}
                  </td>
                  <td style={{ fontFamily: T.mono, fontSize: 11, color: T.nt }}>
                    {r.q4 ? fmtRange(r.q4.range_low, r.q4.range_high, r.asset) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gauges.length === 0 && tableRows.length === 0 && (
        <div className="in-empty">No forecast data found.</div>
      )}
    </div>
  );
}

/* ─── PredictPanel ───────────────────────────────────────────────────────────── */
function PredictPanel({ settings = DEFAULT_SETTINGS }) {
  const [loading,     setLoading]     = useState(true);
  const [err,         setErr]         = useState('');
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr('');
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('id, title, source, badge_label, probability_pct, color_hex, factors, created_at')
        .order('probability_pct', { ascending: false });
      setLoading(false);
      if (error) { setErr(error.message); return; }
      setPredictions(data || []);
    };
    load();
  }, []);

  if (loading) return <div className="in-loading"><Loader2 size={20} /> Loading predictions…</div>;
  if (err)     return <div className="in-error"><AlertCircle size={16} /> {err}</div>;
  if (!predictions.length) return <div className="in-empty">No AI predictions available.</div>;

  // Derive consensus from all predictions
  const bullish = predictions.filter(p => (p.probability_pct || 0) >= 55);
  const bearish = predictions.filter(p => (p.probability_pct || 0) <= 35);
  const neutral = predictions.filter(p => (p.probability_pct || 0) > 35 && (p.probability_pct || 0) < 55);
  const total   = predictions.length || 1;
  const bullPct = Math.round((bullish.length / total) * 100);
  const bearPct = Math.round((bearish.length / total) * 100);
  const neutPct = 100 - bullPct - bearPct;
  const sentimentLabel = bullPct >= 50 ? 'Moderately Bullish' : bearPct >= 50 ? 'Cautiously Bearish' : 'Mixed Signals';

  return (
    <div>
      {/* Consensus hero */}
      <div className="pr-hero">
        <div className="pr-hero-label">
          <Cpu size={13} />
          AI Market Consensus · Updated {fmtRelative(predictions[0]?.created_at)}
        </div>
        <div className="pr-hero-title">
          Global Market Sentiment —{' '}
          <em style={{ color: T.pr, fontStyle: 'italic' }}>{sentimentLabel}</em>
        </div>
        {settings.show_extended_hours && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.2)',
            borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700,
            color: 'var(--amber)', marginBottom: 8, letterSpacing: '.5px',
          }}>
            <Clock size={12} />
            Extended Hours Data Included
          </div>
        )}
        <div className="pr-hero-sub">
          ProfitGainSignal's ensemble model synthesises 340+ data sources — macro indicators, on-chain signals,
          options flow, and sentiment feeds — to produce a real-time market consensus.
        </div>
        <div className="pr-consensus">
          {[
            { label: 'Bullish',  val: `${bullPct}%`, color: T.gn },
            { label: 'Neutral',  val: `${neutPct}%`, color: T.nt },
            { label: 'Bearish',  val: `${bearPct}%`, color: T.rd },
          ].map(c => (
            <div key={c.label} className="pr-con-box">
              <div className="pr-con-label">{c.label}</div>
              <div className="pr-con-val" style={{ color: c.color }}>{c.val}</div>
              <div className="pr-con-sub">of models</div>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction cards */}
      <div className="pr-grid">
        {predictions.map(p => {
          const factors = Array.isArray(p.factors) ? p.factors : [];
          return (
            <div key={p.id} className="pr-card">
              <div className="pr-card-head">
                <div>
                  <div className="pr-card-title">{p.title}</div>
                  {p.source && (
                    <div className="pr-card-src" style={{ marginTop: 4 }}>
                      <Database size={12} style={{ marginRight: 4 }} />{p.source}
                    </div>
                  )}
                </div>
                {p.badge_label && (
                  <div className="pr-ai-tag" style={{ marginLeft: 12, flexShrink: 0 }}>
                    <Sparkles size={11} />{p.badge_label}
                  </div>
                )}
              </div>

              <div className="pr-meter">
                <div className="pr-meter-label">
                  <span>Probability</span>
                  <span style={{ fontFamily: T.mono, color: p.color_hex || T.pr }}>
                    {parseFloat(p.probability_pct).toFixed(0)}%
                  </span>
                </div>
                <div className="pr-meter-track">
                  <div className="pr-meter-fill" style={{
                    width: `${p.probability_pct}%`,
                    background: p.color_hex || T.pr,
                  }} />
                </div>
              </div>

              {factors.length > 0 && (
                <div className="pr-factors">
                  {factors.map((f, i) => (
                    <div key={i} className="pr-factor">
                      {(() => { const iconMap = { 'ti-trending-up': ArrowUpRight, 'ti-trending-down': ArrowDownRight, 'ti-minus': Minus, 'ti-chart-line': LineChart, 'ti-cpu': Cpu, 'ti-database': Database }; const FIcon = iconMap[f.icon] || Minus; return <FIcon size={14} style={{ color: f.color }} />; })()}
                      <span style={{ color: T.nt, fontSize: 12 }}>{f.label}</span>
                      <span className="pr-factor-val" style={{ color: f.color }}>{f.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────────── */
export default function Insights() {
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab,         setTab]         = useState('economic');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marketFilter, setMarketFilter] = useState('All Markets');
  const [impactFilter, setImpactFilter] = useState('All Impact');
  const [settings,    setSettings]    = useState(DEFAULT_SETTINGS);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  // Metrics derived from DB counts
  const [metrics, setMetrics] = useState([
    { label: 'News Tracked',    value: '—', sub: 'Loading…',        icon: Newspaper,                  bg: 'rgba(226,174,74,.12)',  col: '#E2AE4A' },
    { label: 'Events This Week',value: '—', sub: 'Loading…',        icon: CalendarDays,               bg: 'rgba(96,165,250,.12)',  col: '#5B8CFF' },
    { label: 'Active Forecasts',value: '—', sub: 'Loading…',        icon: BarChart2,                  bg: 'rgba(52,211,153,.12)',  col: '#34d399' },
    { label: 'AI Predictions',  value: '—', sub: 'Loading…',        icon: Cpu,                        bg: 'rgba(167,139,250,.12)', col: '#B49BFF' },
  ]);

  /* ── Auth + Settings ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const uid = session.user.id;
        const [{ data: profile }, { data: wallet }, { data: userSettings }] = await Promise.all([
          supabase.from('users').select('id, first_name, last_name, plan, is_verified, currency').eq('id', uid).single(),
          supabase.from('wallets').select('balance').eq('user_id', uid).single(),
          supabase.from('user_settings').select('*').eq('user_id', uid).single(),
        ]);
        if (profile) {
          const balanceUsd = parseFloat(wallet?.balance ?? 0);
          const fxRate = await getUsdRate(profile.currency);
          setUser({ ...profile, balance: balanceUsd * fxRate });
        }
        if (userSettings) setSettings({ ...DEFAULT_SETTINGS, ...userSettings });
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setUser(null); setSettings(DEFAULT_SETTINGS); }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Metrics ── */
  const fetchMetrics = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today   = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: newsCount },
      { count: eventsCount },
      { count: forecastCount },
      { data:  predictions },
    ] = await Promise.all([
      supabase.from('news_articles').select('id', { count: 'exact', head: true }),
      supabase.from('market_events').select('id', { count: 'exact', head: true })
        .gte('event_time', weekAgo).lte('event_time', weekEnd),
      supabase.from('asset_forecasts').select('id', { count: 'exact', head: true }),
      supabase.from('ai_predictions').select('probability_pct').order('created_at', { ascending: false }).limit(20),
    ]);

    const todayNews = await supabase
      .from('news_articles')
      .select('id', { count: 'exact', head: true })
      .gte('published_at', `${today}T00:00:00Z`);

    const highImpactEvents = await supabase
      .from('market_events')
      .select('id', { count: 'exact', head: true })
      .gte('event_time', weekAgo).lte('event_time', weekEnd)
      .gte('impact_level', 4);

    // Avg accuracy: % of predictions with probability >= 60
    const preds    = predictions || [];
    const avgConf  = preds.length
      ? (preds.reduce((a, p) => a + parseFloat(p.probability_pct || 0), 0) / preds.length).toFixed(1)
      : '—';

    setMetrics([
      { label: 'News Tracked',    value: (newsCount ?? 0).toLocaleString(), sub: `+${todayNews.count ?? 0} today`,          icon: Newspaper,                  bg: 'rgba(226,174,74,.12)',  col: '#E2AE4A' },
      { label: 'Events This Week',value: String(eventsCount ?? 0),          sub: `${highImpactEvents.count ?? 0} high-impact`, icon: CalendarDays,               bg: 'rgba(96,165,250,.12)',  col: '#5B8CFF' },
      { label: 'Active Forecasts',value: String(forecastCount ?? 0),        sub: 'Across all assets',                         icon: BarChart2,                  bg: 'rgba(52,211,153,.12)',  col: '#34d399' },
      { label: 'Avg AI Confidence',value: avgConf !== '—' ? `${avgConf}%` : '—', sub: `${preds.length} active models`,       icon: Cpu,                        bg: 'rgba(167,139,250,.12)', col: '#B49BFF' },
    ]);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const TABS = [
    { key: 'economic', label: 'Economic News',  Icon: Building2 },
    { key: 'events',   label: 'Event News',     Icon: CalendarDays },
    { key: 'forecast', label: 'Forecast',       Icon: BarChart2 },
    { key: 'predict',  label: 'AI Predictions', Icon: Cpu },
  ];

  if (authLoading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07101E', color: '#64748b', fontSize: 14, gap: 10 }}>
        <Loader2 size={20} /> Loading…
      </div>
    </>
  );

  // Dynamic theme vars derived from user settings
  const dynamicVars = buildThemeVars(settings);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      {/* Per-user theme / density / accent overrides */}
      <style dangerouslySetInnerHTML={{ __html: `:root { ${dynamicVars} }` }} />
      {/* Grid lines toggle: hide table grid borders when disabled */}
      {!settings.show_grid_lines && (
        <style dangerouslySetInnerHTML={{ __html: `
          .in-table td, .in-table th { border-bottom-color: transparent !important; }
          .in-table tr:hover td { outline: none; }
          .fc-table-wrap, .eco-hero-impact, .ev-card { border-color: var(--border) !important; }
        `}} />
      )}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 299,
        }} />
      )}

      <div className="in-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />

        <div className="in-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} />

          <main className="in-main">
            {/* Page header */}
            <div className="in-page-header">
              <div>
                <div className="in-page-title"><em>Insights</em></div>
                <div className="in-page-sub">
                  <span className="in-live-dot" />
                  Real-time market intelligence — news, events, forecasts, and AI-powered predictions.
                </div>
              </div>
              <div className="in-header-actions">
                <a href="/notification" className="in-btn in-btn-ghost in-btn-sm">
                  <Bell size={14} /> Alerts
                </a>
                <button className="in-btn in-btn-accent in-btn-sm" onClick={fetchMetrics}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="in-metrics">
              {metrics.map(m => <MetricCard key={m.label} m={m} />)}
            </div>

            {/* Controls */}
            <div className="in-controls">
              <div className="in-tabs">
                {TABS.map(({ key, label, Icon }) => (
                  <button key={key} className={`in-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>
              <div className="in-filters">
                <select className="in-select" value={marketFilter} onChange={e => setMarketFilter(e.target.value)}>
                  <option>All Markets</option>
                  <option>Crypto</option>
                  <option>Forex</option>
                  <option>Equities</option>
                  <option>Commodities</option>
                  <option>Bonds</option>
                </select>
                {(tab === 'economic' || tab === 'events') && (
                  <select className="in-select" value={impactFilter} onChange={e => setImpactFilter(e.target.value)}>
                    <option>All Impact</option>
                    <option>High Impact</option>
                    <option>Medium Impact</option>
                  </select>
                )}
              </div>
            </div>

            {/* Panels */}
            {tab === 'economic' && <EconomicPanel marketFilter={marketFilter} impactFilter={impactFilter} />}
            {tab === 'events'   && <EventsPanel   marketFilter={marketFilter} impactFilter={impactFilter} />}
            {tab === 'forecast' && <ForecastPanel marketFilter={marketFilter} settings={settings} />}
            {tab === 'predict'  && <PredictPanel settings={settings} />}
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
