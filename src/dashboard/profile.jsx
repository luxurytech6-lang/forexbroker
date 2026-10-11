import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Send, MessageSquare, LineChart, Plug, ArrowDownCircle, ArrowUpCircle, CreditCard, Receipt, Coins, Eye, EyeOff, Bell, BellRing, UserPlus, Star, LayoutDashboard, CandlestickChart, Lightbulb, Users, UserCircle, User, Globe, Settings, HelpCircle, LogOut, Search, Clock, X, Check, Activity, CalendarDays, Calendar, AlertCircle, AlertTriangle, Pencil, Share2, ShieldCheck, BarChart3, Copy, Plus, LayoutGrid, MapPin, Flag, Download, Lock, Trash2,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";

/* ─── Icon lookup (maps legacy Tabler icon keys to lucide-react components) ─── */
const ICON_MAP = {
  'ti-brand-discord':   MessageCircle,
  'ti-brand-telegram':  Send,
  'ti-brand-slack':     MessageSquare,
  'ti-chart-line':      LineChart,
  'ti-plug-connected':  Plug,
  'ti-plug':            Plug,
  'ti-arrow-down-circle': ArrowDownCircle,
  'ti-arrow-up-circle':   ArrowUpCircle,
  'ti-credit-card':     CreditCard,
  'ti-receipt':         Receipt,
  'ti-coins':           Coins,
  'ti-eye':             Eye,
  'ti-eye-off':         EyeOff,
  'ti-bell':            Bell,
  'ti-bell-ringing':    BellRing,
  'ti-user-plus':       UserPlus,
  'ti-message':         MessageCircle,
  'ti-star':            Star,
  'ti-layout-dashboard': LayoutDashboard,
  'ti-chart-candlestick': CandlestickChart,
  'ti-bulb':            Lightbulb,
  'ti-users':           Users,
  'ti-user-circle':     UserCircle,
  'ti-user':            User,
  'ti-world':           Globe,
  'ti-settings':        Settings,
  'ti-help-circle':     HelpCircle,
  'ti-logout':          LogOut,
  'ti-search':          Search,
  'ti-clock':           Clock,
  'ti-x':               X,
  'ti-check':           Check,
  'ti-activity':        Activity,
  'ti-calendar-stats':  CalendarDays,
  'ti-calendar':        Calendar,
  'ti-alert-circle':    AlertCircle,
  'ti-alert-triangle':  AlertTriangle,
  'ti-edit':            Pencil,
  'ti-share':           Share2,
  'ti-shield-check':    ShieldCheck,
  'ti-chart-bar':       BarChart3,
  'ti-copy':            Copy,
  'ti-plus':            Plus,
  'ti-apps':            LayoutGrid,
  'ti-map-pin':         MapPin,
  'ti-flag':            Flag,
  'ti-download':        Download,
  'ti-lock':            Lock,
  'ti-trash':           Trash2,
};
function TIcon({ name, size = 16, style, className }) {
  const C = ICON_MAP[name];
  if (!C) return null;
  return <C size={size} style={style} className={className} />;
}

/* ─── Design tokens (matches existing site shell) ──────────────────── */
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
  const s     = { ...DEFAULT_SETTINGS, ...settings };
  const theme = resolveTheme(s.theme);
  const accent = s.accent_color;

  const hex2rgb = h => {
    const c = h.replace('#', '');
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  const [ar, ag, ab] = hex2rgb(accent);

  const densityMap = {
    compact:     { sbW:'220px', mainPad:'16px 20px 32px', cardPad:'12px 16px', gap:'10px' },
    comfortable: { sbW:'256px', mainPad:'24px 28px 40px', cardPad:'16px 20px', gap:'14px' },
    spacious:    { sbW:'280px', mainPad:'32px 36px 56px', cardPad:'20px 24px', gap:'20px' },
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
    '--sidebar-w': d.sbW,
    '--topbar-h':  '60px',
    '--density-pad':  d.mainPad,
    '--card-body-pad': d.cardPad,
    '--grid-gap':  d.gap,
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
    --card-body-pad:16px 20px;
    --grid-gap:14px;
    --sans:'Instrument Sans', system-ui, sans-serif;
    --serif:'Instrument Serif',serif;
    --mono:'Instrument Sans', system-ui, sans-serif;
    --r-sm:8px; --r-md:12px; --r-lg:16px;
  }

  body, #root {
    font-family: var(--sans); background: var(--bg); color: var(--text);
    height: 100vh; height: 100dvh; overflow: hidden; -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  button { font-family: var(--sans); cursor: pointer; border: none; background: none; }
  input, select, textarea { font-family: var(--sans); }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  /* ── Shell ── */
  .in-shell { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; height: 100dvh; overflow: hidden; }

  /* ── Sidebar ── */
  .in-sidebar {
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; height: 100vh; height: 100dvh;
    overflow-y: auto; overflow-x: hidden; position: relative; z-index: 100;
    flex-shrink: 0; transition: transform .25s cubic-bezier(.4,0,.2,1);
  }
  .in-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
  .in-sidebar::after {
    content:''; position:absolute; top:0; right:0; width:1px; height:100%;
    background: linear-gradient(180deg, transparent 0%, var(--accent) 30%, var(--border) 60%, transparent 100%);
    opacity:.15; pointer-events:none;
  }

  /* Brand */
  .in-brand { display:flex; align-items:center; gap:10px; padding:20px 20px 16px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .in-brand-icon { width:34px; height:34px; background:var(--accent); border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .in-brand-icon i { font-size:18px; color:#000; }
  .in-brand-name { font-size:16px; font-weight:700; color:var(--text); }
  .in-brand-name em { color:var(--accent); font-style:normal; }

  /* Portfolio pill */
  .in-sb-pill { margin:12px 16px; background:var(--accent-dim); border:1px solid rgba(var(--accent-rgb),.18); border-radius:var(--r-md); padding:10px 14px; flex-shrink:0; }
  .in-sb-pill-label { font-size:10px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; display:flex; align-items:center; gap:6px; }
  .in-live-dot { width:6px; height:6px; background:var(--green); border-radius:50%; animation:in-pulse 2s infinite; flex-shrink:0; }
  @keyframes in-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .in-sb-pill-val { font-family:var(--mono); font-size:19px; font-weight:600; color:var(--accent); letter-spacing:-.5px; }
  .in-sb-pill-sub { font-size:11px; color:var(--green); margin-top:3px; }

  /* Nav */
  .in-sb-scroll { flex:1; overflow-y:auto; padding:8px 0; }
  .in-sb-section { padding:10px 20px 4px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--faint); }
  .in-sb-link {
    display:flex; align-items:center; gap:11px; padding:9px 20px;
    font-size:13px; font-weight:500; color:var(--muted);
    border-left:2px solid transparent; transition:all .15s; cursor:pointer; text-decoration:none;
  }
  .in-sb-link svg { width:18px; height:18px; flex-shrink:0; }
  .in-sb-link:hover { color:var(--text); background:var(--accent-glow); border-left-color:var(--border2); }
  .in-sb-link.active { color:var(--accent); background:var(--accent-dim); border-left-color:var(--accent); }
  .in-sb-link.active svg { filter:drop-shadow(0 0 6px var(--accent)); }
  .in-sb-badge { margin-left:auto; font-size:9px; font-weight:700; background:var(--accent); color:#000; padding:2px 6px; border-radius:5px; }

  /* User */
  .in-sb-user { flex-shrink:0; border-top:1px solid var(--border); padding:14px 16px; display:flex; align-items:center; gap:10px; min-width:0; }
  .in-sb-avatar {
    width:36px; height:36px; border-radius:50%;
    background:linear-gradient(135deg,var(--accent) 0%,#78d000 100%);
    color:#000; font-size:12px; font-weight:700;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 0 12px rgba(var(--accent-rgb),.3);
  }
  .in-sb-user-name { font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .in-sb-user-role { font-size:10px; color:var(--accent); margin-top:1px; }
  .in-sb-link.logout { color:var(--red); width:100%; }
  .in-sb-link.logout:hover { background:var(--red-dim); border-left-color:var(--red); color:var(--red); }
  .in-sb-link.logout svg { color:var(--red); }

  /* ── Profile dropdown ── */
  .in-avatar-wrap { position:relative; display:inline-flex; }
  @keyframes in-fade { from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }
  .in-profile-dropdown {
    position:absolute; top:calc(100% + 8px); right:0;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:var(--r-md); padding:6px; min-width:190px; z-index:400;
    box-shadow:0 16px 40px rgba(0,0,0,.75); animation:in-fade .18s ease both;
  }
  .in-profile-head {
    display:flex; align-items:center; gap:10px;
    padding:8px 10px 10px; border-bottom:1px solid var(--border); margin-bottom:6px;
  }
  .in-profile-head-name { font-size:12px; font-weight:700; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .in-profile-head-role { font-size:10px; color:var(--muted); margin-top:1px; }
  .in-profile-option {
    display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:var(--r-sm);
    font-size:12px; color:var(--muted); font-weight:500; cursor:pointer;
    font-family:var(--sans); transition:background .12s, color .12s; text-decoration:none;
  }
  .in-profile-option svg { width:15px; height:15px; flex-shrink:0; }
  .in-profile-option:hover { background:var(--surface2); color:var(--text); }
  .in-profile-option.logout { color:var(--red); }
  .in-profile-option.logout:hover { background:var(--red-dim); color:var(--red); }

  /* ── Right panel ── */
  .in-right { grid-column:2; display:flex; flex-direction:column; height:100vh; height:100dvh; overflow:hidden; }

  /* ── Topbar ── */
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
    width:36px; height:36px; border-radius:50%;
    background:linear-gradient(135deg,var(--accent) 0%,#78d000 100%);
    color:#000; font-size:12px; font-weight:700;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    box-shadow:0 0 10px rgba(var(--accent-rgb),.25);
  }
  .in-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; padding:4px; flex-shrink:0; }
  .in-hamburger span { display:block; width:20px; height:2px; background:var(--text); border-radius:2px; }
  .in-topbar-actions { display:flex; align-items:center; gap:16px; margin-left:auto; flex-shrink:0; }

  /* ── Main ── */
  .in-main { flex:1; overflow-y:auto; overflow-x:hidden; padding:var(--density-pad); padding-bottom:calc(env(safe-area-inset-bottom, 0px) + 40px); }

  /* Buttons */
  .in-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:7px;
    border-radius:var(--r-sm); font-family:var(--sans); font-weight:600;
    cursor:pointer; transition:all .15s; border:none; text-decoration:none; white-space:nowrap;
  }
  .in-btn-sm { font-size:12px; padding:7px 14px; }
  .in-btn-md { font-size:13px; padding:9px 18px; }
  .in-btn-accent { background:var(--accent); color:#000; }
  .in-btn-accent:hover { opacity:.88; box-shadow:0 0 20px rgba(var(--accent-rgb),.3); }
  .in-btn-ghost { background:var(--surface2); border:1px solid var(--border); color:var(--text); }
  .in-btn-ghost:hover { border-color:var(--border2); }
  .in-btn-danger { background:var(--red-dim); border:1px solid rgba(248,113,113,.2); color:var(--red); }
  .in-btn-danger:hover { background:rgba(248,113,113,.2); }

  /* Badge */
  .in-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; white-space:nowrap; letter-spacing:.2px; }
  .in-badge-green  { background:var(--green-dim);  color:var(--green); }
  .in-badge-blue   { background:var(--blue-dim);   color:var(--blue); }
  .in-badge-red    { background:var(--red-dim);    color:var(--red); }
  .in-badge-gold   { background:var(--accent-dim); color:var(--accent); }
  .in-badge-purple { background:var(--purple-dim); color:var(--purple); }
  .in-badge-amber  { background:var(--amber-dim);  color:var(--amber); }
  .in-badge-muted  { background:rgba(100,116,139,.12); color:var(--muted); }

  /* ─────────────────────────────────────────────────────── */
  /* ── PROFILE PAGE ── */

  /* Hero Banner */
  .pf-hero {
    position:relative; height:160px; border-radius:var(--r-lg);
    overflow:hidden; margin-bottom:0;
    background:linear-gradient(135deg,#0d1520 0%,#0b1628 40%,#0d1018 100%);
    border:1px solid var(--border);
  }
  .pf-hero-grid {
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(var(--accent-rgb),.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(var(--accent-rgb),.04) 1px,transparent 1px);
    background-size:40px 40px;
  }
  .pf-hero-glow {
    position:absolute; top:-80px; left:50%; transform:translateX(-50%);
    width:500px; height:300px; border-radius:50%;
    background:radial-gradient(ellipse,rgba(var(--accent-rgb),.07) 0%,transparent 70%);
    pointer-events:none;
  }
  .pf-hero-actions { position:absolute; top:16px; right:16px; display:flex; gap:8px; }

  /* Profile identity */
  .pf-identity {
    display:flex; align-items:flex-end; gap:20px;
    padding:0 28px; margin-top:-48px; margin-bottom:20px;
    position:relative; z-index:10;
  }
  .pf-avatar-wrap { position:relative; flex-shrink:0; }
  .pf-avatar {
    width:96px; height:96px; border-radius:50%;
    background:linear-gradient(135deg,var(--accent) 0%,#78d000 100%);
    color:#000; font-size:32px; font-weight:700;
    display:flex; align-items:center; justify-content:center;
    border:3px solid var(--bg); box-shadow:0 0 24px rgba(var(--accent-rgb),.35);
  }
  .pf-avatar-status {
    position:absolute; bottom:4px; right:4px; width:16px; height:16px;
    border-radius:50%; background:var(--green); border:2.5px solid var(--bg);
  }
  .pf-identity-info { flex:1; padding-bottom:4px; }
  .pf-name { font-family:var(--serif); font-size:24px; line-height:1.2; margin-bottom:4px; }
  .pf-name em { color:var(--accent); font-style:italic; }
  .pf-handle { font-size:13px; color:var(--muted); margin-bottom:8px; display:flex; align-items:center; gap:8px; }
  .pf-tags { display:flex; gap:6px; flex-wrap:wrap; }
  .pf-identity-actions { display:flex; gap:8px; padding-bottom:4px; }

  /* Account summary cards */
  .pf-summary-row { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--grid-gap); margin-bottom:24px; }
  .pf-summary-card {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--r-lg); padding:16px 18px;
    position:relative; overflow:hidden; transition:all .2s;
  }
  .pf-summary-card:hover { border-color:var(--border2); transform:translateY(-1px); }
  .pf-summary-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent 0%,var(--accent) 50%,transparent 100%);
    opacity:.2;
  }
  .pf-summary-icon { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:14px; margin-bottom:10px; }
  .pf-summary-label { font-size:9px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; }
  .pf-summary-value { font-family:var(--mono); font-size:20px; font-weight:600; line-height:1; margin-bottom:4px; letter-spacing:-.5px; }
  .pf-summary-sub { font-size:11px; color:var(--muted); }

  /* Content layout */
  .pf-content { display:grid; grid-template-columns:1fr 320px; gap:var(--grid-gap); }
  .pf-left { display:flex; flex-direction:column; gap:var(--grid-gap); }
  .pf-right { display:flex; flex-direction:column; gap:var(--grid-gap); }

  /* Section card */
  .pf-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; }
  .pf-card-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 20px; border-bottom:1px solid var(--border);
  }
  .pf-card-title { font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px; }
  .pf-card-title svg { width:16px; height:16px; color:var(--accent); }
  .pf-card-body { padding:var(--card-body-pad); }

  /* Tabs */
  .pf-tabs { display:flex; gap:4px; }
  .pf-tab {
    display:flex; align-items:center; gap:6px; padding:6px 12px;
    font-size:12px; font-weight:600; border-radius:var(--r-sm);
    color:var(--muted); background:none; transition:all .15s; cursor:pointer; border:none;
  }
  .pf-tab svg { width:14px; height:14px; }
  .pf-tab:hover { color:var(--text); background:var(--surface2); }
  .pf-tab.active { color:var(--accent); background:var(--accent-dim); }

  /* Activity feed */
  .pf-activity-item {
    display:flex; align-items:flex-start; gap:12px;
    padding:12px 0; border-bottom:1px solid var(--border);
  }
  .pf-activity-item:last-child { border-bottom:none; padding-bottom:0; }
  .pf-activity-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; margin-top:1px; }
  .pf-activity-text { flex:1; min-width:0; }
  .pf-activity-title { font-size:13px; line-height:1.4; margin-bottom:4px; }
  .pf-activity-meta { font-size:11px; color:var(--muted); display:flex; align-items:center; gap:5px; }
  .pf-activity-val { font-family:var(--mono); font-size:12px; font-weight:700; flex-shrink:0; }

  /* Watchlist */
  .pf-watch-item {
    display:flex; align-items:center; gap:12px;
    padding:10px 0; border-bottom:1px solid var(--border);
  }
  .pf-watch-item:last-child { border-bottom:none; }
  .pf-watch-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
  .pf-watch-ticker { font-size:13px; font-weight:700; margin-bottom:2px; }
  .pf-watch-name { font-size:11px; color:var(--muted); }
  .pf-watch-price { font-family:var(--mono); font-size:13px; font-weight:600; text-align:right; }
  .pf-watch-chg { font-size:11px; text-align:right; margin-top:2px; }

  /* Followed traders */
  .pf-trader-item {
    display:flex; align-items:center; gap:10px;
    padding:10px 0; border-bottom:1px solid var(--border);
  }
  .pf-trader-item:last-child { border-bottom:none; }
  .pf-trader-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
  .pf-trader-name { font-size:12px; font-weight:700; margin-bottom:2px; }
  .pf-trader-sub { font-size:10px; color:var(--muted); }
  .pf-trader-roi { font-family:var(--mono); font-size:12px; font-weight:700; margin-left:auto; }
  .pf-trader-action { margin-left:8px; }

  /* Notifications card */
  .pf-notif-item { display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
  .pf-notif-item:last-child { border-bottom:none; }
  .pf-notif-dot-wrap { padding-top:4px; flex-shrink:0; }
  .pf-notif-unread { width:7px; height:7px; border-radius:50%; background:var(--accent); }
  .pf-notif-read { width:7px; height:7px; border-radius:50%; background:var(--border2); }
  .pf-notif-text { font-size:12px; line-height:1.45; flex:1; }
  .pf-notif-time { font-size:10px; color:var(--muted); margin-top:3px; }

  /* Info rows */
  .pf-info-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); }
  .pf-info-row:last-child { border-bottom:none; }
  .pf-info-row svg { width:20px; height:20px; color:var(--muted); flex-shrink:0; }
  .pf-info-label { font-size:11px; color:var(--muted); width:80px; flex-shrink:0; }
  .pf-info-val { font-size:12px; font-weight:500; }

  /* Plan card */
  .pf-plan-card {
    background:linear-gradient(135deg,rgba(var(--accent-rgb),.08) 0%,rgba(var(--accent-rgb),.03) 100%);
    border:1px solid rgba(var(--accent-rgb),.2); border-radius:var(--r-md); padding:16px;
    display:flex; align-items:center; gap:14px;
  }
  .pf-plan-icon { width:40px; height:40px; border-radius:10px; background:var(--accent-dim); border:1px solid rgba(var(--accent-rgb),.25); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
  .pf-plan-name { font-size:14px; font-weight:700; color:var(--accent); margin-bottom:3px; }
  .pf-plan-desc { font-size:11px; color:var(--muted); }
  .pf-plan-upgrade { margin-left:auto; flex-shrink:0; }

  /* Edit modal */
  .pf-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.7);
    z-index:500; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);
  }
  .pf-modal {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:var(--r-lg); width:480px; max-width:calc(100vw - 32px);
    max-height:90vh; overflow-y:auto; box-shadow:0 24px 80px rgba(0,0,0,.6);
  }
  .pf-modal-head { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--border); }
  .pf-modal-title { font-family:var(--serif); font-size:18px; }
  .pf-modal-body { padding:22px; display:flex; flex-direction:column; gap:16px; }
  .pf-modal-foot { padding:14px 22px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:8px; }
  .pf-field { display:flex; flex-direction:column; gap:6px; }
  .pf-field label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); }
  .pf-input {
    background:var(--input-bg, var(--surface2)); border:1px solid var(--border); color:var(--text);
    border-radius:var(--r-sm); padding:9px 12px; font-size:13px; outline:none;
    transition:border-color .15s; width:100%;
  }
  .pf-input:focus { border-color:var(--accent); }
  .pf-textarea { resize:vertical; min-height:80px; }
  .pf-field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  /* Trading Performance stats */
  .pf-perf-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:14px; }
  .pf-perf-stat {
    background:var(--surface2); border:1px solid var(--border);
    border-radius:10px; padding:12px 14px; text-align:center;
  }
  .pf-perf-stat-val { font-family:var(--mono); font-size:18px; font-weight:700; line-height:1; margin-bottom:4px; }
  .pf-perf-stat-label { font-size:10px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; }
  .pf-period-tabs { display:flex; gap:4px; margin-bottom:14px; }
  .pf-period-tab {
    padding:4px 10px; border-radius:5px; font-size:11px; font-weight:600;
    color:var(--muted); background:none; cursor:pointer; border:1px solid transparent; transition:all .15s;
  }
  .pf-period-tab:hover { color:var(--text); }
  .pf-period-tab.active { color:var(--accent); background:var(--accent-dim); border-color:rgba(var(--accent-rgb),.2); }
  .pf-sparkline { display:flex; align-items:flex-end; gap:3px; height:48px; }
  .pf-spark-bar { flex:1; border-radius:3px 3px 0 0; min-height:4px; transition:opacity .2s; }
  .pf-spark-bar:hover { opacity:.75; }

  /* Broker connections */
  .pf-broker-item {
    display:flex; align-items:center; gap:12px;
    padding:10px 0; border-bottom:1px solid var(--border);
  }
  .pf-broker-item:last-child { border-bottom:none; }
  .pf-broker-logo {
    width:36px; height:36px; border-radius:9px;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:800; flex-shrink:0;
    border:1px solid var(--border);
  }
  .pf-broker-name { font-size:12px; font-weight:700; margin-bottom:2px; }
  .pf-broker-meta { font-size:10px; color:var(--muted); }
  .pf-broker-balance { font-family:var(--mono); font-size:12px; font-weight:700; margin-left:auto; text-align:right; }
  .pf-broker-type { font-size:10px; margin-top:2px; text-align:right; }
  .pf-live-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; }
  .pf-live-pill.live { background:var(--green-dim); color:var(--green); }
  .pf-live-pill.demo { background:var(--blue-dim); color:var(--blue); }

  /* Connected apps */
  .pf-apps-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .pf-app-item {
    background:var(--surface2); border:1px solid var(--border);
    border-radius:10px; padding:12px; display:flex; align-items:center; gap:10px;
    transition:border-color .15s;
  }
  .pf-app-item:hover { border-color:var(--border2); }
  .pf-app-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .pf-app-name { font-size:11px; font-weight:700; margin-bottom:2px; }
  .pf-app-status { font-size:10px; }
  .pf-app-toggle { margin-left:auto; flex-shrink:0; }
  .pf-toggle { width:32px; height:18px; border-radius:9px; border:none; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
  .pf-toggle::after { content:''; position:absolute; width:12px; height:12px; border-radius:50%; background:#fff; top:3px; transition:left .2s; }
  .pf-toggle.on { background:var(--accent); }
  .pf-toggle.on::after { left:17px; }
  .pf-toggle.off { background:var(--border2); }
  .pf-toggle.off::after { left:3px; }

  /* Transactions */
  .pf-tx-item {
    display:flex; align-items:center; gap:12px;
    padding:10px 0; border-bottom:1px solid var(--border);
  }
  .pf-tx-item:last-child { border-bottom:none; }
  .pf-tx-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .pf-tx-desc { font-size:12px; font-weight:600; margin-bottom:2px; }
  .pf-tx-meta { font-size:10px; color:var(--muted); }
  .pf-tx-amount { font-family:var(--mono); font-size:13px; font-weight:700; margin-left:auto; text-align:right; }
  .pf-tx-status { font-size:10px; text-align:right; margin-top:2px; }

  /* Responsive */
  @media (min-width:1600px) {
    .in-main > * { max-width:1440px; margin-left:auto; margin-right:auto; }
  }
  @media (max-width:1100px) {
    .pf-summary-row { grid-template-columns:repeat(2,1fr); }
    .pf-content { grid-template-columns:1fr; }
  }
  @media (max-width:768px) {
    .in-shell { grid-template-columns:1fr !important; }
    .in-sidebar { position:fixed !important; top:0 !important; left:0 !important; transform:translateX(-100%) !important; z-index:300 !important; }
    .in-sidebar.open { transform:translateX(0) !important; box-shadow:4px 0 32px rgba(0,0,0,.6) !important; }
    .in-right { grid-column:1; }
    .in-hamburger { display:flex; }
    .pf-identity { padding:0 16px; flex-wrap:wrap; }
    .pf-summary-row { grid-template-columns:repeat(2,1fr); }
    .in-topbar { gap:8px; }
    .in-topbar-title { font-size:16px; }
  }
  @media (max-width:600px) {
    .in-main { padding:16px; padding-bottom:calc(env(safe-area-inset-bottom, 0px) + 28px); }
    .in-topbar { padding:0 12px; gap:6px; }
    .in-topbar-actions { gap:10px; }
    .pf-summary-row { grid-template-columns:1fr; }
    .pf-identity { flex-direction:column; align-items:center; text-align:center; margin-top:-40px; gap:12px; padding:0 16px; }
    .pf-identity-info { width:100%; }
    .pf-handle { justify-content:center; }
    .pf-tags { justify-content:center; }
    .pf-identity-actions { width:100%; padding-bottom:0; }
    .pf-identity-actions .in-btn { flex:1; justify-content:center; }
    .in-profile-dropdown { right:-12px; }
  }
  @media (max-width:420px) {
    .in-topbar-title { display:none; }
    .in-topbar-actions { gap:8px; }
  }
`;

/* ─── Helpers ────────────────────────────────────────────────────── */
const APP_META = {
  discord:     { icon:'ti-brand-discord',   bg:'rgba(167,139,250,.12)', col:'#B49BFF' },
  telegram:    { icon:'ti-brand-telegram',  bg:'rgba(52,211,153,.12)',  col:'#34d399' },
  slack:       { icon:'ti-brand-slack',     bg:'rgba(245,158,11,.12)',  col:'#f59e0b' },
  tradingview: { icon:'ti-chart-line',      bg:'rgba(96,165,250,.12)',  col:'#5B8CFF' },
  broker_link: { icon:'ti-plug-connected',  bg:'rgba(226,174,74,.12)',  col:'#E2AE4A' },
};
const TX_META = {
  deposit:     { icon:'ti-arrow-down-circle', bg:'rgba(52,211,153,.12)',  col:'#34d399' },
  withdrawal:  { icon:'ti-arrow-up-circle',   bg:'rgba(248,113,113,.12)', col:'#FF6470' },
  plan_charge: { icon:'ti-credit-card',       bg:'rgba(226,174,74,.12)',  col:'#E2AE4A' },
  fee:         { icon:'ti-receipt',           bg:'rgba(96,165,250,.12)',  col:'#5B8CFF' },
  payout:      { icon:'ti-coins',             bg:'rgba(52,211,153,.12)',  col:'#34d399' },
};
const ACTIVITY_META = {
  Watchlist: { icon:'ti-eye',       bg:'rgba(96,165,250,.12)',  col:'#5B8CFF' },
  Alert:     { icon:'ti-bell',      bg:'rgba(245,158,11,.12)',  col:'#f59e0b' },
  Social:    { icon:'ti-user-plus', bg:'rgba(52,211,153,.12)',  col:'#34d399' },
  Community: { icon:'ti-message',   bg:'rgba(167,139,250,.12)', col:'#B49BFF' },
  Signals:   { icon:'ti-star',      bg:'rgba(226,174,74,.12)',  col:'#E2AE4A' },
};
const BROKER_COLORS = [
  { bg:'rgba(52,211,153,.12)',  col:'#34d399' },
  { bg:'rgba(96,165,250,.12)',  col:'#5B8CFF' },
  { bg:'rgba(226,174,74,.12)',  col:'#E2AE4A' },
  { bg:'rgba(167,139,250,.12)', col:'#B49BFF' },
  { bg:'rgba(245,158,11,.12)',  col:'#f59e0b' },
];
const PERF_PERIODS = ['30D', '90D', '6M', '1Y', 'all_time'];
const PERF_LABELS  = { '30D':'30D', '90D':'90D', '6M':'6M', '1Y':'1Y', 'all_time':'All' };

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  if (diff < 172800)return 'Yesterday';
  return fmtDate(ts);
}
function fmtMoney(n, currency = 'USD') {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style:'currency', currency, maximumFractionDigits:2 }).format(n);
}

/* ─── Currency conversion ─────────────────────────────────────────────
   The wallet is always stored/fetched in USD (the base currency, filtered
   with .eq('currency','USD') below). Convert to the user's chosen display
   currency (users.currency) only at render time, using live USD → X rates. */
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
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

/* ─── Supabase data hook ─────────────────────────────────────────── */
function useProfileData() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current session user
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authUser) throw new Error('Not authenticated');
      const uid = authUser.id;

      // Fire all queries in parallel
      const [
        userRes, subRes, activityRes, watchlistRes,
        followedRes, notifRes, txRes, brokerRes,
        appsRes, usageRes, perfRes, walletRes, settingsRes,
      ] = await Promise.all([
        // 1. User profile
        supabase.from('users').select('*').eq('id', uid).single(),

        // 2. Active subscription + plan details
        supabase.from('user_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', uid)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 3. Recent activity feed
        supabase.from('user_activity_feed')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(10),

        // 4. Watchlist — select only columns that exist in portfolio_watchlist
        supabase.from('portfolio_watchlist')
          .select('id, symbol, name, position_order, added_at')
          .eq('user_id', uid)
          .order('position_order', { ascending: true })
          .limit(10),

        // 5. Followed traders (copy relationships + trader profiles)
        supabase.from('copy_relationships')
          .select('*, trader_profiles(*, users(first_name, last_name, avatar_url))')
          .eq('copier_id', uid)
          .eq('status', 'active')
          .limit(6),

        // 6. Notifications
        supabase.from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(10),

        // 7. Transactions
        supabase.from('transactions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(10),

        // 8. Broker connections
        supabase.from('broker_connections')
          .select('*')
          .eq('user_id', uid)
          .eq('is_active', true)
          .order('connected_at', { ascending: false }),

        // 9. Connected apps
        supabase.from('connected_apps')
          .select('*')
          .eq('user_id', uid),

        // 10. Usage metrics (current period)
        supabase.from('usage_metrics')
          .select('*')
          .eq('user_id', uid)
          .order('period_start', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 11. Trader profile id — fetched separately; performance queried below
        supabase.from('trader_profiles')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle(),

        // 12. USD wallet balance
        supabase.from('wallets')
          .select('balance, currency')
          .eq('user_id', uid)
          .eq('currency', 'USD')
          .maybeSingle(),

        // 13. User settings
        supabase.from('user_settings')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle(),
      ]);

      // Check for critical errors
      if (userRes.error) throw userRes.error;

      // 11b. Fetch trader performance only if the user has a trader profile
      const traderProfile = perfRes.data;
      let performanceData = [];
      if (traderProfile?.id) {
        const { data: perfRows } = await supabase
          .from('trader_performance')
          .select('*')
          .eq('trader_id', traderProfile.id)
          .in('period', PERF_PERIODS)
          .order('recorded_at', { ascending: false });
        performanceData = perfRows || [];
      }

      setData({
        user:         userRes.data,
        subscription: subRes.data,
        activity:     activityRes.data    || [],
        watchlist:    watchlistRes.data   || [],
        followed:     followedRes.data    || [],
        notifications: notifRes.data      || [],
        transactions: txRes.data          || [],
        brokers:      brokerRes.data      || [],
        apps:         appsRes.data        || [],
        usage:        usageRes.data,
        performance:  performanceData,
        wallet:       walletRes.data,
        settings:     settingsRes.data    || null,
      });
    } catch (e) {
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
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
    { key:'settings',  href:'/settings',     Icon:DkSettings,  label:'Settings' },
    { key:'support',   href:'/support',      Icon:DkHeadset,   label:'Support' },
  ]},
];
const DK_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', AUD:'A$', CAD:'C$', CHF:'Fr', CNY:'¥', INR:'₹', NGN:'₦', ZAR:'R', KES:'KSh', GHS:'₵', BTC:'₿', ETH:'Ξ' };
const DK_ACTIVE = 'profile';
const DK_TITLE  = 'Profile';
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

function ActivityTab({ items = [] }) {
  if (!items.length) return <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>No activity yet.</div>;
  return (
    <div>
      {items.map((a, i) => {
        const cat  = a.category || 'Community';
        const meta = ACTIVITY_META[cat] || ACTIVITY_META.Community;
        return (
          <div key={i} className="pf-activity-item">
            <div className="pf-activity-icon" style={{ background:meta.bg, color:meta.col }}>
              <TIcon name={meta.icon} size={16} />
            </div>
            <div className="pf-activity-text">
              <div className="pf-activity-title">{a.description || a.title}</div>
              <div className="pf-activity-meta">
                <Clock size={11} />
                {timeAgo(a.created_at)} · {cat}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WatchlistTab({ items = [] }) {
  const COLORS = ['rgba(245,158,11,.15)','rgba(96,165,250,.15)','rgba(52,211,153,.15)','rgba(226,174,74,.15)','rgba(167,139,250,.15)'];
  const TEXT   = ['#f59e0b','#5B8CFF','#34d399','#E2AE4A','#B49BFF'];
  if (!items.length) return <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>Your watchlist is empty.</div>;
  return (
    <div>
      {items.map((w, i) => (
        <div key={i} className="pf-watch-item">
          <div className="pf-watch-icon" style={{ background:COLORS[i%COLORS.length], color:TEXT[i%TEXT.length] }}>
            {(w.symbol || '??').slice(0,2)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="pf-watch-ticker">{w.symbol}</div>
            <div className="pf-watch-name">{w.name || w.symbol}</div>
          </div>
          <div style={{ fontSize:10, color:'var(--muted)' }}>
            Added {fmtDate(w.added_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsTab({ items = [] }) {
  if (!items.length) return <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>No notifications.</div>;
  return (
    <div>
      {items.map((n, i) => (
        <div key={i} className="pf-notif-item">
          <div className="pf-notif-dot-wrap">
            <div className={!n.is_read ? 'pf-notif-unread' : 'pf-notif-read'} />
          </div>
          <div style={{ flex:1 }}>
            <div className="pf-notif-text">{n.body || n.message}</div>
            <div className="pf-notif-time">{timeAgo(n.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionsTab({ items = [] }) {
  if (!items.length) return <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>No transactions found.</div>;
  return (
    <div>
      {items.map((tx, i) => {
        const m       = TX_META[tx.type] || TX_META.fee;
        const isCredit = tx.type === 'deposit' || tx.type === 'payout';
        const sign    = isCredit ? '+' : '−';
        const amtCol  = isCredit ? '#34d399' : '#FF6470';
        const stCol   = tx.status === 'completed' ? '#34d399' : tx.status === 'failed' ? '#FF6470' : '#f59e0b';
        return (
          <div key={i} className="pf-tx-item">
            <div className="pf-tx-icon" style={{ background:m.bg, color:m.col }}>
              <TIcon name={m.icon} size={16} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="pf-tx-desc">{tx.description || tx.type?.replace('_',' ')}</div>
              <div className="pf-tx-meta">{fmtDate(tx.created_at)} · {tx.currency}</div>
            </div>
            <div>
              <div className="pf-tx-amount" style={{ color:amtCol }}>{sign}{fmtMoney(Math.abs(tx.amount), tx.currency)}</div>
              <div className="pf-tx-status" style={{ color:stCol }}>{tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditModal({ onClose, user = {} }) {
  return (
    <div className="pf-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pf-modal">
        <div className="pf-modal-head">
          <div className="pf-modal-title">Edit <em style={{ color:T.g, fontStyle:'italic' }}>Profile</em></div>
          <button className="in-tb-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pf-modal-body">
          <div className="pf-field-row">
            <div className="pf-field">
              <label>First Name</label>
              <input className="pf-input" defaultValue={user.first_name || ''} />
            </div>
            <div className="pf-field">
              <label>Last Name</label>
              <input className="pf-input" defaultValue={user.last_name || ''} />
            </div>
          </div>
          <div className="pf-field">
            <label>Handle</label>
            <input className="pf-input" defaultValue={user.handle || ''} />
          </div>
          <div className="pf-field">
            <label>Bio</label>
            <textarea className="pf-input pf-textarea" defaultValue={user.bio || ''} />
          </div>
          <div className="pf-field-row">
            <div className="pf-field">
              <label>Location</label>
              <input className="pf-input" defaultValue={user.location || ''} />
            </div>
            <div className="pf-field">
              <label>Website</label>
              <input className="pf-input" defaultValue={user.website || ''} />
            </div>
          </div>
          <div className="pf-field">
            <label>Timezone</label>
            <select className="pf-input" defaultValue={user.timezone || ''}>
              <option>EST (UTC −5)</option>
              <option>PST (UTC −8)</option>
              <option>UTC</option>
              <option>CET (UTC +1)</option>
              <option>WAT (UTC +1)</option>
              <option>EAT (UTC +3)</option>
              <option>IST (UTC +5:30)</option>
              <option>SGT (UTC +8)</option>
            </select>
          </div>
        </div>
        <div className="pf-modal-foot">
          <button className="in-btn in-btn-ghost in-btn-sm" onClick={onClose}>Cancel</button>
          <button className="in-btn in-btn-accent in-btn-sm" onClick={onClose}>
            <Check size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────────────────────── */
export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState('activity');
  const [editOpen, setEditOpen]       = useState(false);
  const [perfPeriod, setPerfPeriod]   = useState('30D');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const { data, loading, error } = useProfileData();

  // Live USD → X rates, fetched once per currency the user is displaying in.
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
  const userCurrency = data?.user?.currency || 'USD';
  useEffect(() => {
    if (exchangeRates[userCurrency]) return;
    fetchExchangeRates().then(rates => { if (rates) setExchangeRates(rates); });
  }, [userCurrency, exchangeRates]);
  const fxRate = exchangeRates[userCurrency] || 1;

  // user_settings: applied to :root as CSS vars
  const [userSettings, setUserSettings] = useState(DEFAULT_SETTINGS);
  const settingsApplied = useRef(false);

  // Sync userSettings from loaded data
  useEffect(() => {
    if (data?.settings && !settingsApplied.current) {
      settingsApplied.current = true;
      setUserSettings(s => ({ ...s, ...data.settings }));
    }
  }, [data?.settings]);

  // Apply CSS vars whenever userSettings change
  useEffect(() => {
    applyThemeVars(buildThemeVars(userSettings));
    if (userSettings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyThemeVars(buildThemeVars(userSettings));
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [userSettings]);

  const TABS = [
    { key:'activity',      label:'Activity',      icon:'ti-activity', show: userSettings.show_activity      },
    { key:'watchlist',     label:'Watchlist',     icon:'ti-eye',      show: userSettings.show_watchlist     },
    { key:'notifications', label:'Notifications', icon:'ti-bell',     show: true                            },
    { key:'transactions',  label:'Transactions',  icon:'ti-receipt',  show: true                            },
  ].filter(t => t.show);

  // If the current active tab was hidden, fall back to first visible tab
  const visibleTabKeys = TABS.map(t => t.key);
  const resolvedTab = visibleTabKeys.includes(activeTab) ? activeTab : (visibleTabKeys[0] || 'notifications');

  // ── Derived values from live data ──────────────────────────────────
  const user         = data?.user         || {};
  const sub          = data?.subscription;
  const plan         = sub?.subscription_plans;
  const usage        = data?.usage;
  const performance  = data?.performance  || [];
  const brokers      = data?.brokers      || [];
  const apps         = data?.apps         || [];
  const followed     = data?.followed     || [];

  const userInitials = initials(`${user.first_name || ''} ${user.last_name || ''}`);
  const fullName     = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const joinedDate   = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '—';

  // Days active
  const daysActive = user.created_at
    ? Math.floor((Date.now() - new Date(user.created_at)) / 86400000)
    : '—';

  // Summary cards from real data
  const SUMMARY = [
    { label:'Days Active',       value: String(daysActive),            sub:'Since joining',      icon:'ti-calendar-stats', bg:'rgba(226,174,74,.12)',  col:'#E2AE4A' },
    { label:'Traders Followed',  value: String(followed.length),       sub:'Active copy trades', icon:'ti-users',          bg:'rgba(96,165,250,.12)',  col:'#5B8CFF' },
    { label:'Watchlist Items',   value: String(data?.watchlist?.length ?? '—'), sub:'Assets tracked', icon:'ti-eye', bg:'rgba(52,211,153,.12)', col:'#34d399' },
    { label:'Alerts Used',       value: String(usage?.alerts_used ?? '—'), sub:'This period',    icon:'ti-bell-ringing',   bg:'rgba(245,158,11,.12)',  col:'#f59e0b' },
  ];

  // Performance for selected period
  const perfEntry   = performance.find(p => p.period === perfPeriod) || null;
  const sparkData   = perfEntry?.sparkline || [];
  const maxSpark    = sparkData.length ? Math.max(...sparkData) : 1;
  const roiPositive = (perfEntry?.roi_pct ?? 0) >= 0;
  const roiCol      = roiPositive ? '#34d399' : '#FF6470';
  const fmtPct      = (v) => v != null ? `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%` : '—';

  // Loading / error states
  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)', flexDirection:'column', gap:16 }}>
        <div style={{ width:40, height:40, border:`3px solid rgba(226,174,74,.2)`, borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <div style={{ color:'var(--muted)', fontSize:13 }}>Loading your profile…</div>
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    </>
  );

  if (error) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)', flexDirection:'column', gap:12 }}>
        <AlertCircle size={32} style={{ color:'var(--red)' }} />
        <div style={{ color:'var(--text)', fontWeight:600 }}>Failed to load profile</div>
        <div style={{ color:'var(--muted)', fontSize:12 }}>{error}</div>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />

      {editOpen && <EditModal user={user} onClose={() => setEditOpen(false)} />}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:299,
        }} />
      )}

      <div className="in-shell">
        <Sidebar open={sidebarOpen} user={user} sub={sub} wallet={data?.wallet} fxRate={fxRate} followed={followed} onLogout={handleLogout} />

        <div className="in-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} notifications={data?.notifications || []} onLogout={handleLogout} />

          <main className="in-main">

            {/* Hero banner */}
            <div className="pf-hero">
              <div className="pf-hero-grid" />
              <div className="pf-hero-glow" />
              <div className="pf-hero-actions">
                <button className="in-btn in-btn-ghost in-btn-sm" onClick={() => setEditOpen(true)}>
                  <Pencil size={14} /> Edit Profile
                </button>
                <button className="in-btn in-btn-accent in-btn-sm">
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>

            {/* Identity row */}
            <div className="pf-identity">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar">
                  {user.avatar_url
                    ? <img src={user.avatar_url} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} alt="" />
                    : userInitials}
                </div>
                <div className="pf-avatar-status" />
              </div>
              <div className="pf-identity-info">
                <div className="pf-name">{user.first_name} <em>{user.last_name}</em></div>
                <div className="pf-handle">
                  {user.handle || `@${(user.first_name || '').toLowerCase()}`}
                  {user.is_verified && (
                    <span className="in-badge in-badge-gold"><ShieldCheck size={9} style={{ marginRight:3 }} />Verified</span>
                  )}
                </div>
                <div className="pf-tags">
                  <span className="in-badge in-badge-gold">{plan?.name ? `${plan.name.charAt(0).toUpperCase()+plan.name.slice(1)} Member` : 'Free'}</span>
                  {user.is_public && <span className="in-badge in-badge-muted"><Globe size={9} style={{ marginRight:3 }} />Public</span>}
                  {user.trading_goal && <span className="in-badge in-badge-blue">{user.trading_goal}</span>}
                </div>
              </div>
              <div className="pf-identity-actions">
                <button className="in-btn in-btn-ghost in-btn-sm" onClick={() => setEditOpen(true)}>
                  <Settings size={14} /> Settings
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="pf-summary-row">
              {SUMMARY.map(s => (
                <div key={s.label} className="pf-summary-card">
                  <div className="pf-summary-icon" style={{ background:s.bg, color:s.col }}>
                    <TIcon name={s.icon} size={14} />
                  </div>
                  <div className="pf-summary-label">{s.label}</div>
                  <div className="pf-summary-value" style={{ color:s.col }}>{s.value}</div>
                  <div className="pf-summary-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="pf-content">

              {/* Left column */}
              <div className="pf-left">

                {/* Tabs card */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-tabs">
                      {TABS.map(t => (
                        <button key={t.key} className={`pf-tab${resolvedTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                          <TIcon name={t.icon} size={14} />{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pf-card-body">
                    {resolvedTab === 'activity'      && <ActivityTab      items={data?.activity}      />}
                    {resolvedTab === 'watchlist'     && <WatchlistTab     items={data?.watchlist}     />}
                    {resolvedTab === 'notifications' && <NotificationsTab items={data?.notifications} />}
                    {resolvedTab === 'transactions'  && <TransactionsTab  items={data?.transactions}  />}
                  </div>
                </div>

                {/* Trading Performance */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title"><BarChart3 size={16} />Trading Performance</div>
                    <div className="pf-period-tabs" style={{ marginBottom:0 }}>
                      {PERF_PERIODS.map(p => (
                        <button key={p} className={`pf-period-tab${perfPeriod === p ? ' active' : ''}`} onClick={() => setPerfPeriod(p)}>
                          {PERF_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pf-card-body">
                    {perfEntry ? (
                      <>
                        <div className="pf-perf-grid">
                          <div className="pf-perf-stat">
                            <div className="pf-perf-stat-val" style={{ color:roiCol }}>{fmtPct(perfEntry.roi_pct)}</div>
                            <div className="pf-perf-stat-label">Return</div>
                          </div>
                          <div className="pf-perf-stat">
                            <div className="pf-perf-stat-val" style={{ color:'#5B8CFF' }}>{perfEntry.win_rate_pct != null ? `${perfEntry.win_rate_pct}%` : '—'}</div>
                            <div className="pf-perf-stat-label">Win Rate</div>
                          </div>
                          <div className="pf-perf-stat">
                            <div className="pf-perf-stat-val" style={{ color:'#FF6470' }}>{perfEntry.max_drawdown_pct != null ? `−${perfEntry.max_drawdown_pct}%` : '—'}</div>
                            <div className="pf-perf-stat-label">Max Drawdown</div>
                          </div>
                          <div className="pf-perf-stat">
                            <div className="pf-perf-stat-val" style={{ color:'#B49BFF' }}>{perfEntry.total_trades ?? '—'}</div>
                            <div className="pf-perf-stat-label">Total Trades</div>
                          </div>
                        </div>
                        {sparkData.length > 0 && (
                          <div style={{ marginBottom:6 }}>
                            <div style={{ fontSize:10, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Equity Curve</div>
                            <div className="pf-sparkline">
                              {sparkData.map((v, i) => (
                                <div key={i} className="pf-spark-bar" style={{ height:`${(v/maxSpark)*100}%`, background:roiCol, opacity: 0.6 + (i/sparkData.length)*0.4 }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>No performance data for this period.</div>
                    )}
                  </div>
                </div>

                {/* Followed traders */}
                {userSettings.show_followed_traders && (
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title"><Users size={16} />Traders You Follow</div>
                    <a href="#" className="in-btn in-btn-ghost in-btn-sm">View all</a>
                  </div>
                  <div className="pf-card-body">
                    {followed.length === 0 && (
                      <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>You're not copying any traders yet.</div>
                    )}
                    {followed.map((rel, i) => {
                      const tp   = rel.trader_profiles || {};
                      const tu   = tp.users || {};
                      const name = tp.display_name || `${tu.first_name || ''} ${tu.last_name || ''}`.trim() || tp.handle || '—';
                      const ini  = initials(name);
                      const BGCOLS = ['#1d4ed8','#7c3aed','#065f46','#b45309','#1e3a5f'];
                      const roi  = tp.badge_label ? tp.badge_label : '—';
                      const roiPositive = rel.realised_gain >= 0;
                      return (
                        <div key={i} className="pf-trader-item">
                          <div className="pf-trader-avatar" style={{ background:BGCOLS[i%BGCOLS.length], color:'#fff' }}>{ini}</div>
                          <div>
                            <div className="pf-trader-name">{name}</div>
                            <div className="pf-trader-sub">{tp.market || '—'} · {fmtMoney(rel.allocated_amount, rel.currency)} allocated</div>
                          </div>
                          <div className="pf-trader-roi" style={{ color: roiPositive ? '#34d399' : '#FF6470' }}>
                            {rel.realised_gain != null ? fmtMoney(rel.realised_gain, rel.currency) : '—'}
                          </div>
                          <div className="pf-trader-action">
                            <button className="in-btn in-btn-ghost in-btn-sm">
                              <Copy size={14} /> Copy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}

              </div>

              {/* Right column */}
              <div className="pf-right">

                {/* Subscription */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title"><CreditCard size={16} />Subscription</div>
                  </div>
                  <div className="pf-card-body">
                    <div className="pf-plan-card">
                      <div className="pf-plan-icon">⚡</div>
                      <div>
                        <div className="pf-plan-name">{plan ? `${plan.name.charAt(0).toUpperCase()+plan.name.slice(1)} Plan` : 'Free Plan'}</div>
                        <div className="pf-plan-desc">
                          {sub?.current_period_end ? `Renews ${fmtDate(sub.current_period_end)}` : 'No active subscription'}
                          {plan?.monthly_price ? ` · $${plan.monthly_price}/mo` : ''}
                        </div>
                      </div>
                      <div className="pf-plan-upgrade">
                        <button className="in-btn in-btn-ghost in-btn-sm">Manage</button>
                      </div>
                    </div>
                    <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        { label:'Alerts used',     used: usage?.alerts_used    ?? 0, total: plan?.max_alerts     ?? '∞' },
                        { label:'Watchlist spots', used: usage?.watchlist_used ?? 0, total: plan?.max_watchlist  ?? '∞' },
                      ].map(u => {
                        const pct = typeof u.total === 'number' ? (u.used / u.total) * 100 : 0;
                        return (
                          <div key={u.label} style={{ background:T.s2, border:`1px solid ${T.br}`, borderRadius:10, padding:'10px 12px' }}>
                            <div style={{ fontSize:10, color:T.nt, marginBottom:6, fontWeight:600 }}>{u.label}</div>
                            <div style={{ height:4, background:T.br2, borderRadius:4, overflow:'hidden', marginBottom:6 }}>
                              <div style={{ height:'100%', width:`${Math.min(pct, 100)}%`, background:T.g, borderRadius:4 }} />
                            </div>
                            <div style={{ fontSize:11, fontFamily:T.mono, color:T.gr }}>{u.used} <span style={{ color:T.nt }}>/ {u.total}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Broker Connections */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title"><Plug size={16} />Broker Connections</div>
                    <button className="in-btn in-btn-ghost in-btn-sm"><Plus size={14} /> Add</button>
                  </div>
                  <div className="pf-card-body">
                    {brokers.length === 0 && (
                      <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>No broker connected yet.</div>
                    )}
                    {brokers.map((b, i) => {
                      const { bg, col } = BROKER_COLORS[i % BROKER_COLORS.length];
                      const ini = (b.broker_name || b.broker_id || '??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
                      return (
                        <div key={i} className="pf-broker-item">
                          <div className="pf-broker-logo" style={{ background:bg, color:col }}>{ini}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div className="pf-broker-name">{b.broker_name}</div>
                            <div className="pf-broker-meta">{b.platform} · {b.server_name}</div>
                          </div>
                          <div>
                            <div className="pf-broker-balance" style={{ color:col }}>{fmtMoney(b.balance, b.currency)}</div>
                            <div className="pf-broker-type">
                              <span className={`pf-live-pill ${b.account_type}`}>
                                {b.account_type === 'live' ? '● Live' : '○ Demo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connected Apps */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title"><LayoutGrid size={16} />Connected Apps</div>
                  </div>
                  <div className="pf-card-body">
                    {apps.length === 0 && (
                      <div style={{ color:'var(--muted)', fontSize:13, padding:'8px 0' }}>No apps connected.</div>
                    )}
                    <div className="pf-apps-grid">
                      {apps.map((app, i) => {
                        const key  = (app.app_name || '').toLowerCase();
                        const meta = APP_META[key] || { icon:'ti-plug', bg:'rgba(100,116,139,.12)', col:'#64748b' };
                        const name = app.app_name ? app.app_name.charAt(0).toUpperCase() + app.app_name.slice(1) : '—';
                        return (
                          <div key={i} className="pf-app-item">
                            <div className="pf-app-icon" style={{ background:meta.bg, color:meta.col }}>
                              <TIcon name={meta.icon} size={16} />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div className="pf-app-name">{name}</div>
                              <div className="pf-app-status" style={{ color: app.is_connected ? 'var(--green)' : 'var(--muted)' }}>
                                {app.is_connected ? 'Connected' : 'Disconnected'}
                              </div>
                            </div>
                            <div className="pf-app-toggle">
                              <button className={`pf-toggle ${app.is_connected ? 'on' : 'off'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* About */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title"><User size={16} />About</div>
                    <button className="in-btn in-btn-ghost in-btn-sm" onClick={() => setEditOpen(true)}>
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="pf-card-body">
                    <p style={{ fontSize:13, color:T.nt, lineHeight:1.65, marginBottom:16 }}>{user.bio || 'No bio set yet.'}</p>
                    {[
                      { icon:'ti-map-pin',  label:'Location', val: user.location  || '—' },
                      { icon:'ti-calendar', label:'Joined',   val: joinedDate             },
                      { icon:'ti-world',    label:'Website',  val: user.website   || '—' },
                      { icon:'ti-clock',    label:'Timezone', val: user.timezone  || '—' },
                      { icon:'ti-flag',     label:'Country',  val: user.country_name || '—' },
                    ].map(r => (
                      <div key={r.label} className="pf-info-row">
                        <TIcon name={r.icon} size={15} />
                        <span className="pf-info-label">{r.label}</span>
                        <span className="pf-info-val">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account actions */}
                <div className="pf-card">
                  <div className="pf-card-head">
                    <div className="pf-card-title" style={{ color:T.rd }}>
                      <AlertTriangle size={16} style={{ color:T.rd }} />Account
                    </div>
                  </div>
                  <div className="pf-card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <button className="in-btn in-btn-ghost in-btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>
                      <Download size={14} /> Export Data
                    </button>
                    <button className="in-btn in-btn-ghost in-btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>
                      <Lock size={14} /> Change Password
                    </button>
                    <button className="in-btn in-btn-ghost in-btn-sm" style={{ justifyContent:'flex-start', width:'100%' }} onClick={() => setEditOpen(true)}>
                      <EyeOff size={14} /> {user.is_public ? 'Make Profile Private' : 'Make Profile Public'}
                    </button>
                    <button className="in-btn in-btn-danger in-btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>
                      <Trash2 size={14} /> Delete Account
                    </button>
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
