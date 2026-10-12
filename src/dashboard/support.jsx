import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, ArrowUpRight, BarChart2, Bell, BookOpen, CandlestickChart, Check, ChevronDown, ChevronRight, Clock, Code, CreditCard, Edit, Headphones, HelpCircle, Inbox, Info, List, Loader2, Mail, MessageCircle, MessageSquare, Phone, Plus, Search, Send, Ticket, Upload, UserCircle, Users,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";

const T = {
  bg:'#07101E', s:'#0C1A2E', s2:'#112238', br:'#1C2C45', br2:'#2A3D5C',
  gr:'#EEF2F7', nt:'#8A9AB2', g:'#E2AE4A', gd:'rgba(226,174,74,.12)',
  bl:'#5B8CFF', rd:'#FF6470', gn:'#34d399', pr:'#B49BFF', am:'#f59e0b',
  sans:"'Instrument Sans', system-ui, sans-serif",
  serif:"'Instrument Serif', serif",
  mono:"'Instrument Sans', system-ui, sans-serif",
};

/* ─── Default user_settings (mirrors DB defaults) ──────────────────── */
const DEFAULT_SETTINGS = {
  theme:                 'dark',
  accent_color:          '#E2AE4A',
  layout_density:        'comfortable',
  chart_type:            'candle',
  show_volume:           true,
  show_extended_hours:   false,
  show_grid_lines:       true,
  profile_public:        true,
  show_watchlist:        false,
  show_activity:         true,
  show_followed_traders: false,
  appear_in_search:      true,
  usage_analytics:       true,
  personalised_feed:     true,
  marketing_emails:      false,
};

function resolveTheme(theme) {
  if (theme === 'system')
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return theme;
}

function buildThemeVars(settings) {
  const s      = { ...DEFAULT_SETTINGS, ...settings };
  const theme  = resolveTheme(s.theme);
  const accent = s.accent_color;

  const hex2rgb = h => {
    const c = h.replace('#', '');
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  const [ar, ag, ab] = hex2rgb(accent);

  const densityMap = {
    compact:     { sbW:'220px', mainPad:'16px 20px 32px', gap:'16px' },
    comfortable: { sbW:'256px', mainPad:'24px 28px 40px', gap:'24px' },
    spacious:    { sbW:'280px', mainPad:'32px 36px 56px', gap:'32px' },
  };
  const d = densityMap[s.layout_density] || densityMap.comfortable;

  const dark = {
    '--bg':'#07101E','--surface':'#0C1A2E','--surface2':'#112238',
    '--border':'#1C2C45','--border2':'#2A3D5C',
    '--text':'#EEF2F7','--muted':'#8A9AB2','--faint':'#56677F','--input-bg':'#112238',
  };
  const light = {
    '--bg':'#EEF2F7','--surface':'#ffffff','--surface2':'#f8fafc',
    '--border':'#EEF2F7','--border2':'#cbd5e1',
    '--text':'#0B1628','--muted':'#64748b','--faint':'#94a3b8','--input-bg':'#f1f5f9',
  };

  return {
    ...(theme === 'light' ? light : dark),
    '--accent':      accent,
    '--accent-dim':  `rgba(${ar},${ag},${ab},.12)`,
    '--accent-glow': `rgba(${ar},${ag},${ab},.06)`,
    '--accent-rgb':  `${ar},${ag},${ab}`,
    '--green':'#34d399','--green-dim':'rgba(52,211,153,.12)',
    '--red':'#FF6470','--red-dim':'rgba(248,113,113,.12)',
    '--blue':'#5B8CFF','--blue-dim':'rgba(96,165,250,.12)',
    '--purple':'#B49BFF','--purple-dim':'rgba(167,139,250,.12)',
    '--amber':'#f59e0b','--amber-dim':'rgba(245,158,11,.12)',
    '--sidebar-w':  d.sbW,
    '--topbar-h':   '60px',
    '--density-pad': d.mainPad,
    '--layout-gap':  d.gap,
    '--sans':"'Instrument Sans', system-ui, sans-serif",
    '--serif':"'Instrument Serif',serif",
    '--mono':"'Instrument Sans', system-ui, sans-serif",
    '--r-sm':'8px','--r-md':'12px','--r-lg':'16px',
  };
}

function applyThemeVars(vars) {
  Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }

  :root {
    /* Injected dynamically by applyThemeVars() from user_settings */
    --bg:#07101E; --surface:#0C1A2E; --surface2:#112238;
    --border:#1C2C45; --border2:#2A3D5C;
    --text:#EEF2F7; --muted:#8A9AB2; --faint:#56677F;
    --accent:#E2AE4A; --accent-dim:rgba(226,174,74,.12); --accent-glow:rgba(226,174,74,.06);
    --accent-rgb:226,174,74;
    --green:#34d399; --green-dim:rgba(52,211,153,.12);
    --red:#FF6470; --red-dim:rgba(248,113,113,.12);
    --blue:#5B8CFF; --blue-dim:rgba(96,165,250,.12);
    --purple:#B49BFF; --purple-dim:rgba(167,139,250,.12);
    --amber:#f59e0b; --amber-dim:rgba(245,158,11,.12);
    --sidebar-w:256px; --topbar-h:60px;
    --density-pad:24px 28px 40px;
    --layout-gap:24px;
    --sans:'Instrument Sans', system-ui, sans-serif;
    --serif:'Instrument Serif',serif;
    --mono:'Instrument Sans', system-ui, sans-serif;
    --r-sm:8px; --r-md:12px; --r-lg:16px;
  }

  *, *::before, *::after { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body, #root {
    font-family:var(--sans); background:var(--bg); color:var(--text);
    height:100vh; overflow:hidden; -webkit-font-smoothing:antialiased;
    width:100%; max-width:100vw;
  }
  img, svg { max-width:100%; }
  a { color:inherit; text-decoration:none; }
  button { font-family:var(--sans); cursor:pointer; border:none; background:none; }
  input, select, textarea { font-family:var(--sans); }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:4px; }

  /* Shell */
  .in-shell { display:grid; grid-template-columns:var(--sidebar-w) 1fr; height:100vh; overflow:hidden; }

  /* Sidebar */
  .in-sidebar {
    background:var(--surface); border-right:1px solid var(--border);
    display:flex; flex-direction:column; height:100vh;
    overflow-y:auto; overflow-x:hidden; position:relative; z-index:100;
    flex-shrink:0; transition:transform .25s cubic-bezier(.4,0,.2,1);
  }
  .in-sidebar.open { transform:translateX(0) !important; box-shadow:4px 0 32px rgba(0,0,0,.6) !important; }
  .in-sidebar::after {
    content:''; position:absolute; top:0; right:0; width:1px; height:100%;
    background:linear-gradient(180deg,transparent 0%,var(--accent) 30%,var(--border) 60%,transparent 100%);
    opacity:.15; pointer-events:none;
  }
  .in-brand { display:flex; align-items:center; gap:10px; padding:20px 20px 16px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .in-brand-icon { width:34px; height:34px; background:var(--accent); border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .in-brand-icon svg { color:#000; }
  .in-brand-name { font-size:16px; font-weight:700; }
  .in-brand-name em { color:var(--accent); font-style:normal; }
  .in-sb-pill { margin:12px 16px; background:var(--accent-dim); border:1px solid rgba(var(--accent-rgb),.18); border-radius:var(--r-md); padding:10px 14px; flex-shrink:0; }
  .in-sb-pill-label { font-size:10px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; display:flex; align-items:center; gap:6px; }
  .in-live-dot { width:6px; height:6px; background:var(--green); border-radius:50%; animation:in-pulse 2s infinite; flex-shrink:0; }
  @keyframes in-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .in-sb-pill-val { font-family:var(--mono); font-size:19px; font-weight:600; color:var(--accent); letter-spacing:-.5px; }
  .in-sb-pill-sub { font-size:11px; color:var(--green); margin-top:3px; }
  .in-sb-scroll { flex:1; overflow-y:auto; padding:8px 0; }
  .in-sb-section { padding:10px 20px 4px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--faint); }
  .in-sb-link {
    display:flex; align-items:center; gap:11px; padding:9px 20px;
    font-size:13px; font-weight:500; color:var(--muted);
    border-left:2px solid transparent; transition:all .15s; cursor:pointer;
  }
  .in-sb-link svg { flex-shrink:0; }
  .in-sb-link:hover { color:var(--text); background:var(--accent-glow); border-left-color:var(--border2); }
  .in-sb-link.active { color:var(--accent); background:var(--accent-dim); border-left-color:var(--accent); }
  .in-sb-badge { margin-left:auto; font-size:9px; font-weight:700; background:var(--accent); color:#000; padding:2px 6px; border-radius:5px; }
  .in-sb-logout { color:var(--red); }
  .in-sb-logout:hover { color:var(--red); background:var(--red-dim); border-left-color:var(--red); }
  .in-sb-user { flex-shrink:0; border-top:1px solid var(--border); padding:14px 16px; display:flex; align-items:center; gap:10px; }
  .in-sb-avatar {
    width:36px; height:36px; border-radius:50%;
    background:linear-gradient(135deg,var(--accent) 0%,#78d000 100%);
    color:#000; font-size:12px; font-weight:700;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 0 12px rgba(var(--accent-rgb),.3);
  }
  .in-sb-user-name { font-size:13px; font-weight:700; }
  .in-sb-user-role { font-size:10px; color:var(--accent); margin-top:1px; }

  /* Right panel */
  .in-right { grid-column:2; display:flex; flex-direction:column; height:100vh; overflow:hidden; }

  /* Topbar */
  .in-topbar {
    height:var(--topbar-h); flex-shrink:0; display:flex; align-items:center;
    padding:0 28px; background:var(--surface); border-bottom:1px solid var(--border); gap:16px; z-index:50;
  }
  .in-topbar-title { font-family:var(--serif); font-size:20px; color:var(--text); flex:1; }
  .in-topbar-title span { color:var(--accent); font-style:italic; }
  .in-tb-icon {
    width:36px; height:36px; border-radius:var(--r-sm); background:var(--surface2);
    border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all .15s; color:var(--muted); font-size:18px; position:relative;
  }
  .in-tb-icon:hover { border-color:var(--border2); color:var(--text); }
  .in-notif-dot { position:absolute; top:6px; right:6px; width:6px; height:6px; background:var(--red); border-radius:50%; border:1.5px solid var(--surface); }
  .in-tb-avatar {
    width:36px; height:36px; border-radius:50%; padding:0; margin:0;
    background:linear-gradient(135deg,var(--accent) 0%,#78d000 100%);
    color:#000; font-size:12px; font-weight:700;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    box-shadow:0 0 10px rgba(var(--accent-rgb),.25); flex-shrink:0;
  }
  .in-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; padding:4px; }
  .in-hamburger span { display:block; width:20px; height:2px; background:var(--text); border-radius:2px; }

  /* Main */
  .in-main { flex:1; overflow-y:auto; overflow-x:hidden; padding:var(--density-pad); width:100%; }
  @media (min-width:1600px) {
    .in-main { max-width:1600px; margin:0 auto; }
  }

  /* Shared buttons */
  .in-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:7px;
    border-radius:var(--r-sm); font-family:var(--sans); font-weight:600;
    cursor:pointer; transition:all .15s; border:none; white-space:nowrap;
  }
  .in-btn-sm  { font-size:12px; padding:7px 14px; }
  .in-btn-md  { font-size:13px; padding:9px 18px; }
  .in-btn-lg  { font-size:14px; padding:11px 22px; }
  .in-btn-accent { background:var(--accent); color:#000; }
  .in-btn-accent:hover { opacity:.88; box-shadow:0 0 20px rgba(var(--accent-rgb),.3); }
  .in-btn-ghost { background:var(--surface2); border:1px solid var(--border); color:var(--text); }
  .in-btn-ghost:hover { border-color:var(--border2); }

  /* Badge */
  .in-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; white-space:nowrap; }
  .in-badge-green  { background:var(--green-dim);  color:var(--green); }
  .in-badge-blue   { background:var(--blue-dim);   color:var(--blue); }
  .in-badge-amber  { background:var(--amber-dim);  color:var(--amber); }
  .in-badge-red    { background:var(--red-dim);    color:var(--red); }
  .in-badge-muted  { background:rgba(100,116,139,.12); color:var(--muted); }

  /* ── SUPPORT PAGE ── */

  /* Hero */
  .sp-hero {
    position:relative; border-radius:var(--r-lg); overflow:hidden;
    background:linear-gradient(135deg,#0d1520 0%,#0b1628 50%,#0d1018 100%);
    border:1px solid var(--border); padding:40px 36px; margin-bottom:28px;
  }
  .sp-hero-grid {
    position:absolute; inset:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(var(--accent-rgb),.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(var(--accent-rgb),.04) 1px,transparent 1px);
    background-size:40px 40px;
  }
  .sp-hero-glow {
    position:absolute; top:-100px; right:-80px; width:400px; height:400px;
    border-radius:50%;
    background:radial-gradient(ellipse,rgba(var(--accent-rgb),.06) 0%,transparent 65%);
    pointer-events:none;
  }
  .sp-hero-content { position:relative; z-index:2; max-width:560px; }
  .sp-hero-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--accent); margin-bottom:10px; display:flex; align-items:center; gap:8px; }
  .sp-hero-label::before { content:''; display:block; width:20px; height:1px; background:var(--accent); }
  .sp-hero-title { font-family:var(--serif); font-size:32px; line-height:1.2; margin-bottom:10px; }
  .sp-hero-title em { color:var(--accent); font-style:italic; }
  .sp-hero-sub { font-size:13px; color:var(--muted); line-height:1.6; margin-bottom:24px; }
  .sp-search-wrap { display:flex; gap:10px; max-width:480px; }
  .sp-search-input {
    flex:1; background:rgba(255,255,255,.05); border:1px solid var(--border2);
    color:var(--text); border-radius:var(--r-sm); padding:10px 14px 10px 40px;
    font-size:13px; outline:none; transition:border-color .15s;
    font-family:var(--sans);
  }
  .sp-search-input::placeholder { color:var(--muted); }
  .sp-search-input:focus { border-color:var(--accent); background:rgba(var(--accent-rgb),.04); }
  .sp-search-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); font-size:16px; color:var(--muted); pointer-events:none; }
  .sp-search-rel { position:relative; flex:1; }

  /* Status bar */
  .sp-status-bar {
    display:flex; align-items:center; gap:10px;
    background:var(--green-dim); border:1px solid rgba(52,211,153,.2);
    border-radius:var(--r-sm); padding:10px 16px;
    font-size:12px; font-weight:600; color:var(--green); margin-bottom:28px;
  }
  .sp-status-dot { width:8px; height:8px; border-radius:50%; background:var(--green); flex-shrink:0; animation:in-pulse 2s infinite; }
  .sp-status-bar span { color:var(--muted); font-weight:400; margin-left:4px; }

  /* Quick-action cards */
  .sp-quick-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--layout-gap); margin-bottom:28px; }
  .sp-quick-card {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--r-lg); padding:20px; cursor:pointer;
    transition:all .2s; position:relative; overflow:hidden;
  }
  .sp-quick-card:hover { border-color:var(--border2); transform:translateY(-2px); }
  .sp-quick-card.featured { border-color:rgba(var(--accent-rgb),.25); background:linear-gradient(135deg,rgba(var(--accent-rgb),.07) 0%,rgba(var(--accent-rgb),.02) 100%); }
  .sp-quick-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,var(--accent),transparent); opacity:.2;
  }
  .sp-quick-card.featured::before { opacity:.5; }
  .sp-quick-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:14px; }
  .sp-quick-title { font-size:14px; font-weight:700; margin-bottom:5px; }
  .sp-quick-desc { font-size:12px; color:var(--muted); line-height:1.5; }
  .sp-quick-arrow { position:absolute; bottom:16px; right:16px; font-size:18px; color:var(--muted); transition:all .2s; }
  .sp-quick-card:hover .sp-quick-arrow { color:var(--accent); transform:translate(2px,-2px); }

  /* Two-col layout */
  .sp-layout { display:grid; grid-template-columns:1fr 340px; gap:var(--layout-gap); align-items:start; }
  .sp-left  { display:flex; flex-direction:column; gap:var(--layout-gap); }
  .sp-right { display:flex; flex-direction:column; gap:var(--layout-gap); }

  /* Section card */
  .sp-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; }
  .sp-card-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
  .sp-card-title { font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px; }
  .sp-card-title svg { color:var(--accent); }
  .sp-card-body { padding:0; }

  /* FAQ accordion */
  .sp-faq-item { border-bottom:1px solid var(--border); }
  .sp-faq-item:last-child { border-bottom:none; }
  .sp-faq-q {
    width:100%; text-align:left; padding:16px 20px;
    display:flex; align-items:center; justify-content:space-between; gap:12px;
    font-size:13px; font-weight:600; color:var(--text);
    cursor:pointer; transition:background .15s; background:none; border:none;
    font-family:var(--sans);
  }
  .sp-faq-q:hover { background:var(--accent-glow); }
  .sp-faq-q.open { color:var(--accent); }
  .sp-faq-chevron { color:var(--muted); transition:transform .2s; flex-shrink:0; }
  .sp-faq-q.open .sp-faq-chevron { transform:rotate(180deg); color:var(--accent); }
  .sp-faq-a { padding:0 20px 16px; font-size:13px; color:var(--muted); line-height:1.7; }

  /* Ticket list */
  .sp-ticket {
    display:flex; align-items:flex-start; gap:14px;
    padding:16px 20px; border-bottom:1px solid var(--border); transition:background .15s; cursor:pointer;
  }
  .sp-ticket:last-child { border-bottom:none; }
  .sp-ticket:hover { background:var(--accent-glow); }
  .sp-ticket-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; margin-top:1px; }
  .sp-ticket-title { font-size:13px; font-weight:600; margin-bottom:4px; }
  .sp-ticket-meta { font-size:11px; color:var(--muted); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .sp-ticket-id { font-family:var(--mono); font-size:10px; color:var(--muted); }

  /* New ticket form */
  .sp-field { display:flex; flex-direction:column; gap:6px; }
  .sp-field-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); }
  .sp-input {
    background:var(--input-bg, var(--surface2)); border:1px solid var(--border); color:var(--text);
    border-radius:var(--r-sm); padding:9px 12px; font-size:13px; outline:none;
    transition:border-color .15s; width:100%; font-family:var(--sans);
  }
  .sp-input:focus { border-color:var(--accent); }
  .sp-textarea { resize:vertical; min-height:100px; }
  .sp-select {
    background:var(--input-bg, var(--surface2)); border:1px solid var(--border); color:var(--text);
    border-radius:var(--r-sm); padding:9px 12px; font-size:13px; outline:none;
    transition:border-color .15s; width:100%; cursor:pointer; font-family:var(--sans);
  }

  /* Resource links */
  .sp-resource {
    display:flex; align-items:center; gap:12px;
    padding:14px 20px; border-bottom:1px solid var(--border);
    cursor:pointer; transition:background .15s;
  }
  .sp-resource:last-child { border-bottom:none; }
  .sp-resource:hover { background:var(--accent-glow); }
  .sp-resource-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; }
  .sp-resource-title { font-size:13px; font-weight:600; margin-bottom:2px; }
  .sp-resource-sub { font-size:11px; color:var(--muted); }

  /* Contact channels */
  .sp-contact {
    display:flex; align-items:center; gap:12px;
    padding:14px 20px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .15s;
  }
  .sp-contact:last-child { border-bottom:none; }
  .sp-contact:hover { background:var(--accent-glow); }
  .sp-contact-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .sp-contact-label { font-size:13px; font-weight:700; margin-bottom:2px; }
  .sp-contact-sub { font-size:11px; color:var(--muted); }
  .sp-contact-badge { margin-left:auto; }

  /* Tabs */
  .sp-tabs { display:flex; gap:4px; padding:14px 20px 0; border-bottom:1px solid var(--border); }
  .sp-tab {
    display:flex; align-items:center; gap:6px;
    padding:8px 14px; font-size:12px; font-weight:600;
    border-radius:var(--r-sm) var(--r-sm) 0 0;
    color:var(--muted); cursor:pointer; transition:all .15s;
    border:none; background:none; font-family:var(--sans);
    border-bottom:2px solid transparent; margin-bottom:-1px;
  }
  .sp-tab svg { flex-shrink:0; }
  .sp-tab:hover { color:var(--text); }
  .sp-tab.active { color:var(--accent); border-bottom-color:var(--accent); }


  /* ── Language switcher ── */
  .lang-switcher { position:relative; display:inline-flex; align-items:center; }
  .lang-btn {
    display:inline-flex; align-items:center; justify-content:center;
    background:var(--surface2); border:1px solid var(--border);
    border-radius:var(--r-sm); width:36px; height:36px;
    cursor:pointer; font-family:var(--sans); color:var(--muted);
    transition:border-color .15s, color .15s;
  }
  .lang-btn:hover { border-color:var(--border2); color:var(--text); }
  .lang-dropdown {
    position:absolute; top:calc(100% + 6px); right:0;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:var(--r-md); padding:6px;
    min-width:176px; z-index:400;
    box-shadow:0 16px 40px rgba(0,0,0,.75);
    animation:sp-lang-fade .18s ease both;
  }
  @keyframes sp-lang-fade {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .lang-option {
    display:flex; align-items:center; gap:9px;
    padding:8px 10px; border-radius:var(--r-sm);
    font-size:12px; color:var(--muted);
    cursor:pointer; font-family:var(--sans);
    transition:background .12s, color .12s;
  }
  .lang-option:hover { background:var(--surface2); color:var(--text); }
  .lang-option.active { color:var(--accent); background:var(--accent-dim); font-weight:600; }
  .lang-section-label {
    font-size:9px; font-weight:700; color:var(--faint);
    letter-spacing:.1em; text-transform:uppercase; padding:4px 10px 6px;
  }
  /* ── Profile menu ── */
  .profile-menu { position:relative; display:inline-flex; align-items:center; flex-shrink:0; }
  .profile-menu .in-tb-avatar { border:none; }
  .profile-dropdown {
    position:absolute; top:calc(100% + 8px); right:0;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:var(--r-md); padding:6px;
    min-width:180px; z-index:400;
    box-shadow:0 16px 40px rgba(0,0,0,.75);
    animation:sp-lang-fade .18s ease both;
  }
  .profile-dd-item {
    display:flex; align-items:center; gap:9px;
    padding:9px 10px; border-radius:var(--r-sm);
    font-size:12px; font-weight:500; color:var(--text);
    cursor:pointer; font-family:var(--sans);
    transition:background .12s, color .12s;
  }
  .profile-dd-item svg { flex-shrink:0; }
  .profile-dd-item:hover { background:var(--surface2); }
  .profile-dd-divider { height:1px; background:var(--border); margin:6px 2px; }
  .profile-dd-logout { color:var(--red); }
  .profile-dd-logout:hover { background:var(--red-dim); color:var(--red); }

  /* Hide Google's default toolbar */
  .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display:none !important; }
  body { top:0 !important; }
  .skiptranslate { display:none !important; }

  /* ── Submit Ticket Modal ── */
  .stm-overlay {
    position:fixed; inset:0; z-index:600;
    background:rgba(0,0,0,.65); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center;
    padding:20px;
    animation:stm-fade .18s ease both;
  }
  @keyframes stm-fade {
    from { opacity:0; }
    to   { opacity:1; }
  }
  .stm-modal {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:var(--r-lg); width:100%; max-width:560px;
    max-height:90vh; overflow-y:auto; position:relative;
    box-shadow:0 32px 80px rgba(0,0,0,.7);
    animation:stm-slide .22s cubic-bezier(.34,1.12,.64,1) both;
  }
  @keyframes stm-slide {
    from { opacity:0; transform:translateY(18px) scale(.97); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .stm-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 24px; border-bottom:1px solid var(--border);
    position:sticky; top:0; background:var(--surface); z-index:2;
  }
  .stm-header-left { display:flex; align-items:center; gap:12px; }
  .stm-header-icon {
    width:38px; height:38px; border-radius:10px;
    background:var(--accent-dim); border:1px solid rgba(var(--accent-rgb),.2);
    display:flex; align-items:center; justify-content:center; color:var(--accent);
  }
  .stm-title { font-size:15px; font-weight:700; }
  .stm-sub   { font-size:11px; color:var(--muted); margin-top:2px; }
  .stm-close {
    width:32px; height:32px; border-radius:var(--r-sm);
    background:var(--surface2); border:1px solid var(--border);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:var(--muted); transition:all .15s;
  }
  .stm-close:hover { border-color:var(--border2); color:var(--text); }
  .stm-body { padding:24px; display:flex; flex-direction:column; gap:18px; }
  .stm-footer {
    display:flex; justify-content:flex-end; gap:8px;
    padding:16px 24px; border-top:1px solid var(--border);
    position:sticky; bottom:0; background:var(--surface); z-index:2;
  }
  .stm-success {
    padding:48px 24px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:12px;
  }
  .stm-success-icon {
    width:60px; height:60px; border-radius:50%;
    background:var(--accent-dim); border:1px solid rgba(var(--accent-rgb),.25);
    display:flex; align-items:center; justify-content:center; color:var(--accent);
    margin-bottom:4px;
  }
  .stm-success-title { font-family:var(--serif); font-size:22px; }
  .stm-success-title em { color:var(--accent); font-style:italic; }
  .stm-success-ref { font-family:var(--mono); font-size:12px; color:var(--text); background:var(--surface2); border:1px solid var(--border); padding:4px 10px; border-radius:6px; }
  .stm-success-note { font-size:12px; color:var(--muted); }

  /* Responsive */
  @media (max-width:1060px) {
    .sp-layout { grid-template-columns:1fr; }
    .sp-quick-grid { grid-template-columns:1fr 1fr; }
  }
  @media (max-width:768px) {
    .in-shell { grid-template-columns:1fr !important; }
    .in-sidebar {
      position:fixed !important; top:0 !important; left:0 !important;
      transform:translateX(-100%) !important; z-index:300 !important;
      width:min(280px, 84vw) !important;
    }
    .in-sidebar.open { transform:translateX(0) !important; box-shadow:4px 0 32px rgba(0,0,0,.6) !important; }
    .in-right { grid-column:1; }
    .in-hamburger { display:flex; }
    .sp-quick-grid { grid-template-columns:1fr; }
    .sp-hero { padding:28px 20px; }
    .sp-hero-title { font-size:26px; }
  }
  @media (max-width:600px) {
    .in-main { padding:16px; }
    .in-topbar { padding:0 12px; gap:8px; }
    .sp-search-wrap { flex-wrap:wrap; }
    .sp-search-wrap .in-btn { width:100%; }
  }
  @media (max-width:460px) {
    .in-topbar-title { display:none; }
    .lang-btn, .in-tb-icon, .in-tb-avatar { width:32px; height:32px; }
  }
  @media (max-width:380px) {
    .in-topbar { gap:6px; }
    .sp-hero { padding:22px 16px; }
    .sp-hero-title { font-size:22px; }
  }
`;

/* ─── Data ─────────────────────────────────────────── */
const FAQS = [
  {
    cat: 'Account',
    items: [
      { q: 'How do I change my email address?', a: 'Go to Settings → Profile → Email Address. Enter your new email and click Update. A verification link will be sent to the new address. Note: you will be signed out of all sessions after the change.' },
      { q: 'How do I reset my password?', a: 'On the login screen, click "Forgot password" and enter your email. You will receive a reset link within a few minutes. Links expire after 30 minutes for security.' },
      { q: 'Can I have multiple accounts?', a: 'Each user is permitted one account. If you need a business account, contact support and we can arrange an upgrade to a Team plan.' },
    ],
  },
  {
    cat: 'Subscription & Billing',
    items: [
      { q: 'How do I upgrade my plan?', a: 'Go to Settings → Subscription and click "Upgrade to Elite". You will be charged a prorated amount for the remainder of the billing cycle.' },
      { q: 'What payment methods are accepted?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. Crypto payments are available for annual plans only.' },
      { q: 'How do I cancel my subscription?', a: 'Go to Settings → Subscription → Danger Zone and click Cancel. Your access will continue until the end of the current billing period. You will not be charged again.' },
    ],
  },
  {
    cat: 'Features & Usage',
    items: [
      { q: 'How do price alerts work?', a: 'Navigate to any asset on your watchlist, click the bell icon and set your target price. You will receive notifications via your chosen delivery channels (Email, Push, Telegram) when the price is reached.' },
      { q: 'What is Copy Trading and how do I start?', a: 'Copy Trading lets you automatically mirror the trades of experienced traders. Go to the Copy Trading section, browse traders, review their stats and click "Copy". You can set an allocation amount and stop at any time.' },
      { q: 'How is my portfolio value calculated?', a: 'Your portfolio value reflects the current market value of all open positions, plus your available cash balance. It updates in real-time during market hours and uses last-close prices outside of hours.' },
    ],
  },
];

// TICKETS now fetched from Supabase — see TicketsSection

/* ── Ticket helpers ───────────────────────────────────── */
function getTicketIcon(category) {
  const map = {
    'Account & Profile':    { Icon:UserCircle,       iconBg:'rgba(96,165,250,.12)',   iconCol:'#5B8CFF' },
    'Billing':              { Icon:CreditCard,        iconBg:'rgba(245,158,11,.12)',   iconCol:'#f59e0b' },
    'Billing & Subscription': { Icon:CreditCard,      iconBg:'rgba(245,158,11,.12)',  iconCol:'#f59e0b' },
    'Trading':              { Icon:CandlestickChart,  iconBg:'rgba(167,139,250,.12)', iconCol:'#B49BFF' },
    'Trading & Positions':  { Icon:CandlestickChart,  iconBg:'rgba(167,139,250,.12)', iconCol:'#B49BFF' },
    'Alerts':               { Icon:Bell,              iconBg:'rgba(248,113,113,.12)',  iconCol:'#FF6470' },
    'Alerts & Watchlist':   { Icon:Bell,              iconBg:'rgba(248,113,113,.12)',  iconCol:'#FF6470' },
    'Copy Trading':         { Icon:Users,             iconBg:'rgba(52,211,153,.12)',   iconCol:'#34d399' },
    'API':                  { Icon:Code,              iconBg:'rgba(226,174,74,.12)',   iconCol:'#E2AE4A' },
    'Integrations & API':   { Icon:Code,              iconBg:'rgba(226,174,74,.12)',   iconCol:'#E2AE4A' },
    'Other':                { Icon:HelpCircle,        iconBg:'rgba(100,116,139,.12)',  iconCol:'#64748b' },
  };
  return map[category] ?? { Icon:Ticket, iconBg:'rgba(100,116,139,.12)', iconCol:'#64748b' };
}

function getStatusBadge(status) {
  const map = {
    open:       'in-badge-red',
    in_review:  'in-badge-amber',
    resolved:   'in-badge-green',
    closed:     'in-badge-muted',
  };
  return map[status] ?? 'in-badge-muted';
}

function formatStatusLabel(status) {
  const map = { open:'Open', in_review:'In Review', resolved:'Resolved', closed:'Closed' };
  return map[status] ?? status;
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 3600)   return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}



/* ─── Language Switcher ──────────────────────────────────────────────────── */
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
const DK_ACTIVE = 'support';
const DK_TITLE  = 'Help Center';
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

function FaqSection() {
  const [openKey, setOpenKey] = useState(null);
  const [activeGroup, setActiveGroup] = useState(0);

  const group = FAQS[activeGroup];
  return (
    <div className="sp-card">
      <div className="sp-card-head">
        <div className="sp-card-title"><HelpCircle size={16} />Frequently Asked Questions</div>
      </div>

      {/* Category tabs */}
      <div className="sp-tabs">
        {FAQS.map((g, i) => (
          <button key={g.cat} className={`sp-tab${activeGroup === i ? ' active' : ''}`} onClick={() => { setActiveGroup(i); setOpenKey(null); }}>
            {g.cat}
          </button>
        ))}
      </div>

      <div className="sp-card-body">
        {group.items.map((item, i) => {
          const key = `${activeGroup}-${i}`;
          const isOpen = openKey === key;
          return (
            <div key={key} className="sp-faq-item">
              <button className={`sp-faq-q${isOpen ? ' open' : ''}`} onClick={() => setOpenKey(isOpen ? null : key)}>
                {item.q}
                <ChevronDown size={14} className="sp-faq-chevron" />
              </button>
              {isOpen && <div className="sp-faq-a">{item.a}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketsSection({ userId }) {
  const [tab, setTab]           = useState('tickets');
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Form state
  const [subject,     setSubject]     = useState('');
  const [category,    setCategory]    = useState('Account & Profile');
  const [priority,    setPriority]    = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  // Fetch tickets on mount
  React.useEffect(() => {
    async function fetchTickets() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('support_tickets')
          .select('id, ticket_ref, subject, category, priority, status, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (err) throw err;
        setTickets(data || []);
      } catch (e) {
        setError(e.message || 'Failed to load tickets.');
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [userId]);

  // Submit new ticket
  async function handleSubmit() {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ticketRef = `#TF-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: newTicket, error: err } = await supabase
        .from('support_tickets')
        .insert({
          user_id:    user?.id,
          ticket_ref: ticketRef,
          subject:    subject.trim(),
          category,
          priority,
          status:     'open',
        })
        .select()
        .single();

      if (err) throw err;

      // Also insert the description as the first ticket message
      if (newTicket) {
        await supabase.from('ticket_messages').insert({
          ticket_id: newTicket.id,
          sender_id: user?.id,
          is_agent:  false,
          body:      description.trim(),
        });
        setTickets(prev => [newTicket, ...prev]);
      }

      setSubmitted(true);
      setSubject(''); setCategory('Account & Profile'); setPriority('medium'); setDescription('');
    } catch (e) {
      alert('Failed to submit ticket: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sp-card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid var(--border)` }}>
        <div className="sp-card-title"><Ticket size={16} />Support Tickets</div>
        <button className="in-btn in-btn-accent in-btn-sm" onClick={() => setTab('new')}>
          <Plus size={14} /> New Ticket
        </button>
      </div>

      <div className="sp-tabs" style={{ borderBottom:`1px solid var(--border)` }}>
        {[
          { key:'tickets', Icon:List,  label:'My Tickets' },
          { key:'new',     Icon:Edit,  label:'New Ticket'  },
        ].map(t => (
          <button key={t.key} className={`sp-tab${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setSubmitted(false); }}>
            <t.Icon size={14} />{t.label}
          </button>
        ))}
      </div>

      <div className="sp-card-body">
        {tab === 'tickets' && (
          loading ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              <Loader2 size={22} style={{ display:'block', margin:'0 auto 8px', animation:'spin 1s linear infinite' }} />
              Loading tickets…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ padding:'24px 20px', textAlign:'center', color:'var(--red)', fontSize:13 }}>
              <AlertCircle size={20} style={{ display:'block', margin:'0 auto 6px' }} />
              {error}
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              <Inbox size={28} style={{ display:'block', margin:'0 auto 8px' }} />
              No tickets yet. Need help? Open a new ticket.
            </div>
          ) : (
            tickets.map((t) => {
              const { Icon, iconBg, iconCol } = getTicketIcon(t.category);
              return (
                <div key={t.id} className="sp-ticket">
                  <div className="sp-ticket-icon" style={{ background:iconBg, color:iconCol }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <div className="sp-ticket-title">{t.subject}</div>
                      <span className={`in-badge ${getStatusBadge(t.status)}`}>{formatStatusLabel(t.status)}</span>
                    </div>
                    <div className="sp-ticket-meta">
                      <span className="sp-ticket-id">{t.ticket_ref}</span>
                      <span>·</span>
                      <span>{timeAgo(t.created_at)}</span>
                      <span>·</span>
                      <span style={{ textTransform:'capitalize' }}>{t.category}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color:'var(--muted)', flexShrink:0, marginTop:2 }} />
                </div>
              );
            })
          )
        )}

        {tab === 'new' && !submitted && (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
            <div className="sp-field">
              <div className="sp-field-label">Subject</div>
              <input
                className="sp-input"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="sp-field">
                <div className="sp-field-label">Category</div>
                <select className="sp-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Account & Profile">Account &amp; Profile</option>
                  <option value="Billing & Subscription">Billing &amp; Subscription</option>
                  <option value="Trading & Positions">Trading &amp; Positions</option>
                  <option value="Alerts & Watchlist">Alerts &amp; Watchlist</option>
                  <option value="Copy Trading">Copy Trading</option>
                  <option value="Integrations & API">Integrations &amp; API</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="sp-field">
                <div className="sp-field-label">Priority</div>
                <select className="sp-select" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="low">Low — general question</option>
                  <option value="medium">Medium — something not working</option>
                  <option value="high">High — blocking my trading</option>
                  <option value="critical">Critical — account / funds issue</option>
                </select>
              </div>
            </div>
            <div className="sp-field">
              <div className="sp-field-label">Description</div>
              <textarea
                className="sp-input sp-textarea"
                placeholder="Please describe the issue in detail — what you expected to happen and what actually happened."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="sp-field">
              <div className="sp-field-label">Attachments <span style={{ color:'var(--muted)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></div>
              <div style={{
                background:'var(--surface2)', border:`1px dashed var(--border2)`, borderRadius:8,
                padding:'20px 16px', textAlign:'center', cursor:'pointer',
              }}>
                <Upload size={22} style={{ color:'var(--muted)', marginBottom:6, display:'block' }} />
                <div style={{ fontSize:12, color:'var(--muted)' }}>Drop files here or click to upload · PNG, JPG, PDF up to 10 MB</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="in-btn in-btn-ghost in-btn-sm" onClick={() => setTab('tickets')}>Cancel</button>
              <button
                className="in-btn in-btn-accent in-btn-sm"
                onClick={handleSubmit}
                disabled={submitting || !subject.trim() || !description.trim()}
                style={{ opacity: (!subject.trim() || !description.trim()) ? 0.5 : 1 }}
              >
                {submitting
                  ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Submitting…</>
                  : <><Send size={16} /> Submit Ticket</>}
              </button>
            </div>
          </div>
        )}

        {tab === 'new' && submitted && (
          <div style={{ padding:40, textAlign:'center' }}>
            <div style={{
              width:56, height:56, borderRadius:'50%', background:'var(--accent-dim)',
              border:`1px solid rgba(var(--accent-rgb),.25)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 16px', fontSize:26, color:'var(--accent)',
            }}>
              <Check size={16} />
            </div>
            <div style={{ fontFamily:'var(--serif)', fontSize:20, marginBottom:8 }}>Ticket <em style={{ color:'var(--accent)', fontStyle:'italic' }}>Submitted</em></div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:6 }}>Your ticket <span style={{ fontFamily:'var(--mono)', color:'var(--text)' }}>#TF-4822</span> has been received.</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:24 }}>Our team typically responds within 4–8 hours on business days.</div>
            <button className="in-btn in-btn-ghost in-btn-sm" onClick={() => { setTab('tickets'); setSubmitted(false); }}>
              View My Tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Submit Ticket Modal ───────────────────────────── */
function SubmitTicketModal({ onClose, onSuccess }) {
  const [subject,     setSubject]     = useState('');
  const [category,    setCategory]    = useState('Account & Profile');
  const [priority,    setPriority]    = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [ticketRef,   setTicketRef]   = useState('');

  // Close on Escape
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  async function handleSubmit() {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ref = `#TF-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: newTicket, error: err } = await supabase
        .from('support_tickets')
        .insert({
          user_id:    user?.id,
          ticket_ref: ref,
          subject:    subject.trim(),
          category,
          priority,
          status:     'open',
        })
        .select()
        .single();

      if (err) throw err;

      if (newTicket) {
        await supabase.from('ticket_messages').insert({
          ticket_id: newTicket.id,
          sender_id: user?.id,
          is_agent:  false,
          body:      description.trim(),
        });
      }

      setTicketRef(ref);
      setSubmitted(true);
      if (onSuccess) onSuccess(newTicket);
    } catch (e) {
      alert('Failed to submit ticket: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = subject.trim() && description.trim() && !submitting;

  return (
    <div className="stm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="stm-modal" role="dialog" aria-modal="true" aria-label="Submit a support ticket">

        {/* Header */}
        <div className="stm-header">
          <div className="stm-header-left">
            <div className="stm-header-icon"><Ticket size={18} /></div>
            <div>
              <div className="stm-title">Submit a Ticket</div>
              <div className="stm-sub">Our team responds within 4–8 hours on business days</div>
            </div>
          </div>
          <button className="stm-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div className="stm-success">
            <div className="stm-success-icon"><Check size={26} /></div>
            <div className="stm-success-title">Ticket <em>Submitted</em></div>
            <div className="stm-success-ref">{ticketRef}</div>
            <div className="stm-success-note">We'll follow up at your registered email address.</div>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button className="in-btn in-btn-ghost in-btn-sm" onClick={onClose}>Close</button>
              <button className="in-btn in-btn-accent in-btn-sm" onClick={() => { setSubmitted(false); setSubject(''); setDescription(''); }}>
                <Plus size={14} /> Another Ticket
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Form ── */}
            <div className="stm-body">

              {/* Subject */}
              <div className="sp-field">
                <div className="sp-field-label">Subject</div>
                <input
                  className="sp-input"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Category + Priority */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="sp-field">
                  <div className="sp-field-label">Category</div>
                  <select className="sp-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Account & Profile">Account &amp; Profile</option>
                    <option value="Billing & Subscription">Billing &amp; Subscription</option>
                    <option value="Trading & Positions">Trading &amp; Positions</option>
                    <option value="Alerts & Watchlist">Alerts &amp; Watchlist</option>
                    <option value="Copy Trading">Copy Trading</option>
                    <option value="Integrations & API">Integrations &amp; API</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="sp-field">
                  <div className="sp-field-label">Priority</div>
                  <select className="sp-select" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="low">Low — general question</option>
                    <option value="medium">Medium — something not working</option>
                    <option value="high">High — blocking my trading</option>
                    <option value="critical">Critical — account / funds issue</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="sp-field">
                <div className="sp-field-label">Description</div>
                <textarea
                  className="sp-input sp-textarea"
                  placeholder="Describe the issue — what you expected vs. what actually happened."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Attachments */}
              <div className="sp-field">
                <div className="sp-field-label">
                  Attachments <span style={{ color:'var(--muted)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span>
                </div>
                <div style={{
                  background:'var(--surface2)', border:`1px dashed var(--border2)`, borderRadius:8,
                  padding:'20px 16px', textAlign:'center', cursor:'pointer',
                }}>
                  <Upload size={22} style={{ color:'var(--muted)', marginBottom:6, display:'block', margin:'0 auto 6px' }} />
                  <div style={{ fontSize:12, color:'var(--muted)' }}>Drop files here or click to upload · PNG, JPG, PDF up to 10 MB</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="stm-footer">
              <button className="in-btn in-btn-ghost in-btn-sm" onClick={onClose}>Cancel</button>
              <button
                className="in-btn in-btn-accent in-btn-sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{ opacity: canSubmit ? 1 : 0.5 }}
              >
                {submitting
                  ? <><Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} /> Submitting…</>
                  : <><Send size={15} /> Submit Ticket</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────── */
export default function Support() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // user_settings: fetched once after auth, applied as CSS vars
  const [userSettings, setUserSettings] = useState(DEFAULT_SETTINGS);
  const settingsApplied = useRef(false);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  useEffect(() => {
    async function fetchSettings() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || settingsApplied.current) return;

      // Fetch user profile + settings together
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, plan, currency').eq('id', authUser.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', authUser.id).maybeSingle(),
      ]);

      if (profile) setUser(profile);
      if (settings) {
        settingsApplied.current = true;
        setUserSettings(s => ({ ...s, ...settings }));
      }
    }
    fetchSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Apply CSS vars on :root whenever settings change
  useEffect(() => {
    applyThemeVars(buildThemeVars(userSettings));
    if (userSettings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyThemeVars(buildThemeVars(userSettings));
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [userSettings]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />

      {ticketModalOpen && (
        <SubmitTicketModal
          onClose={() => setTicketModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:299,
        }} />
      )}

      <div className="in-shell">
        <Sidebar open={sidebarOpen} user={user} />

        <div className="in-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} />

          <main className="in-main">

            {/* Hero */}
            <div className="sp-hero">
              <div className="sp-hero-grid" />
              <div className="sp-hero-glow" />
              <div className="sp-hero-content">
                <div className="sp-hero-label">Help Center</div>
                <div className="sp-hero-title">How can we <em>help you</em>?</div>
                <div className="sp-hero-sub">Search our knowledge base or browse topics below. Most answers are just a click away.</div>
                <div className="sp-search-wrap">
                  <div className="sp-search-rel">
                    <Search size={16} className="sp-search-icon" />
                    <input
                      className="sp-search-input"
                      placeholder="Search articles, guides, FAQs…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button className="in-btn in-btn-accent in-btn-md">Search</button>
                </div>
              </div>
            </div>

            {/* System status */}
            <div className="sp-status-bar">
              <div className="sp-status-dot" />
              All systems operational
              <span>· Last checked 3 min ago · </span>
              <a href="/status" style={{ color:'var(--green)', textDecoration:'underline', fontSize:12 }}>View status page</a>
            </div>

            {/* Quick actions */}
            <div className="sp-quick-grid">
              {[
                { Icon: Ticket,      iconBg:'rgba(226,174,74,.12)',  iconCol:'#E2AE4A', title:'Submit a Ticket',      desc:'Get help from our support team directly.',          featured:true, action:() => setTicketModalOpen(true) },
                { Icon: BookOpen,        iconBg:'rgba(96,165,250,.12)',  iconCol:'#5B8CFF', title:'Browse Docs',          desc:'Step-by-step guides and how-to articles.',          featured:false, action:() => { window.location.href = '/docs'; } },
                { Icon: MessageCircle, iconBg:'rgba(167,139,250,.12)', iconCol:'#B49BFF', title:'Community Forum',  desc:'Ask questions and connect with other traders.',      featured:false, action:() => { window.location.href = '/community'; } },
                { Icon: MessageSquare, iconBg:'rgba(245,158,11,.12)', iconCol:'#f59e0b', title:'Live Chat',            desc:'Chat with support in real time. Available 9–6 EST.', featured:false, action:() => { window.location.href = ''; } },
                { Icon: BarChart2,   iconBg:'rgba(248,113,113,.12)', iconCol:'#FF6470', title:'System Status',        desc:'Check uptime and any ongoing incidents.',            featured:false, action:() => { window.location.href = '/status'; } },
              ].map((c, i) => (
                <div key={i} className={`sp-quick-card${c.featured ? ' featured' : ''}`} onClick={c.action}>
                  <div className="sp-quick-icon" style={{ background:c.iconBg, color:c.iconCol }}>
                    <c.Icon size={16} />
                  </div>
                  <div className="sp-quick-title">{c.title}</div>
                  <div className="sp-quick-desc">{c.desc}</div>
                  <ArrowUpRight size={16} className="sp-quick-arrow" />
                </div>
              ))}
            </div>

            {/* Two-col layout */}
            <div className="sp-layout">

              {/* Left: FAQ + Tickets */}
              <div className="sp-left">
                <FaqSection />
                <TicketsSection userId={user?.id} />
              </div>

              {/* Right: Contact + Resources */}
              <div className="sp-right">

                {/* Contact channels */}
                <div className="sp-card">
                  <div className="sp-card-head">
                    <div className="sp-card-title"><Headphones size={16} />Contact Support</div>
                  </div>
                  <div className="sp-card-body">
                    {[
                      { Icon: MessageSquare, iconBg:'rgba(226,174,74,.12)',  iconCol:'#E2AE4A', label:'Live Chat',     sub:'Avg. reply in 4 min', badge:'Online', badgeCol:'in-badge-green', action:() => { window.location.href = '/live-chat'; } },
                      { Icon: Mail,         iconBg:'rgba(96,165,250,.12)',  iconCol:'#5B8CFF', label:'Email Support', sub:'Reply within 8 hours', badge:null, action:() => { window.location.href = 'mailto:support@tradesxfx.com'; } },
                      { Icon: Phone,        iconBg:'rgba(52,211,153,.12)',  iconCol:'#34d399', label:'Phone',         sub:'Elite plan only · 24/7', badge:'Elite', badgeCol:'in-badge-amber', action:undefined },
                    ].map((c, i) => (
                      <div key={i} className="sp-contact" onClick={c.action} style={{ cursor: c.action ? 'pointer' : 'default' }}>
                        <div className="sp-contact-icon" style={{ background:c.iconBg, color:c.iconCol }}>
                          <c.Icon size={16} />
                        </div>
                        <div style={{ flex:1 }}>
                          <div className="sp-contact-label">{c.label}</div>
                          <div className="sp-contact-sub">{c.sub}</div>
                        </div>
                        {c.badge && (
                          <span className={`in-badge ${c.badgeCol} sp-contact-badge`}>{c.badge}</span>
                        )}
                        <ChevronRight size={15} style={{ color:'var(--muted)', marginLeft:8 }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support hours */}
                <div className="sp-card">
                  <div className="sp-card-head">
                    <div className="sp-card-title"><Clock size={16} />Support Hours</div>
                  </div>
                  <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { day:'Monday – Friday', hours:'9:00 AM – 6:00 PM EST', active:true  },
                      { day:'Saturday',        hours:'10:00 AM – 3:00 PM EST', active:false },
                      { day:'Sunday',          hours:'Closed',                 active:false },
                    ].map((h, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                        <span style={{ color:'var(--muted)' }}>{h.day}</span>
                        <span style={{ fontFamily:'var(--mono)', fontWeight:600, color: h.hours === 'Closed' ? 'var(--muted)' : 'var(--text)' }}>{h.hours}</span>
                      </div>
                    ))}
                    <div style={{ marginTop:4, padding:'10px 12px', background:'var(--accent-dim)', border:`1px solid rgba(var(--accent-rgb),.15)`, borderRadius:8, fontSize:11, color:'var(--accent)' }}>
                      <Info size={13} style={{ marginRight:6, verticalAlign:-2 }} />
                      Elite plan members receive 24/7 priority support.
                    </div>
                  </div>
                </div>

              </div>
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
