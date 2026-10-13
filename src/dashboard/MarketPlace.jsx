import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from "../supabase";
import {
  Copy, TrendingUp, Bot, Radio, CreditCard, Settings, Search, Loader2, AlertCircle, Layers, PlayCircle, Send, BellRing, Check, Info, ArrowLeft, ShieldCheck, Clock, Wallet, Bitcoin, Wrench, Calculator, LineChart, FileText, Upload, X,
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

/* ─── DB icon_class resolver (Tabler string → lucide component) ─────────────── */
const ICON_MAP = {
  'ti-robot':            Bot,
  'ti-broadcast':        Radio,
  'ti-trending-up':      TrendingUp,
  'ti-chart-line':       TrendingUp,
  'ti-cpu':              Settings,
  'ti-bolt':             PlayCircle,
  'ti-currency-bitcoin': Bitcoin,
  'ti-currency-ethereum':Wallet,
  'ti-currency-dollar':  Wallet,
  'ti-search':           Search,
  'ti-calculator':       Calculator,
  'ti-chart-candle':     LineChart,
  'ti-shield-check':     ShieldCheck,
  'ti-report':           FileText,
  'ti-tool':             Wrench,
};
function DbIcon({ cls, size = 20, style }) {
  const Icon = ICON_MAP[cls] || Bot;
  return <Icon size={size} style={style} />;
}

/* ─── Payment proof upload ────────────────────────────────────────────────────
   Same `payment-proofs` bucket used across the app (see payment.jsx). Every
   "I've Sent the Payment" confirmation must attach proof before it can submit.
   Files are namespaced by user id so proofs never collide or leak across
   accounts. ────────────────────────────────────────────────────────────────── */
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
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.nt, marginBottom: 6 }}>
        Payment Proof <span style={{ color: T.rd, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(required)</span>
      </div>
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 14px', borderRadius: 10, border: `1px dashed ${T.br2}`,
            background: T.s2, color: T.nt, fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
          }}
        >
          <Upload size={16} />
          Upload a screenshot of your payment (JPG/PNG, max {MAX_PROOF_SIZE_MB}MB)
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.br}`, background: T.s2 }}>
          {preview && (
            <img src={preview} alt="Payment proof preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: `1px solid ${T.br2}` }} />
          )}
          <div style={{ flex: 1, fontSize: 11, color: T.gr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <button type="button" onClick={onRemove} style={{ color: T.nt, display: 'flex' }}><X size={14} /></button>
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

/* ─── Design tokens (matches CopyTrading) ───────────────────────────────────── */
const T = {
  bg:  '#07101E', s:   '#0C1A2E', s2:  '#112238', br:  '#1C2C45', br2: '#2A3D5C',
  gr:  '#EEF2F7', nt:  '#8A9AB2', g:   '#E2AE4A', gd:  'rgba(226,174,74,.12)',
  bl:  '#5B8CFF', rd:  '#FF6470', gn:  '#34d399',  pr:  '#B49BFF',
  sans:"'Instrument Sans', system-ui, sans-serif",
  serif:"'Instrument Serif', serif",
  mono:"'Instrument Sans', system-ui, sans-serif",
};

/* ─── Default user_settings (matches DB defaults) ──────────────────────────── */
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

/* ─── Resolve system theme ──────────────────────────────────────────────────── */
function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/* ─── Build :root CSS vars from user_settings ────────────────────────────────
   Light theme maps to a slate/white palette; dark keeps the existing dark palette.
   accent_color drives --accent and all derived accent-* variables.
   layout_density maps to spacing/padding adjustments.             ─────────── */
function buildThemeVars(settings) {
  const s       = { ...DEFAULT_SETTINGS, ...settings };
  const theme   = resolveTheme(s.theme);
  const accent  = s.accent_color;

  // Parse accent hex → r,g,b for rgba derivations
  const hex2rgb = h => {
    const c = h.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return [r, g, b];
  };
  const [ar, ag, ab] = hex2rgb(accent);

  // Density → sidebar width + main padding
  const densityMap = {
    compact:     { sbW: '220px', mainPad: '16px 20px 32px', metricPad: '12px 16px', cardPad: '14px', gap: '10px' },
    comfortable: { sbW: '256px', mainPad: '24px 28px 40px', metricPad: '18px 20px', cardPad: '18px', gap: '14px' },
    spacious:    { sbW: '280px', mainPad: '32px 36px 56px', metricPad: '22px 24px', cardPad: '24px', gap: '18px' },
  };
  const d = densityMap[s.layout_density] || densityMap.comfortable;

  const dark = {
    '--bg':         '#07101E',
    '--surface':    '#0C1A2E',
    '--surface2':   '#112238',
    '--border':     '#1C2C45',
    '--border2':    '#2A3D5C',
    '--text':       '#EEF2F7',
    '--muted':      '#8A9AB2',
    '--faint':      '#56677F',
    '--input-bg':   '#112238',
  };
  const light = {
    '--bg':         '#EEF2F7',
    '--surface':    '#ffffff',
    '--surface2':   '#f8fafc',
    '--border':     '#D5DDE8',
    '--border2':    '#cbd5e1',
    '--text':       '#0B1628',
    '--muted':      '#64748b',
    '--faint':      '#94a3b8',
    '--input-bg':   '#f1f5f9',
  };

  const palette = theme === 'light' ? light : dark;

  return {
    ...palette,
    '--accent':       accent,
    '--accent-dim':   `rgba(${ar},${ag},${ab},.12)`,
    '--accent-glow':  `rgba(${ar},${ag},${ab},.06)`,
    '--accent-rgb':   `${ar},${ag},${ab}`,
    '--green':        '#34d399',
    '--green-dim':    'rgba(52,211,153,.12)',
    '--red':          '#FF6470',
    '--red-dim':      'rgba(248,113,113,.12)',
    '--blue':         '#5B8CFF',
    '--purple':       '#B49BFF',
    '--sidebar-w':    d.sbW,
    '--topbar-h':     '60px',
    '--density-pad':  d.mainPad,
    '--metric-pad':   d.metricPad,
    '--card-pad':     d.cardPad,
    '--grid-gap':     d.gap,
    '--sans':         "'Instrument Sans', system-ui, sans-serif",
    '--serif':        "'Instrument Serif', serif",
    '--mono':         "'Instrument Sans', system-ui, sans-serif",
    '--r-sm': '8px', '--r-md': '12px', '--r-lg': '16px',
  };
}

/* ─── Inject/update :root CSS vars ─────────────────────────────────────────── */
function applyThemeVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }

  :root {
    /* All values injected dynamically via applyThemeVars() from user_settings */
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
    --accent-rgb: 226,174,74;
    --green:      #34d399;
    --green-dim:  rgba(52,211,153,.12);
    --red:        #FF6470;
    --red-dim:    rgba(248,113,113,.12);
    --blue:       #5B8CFF;
    --purple:     #B49BFF;
    --sidebar-w:  256px;
    --topbar-h:   60px;
    --density-pad:  24px 28px 40px;
    --metric-pad:   18px 20px;
    --card-pad:     18px;
    --grid-gap:     14px;
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
  .mp-shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    grid-template-rows: 1fr;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .mp-sidebar {
    grid-column: 1;
    grid-row: 1;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    width: var(--sidebar-w);
    min-width: var(--sidebar-w);
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    z-index: 100;
    transition: transform .25s cubic-bezier(.4,0,.2,1);
    flex-shrink: 0;
  }
  .mp-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
  .mp-sidebar::after {
    content: '';
    position: absolute; top: 0; right: 0;
    width: 1px; height: 100%;
    background: linear-gradient(180deg, transparent 0%, var(--accent) 30%, var(--border) 60%, transparent 100%);
    opacity: .15; pointer-events: none;
  }

  /* Brand */
  .mp-brand {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .mp-brand-icon {
    width: 34px; height: 34px;
    background: var(--accent); border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .mp-brand-icon svg { width:18px; height:18px; color: #000; }
  .mp-brand-name { font-size: 16px; font-weight: 700; letter-spacing: -.3px; color: var(--text); }
  .mp-brand-name em { color: var(--accent); font-style: normal; }

  /* Portfolio pill */
  .mp-sb-pill {
    margin: 12px 16px;
    background: var(--accent-dim);
    border: 1px solid rgba(var(--accent-rgb),.18);
    border-radius: var(--r-md);
    padding: 10px 14px;
    flex-shrink: 0;
  }
  .mp-sb-pill-label {
    font-size: 10px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .mp-live-dot {
    width: 6px; height: 6px; background: var(--green);
    border-radius: 50%; animation: mp-pulse 2s infinite; flex-shrink: 0;
  }
  @keyframes mp-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .mp-sb-pill-val { font-family: var(--mono); font-size: 19px; font-weight: 600; color: var(--accent); letter-spacing: -.5px; }
  .mp-sb-pill-sub { font-size: 11px; color: var(--green); margin-top: 3px; }

  /* Nav links */
  .mp-sb-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
  .mp-sb-section {
    padding: 10px 20px 4px;
    font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.5px; color: var(--faint);
  }
  .mp-sb-link {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 20px; font-size: 13px; font-weight: 500;
    color: var(--muted); border-left: 2px solid transparent;
    transition: all .15s; cursor: pointer; position: relative;
    text-decoration: none;
  }
  .mp-sb-link svg { width:18px; height:18px; flex-shrink: 0; }
  .mp-sb-link:hover { color: var(--text); background: var(--accent-glow); border-left-color: var(--border2); }
  .mp-sb-link.active { color: var(--accent); background: var(--accent-dim); border-left-color: var(--accent); }
  .mp-sb-link.active svg { filter: drop-shadow(0 0 6px var(--accent)); }
  .mp-sb-badge {
    margin-left: auto; font-size: 9px; font-weight: 700;
    background: var(--accent); color: #000;
    padding: 2px 6px; border-radius: 5px; letter-spacing: .3px;
  }

  /* User block */
  .mp-sb-user {
    flex-shrink: 0; border-top: 1px solid var(--border);
    padding: 14px 16px; display: flex; align-items: center; gap: 10px; min-width: 0;
  }
  .mp-sb-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 0 12px rgba(var(--accent-rgb),.3);
  }
  .mp-sb-user-name { font-size: 13px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mp-sb-user-role { font-size: 10px; color: var(--accent); margin-top: 1px; }
  .mp-sb-link.logout { color: var(--red); width: 100%; background: none; border: none; }
  .mp-sb-link.logout:hover { background: var(--red-dim); border-left-color: var(--red); color: var(--red); }
  .mp-sb-link.logout svg { color: var(--red); }

  /* ── Profile dropdown ── */
  .mp-avatar-wrap { position: relative; display: inline-flex; }
  .mp-profile-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 190px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: mp-lang-fade .18s ease both;
  }
  .mp-profile-head {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px 10px; border-bottom: 1px solid var(--border); margin-bottom: 6px;
  }
  .mp-profile-head-name { font-size: 12px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mp-profile-head-role { font-size: 10px; color: var(--muted); margin-top: 1px; }
  .mp-profile-option {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: var(--r-sm);
    font-size: 12px; color: var(--muted); font-weight: 500;
    cursor: pointer; font-family: var(--sans);
    transition: background .12s, color .12s; text-decoration: none;
  }
  .mp-profile-option svg { width: 15px; height: 15px; flex-shrink: 0; }
  .mp-profile-option:hover { background: var(--surface2); color: var(--text); }
  .mp-profile-option.logout { color: var(--red); }
  .mp-profile-option.logout:hover { background: var(--red-dim); color: var(--red); }

  /* ── Right panel ── */
  .mp-right {
    grid-column: 2;
    display: flex; flex-direction: column;
    height: 100vh; height: 100dvh; overflow: hidden;
  }

  /* ── Topbar ── */
  .mp-topbar {
    height: var(--topbar-h); flex-shrink: 0;
    display: flex; align-items: center;
    padding: 0 28px; background: var(--surface);
    border-bottom: 1px solid var(--border); gap: 16px; z-index: 50;
  }
  .mp-topbar-title { font-family: var(--serif); font-size: 15px; color: var(--text); flex: 1; }
  .mp-topbar-title span { color: var(--accent); font-style: italic; }
  .mp-topbar-icon {
    width: 36px; height: 36px; border-radius: var(--r-sm);
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; color: var(--muted); font-size: 18px; position: relative;
  }
  .mp-topbar-icon:hover { border-color: var(--border2); color: var(--text); }
  .mp-notif-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; background: var(--red); border-radius: 50%;
    border: 1.5px solid var(--surface);
  }
  .mp-topbar-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, #78d000 100%);
    color: #000; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 0 10px rgba(var(--accent-rgb),.25);
  }
  .mp-hamburger {
    display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; flex-shrink: 0;
  }
  .mp-hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }
  .mp-topbar-actions { display: flex; align-items: center; gap: 16px; margin-left: auto; flex-shrink: 0; }

  /* ── Main ── */
  .mp-main {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: var(--density-pad);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 40px);
  }

  /* Page header */
  .mp-page-header {
    display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;
  }
  .mp-page-title {
    font-family: var(--serif); font-size: 28px; color: var(--text); line-height: 1.2;
  }
  .mp-page-title em { color: var(--accent); font-style: italic; }
  .mp-page-sub {
    font-size: 13px; color: var(--muted); margin-top: 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .mp-header-actions { display: flex; gap: 8px; }

  /* Buttons */
  .mp-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; border-radius: var(--r-sm);
    font-family: var(--sans); font-weight: 600;
    cursor: pointer; transition: all .15s;
    border: none; text-decoration: none; white-space: nowrap;
  }
  .mp-btn-sm  { font-size: 12px; padding: 7px 14px; }
  .mp-btn-accent { background: var(--accent); color: #000; }
  .mp-btn-accent:hover { opacity: .88; box-shadow: 0 0 20px rgba(var(--accent-rgb),.3); }
  .mp-btn-ghost {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); font-size: 12px; padding: 7px 14px;
  }
  .mp-btn-ghost:hover { border-color: var(--border2); }

  /* ── Metrics ── */
  .mp-metrics {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--grid-gap); margin-bottom: 20px;
  }
  .mp-metric {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: var(--metric-pad);
    position: relative; overflow: hidden;
    transition: border-color .2s, transform .2s;
  }
  .mp-metric:hover { border-color: var(--border2); transform: translateY(-1px); }
  .mp-metric::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
    opacity: .3;
  }
  .mp-metric-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .mp-metric-label {
    font-size: 10px; font-weight: 700; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;
  }
  .mp-metric-value {
    font-family: var(--mono); font-size: 20px; font-weight: 600;
    color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: -.5px;
  }
  .mp-metric-sub { font-size: 11px; color: var(--muted); }

  /* ── Controls bar ── */
  .mp-controls {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  }

  /* Tabs */
  .mp-tabs {
    display: flex; gap: 4px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px;
  }
  .mp-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: var(--r-sm); border: none; cursor: pointer;
    font-family: var(--sans); font-weight: 700; font-size: 12px;
    background: transparent; color: var(--muted);
    transition: all .15s; white-space: nowrap;
  }
  .mp-tab:hover { color: var(--text); }
  .mp-tab.active { background: var(--accent); color: #000; }
  .mp-tab svg { width:14px; height:14px; }
  .mp-tab-count {
    font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 99px;
  }

  /* Filters */
  .mp-filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .mp-select {
    background: var(--input-bg, var(--surface2)); border: 1px solid var(--border);
    color: var(--text); border-radius: var(--r-sm); padding: 7px 10px;
    font-size: 12px; font-family: var(--sans); cursor: pointer; outline: none;
    transition: border-color .15s;
  }
  .mp-select:hover { border-color: var(--border2); }

  /* ── Cards grid ── */
  .mp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--grid-gap); }
  .mp-grid-1 { display: grid; gap: var(--grid-gap); }

  /* ── Item Card ── */
  .mp-item-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: var(--card-pad); cursor: pointer;
    transition: all .18s; position: relative; overflow: hidden;
  }
  .mp-item-card:hover { background: var(--surface2); border-color: var(--border2); transform: translateY(-1px); }
  .mp-item-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .mp-item-card-left { display: flex; align-items: center; gap: 12px; }
  .mp-item-icon {
    width: 42px; height: 42px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    color: #000; flex-shrink: 0;
  }
  .mp-item-name { font-family: var(--serif); font-size: 15px; font-weight: 600; margin-bottom: 2px; }
  .mp-item-tag { font-size: 11px; color: var(--muted); }
  .mp-item-desc { font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 14px; }
  .mp-item-stats {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    border-top: 1px solid var(--border); padding-top: 12px; margin-bottom: 12px;
  }
  .mp-stat-val { font-family: var(--mono); font-size: 13px; font-weight: 700; text-align: center; }
  .mp-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; text-align: center; }
  .mp-markets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .mp-market-tag {
    font-size: 10px; font-weight: 600; padding: 3px 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; color: var(--muted);
  }
  .mp-item-footer {
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid var(--border); padding-top: 12px;
  }
  .mp-price { font-family: var(--mono); font-size: 18px; font-weight: 700; color: var(--accent); }
  .mp-per { font-size: 11px; color: var(--muted); margin-left: 3px; }
  .mp-delivery { font-size: 11px; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; gap: 5px; }

  /* Badge */
  .mp-badge {
    font-size: 10px; font-weight: 700; font-family: var(--sans);
    padding: 2px 8px; border-radius: 4px; white-space: nowrap; letter-spacing: .2px;
  }
  .mp-badge-green { background: rgba(52,211,153,.13); color: #34d399; }
  .mp-badge-blue  { background: rgba(96,165,250,.13); color: #5B8CFF; }
  .mp-badge-gold  { background: rgba(226,174,74,.13); color: #E2AE4A; }
  .mp-badge-red   { background: rgba(248,113,113,.13); color: #FF6470; }
  .mp-badge-purple { background: rgba(167,139,250,.13); color: #B49BFF; }
  .mp-badge-amber { background: rgba(245,158,11,.13); color: #f59e0b; }

  /* ── Active Subscriptions row ── */
  .mp-active-row {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); overflow: hidden; margin-bottom: 20px;
  }
  .mp-active-head {
    padding: 14px 20px; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
  }
  .mp-active-title { font-family: var(--serif); font-size: 16px; }
  .mp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .mp-table th {
    text-align: left; padding: 9px 16px;
    color: var(--muted); font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .7px;
    border-bottom: 1px solid var(--border); background: var(--surface2);
  }
  .mp-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .mp-table tr:last-child td { border-bottom: none; }
  .mp-table tr:hover td { background: var(--surface2); }
  /* When show_grid_lines is false, hide column separators */
  .mp-table.no-grid-lines td,
  .mp-table.no-grid-lines th { border-bottom: none; }
  .mp-table.no-grid-lines tr:last-child td { border-bottom: none; }
  .mp-table.no-grid-lines tbody tr { border-bottom: 1px solid var(--border); }
  .mp-table-manage-btn {
    background: transparent; border: 1px solid var(--border);
    color: var(--text); border-radius: 7px; padding: 6px 14px;
    font-size: 11px; font-weight: 700; font-family: var(--sans); cursor: pointer;
    transition: all .15s;
  }
  .mp-table-manage-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Section intro */
  .mp-section-intro {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-md); padding: 12px 16px; margin-bottom: 16px;
    font-size: 12px; color: var(--muted); line-height: 1.6;
  }
  .mp-section-intro strong { color: var(--text); }

  /* Modal */
  .mp-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 600; padding: 16px;
  }
  .mp-modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
    width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto;
    padding: 24px; position: relative;
  }
  .mp-modal-close {
    position: absolute; top: 14px; right: 14px;
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); border-radius: 8px;
    width: 28px; height: 28px; cursor: pointer; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s;
  }
  .mp-modal-close:hover { border-color: var(--red); color: var(--red); }
  .mp-modal-stats {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
    margin-bottom: 20px; background: var(--surface2); border-radius: 10px; padding: 14px;
  }
  .mp-modal-stat-val { font-family: var(--mono); font-size: 16px; font-weight: 700; text-align: center; }
  .mp-modal-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 3px; text-align: center; }
  .mp-input-label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 6px; font-weight: 600; }
  .mp-input {
    width: 100%; background: var(--input-bg, var(--surface2)); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 10px 12px; font-size: 13px; color: var(--text);
    font-family: var(--sans); outline: none; transition: border-color .15s;
  }
  .mp-input:focus { border-color: var(--accent); }
  .mp-order-summary {
    background: var(--surface2); border-radius: 10px; padding: 14px; margin-bottom: 16px;
    font-size: 12px;
  }
  .mp-order-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0;
  }
  .mp-order-row-label { color: var(--muted); }
  .mp-order-total {
    border-top: 1px solid var(--border); padding-top: 10px; margin-top: 6px;
    display: flex; justify-content: space-between;
    font-weight: 700; font-size: 13px;
  }
  .mp-disclaimer {
    background: rgba(200,175,76,.06); border: 1px solid rgba(200,175,76,.18);
    border-radius: var(--r-sm); padding: 10px; margin-bottom: 16px;
    font-size: 11px; color: var(--muted); line-height: 1.5;
  }
  .mp-success-ring {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--accent-dim); border: 2px solid var(--accent);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px; color: var(--accent);
  }

  /* ── Language switcher ── */
  .lang-switcher { position: relative; display: inline-flex; align-items: center; }
  .lang-btn {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); width: 36px; height: 36px;
    cursor: pointer; font-family: var(--sans);
    transition: border-color .15s, color .15s; color: var(--muted);
  }
  .lang-btn:hover { border-color: var(--border2); color: var(--text); }
  .lang-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r-md); padding: 6px;
    min-width: 176px; z-index: 400;
    box-shadow: 0 16px 40px rgba(0,0,0,.75);
    animation: mp-lang-fade .18s ease both;
  }
  @keyframes mp-lang-fade {
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
    .mp-main > * { max-width: 1440px; margin-left: auto; margin-right: auto; }
  }
  @media (max-width: 1100px) { .mp-metrics { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 768px) {
    .mp-shell { grid-template-columns: 1fr !important; }
    .mp-sidebar {
      position: fixed !important; top: 0 !important; left: 0 !important;
      transform: translateX(-100%) !important; z-index: 300 !important;
    }
    .mp-sidebar.open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,.6) !important; }
    .mp-right { grid-column: 1; }
    .mp-hamburger { display: flex; }
    .mp-grid-3 { grid-template-columns: 1fr 1fr; }
    .mp-metrics { grid-template-columns: repeat(2, 1fr); }
    .mp-topbar { gap: 8px; }
    .mp-topbar-title { font-size: 13px; }
  }
  @media (max-width: 600px) {
    .mp-grid-3 { grid-template-columns: 1fr; }
    .mp-main { padding: 16px; padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 28px); }
    .mp-topbar { padding: 0 12px; gap: 6px; }
    .mp-topbar-actions { gap: 10px; }
    .mp-metrics { grid-template-columns: 1fr 1fr; }
    .mp-page-header { flex-direction: column; align-items: stretch; gap: 12px; }
    .mp-profile-dropdown { right: -12px; }
  }
  @media (max-width: 420px) {
    .mp-topbar-title { display: none; }
    .mp-topbar-actions { gap: 8px; }
    .mp-metrics { gap: 10px; }
    .mp-metric { padding: 14px 12px; }
    .mp-metric-value { font-size: 17px; }
  }
`;

/* ─── All data comes from Supabase — no hardcoded constants ── */

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
   The page keeps its own layout classes (mp-sidebar, mp-topbar) so its
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
const DK_ACTIVE = 'market';
const DK_TITLE  = 'Marketplace';
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
    <aside className={`mp-sidebar dk-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
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
    <header className="mp-topbar dk-topbar">
      <button className="mp-hamburger dk-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
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

/* Visual layer: palette, type and component polish for the mp- page */
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
.mp-page-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.4vw,46px) !important; line-height: 1.05 !important; letter-spacing: -.01em !important; color: var(--text); }
.mp-page-title em, .mp-page-title span { font-style: normal; color: var(--text) !important; }
.mp-page-sub { font-size: 15px !important; color: var(--muted) !important; margin-top: 8px; }

/* Buttons */
.mp-btn { border-radius: 10px !important; font-family: inherit !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.mp-btn-accent { background: var(--accent) !important; color: #07101E !important; border: 1px solid transparent !important; }
.mp-btn-accent:hover { filter: brightness(1.07); }
.mp-btn-ghost { background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text) !important; }
.mp-btn-ghost:hover { background: var(--surface) !important; }

/* Cards and metrics */
.mp-metric, .mp-card, .mp-trader-card, .mp-copying-card, .mp-item-card, .mp-lb-wrap, .mp-plan-card,
.fc-card, .pr-card, .ev-card, .eco-side-card, .fc-table-wrap {
  border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -36px rgba(0,0,0,.6);
}
.mp-trader-card, .mp-item-card, .mp-copying-card { transition: border-color .15s, transform .2s; }
.mp-trader-card:hover, .mp-item-card:hover { border-color: var(--border2) !important; transform: translateY(-2px); }
.mp-metric-label { font-size: 13.5px !important; color: var(--muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-family: inherit !important; }
.mp-metric-value { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-weight: 600 !important; font-size: 26px !important; letter-spacing: -.01em; }
.mp-metric-sub { font-size: 13px !important; color: var(--muted) !important; font-family: inherit !important; }
.mp-metric-icon { border-radius: 10px !important; }

/* Tabs, selects, inputs */
.mp-tabs { background: var(--surface) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; padding: 4px !important; }
.mp-tab { border-radius: 9px !important; font-family: inherit !important; font-weight: 600 !important; color: var(--muted); }
.mp-tab.active { background: var(--accent) !important; color: #07101E !important; }
.mp-select, .mp-input, .mp-filter-select, .mp-login-input {
  border-radius: 10px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: inherit !important;
}
.mp-select:focus, .mp-input:focus, .mp-filter-select:focus, .mp-login-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); outline: none; }

/* Tables */
.mp-table th, .fc-table-head { font-family: inherit !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; color: var(--faint) !important; }
.mp-table td { font-variant-numeric: tabular-nums; }

/* Badges */
[class^="mp-badge"], [class*=" mp-badge"] { border-radius: 7px !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0 !important; text-transform: none !important; }

/* Modals */
.mp-modal-overlay, .mp-upgrade-overlay { background: rgba(3,8,16,.7) !important; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.mp-modal, .mp-upgrade-modal { border-radius: 20px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8) !important; }

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
.mp-live-dot { background: var(--green) !important; }

/* Mono labels become calm sentence-case text */
[class*="-lbl"], [class*="-label"] { letter-spacing: 0 !important; }
`;

function MetricCard({ m }) {
  return (
    <div className="mp-metric">
      <div className="mp-metric-icon" style={{ background: m.iconBg, color: m.iconColor }}>
        <m.icon size={16} />
      </div>
      <div className="mp-metric-label">{m.label}</div>
      <div className="mp-metric-value">{m.value}</div>
      <div className="mp-metric-sub">{m.sub}</div>
    </div>
  );
}

/* ── Item cards — driven entirely by the DB row ── */
function BotCard({ item, onActivate, symbol = '$', fxRate = 1 }) {
  const [hovered, setHovered] = useState(false);
  const roi      = item.roi_12m_pct != null ? `+${parseFloat(item.roi_12m_pct).toFixed(1)}%` : '—';
  const winRate  = item.win_rate_pct != null ? `${parseFloat(item.win_rate_pct).toFixed(1)}%` : '—';
  const trades   = item.total_trades != null ? item.total_trades.toLocaleString() : '—';
  return (
    <div className="mp-item-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {item.badge_label && (
        <span className={`mp-badge mp-badge-${item.badge_type || 'gold'}`}
          style={{ position: 'absolute', top: 14, right: 14 }}>
          {item.badge_label}
        </span>
      )}
      <div className="mp-item-card-top">
        <div className="mp-item-card-left">
          <div className="mp-item-icon" style={{ background: item.color_hex || T.g }}>
            <DbIcon cls={item.icon_class || 'ti-robot'} size={20} />
          </div>
          <div>
            <div className="mp-item-name">{item.name}</div>
            <div className="mp-item-tag">{item.tag}</div>
          </div>
        </div>
      </div>
      <p className="mp-item-desc">{item.description}</p>
      <div className="mp-item-stats">
        <div><div className="mp-stat-val" style={{ color: T.gn }}>{roi}</div><div className="mp-stat-lbl">12m ROI</div></div>
        <div><div className="mp-stat-val">{trades}</div><div className="mp-stat-lbl">Trades</div></div>
        <div><div className="mp-stat-val">{winRate}</div><div className="mp-stat-lbl">Win Rate</div></div>
      </div>
      <div className="mp-markets">
        {(item.markets || []).map(m => <span key={m} className="mp-market-tag">{m}</span>)}
      </div>
      <div className="mp-item-footer">
        <div>
          <span className="mp-price">{symbol}{(parseFloat(item.price_monthly) * fxRate).toFixed(2)}</span>
          <span className="mp-per">/month</span>
        </div>
        <button className="mp-btn mp-btn-accent mp-btn-sm" onClick={() => onActivate(item, 'bot')}>
          <PlayCircle size={13} /> Activate
        </button>
      </div>
    </div>
  );
}

function SignalCard({ item, onSubscribe, symbol = '$', fxRate = 1 }) {
  const roi      = item.roi_12m_pct != null ? `+${parseFloat(item.roi_12m_pct).toFixed(1)}%` : '—';
  const accuracy = item.accuracy_pct != null ? `${parseFloat(item.accuracy_pct).toFixed(1)}%` : '—';
  const subs     = item.subscriber_count != null ? `${item.subscriber_count.toLocaleString()}+` : '—';
  return (
    <div className="mp-item-card">
      {item.badge_label && (
        <span className={`mp-badge mp-badge-${item.badge_type || 'blue'}`}
          style={{ position: 'absolute', top: 14, right: 14 }}>
          {item.badge_label}
        </span>
      )}
      <div className="mp-item-card-top">
        <div className="mp-item-card-left">
          <div className="mp-item-icon" style={{ background: item.color_hex || T.bl }}>
            <DbIcon cls={item.icon_class || 'ti-broadcast'} size={20} />
          </div>
          <div>
            <div className="mp-item-name">{item.name}</div>
            <div className="mp-item-tag">{item.tag}</div>
          </div>
        </div>
      </div>
      <p className="mp-item-desc">{item.description}</p>
      <div className="mp-item-stats">
        <div><div className="mp-stat-val" style={{ color: T.gn }}>{roi}</div><div className="mp-stat-lbl">12m ROI</div></div>
        <div><div className="mp-stat-val">{subs}</div><div className="mp-stat-lbl">Subscribers</div></div>
        <div><div className="mp-stat-val">{accuracy}</div><div className="mp-stat-lbl">Accuracy</div></div>
      </div>
      <div className="mp-markets">
        {(item.markets || []).map(m => <span key={m} className="mp-market-tag">{m}</span>)}
      </div>
      {item.delivery_method && (
        <div className="mp-delivery"><Send size={11} /> Delivered via {item.delivery_method}</div>
      )}
      <div className="mp-item-footer">
        <div>
          <span className="mp-price">{symbol}{(parseFloat(item.price_monthly) * fxRate).toFixed(2)}</span>
          <span className="mp-per">/month</span>
        </div>
        <button className="mp-btn mp-btn-accent mp-btn-sm" onClick={() => onSubscribe(item, 'signal')}>
          <BellRing size={13} /> Subscribe
        </button>
      </div>
    </div>
  );
}

/* ── Active Subscriptions — fetched from marketplace_subscriptions JOIN marketplace_items ── */
function ActiveSubscriptions({ userId, refreshKey, userSettings = DEFAULT_SETTINGS, symbol = '$', fxRate = 1 }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true); setErr('');
      const { data, error } = await supabase
        .from('marketplace_subscriptions')
        .select(`
          id, status, pnl_30d, renews_at, started_at,
          marketplace_items (
            id, name, type, price_monthly
          )
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'paused'])
        .order('started_at', { ascending: false });

      setLoading(false);
      if (error) { setErr(error.message); return; }
      setSubs(data || []);
    };
    load();
  }, [userId, refreshKey]);

  const fmtDate = ts => ts
    ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  return (
    <div className="mp-active-row">
      <div className="mp-active-head">
        <div className="mp-active-title"><em style={{ fontStyle: 'italic', color: T.g }}>Active</em> Subscriptions</div>
        <a href="#" className="mp-btn mp-btn-ghost mp-btn-sm"><Settings size={13} /> Manage All</a>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: T.nt, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={18} /> Loading subscriptions…
        </div>
      ) : err ? (
        <div style={{ padding: '14px 20px', color: T.rd, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> {err}
        </div>
      ) : subs.length === 0 ? (
        <div style={{ padding: '28px', textAlign: 'center', color: T.nt, fontSize: 13 }}>
          No active subscriptions yet. Browse bots, signal plans, and trading tools below.
        </div>
      ) : (
        <table className={`mp-table${userSettings.show_grid_lines === false ? ' no-grid-lines' : ''}`}>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Status</th>
              <th>P&amp;L (30D)</th><th>Renews</th><th>Price</th><th></th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => {
              const item    = s.marketplace_items;
              const isBot   = item?.type === 'bot';
              const isTool  = item?.type === 'tool';
              const typeLabel = isBot ? 'Bot' : isTool ? 'Tool' : 'Signal';
              const typeBadge = isBot ? 'gold' : isTool ? 'purple' : 'blue';
              const pnl     = parseFloat(s.pnl_30d || 0) * fxRate;
              const pnlStr  = pnl !== 0 ? (pnl > 0 ? `+${symbol}${pnl.toLocaleString()}` : `-${symbol}${Math.abs(pnl).toLocaleString()}`) : '—';
              const pnlPos  = pnl >= 0;
              const statusCls = s.status === 'active' ? (isBot ? 'green' : 'blue') : 'amber';
              const statusLbl = s.status === 'active' ? (isBot ? 'Running' : 'Active') : 'Paused';
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{item?.name || '—'}</td>
                  <td><span className={`mp-badge mp-badge-${typeBadge}`}>{typeLabel}</span></td>
                  <td><span className={`mp-badge mp-badge-${statusCls}`}>{statusLbl}</span></td>
                  <td style={{ fontFamily: T.mono, color: pnlPos ? T.gn : T.rd }}>{pnlStr}</td>
                  <td style={{ color: T.nt }}>{fmtDate(s.renews_at)}</td>
                  <td style={{ fontFamily: T.mono }}>{symbol}{(parseFloat(item?.price_monthly || 0) * fxRate).toFixed(2)}/mo</td>
                  <td><button className="mp-table-manage-btn">Manage</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Subscribe / Activate modal — 3-step: confirm → payment → success ── */
function ToolCard({ item, onSubscribe, symbol = '$', fxRate = 1 }) {
  const users  = item.subscriber_count != null ? `${item.subscriber_count.toLocaleString()}+` : '—';
  const rating = item.accuracy_pct != null ? `${parseFloat(item.accuracy_pct).toFixed(1)}%` : '—';
  return (
    <div className="mp-item-card">
      {item.badge_label && (
        <span className={`mp-badge mp-badge-${item.badge_type || 'purple'}`}
          style={{ position: 'absolute', top: 14, right: 14 }}>
          {item.badge_label}
        </span>
      )}
      <div className="mp-item-card-top">
        <div className="mp-item-card-left">
          <div className="mp-item-icon" style={{ background: item.color_hex || T.pr }}>
            <DbIcon cls={item.icon_class || 'ti-tool'} size={20} />
          </div>
          <div>
            <div className="mp-item-name">{item.name}</div>
            <div className="mp-item-tag">{item.tag}</div>
          </div>
        </div>
      </div>
      <p className="mp-item-desc">{item.description}</p>
      <div className="mp-item-stats">
        <div><div className="mp-stat-val">{users}</div><div className="mp-stat-lbl">Active Users</div></div>
        <div><div className="mp-stat-val">{rating}</div><div className="mp-stat-lbl">Satisfaction</div></div>
      </div>
      <div className="mp-markets">
        {(item.markets || []).map(m => <span key={m} className="mp-market-tag">{m}</span>)}
      </div>
      {item.delivery_method && (
        <div className="mp-delivery"><Send size={11} /> Access via {item.delivery_method}</div>
      )}
      <div className="mp-item-footer">
        <div>
          <span className="mp-price">{symbol}{(parseFloat(item.price_monthly) * fxRate).toFixed(2)}</span>
          <span className="mp-per">/month</span>
        </div>
        <button className="mp-btn mp-btn-accent mp-btn-sm" onClick={() => onSubscribe(item, 'tool')}>
          <Wrench size={13} /> Unlock
        </button>
      </div>
    </div>
  );
}

function SubscribeModal({ item, type, onClose, userId, onSuccess, symbol = '$', fxRate = 1 }) {
  const [step,           setStep]           = useState(1);
  const [saving,         setSaving]         = useState(false);
  const [saveErr,        setSaveErr]        = useState('');

  // Platform crypto deposit wallets
  const [cryptoWallets,  setCryptoWallets]  = useState([]);
  const [cryptoLoading,  setCryptoLoading]  = useState(false);

  // Payment UI
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [copied,         setCopied]         = useState(false);
  const [paying,         setPaying]         = useState(false);
  const [payErr,         setPayErr]         = useState('');
  const [proofFile,      setProofFile]      = useState(null);
  const [proofPreview,   setProofPreview]   = useState(null);

  // Success receipt
  const [receipt,        setReceipt]        = useState(null);

  const isBot       = type === 'bot';
  const isTool      = type === 'tool';
  const annualPrice = parseFloat(item.price_monthly || 0) * 12;

  const roi      = item.roi_12m_pct  != null ? `+${parseFloat(item.roi_12m_pct).toFixed(1)}%`  : '—';
  const winRate  = item.win_rate_pct != null ? `${parseFloat(item.win_rate_pct).toFixed(1)}%`  : '—';
  const trades   = item.total_trades != null ? item.total_trades.toLocaleString()               : '—';
  const accuracy = item.accuracy_pct != null ? `${parseFloat(item.accuracy_pct).toFixed(1)}%`  : '—';
  const subs     = item.subscriber_count != null ? `${item.subscriber_count.toLocaleString()}+` : '—';

  const stats = isBot
    ? [{ label: '12m ROI', val: roi, color: T.gn }, { label: 'Trades', val: trades, color: T.gr }, { label: 'Win Rate', val: winRate, color: T.gr }]
    : isTool
    ? [{ label: 'Active Users', val: subs, color: T.gr }, { label: 'Satisfaction', val: accuracy, color: T.gr }]
    : [{ label: '12m ROI', val: roi, color: T.gn }, { label: 'Subscribers', val: subs, color: T.gr }, { label: 'Accuracy', val: accuracy, color: T.gr }];

  /* ── Step 1 → 2: check existing sub, load wallet + crypto options ── */
  const handleConfirm = async () => {
    if (!userId) { setSaveErr('You must be logged in to subscribe.'); return; }
    setSaving(true); setSaveErr('');

    const { data: existing } = await supabase
      .from('marketplace_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', item.id)
      .in('status', ['active', 'paused'])
      .maybeSingle();

    if (existing) {
      setSaveErr('You already have an active subscription for this item.');
      setSaving(false);
      return;
    }
    setSaving(false);

    // Fetch platform crypto deposit addresses only
    setCryptoLoading(true);
    const { data: crypto } = await supabase
      .from('platform_crypto_wallets')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false });
    setCryptoLoading(false);

    setCryptoWallets(crypto || []);
    const def = (crypto || []).find(c => c.is_default) || (crypto || [])[0];
    if (def) setSelectedCrypto(def);
    setStep(2);
  };

  /* ── Crypto pay: requires proof, uploads it, records pending tx, creates sub ── */
  const handleCryptoPay = async () => {
    if (!selectedCrypto) return;
    if (!proofFile) { setPayErr('Please upload a screenshot of your payment before confirming.'); return; }
    setPaying(true); setPayErr('');

    try {
      const proofUrl = await uploadPaymentProof(proofFile, userId, `marketplace-${item.id}`);

      await supabase.from('transactions').insert({
        user_id:     userId,
        type:        'marketplace_purchase',
        amount:      -annualPrice,
        fee:         0,
        net_amount:  -annualPrice,              // required by transactions.net_amount (NOT NULL)
        currency:    'USD',
        description: `Annual ${isBot ? 'bot' : 'signal'} plan: ${item.name} — awaiting ${selectedCrypto.symbol} deposit`,
        status:      'pending',
        proof_url:   proofUrl,
      });

      await _createSub();
      setReceipt({ method: selectedCrypto.symbol, amount: `$${annualPrice.toFixed(2)} equiv.`, crypto: selectedCrypto });
      onSuccess();
      setStep(3);
    } catch (err) {
      setPayErr(err.message ?? 'Something went wrong. Please contact support.');
    } finally {
      setPaying(false);
    }
  };

  const handleProofSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPayErr('');
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
  };
  const handleProofRemove = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
  };
  useEffect(() => () => { if (proofPreview) URL.revokeObjectURL(proofPreview); }, [proofPreview]);

  /* ── Shared: insert marketplace_subscriptions row ── */
  const _createSub = async () => {
    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);
    await supabase.from('marketplace_subscriptions').insert({
      user_id:   userId,
      item_id:   item.id,
      status:    'pending',
      pnl_30d:   0,
      renews_at: renewsAt.toISOString(),
    });
  };

  const copyAddress = () => {
    if (!selectedCrypto?.address) return;
    navigator.clipboard.writeText(selectedCrypto.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };



  /* ── Step indicator shared ── */
  const StepBar = ({ active }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: active === 1 ? T.g : T.gn, color: '#000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {active > 1 ? <Check size={11} /> : '1'}
        </div>
        <span style={{ fontSize: 11, fontWeight: active === 1 ? 700 : 400, color: active === 1 ? T.g : T.nt }}>Confirm</span>
      </div>
      <div style={{ flex: 1, height: 1, background: active > 1 ? T.g : T.br }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: active === 2 ? T.g : active > 2 ? T.gn : T.br, color: active >= 2 ? '#000' : T.nt, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {active > 2 ? <Check size={11} /> : '2'}
        </div>
        <span style={{ fontSize: 11, fontWeight: active === 2 ? 700 : 400, color: active === 2 ? T.g : T.nt }}>Payment</span>
      </div>
    </div>
  );

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <button className="mp-modal-close" onClick={onClose}>✕</button>

        {/* ════════════════ STEP 1: Plan Confirmation ════════════════ */}
        {step === 1 && (
          <>
            <StepBar active={1} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div className="mp-item-icon" style={{ background: item.color_hex || T.g, width: 50, height: 50, borderRadius: 13 }}>
                <DbIcon cls={item.icon_class || 'ti-robot'} size={22} />
              </div>
              <div>
                <div style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: T.nt }}>{item.tag}</span>
                  {item.badge_label && <span className={`mp-badge mp-badge-${item.badge_type || 'gold'}`}>{item.badge_label}</span>}
                </div>
              </div>
            </div>

            <div className="mp-modal-stats">
              {stats.map(({ label, val, color }) => (
                <div key={label}>
                  <div className="mp-modal-stat-val" style={{ color }}>{val}</div>
                  <div className="mp-modal-stat-lbl">{label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: T.nt, marginBottom: 20, lineHeight: 1.6, padding: '10px 12px', background: T.s2, borderRadius: 8 }}>
              {item.description}
            </div>

            <div className="mp-order-summary">
              <div className="mp-order-row">
                <span className="mp-order-row-label">{isBot ? 'Bot plan' : isTool ? 'Tool plan' : 'Signal plan'}</span>
                <span>{item.name}</span>
              </div>
              <div className="mp-order-row">
                <span className="mp-order-row-label">Billing</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Annual
                  <span style={{ fontSize: 10, background: 'rgba(226,174,74,.15)', color: T.g, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>1 YEAR</span>
                </span>
              </div>
              {!isBot && item.delivery_method && (
                <div className="mp-order-row">
                  <span className="mp-order-row-label">Delivery</span><span>{item.delivery_method}</span>
                </div>
              )}
              <div className="mp-order-row" style={{ opacity: .65 }}>
                <span className="mp-order-row-label">Monthly rate</span>
                <span style={{ fontFamily: T.mono }}>{symbol}{(parseFloat(item.price_monthly) * fxRate).toFixed(2)}/mo</span>
              </div>
              <div className="mp-order-row" style={{ opacity: .65 }}>
                <span className="mp-order-row-label">× 12 months</span>
                <span style={{ fontFamily: T.mono }}>= {symbol}{(annualPrice * fxRate).toFixed(2)}</span>
              </div>
              <div className="mp-order-total">
                <span>Annual total</span>
                <span style={{ color: T.g, fontFamily: T.mono }}>{symbol}{(annualPrice * fxRate).toFixed(2)}</span>
              </div>
            </div>

            {saveErr && (
              <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: T.rd, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={13} /> {saveErr}
              </div>
            )}
            <div className="mp-disclaimer">
              <Info size={13} style={{ color: T.g, verticalAlign: -2, marginRight: 5 }} />
              {isBot
                ? 'Automated bots involve risk. Past performance does not guarantee future results.'
                : isTool
                ? 'Tool access renews automatically at the end of each billing period.'
                : 'Signal accuracy is historical and does not guarantee future results.'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="mp-btn mp-btn-ghost mp-btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="mp-btn mp-btn-accent mp-btn-sm"
                style={{ flex: 1, padding: '10px 0', fontWeight: 700, fontSize: 13 }}
                onClick={handleConfirm} disabled={saving}>
                {saving
                  ? <><Loader2 size={14} /> Checking…</>
                  : isBot ? 'Confirm & Activate →' : isTool ? 'Confirm & Unlock →' : 'Confirm & Subscribe →'}
              </button>
            </div>
          </>
        )}

        {/* ════════════════ STEP 2: Payment ════════════════ */}
        {step === 2 && (
          <>
            <StepBar active={2} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(226,174,74,.12)', border: '1px solid rgba(226,174,74,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bitcoin size={18} style={{ color: T.g }} />
              </div>
              <div>
                <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600 }}>Crypto Deposit</div>
                <div style={{ fontSize: 11, color: T.nt, marginTop: 2 }}>
                  Send <span style={{ fontFamily: T.mono, color: T.g, fontWeight: 700 }}>${annualPrice.toFixed(2)}</span> equivalent to activate your 1-year {isBot ? 'bot' : isTool ? 'tool' : 'signal'} plan
                </div>
              </div>
            </div>

            {/* Crypto coin selector */}
            <>
              <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.nt, marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8 }}>Select coin</div>
                  {cryptoLoading ? (
                    <div style={{ color: T.nt, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={14} /> Loading…</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {cryptoWallets.map(cw => {
                        const active = selectedCrypto?.id === cw.id;
                        return (
                          <button key={cw.id}
                            onClick={() => setSelectedCrypto(cw)}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9,
                              background: active ? `${cw.color}22` : T.s2,
                              border: `1px solid ${active ? cw.color : T.br}`,
                              cursor: 'pointer', transition: 'all .15s', fontFamily: T.sans }}>
                            <DbIcon cls={cw.icon} size={16} style={{ color: cw.color }} />
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: active ? cw.color : T.gr }}>{cw.symbol}</div>
                              <div style={{ fontSize: 10, color: T.nt }}>{cw.name}</div>
                            </div>
                          </button>
                        );
                      })}
                      {cryptoWallets.length === 0 && (
                        <div style={{ fontSize: 12, color: T.nt }}>No crypto wallets configured.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected crypto deposit details */}
                {selectedCrypto && (
                  <div style={{ background: T.s2, border: `1px solid ${T.br}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.br}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${selectedCrypto.color}22`, border: `1px solid ${selectedCrypto.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DbIcon cls={selectedCrypto.icon} size={18} style={{ color: selectedCrypto.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.gr }}>{selectedCrypto.name}</div>
                        <div style={{ fontSize: 11, color: T.nt }}>{selectedCrypto.network}</div>
                      </div>
                      {selectedCrypto.is_default && (
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, background: 'rgba(226,174,74,.12)', color: T.g, padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(226,174,74,.2)' }}>DEFAULT</span>
                      )}
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 700, color: T.nt, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Deposit Address</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg, borderRadius: 8, border: `1px solid ${T.br}`, padding: '10px 12px', marginBottom: 12 }}>
                      <div style={{ flex: 1, fontFamily: T.mono, fontSize: 11, color: T.gr, wordBreak: 'break-all', lineHeight: 1.5 }}>
                        {selectedCrypto.address}
                      </div>
                      <button
                        onClick={copyAddress}
                        style={{ flexShrink: 0, background: copied ? 'rgba(52,211,153,.15)' : T.s2, border: `1px solid ${copied ? T.gn : T.br}`, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: copied ? T.gn : T.nt, fontFamily: T.sans, fontSize: 11, fontWeight: 600, transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>

                    <div style={{ background: 'rgba(226,174,74,.05)', border: '1px solid rgba(226,174,74,.12)', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: T.nt, lineHeight: 1.6 }}>
                      <Info size={12} style={{ color: T.g, marginRight: 5, verticalAlign: -2 }} />
                      Send exactly <span style={{ fontFamily: T.mono, color: T.g, fontWeight: 700 }}>${annualPrice.toFixed(2)}</span> equivalent in <strong style={{ color: T.gr }}>{selectedCrypto.symbol}</strong> to this address. Your plan activates once the deposit is confirmed.
                    </div>
                  </div>
                )}

                {payErr && (
                  <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.rd, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={13} /> {payErr}
                  </div>
                )}

                {/* Payment proof — required before "I've Sent the Payment" can be clicked */}
                <PaymentProofField
                  file={proofFile}
                  preview={proofPreview}
                  onSelect={handleProofSelect}
                  onRemove={handleProofRemove}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="mp-btn mp-btn-ghost mp-btn-sm" style={{ padding: '10px 16px' }} onClick={() => setStep(1)} disabled={paying}>
                    <ArrowLeft size={16} />
                  </button>
                  <button className="mp-btn mp-btn-accent mp-btn-sm"
                    style={{ flex: 1, padding: '10px 0', fontWeight: 700, fontSize: 13, opacity: selectedCrypto && proofFile ? 1 : .4 }}
                    onClick={handleCryptoPay} disabled={paying || !selectedCrypto || !proofFile}>
                    {paying ? <><Loader2 size={14} /> Submitting…</> : <><Send size={13} /> I've Sent the Payment →</>}
                  </button>
                </div>
            </>

            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: T.nt, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ShieldCheck size={12} style={{ color: T.gn }} />
              Secured · encrypted platform
            </div>
          </>
        )}

        {/* ════════════════ STEP 3: Success ════════════════ */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="mp-success-ring"><Check size={22} /></div>
            <div style={{ fontFamily: T.serif, fontSize: 20, marginBottom: 8 }}>
              {isBot ? 'Bot Purchase Under Verification' : 'Subscription Under Verification'}
            </div>
            <p style={{ fontSize: 13, color: T.nt, marginBottom: 12, lineHeight: 1.6 }}>
              <strong style={{ color: T.gr }}>{item.name}</strong> will start {isBot
                ? 'running on your connected exchange account'
                : 'sending signals to your dashboard'} once your payment is confirmed.
            </p>
            {receipt && (
              <div style={{ background: T.s2, border: `1px solid ${T.br}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 12, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: T.nt }}>Amount</span>
                  <span style={{ fontFamily: T.mono, color: T.g, fontWeight: 700 }}>{receipt.amount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: T.nt }}>Method</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    {receipt.crypto
                      ? <><DbIcon cls={receipt.crypto.icon} size={14} style={{ color: receipt.crypto.color }} />{receipt.method}</>
                      : <><Wallet size={14} style={{ color: T.gn }} />{receipt.method}</>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.nt }}>Duration</span>
                  <span style={{ fontWeight: 600 }}>1 Year</span>
                </div>
                {receipt.crypto && (
                  <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(96,165,250,.07)', border: '1px solid rgba(96,165,250,.2)', borderRadius: 8, fontSize: 11, color: T.bl, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} />
                    Crypto deposits confirm within 1–3 hours. Your plan will activate once verified.
                  </div>
                )}
              </div>
            )}
            <button className="mp-btn mp-btn-accent mp-btn-sm"
              style={{ padding: '10px 28px', fontWeight: 700 }} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────────── */
export default function Marketplace() {
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab,         setTab]         = useState('bots');
  const [modal,       setModal]       = useState(null);
  const [modalType,   setModalType]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy,      setSortBy]      = useState('roi');
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [fxRate,      setFxRate]      = useState(1);

  // user_settings from DB — applied as CSS vars on :root
  const [userSettings, setUserSettings] = useState(DEFAULT_SETTINGS);

  // Keep sortBy in sync with personalised_feed preference
  const settingsApplied = useRef(false);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  // marketplace_items fetched from DB
  const [bots,        setBots]        = useState([]);
  const [signals,     setSignals]     = useState([]);
  const [tools,       setTools]       = useState([]);
  const [itemsLoading,setItemsLoading]= useState(true);
  const [itemsErr,    setItemsErr]    = useState('');

  // metrics derived from marketplace_subscriptions
  const [metrics, setMetrics] = useState([
    { label: 'Active Subs',   value: '—', sub: 'Loading…',       icon: Layers,       iconBg: 'rgba(226,174,74,.12)',  iconColor: '#E2AE4A' },
    { label: 'Monthly Spend', value: '—', sub: 'Calculating…',   icon: CreditCard,   iconBg: 'rgba(96,165,250,.12)',  iconColor: '#5B8CFF' },
    { label: 'Bot P&L (30D)', value: '—', sub: 'Awaiting data',  icon: TrendingUp,   iconBg: 'rgba(52,211,153,.12)',  iconColor: '#34d399' },
    { label: 'Total Items',   value: '—', sub: 'In marketplace', icon: Radio,        iconBg: 'rgba(167,139,250,.12)', iconColor: '#B49BFF' },
  ]);

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const uid = session.user.id;
        const [{ data: profile }, { data: wallet }, { data: settings }] = await Promise.all([
          supabase.from('users').select('id, first_name, last_name, handle, plan, is_verified, currency').eq('id', uid).single(),
          supabase.from('wallets').select('balance').eq('user_id', uid).eq('currency', 'USD').maybeSingle(),
          supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
        ]);
        if (profile) {
          const balanceUsd = parseFloat(wallet?.balance ?? 0);
          const rate = await getUsdRate(profile.currency);
          setFxRate(rate);
          setUser({ ...profile, balance: balanceUsd * rate });
        }
        if (settings) {
          setUserSettings(s => ({ ...s, ...settings }));
          // Apply personalised_feed preference to default sort (only on first load)
          if (!settingsApplied.current) {
            settingsApplied.current = true;
            setSortBy(settings.personalised_feed ? 'roi' : 'price');
          }
        }
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Apply user_settings → CSS vars on :root ── */
  useEffect(() => {
    const vars = buildThemeVars(userSettings);
    applyThemeVars(vars);

    // If theme is 'system', re-apply when OS preference changes
    if (userSettings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyThemeVars(buildThemeVars(userSettings));
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [userSettings]);

  /* ── Fetch marketplace_items from DB ── */
  useEffect(() => {
    const load = async () => {
      setItemsLoading(true); setItemsErr('');
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          id, slug, type, name, tag, description, price_monthly,
          badge_label, badge_type, icon_class, color_hex,
          delivery_method, markets, roi_12m_pct, win_rate_pct,
          total_trades, accuracy_pct, subscriber_count, is_active
        `)
        .eq('is_active', true)
        .order('subscriber_count', { ascending: false });

      setItemsLoading(false);
      if (error) { setItemsErr(error.message); return; }
      setBots((data || []).filter(i => i.type === 'bot'));
      setSignals((data || []).filter(i => i.type === 'signal'));
      setTools((data || []).filter(i => i.type === 'tool'));
    };
    load();
  }, []);

  /* ── Metrics from marketplace_subscriptions ── */
  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    const sym = currencySymbol(user?.currency);
    const { data: subs } = await supabase
      .from('marketplace_subscriptions')
      .select(`
        status, pnl_30d, renews_at,
        marketplace_items ( type, price_monthly )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'paused']);

    const rows       = subs || [];
    const totalSubs  = rows.length;
    const botRows    = rows.filter(s => s.marketplace_items?.type === 'bot');
    const sigRows    = rows.filter(s => s.marketplace_items?.type === 'signal');
    const totalSpend = rows.reduce((a, r) => a + parseFloat(r.marketplace_items?.price_monthly || 0), 0) * fxRate;
    const botPnl     = botRows.reduce((a, r) => a + parseFloat(r.pnl_30d || 0), 0) * fxRate;
    const pnlSign    = botPnl >= 0 ? '+' : '';
    const renewDates = rows.map(r => r.renews_at).filter(Boolean).sort();
    const nextRenew  = renewDates[0]
      ? new Date(renewDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—';

    setMetrics([
      { label: 'Active Subs',   value: `${totalSubs}`,    sub: `${botRows.length} bot${botRows.length !== 1 ? 's' : ''} · ${sigRows.length} signal${sigRows.length !== 1 ? 's' : ''}`, icon: Layers,       iconBg: 'rgba(226,174,74,.12)',  iconColor: '#E2AE4A' },
      { label: 'Monthly Spend', value: `${sym}${totalSpend.toLocaleString()}`, sub: `Renews ${nextRenew}`,       icon: CreditCard,   iconBg: 'rgba(96,165,250,.12)',  iconColor: '#5B8CFF' },
      { label: 'Bot P&L (30D)', value: botPnl !== 0 ? `${pnlSign}${sym}${Math.abs(botPnl).toLocaleString()}` : `${sym}0`, sub: botRows.length > 0 ? 'Across active bots' : 'No active bots', icon: TrendingUp,   iconBg: 'rgba(52,211,153,.12)',  iconColor: '#34d399' },
      { label: 'Total Items',   value: `${bots.length + signals.length + tools.length}`, sub: `${bots.length} bots · ${signals.length} signals · ${tools.length} tools`, icon: Radio,        iconBg: 'rgba(167,139,250,.12)', iconColor: '#B49BFF' },
    ]);
  }, [user, bots, signals, tools, fxRate]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics, refreshKey]);

  const sort = (arr) => [...arr].sort((a, b) => sortBy === 'price'
    ? parseFloat(a.price_monthly) - parseFloat(b.price_monthly)
    : parseFloat(b.roi_12m_pct || 0) - parseFloat(a.roi_12m_pct || 0));

  const openModal  = (item, type) => { setModal(item); setModalType(type); };
  const closeModal = () => { setModal(null); setModalType(null); };
  const handleSuccess = () => setRefreshKey(k => k + 1);
  const handleLogout  = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  };

  if (authLoading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07101E', color: '#64748b', fontSize: 14, gap: 10 }}>
        <Loader2 size={20} /> Loading…
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 299 }} />
      )}
      <div className="mp-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="mp-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} />
          <main className="mp-main">
            <div className="mp-page-header">
              <div>
                <div className="mp-page-title"><em>Marketplace</em></div>
                <div className="mp-page-sub">
                  <span className="mp-live-dot" />
                  Automate your edge — deploy bots and subscribe to expert signal plans.
                </div>
              </div>
              
            </div>

            <div className="mp-metrics">
              {metrics.map(m => <MetricCard key={m.label} m={m} />)}
            </div>

            <ActiveSubscriptions userId={user?.id} refreshKey={refreshKey} userSettings={userSettings} symbol={currencySymbol(user?.currency)} fxRate={fxRate} />

            <div className="mp-controls">
              <div className="mp-tabs">
                {[
                  { key: 'bots',    label: 'Trading Bots',  Icon: Bot,     count: bots.length },
                  { key: 'signals', label: 'Signal Plans',  Icon: Radio,   count: signals.length },
                  { key: 'tools',   label: 'Trading Tools', Icon: Wrench,  count: tools.length },
                ].map(({ key, label, Icon, count }) => (
                  <button key={key} className={`mp-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                    <Icon size={14} />{label}
                    <span className="mp-tab-count" style={{
                      background: tab === key ? 'rgba(0,0,0,.2)' : 'rgba(52,211,153,.2)',
                      color: tab === key ? '#000' : T.gn,
                    }}>{count}</span>
                  </button>
                ))}
              </div>
              <div className="mp-filters">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="mp-select">
                  <option value="roi">Sort: ROI</option>
                  <option value="price">Sort: Price</option>
                </select>
              </div>
            </div>

            {/* Loading / error state for items */}
            {itemsLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: T.nt, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={20} /> Loading marketplace…
              </div>
            ) : itemsErr ? (
              <div style={{ padding: '16px', color: T.rd, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {itemsErr}
              </div>
            ) : (
              <>
                {tab === 'bots' && (
                  <>
                    <div className="mp-section-intro">
                      <strong>Trading Bots</strong> run 24/7 on your connected exchange account.
                      Set your capital allocation and let the bot execute — no manual intervention needed.
                    </div>
                    <div className="mp-grid-3">
                      {sort(bots).map(b => <BotCard key={b.id} item={b} onActivate={openModal} symbol={currencySymbol(user?.currency)} fxRate={fxRate} />)}
                      {bots.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: T.nt, padding: 40 }}>No bots available right now.</div>}
                    </div>
                  </>
                )}
                {tab === 'signals' && (
                  <>
                    <div className="mp-section-intro">
                      <strong>Signal Plans</strong> deliver trade alerts with entry, stop-loss, and take-profit levels
                      straight to your app, Telegram, or email. You decide which signals to execute.
                    </div>
                    <div className="mp-grid-3">
                      {sort(signals).map(s => <SignalCard key={s.id} item={s} onSubscribe={openModal} symbol={currencySymbol(user?.currency)} fxRate={fxRate} />)}
                      {signals.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: T.nt, padding: 40 }}>No signal plans available right now.</div>}
                    </div>
                  </>
                )}
                {tab === 'tools' && (
                  <>
                    <div className="mp-section-intro">
                      <strong>Trading Tools</strong> — screeners, calculators, and analytics utilities to sharpen your
                      research and risk management. Unlock access with a monthly subscription.
                    </div>
                    <div className="mp-grid-3">
                      {sort(tools).map(tl => <ToolCard key={tl.id} item={tl} onSubscribe={openModal} symbol={currencySymbol(user?.currency)} fxRate={fxRate} />)}
                      {tools.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: T.nt, padding: 40 }}>No trading tools available right now.</div>}
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {modal && (
        <SubscribeModal
          item={modal}
          type={modalType}
          onClose={closeModal}
          userId={user?.id}
          onSuccess={handleSuccess}
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
