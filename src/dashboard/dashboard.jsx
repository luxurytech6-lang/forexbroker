import { useState, useEffect, useRef } from "react";
import supabase from "../supabase";
import IdentityBanner from "../account/IdentityBanner";
import {
  LayoutDashboard, Copy, Users, TrendingUp, Bot, CandlestickChart,
  CreditCard, UserCircle, ShieldCheck, Settings, Headset, Building2, Pickaxe, Wallet as Wallet2, WalletCards,
  Search, Bell, LogOut, Download, Plus, ChevronRight, ArrowUpRight,
  Rocket, Crown, Zap, Leaf, CircleCheck, LineChart,
} from "lucide-react";


/* ─── Apply saved appearance settings from localStorage / user_settings ──────── */
function applyAppearance(s = null) {
  try {
    const data = s || JSON.parse(localStorage.getItem('tf_appearance') || '{}');
    if (!data || !Object.keys(data).length) return;
    const root = document.documentElement;

    // Accent colour
    if (data.accent_color || data.accentColor) {
      const hex = (data.accent_color || data.accentColor).replace('#', '');
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
      const accent = data.accent_color || data.accentColor;
      root.style.setProperty('--accent',      accent);
      root.style.setProperty('--accent-dim',  `rgba(${r},${g},${b},.12)`);
      root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},.06)`);
    }

    // Theme
    const theme = data.theme || 'dark';
    const effective = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    root.dataset.theme = effective;
    if (effective === 'light') {
      root.style.setProperty('--bg',       '#EEF2F7');
      root.style.setProperty('--surface',  '#ffffff');
      root.style.setProperty('--surface2', '#F4F7FB');
      root.style.setProperty('--border',   '#D5DDE8');
      root.style.setProperty('--border2',  '#B7C3D3');
      root.style.setProperty('--text',     '#0B1628');
      root.style.setProperty('--muted',    '#4A5970');
      root.style.setProperty('--faint',    '#8090A6');
    } else {
      root.style.setProperty('--bg',       '#07101E');
      root.style.setProperty('--surface',  '#0C1A2E');
      root.style.setProperty('--surface2', '#112238');
      root.style.setProperty('--border',   '#1C2C45');
      root.style.setProperty('--border2',  '#2A3D5C');
      root.style.setProperty('--text',     '#EEF2F7');
      root.style.setProperty('--muted',    '#8A9AB2');
      root.style.setProperty('--faint',    '#56677F');
    }

    // Density
    const density = data.layout_density || data.density || 'comfortable';
    const mainPad = { compact: '16px 20px 32px', comfortable: '24px 28px 40px', spacious: '32px 36px 56px' };
    document.querySelectorAll('.db-main, .in-main, .sb-main').forEach(el => {
      el.style.padding = mainPad[density] || mainPad.comfortable;
    });
  } catch (_) {}
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

// ─── Design Tokens & Global CSS — "Global Desk" ─────────────────────────────
// Every colour is a CSS variable so the user's theme / accent settings
// (applied by applyAppearance) keep working in light and dark mode.
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');

:root {
  --bg: #07101E; --surface: #0C1A2E; --surface2: #112238; --border: #1C2C45; --border2: #2A3D5C;
  --text: #EEF2F7; --muted: #8A9AB2; --faint: #56677F;
  --accent: #E2AE4A; --accent-dim: rgba(226,174,74,.14); --accent-glow: rgba(226,174,74,.07);
  --green: #2FD394; --green-dim: rgba(47,211,148,.12);
  --red: #FF6470;   --red-dim: rgba(255,100,112,.12);
  --blue: #5B8CFF;  --blue-dim: rgba(91,140,255,.14);
  --purple: #B49BFF; --teal: #36C2B4;
  --serif: 'Instrument Serif', Georgia, 'Times New Roman', serif;
  --sans: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: 'Instrument Sans', system-ui, sans-serif;
  --radius: 16px; --sb-w: 264px;
  --shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -32px rgba(0,0,0,.6);
}
:root[data-theme="light"] {
  --green: #0F8F5F; --green-dim: rgba(15,143,95,.10);
  --red: #C8373F;   --red-dim: rgba(200,55,63,.10);
  --blue: #3D6FE0;  --blue-dim: rgba(61,111,224,.10);
  --shadow: 0 1px 2px rgba(11,22,40,.04), 0 24px 48px -36px rgba(11,22,40,.35);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; color: inherit; }
svg { flex-shrink: 0; }
.num, .mono-val { font-variant-numeric: tabular-nums; }
.up { color: var(--green); } .dn { color: var(--red); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }

.shell { display: flex; min-height: 100vh; }
.right-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; margin-left: var(--sb-w); }

/* ── Sidebar ── */
.sidebar {
  position: fixed; inset: 0 auto 0 0; width: var(--sb-w); z-index: 200;
  display: flex; flex-direction: column; background: var(--surface); border-right: 1px solid var(--border);
  transition: transform .3s cubic-bezier(.22,1,.36,1);
}
.brand { height: 68px; display: flex; align-items: center; padding: 0 22px; border-bottom: 1px solid var(--border); }
.brand img { height: 34px; width: auto; }
.sb-scroll { flex: 1; overflow-y: auto; padding: 14px 12px; scrollbar-width: thin; }
.sb-section { font-size: 12px; font-weight: 600; color: var(--faint); padding: 14px 12px 6px; }
.sb-link {
  position: relative; display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 9px 12px; border-radius: 10px; font-size: 14.5px; font-weight: 500; color: var(--muted);
  background: none; border: none; cursor: pointer; text-align: left; transition: background .15s, color .15s;
}
.sb-link svg { width: 18px; height: 18px; }
.sb-link:hover { background: var(--surface2); color: var(--text); }
.sb-link.active { background: var(--surface2); color: var(--text); font-weight: 600; }
.sb-link.active::before { content: ''; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent); }
.sb-link.active svg { color: var(--accent); }
.sb-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); }
.sb-logout-link:hover { color: var(--red); }

.sb-plan { margin: 0 12px 12px; padding: 14px; border-radius: 14px; border: 1px solid var(--border); background: linear-gradient(160deg, var(--surface2), var(--surface)); }
.sb-plan-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sb-plan-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--plan-badge-bg); color: var(--plan-badge-color); }
.sb-plan-badge svg { width: 13px; height: 13px; }
.sb-plan-label { font-size: 14px; font-weight: 600; }
.sb-plan-sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.sb-plan-upgrade { margin-top: 12px; width: 100%; height: 36px; border-radius: 9px; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 13.5px; font-weight: 600; background: var(--accent); color: #07101E; }
.sb-plan-upgrade svg { width: 15px; height: 15px; }
.sb-plan-current { margin-top: 10px; display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--green); }
.sb-plan-current svg { width: 14px; height: 14px; }

.sb-user { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--border); }
.avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13.5px; font-weight: 700; background: linear-gradient(145deg, #1C3A6E, #07101E); color: #E2AE4A; border: 1px solid var(--border2); }
.sb-user-name { font-size: 14px; font-weight: 600; line-height: 1.3; }
.sb-user-role { font-size: 12.5px; color: var(--muted); }
.sb-backdrop { display: none; }

/* ── Topbar ── */
.topbar {
  position: sticky; top: 0; z-index: 100; height: 68px; display: flex; align-items: center; gap: 12px;
  padding: 0 28px; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}
.topbar-hamburger { display: none; flex-direction: column; gap: 4px; padding: 8px; cursor: pointer; background: none; border: none; }
.topbar-hamburger span { width: 20px; height: 2px; border-radius: 1px; background: var(--text); }
.topbar-search { flex: 1; max-width: 440px; display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 14px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--muted); }
.topbar-search:focus-within { border-color: var(--accent); }
.topbar-search svg { width: 17px; height: 17px; }
.topbar-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font-family: inherit; font-size: 14.5px; }
.topbar-search input::placeholder { color: var(--faint); }
.topbar-search kbd { font-family: inherit; font-size: 12px; padding: 2px 7px; border-radius: 6px; border: 1px solid var(--border2); color: var(--faint); }
.topbar-spacer { flex: 1; }
.icon-btn { position: relative; width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--muted); border: 1px solid transparent; transition: background .15s, color .15s; }
.icon-btn:hover { background: var(--surface); color: var(--text); border-color: var(--border); }
.icon-btn svg { width: 19px; height: 19px; }
.notif-dot { position: absolute; top: 10px; right: 11px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--bg); }
.profile-menu { position: relative; }
.topbar-avatar { cursor: pointer; }
.profile-dropdown, .lang-dropdown {
  position: absolute; right: 0; top: calc(100% + 8px); z-index: 300; min-width: 220px; padding: 6px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 24px 48px -16px rgba(0,0,0,.5);
  animation: dIn .16s ease both;
}
.profile-dropdown-header { padding: 10px 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.profile-dropdown-name { font-weight: 600; font-size: 14.5px; }
.profile-dropdown-email { font-size: 13px; color: var(--muted); }
.profile-dropdown-item, .lang-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: var(--muted); cursor: pointer; background: none; border: none; text-align: left; }
.profile-dropdown-item svg { width: 16px; height: 16px; }
.profile-dropdown-item:hover, .lang-option:hover { background: var(--surface2); color: var(--text); }
.profile-dropdown-item.logout:hover { color: var(--red); }
.lang-switcher { position: relative; }
.lang-btn { height: 42px; padding: 0 12px; border-radius: 10px; display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border); color: var(--muted); cursor: pointer; font-size: 14px; }
.lang-btn:hover { color: var(--text); border-color: var(--border2); }
.lang-section-label { font-size: 12px; font-weight: 600; color: var(--faint); padding: 6px 12px; }
.lang-option.active { color: var(--text); background: var(--accent-dim); font-weight: 600; }

/* ── Ticker ── */
.ticker { height: 38px; overflow: hidden; display: flex; align-items: center; border-bottom: 1px solid var(--border); background: var(--surface); }
.ticker-track { display: inline-flex; white-space: nowrap; animation: tick 70s linear infinite; }
.ticker:hover .ticker-track { animation-play-state: paused; }
.ticker-item { display: inline-flex; align-items: center; gap: 8px; padding: 0 22px; font-size: 13.5px; color: var(--muted); border-right: 1px solid var(--border); font-variant-numeric: tabular-nums; }
.t-sym { color: var(--text); font-weight: 600; }
.t-up { color: var(--green); font-weight: 600; } .t-dn { color: var(--red); font-weight: 600; }

/* ── Main ── */
.main { padding: 28px 28px 48px; max-width: 1480px; width: 100%; margin: 0 auto; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
.page-greeting { font-family: var(--serif); font-weight: 400; font-size: clamp(32px,3.2vw,44px); line-height: 1.05; letter-spacing: -.01em; }
.page-sub { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; font-size: 14.5px; color: var(--muted); }
.mkt-pill { display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 13px; font-weight: 600; background: var(--surface); border: 1px solid var(--border); color: var(--text); }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 0 var(--green); animation: live 2s ease-out infinite; }
.live-dot.off { background: var(--faint); animation: none; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 18px; border-radius: 10px; font-size: 14.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, color .15s; }
.btn svg { width: 16px; height: 16px; }
.btn-sm { height: 36px; padding: 0 14px; font-size: 13.5px; }
.btn-accent { background: var(--accent); color: #07101E; }
.btn-accent:hover { filter: brightness(1.07); }
.btn-ghost { background: transparent; border-color: var(--border2); color: var(--text); }
.btn-ghost:hover { background: var(--surface); }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; box-shadow: var(--shadow); min-width: 0; }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }
.card-sub { font-size: 13.5px; color: var(--muted); margin-top: 2px; }
.card-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13.5px; font-weight: 600; color: var(--muted); }
.card-link:hover { color: var(--accent); }
.card-link svg { width: 15px; height: 15px; }

/* Hero: net worth + performance */
.hero {
  position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(260px,.8fr) minmax(0,1.6fr); gap: 32px;
  padding: 26px 26px 20px; margin-bottom: 20px;
  background: radial-gradient(120% 140% at 100% 0%, var(--accent-glow) 0%, transparent 55%), var(--surface);
}
.hero-lbl { font-size: 14px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
.hero-val { font-family: var(--serif); font-size: clamp(44px,4.6vw,64px); line-height: 1.05; letter-spacing: -.01em; margin-top: 6px; font-variant-numeric: tabular-nums; }
.hero-val small { font-size: .5em; color: var(--muted); }
.hero-chg { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 14.5px; font-weight: 600; padding: 4px 10px; border-radius: 8px; }
.hero-chg.up { background: var(--green-dim); } .hero-chg.dn { background: var(--red-dim); }
.hero-split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 26px; padding-top: 18px; border-top: 1px solid var(--border); }
.hero-split div span { display: block; font-size: 13px; color: var(--muted); }
.hero-split div strong { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.seg-tabs { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); }
.seg-tab { height: 30px; padding: 0 12px; border-radius: 7px; font-size: 13px; font-weight: 600; color: var(--muted); background: none; border: none; cursor: pointer; }
.seg-tab.active { background: var(--surface2); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.chart-wrap { position: relative; height: 210px; margin-top: 8px; }
.chart-wrap svg { width: 100%; height: 100%; overflow: visible; }
.chart-tip { position: absolute; top: 0; transform: translateX(-50%); pointer-events: none; padding: 6px 10px; border-radius: 8px; background: var(--bg); border: 1px solid var(--border2); font-size: 12.5px; white-space: nowrap; }
.chart-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--faint); margin-top: 6px; }

/* KPI strip */
.kpis { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-bottom: 20px; }
.kpi { padding: 18px 20px; }
.kpi-top { display: flex; align-items: center; justify-content: space-between; }
.kpi-lbl { font-size: 13.5px; color: var(--muted); }
.kpi-ico { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: var(--surface2); color: var(--muted); }
.kpi-ico svg { width: 16px; height: 16px; }
.kpi-val { font-size: 26px; font-weight: 600; letter-spacing: -.01em; margin-top: 10px; font-variant-numeric: tabular-nums; }
.kpi-note { font-size: 13px; color: var(--muted); margin-top: 2px; }
.ring { width: 44px; height: 44px; }

/* Main grid */
.dashboard-grid { display: grid; grid-template-columns: minmax(0,1fr) 360px; gap: 20px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

/* Products */
.products { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; }
.product { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); transition: border-color .15s, transform .15s; min-height: 148px; }
.product:hover { border-color: var(--border2); transform: translateY(-2px); }
.product-ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.product-ico svg { width: 18px; height: 18px; }
.product-name { font-size: 14.5px; font-weight: 600; }
.product-val { font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: auto; }
.product-note { font-size: 13px; color: var(--muted); min-height: 2.9em; }
.product .go { position: absolute; top: 14px; right: 14px; width: 16px; height: 16px; color: var(--faint); }

/* Table */
.table-wrap { overflow-x: auto; margin: 0 -22px; -webkit-overflow-scrolling: touch; }
.dt { width: 100%; border-collapse: collapse; font-size: 14px; }
.dt th { text-align: left; font-size: 12.5px; font-weight: 600; color: var(--faint); padding: 0 22px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.dt td { padding: 14px 22px; border-bottom: 1px solid var(--border); white-space: nowrap; font-variant-numeric: tabular-nums; }
.dt tr:last-child td { border-bottom: none; }
.dt tbody tr:hover td { background: var(--surface2); }
.dt th.r, .dt td.r { text-align: right; }
.asset-cell { display: flex; align-items: center; gap: 12px; }
.asset-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: var(--surface2); border: 1px solid var(--border2); color: var(--accent); }
.asset-name { font-weight: 600; }
.badge { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 7px; font-size: 12.5px; font-weight: 700; text-transform: capitalize; }
.badge-buy, .badge-open { background: var(--green-dim); color: var(--green); }
.badge-sell { background: var(--red-dim); color: var(--red); }
.badge-closed { background: var(--surface2); color: var(--muted); }
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 28px 12px 12px; color: var(--muted); font-size: 14px; }
.empty strong { color: var(--text); font-size: 15px; }

/* Allocation donut */
.alloc { display: flex; align-items: center; gap: 20px; }
.alloc-legend { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.alloc-row { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.alloc-row i { width: 10px; height: 10px; border-radius: 3px; }
.alloc-row b { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; }

/* Lists */
.list-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.list-row:last-child { border-bottom: none; padding-bottom: 0; }
.list-row:first-child { padding-top: 0; }
.list-name { font-size: 14.5px; font-weight: 600; line-height: 1.3; }
.list-sub { font-size: 13px; color: var(--muted); }
.list-end { margin-left: auto; text-align: right; font-variant-numeric: tabular-nums; }
.list-end strong { display: block; font-size: 14.5px; }
.mini-bar { height: 4px; border-radius: 2px; background: var(--surface2); margin-top: 6px; overflow: hidden; }
.mini-bar span { display: block; height: 100%; border-radius: 2px; }

/* Real estate card */
.re-card { padding: 0; overflow: hidden; }
.re-art { height: 132px; position: relative; }
.re-art svg { width: 100%; height: 100%; display: block; }
.re-body { padding: 18px 22px 22px; }
.re-new { position: absolute; top: 12px; left: 12px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: var(--accent); color: #07101E; }

.quick-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); font-size: 14px; font-weight: 600; transition: border-color .15s; }
.quick-btn:hover { border-color: var(--accent); }
.quick-btn svg { width: 18px; height: 18px; color: var(--accent); }

.disclaimer { font-size: 12.5px; color: var(--faint); margin-top: 28px; text-align: center; }

/* Bottom nav (mobile) */
.bottom-nav { display: none; }

@keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes live { 0% { box-shadow: 0 0 0 0 rgba(47,211,148,.5); } 100% { box-shadow: 0 0 0 8px rgba(47,211,148,0); } }
@keyframes dIn  { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.main > * { animation: rise .6s cubic-bezier(.22,1,.36,1) both; }
.main > *:nth-child(2) { animation-delay: .05s; } .main > *:nth-child(3) { animation-delay: .1s; } .main > *:nth-child(4) { animation-delay: .15s; }

@media (max-width: 1280px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .dashboard-grid > .col:last-child { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 1100px) {
  .products { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .kpis { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 960px) {
  .right-panel { margin-left: 0; }
  .sidebar { transform: translateX(-100%); box-shadow: none; }
  .sidebar.open { transform: none; box-shadow: 30px 0 60px rgba(0,0,0,.4); }
  .sb-backdrop { display: block; position: fixed; inset: 0; z-index: 150; background: rgba(3,8,16,.55); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .sb-backdrop.open { opacity: 1; pointer-events: auto; }
  .topbar-hamburger { display: flex; }
  .topbar { padding: 0 16px; }
  .hero { grid-template-columns: 1fr; gap: 12px; }
}
@media (max-width: 760px) {
  .main { padding: 20px 16px 104px; }
  .topbar-search { display: none; }
  .hide-sm { display: none !important; }
  .dashboard-grid > .col:last-child { display: flex; }
  .card { padding: 18px; }
  .table-wrap { margin: 0 -18px; }
  .dt th, .dt td { padding-left: 18px; padding-right: 18px; }
  .hero { padding: 20px 18px 16px; }
  .chart-wrap { height: 170px; }
  .kpi-val { font-size: 22px; }
  .header-actions { width: 100%; }
  .header-actions .btn { flex: 1; }
  .bottom-nav {
    display: grid; grid-template-columns: repeat(5,1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 120;
    padding: 8px 6px calc(8px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-top: 1px solid var(--border);
  }
  .bn-item { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 11.5px; font-weight: 600; color: var(--muted); padding: 4px 0; }
  .bn-item svg { width: 21px; height: 21px; }
  .bn-item.active { color: var(--accent); }
}
@media (max-width: 480px) {
  .products, .quick-list { grid-template-columns: 1fr 1fr; }
  .kpis { gap: 10px; }
  .kpi { padding: 14px; }
}
@supports (padding-top: env(safe-area-inset-top)) {
  .topbar { padding-top: env(safe-area-inset-top); height: calc(68px + env(safe-area-inset-top)); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
body { top: 0 !important; }
.skiptranslate { display: none !important; }
`;

// ─── Static Data ──────────────────────────────────────────────────────────────

/* ─── FIFO buy/sell matching for stock_orders ─────────────────────────────────
 * Given all filled stock_orders for a user (any symbol), match each sell against
 * the oldest unmatched buys for that symbol (FIFO) to compute realized P&L per
 * closed lot, plus how many shares (if any) remain open per symbol.
 * Returns: { realizedPnl, wins, losses, openLots }
 *   - realizedPnl: total realized P&L across all matched sell lots
 *   - wins / losses: count of matched sell lots that were profitable / not
 *   - openLots: number of symbols still holding a net positive quantity (i.e. open stock positions)
 */
function computeStockFifo(orders) {
  const bySymbol = {};
  for (const o of orders) {
    if (o.status !== 'filled') continue;
    const sym = o.symbol;
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(o);
  }

  let realizedPnl = 0;
  let wins = 0;
  let losses = 0;
  let openLots = 0;

  for (const sym of Object.keys(bySymbol)) {
    const rows = [...bySymbol[sym]].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const buyQueue = [];

    for (const row of rows) {
      const price = Number(row.filled_price ?? row.limit_price ?? 0);
      let qty = Number(row.quantity ?? 0);

      if (row.side === 'buy') {
        buyQueue.push({ qty, price });
      } else if (row.side === 'sell') {
        let lotPnl = 0;
        while (qty > 0 && buyQueue.length) {
          const lot = buyQueue[0];
          const matched = Math.min(lot.qty, qty);
          lotPnl += matched * (price - lot.price);
          lot.qty -= matched;
          qty -= matched;
          if (lot.qty <= 0) buyQueue.shift();
        }
        realizedPnl += lotPnl;
        if (lotPnl > 0) wins += 1;
        else if (lotPnl < 0) losses += 1;
      }
    }

    const remaining = buyQueue.reduce((s, l) => s + l.qty, 0);
    if (remaining > 0.0000001) openLots += 1;
  }

  return { realizedPnl, wins, losses, openLots };
}

const TICKER_ITEMS = [
  { sym:'BTC/USD', val:'$67,420', pct:'+2.3%', up:true },
  { sym:'ETH/USD', val:'$3,840',  pct:'+1.8%', up:true },
  { sym:'S&P 500', val:'5,248',   pct:'-0.4%', up:false },
  { sym:'GOLD',    val:'$2,314',  pct:'+0.9%', up:true },
  { sym:'NVDA',    val:'$892',    pct:'+3.1%', up:true },
  { sym:'SOL/USD', val:'$168',    pct:'+4.7%', up:true },
  { sym:'BNB/USD', val:'$602',    pct:'+1.2%', up:true },
  { sym:'XRP/USD', val:'$0.58',   pct:'+0.8%', up:true },
  { sym:'EUR/USD', val:'1.0862',  pct:'-0.1%', up:false },
  { sym:'OIL',     val:'$82.40',  pct:'+0.5%', up:true },
];

// ─── Language Switcher ───────────────────────────────────────────────────────
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
const MP_ITEMS = [
  { Icon:Bot,        name:'AlphaGrid',  tag:'Grid bot',       roi:'+41.2%', price:'$29/mo', color:'var(--accent)' },
  { Icon:Bot,        name:'MomentumX',  tag:'Trend bot',      roi:'+28.7%', price:'$19/mo', color:'var(--blue)' },
  { Icon:TrendingUp, name:'CryptoEdge', tag:'Signal service', roi:'+55.1%', price:'$39/mo', color:'var(--purple)' },
];

// ─── Navigation ──────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { title:'Overview', links:[
    { href:'/dashboard',    Icon:LayoutDashboard,  label:'Dashboard', active:true },
  ]},
  { title:'Invest', links:[
    { href:'/stocks',       Icon:LineChart,        label:'Stocks' },
    { href:'/copy-trading', Icon:Copy,             label:'Copy Trading' },
    { href:'/hire-trader',  Icon:Users,            label:'Hire a Trader' },
    { href:'/real-estate',  Icon:Building2,        label:'Real Estate', badge:'NEW' },
    { href:'/mining',       Icon:Pickaxe,          label:'Mining',      badge:'NEW' },
    { href:'/terminal',     Icon:CandlestickChart, label:'Terminal' },
  ]},
  { title:'Discover', links:[
    { href:'/market-place', Icon:Bot,              label:'Marketplace' },
    { href:'/insights',     Icon:TrendingUp,       label:'Insights' },
  ]},
];
const ACCOUNT_LINKS = [
  { href:'/payments', Icon:CreditCard, label:'Payments' },
  { href:'/cards',    Icon:WalletCards, label:'Cards' },
  { href:'/profile',  Icon:UserCircle, label:'Profile'  },
  { href:'/verify-identity', Icon:ShieldCheck, label:'Verify identity' },
  { href:'/settings', Icon:Settings,   label:'Settings' },
  { href:'/support',  Icon:Headset,    label:'Support'  },
];

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
      <button className="lang-btn" onClick={() => setOpen(o => !o)} aria-label="Change language" aria-expanded={open}>
        <span>{active.flag}</span><span className="hide-sm">{active.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-dropdown" role="menu">
          <div className="lang-section-label">Language</div>
          {LANGUAGES.map(l => (
            <button key={l.code} role="menuitem" className={"lang-option" + (l.code === current ? " active" : "")} onClick={() => select(l.code)}>
              <span style={{ fontSize:15 }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === current && <span style={{ marginLeft:"auto", fontSize:11 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const initialsOf = (user) => user ? (`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || '?') : '?';
const nameOf     = (user) => user ? ([user.first_name, user.last_name].filter(Boolean).join(' ') || user.email) : '—';
const money = (sym, n, d = 2) => `${Number(n) < 0 ? '−' : ''}${sym}${Math.abs(Number(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })}`;
const signed = (sym, n, d = 2) => `${Number(n) >= 0 ? '+' : '−'}${sym}${Math.abs(Number(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })}`;

const fmtPrice = (v) => { const n = Number(v ?? 0); return n.toLocaleString('en-US', { minimumFractionDigits: n >= 100 ? 2 : 4, maximumFractionDigits: n >= 100 ? 2 : 4 }); };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
function nyseStatus() {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'America/New_York', hour:'2-digit', minute:'2-digit', weekday:'short', hourCycle:'h23' }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t)?.value;
    const h = +g('hour') + +g('minute') / 60, wd = g('weekday');
    return wd !== 'Sat' && wd !== 'Sun' && h >= 9.5 && h < 16;
  } catch (_) { return false; }
}

// ─── Plan card ───────────────────────────────────────────────────────────────
const PLAN_META = {
  free:  { label:'Free',  Icon:Leaf,  badgeBg:'var(--surface2)',        badgeColor:'var(--muted)',  sub:'Limited access, 2 positions',     upgrade:true  },
  pro:   { label:'Pro',   Icon:Zap,   badgeBg:'var(--accent-dim)',      badgeColor:'var(--accent)', sub:'Full access, unlimited positions', upgrade:true  },
  elite: { label:'Elite', Icon:Crown, badgeBg:'rgba(180,155,255,.15)',  badgeColor:'var(--purple)', sub:'Everything, with priority support', upgrade:false },
};

const planTier = (name) => {
  const n = String(name || '').toLowerCase();
  if (/elite|vip|enterprise|institution/.test(n)) return 'elite';
  if (/pro|premium|plus|gold/.test(n)) return 'pro';
  return 'free';
};
const planLabel = (name) => { const n = String(name || 'Free').replace(/\s*plan$/i, '').trim(); return n.charAt(0).toUpperCase() + n.slice(1); };

function PlanCard({ plan }) {
  const key  = planTier(plan);
  const meta = PLAN_META[key];
  return (
    <div className="sb-plan" style={{ '--plan-badge-bg':meta.badgeBg, '--plan-badge-color':meta.badgeColor }}>
      <div className="sb-plan-row">
        <span className="sb-plan-badge"><meta.Icon />{planLabel(plan)} plan</span>
      </div>
      <div className="sb-plan-label">{key === 'elite' ? "You're on the top tier" : key === 'pro' ? 'Pro features active' : 'Unlock the full desk'}</div>
      <div className="sb-plan-sub">{meta.sub}</div>
      {meta.upgrade ? (
        <a href="/payments" className="sb-plan-upgrade"><Rocket />{key === 'pro' ? 'Upgrade to Elite' : 'Upgrade to Pro'}</a>
      ) : (
        <div className="sb-plan-current"><CircleCheck />Highest plan, you're all set</div>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ open, user, onLogout }) {
  const status = user ? `${planLabel(user.plan)} plan, ${user.is_verified ? 'verified' : 'unverified'}` : '—';
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="brand"><a href="/dashboard"><BrandMark /></a></div>
      <nav className="sb-scroll">
        {NAV_GROUPS.map(g => (
          <div key={g.title}>
            <div className="sb-section">{g.title}</div>
            {g.links.map(l => (
              <a key={l.label} href={l.href} className={`sb-link${l.active ? ' active' : ''}`} aria-current={l.active ? 'page' : undefined}>
                <l.Icon />{l.label}
                {l.badge && <span className="sb-badge">{l.badge}</span>}
              </a>
            ))}
          </div>
        ))}
        <div className="sb-section">Account</div>
        {ACCOUNT_LINKS.map(l => <a key={l.label} href={l.href} className="sb-link"><l.Icon />{l.label}</a>)}
        <button type="button" className="sb-link sb-logout-link" onClick={onLogout}><LogOut />Log out</button>
      </nav>
      <PlanCard plan={user?.plan} />
      <div className="sb-user">
        <div className="avatar">{initialsOf(user)}</div>
        <div style={{ minWidth:0 }}>
          <div className="sb-user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nameOf(user)}</div>
          <div className="sb-user-role">{status}</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────
function Topbar({ onMenu, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, []);

  return (
    <header className="topbar">
      <button className="topbar-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
      <label className="topbar-search">
        <Search />
        <input ref={searchRef} placeholder="Search assets, traders, properties" aria-label="Search" />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="topbar-spacer" />
      <LanguageSwitcher />
      <a href="/notification" className="icon-btn" aria-label="Notifications"><Bell /><span className="notif-dot" /></a>
      <a href="/settings" className="icon-btn hide-sm" aria-label="Settings"><Settings /></a>
      <div className="profile-menu" ref={menuRef}>
        <button type="button" className="avatar topbar-avatar" onClick={() => setMenuOpen(o => !o)} aria-label="Account menu" aria-expanded={menuOpen}>
          {initialsOf(user)}
        </button>
        {menuOpen && (
          <div className="profile-dropdown" role="menu">
            <div className="profile-dropdown-header">
              <div className="profile-dropdown-name">{nameOf(user)}</div>
              {user?.email && <div className="profile-dropdown-email">{user.email}</div>}
            </div>
            <a href="/profile" className="profile-dropdown-item" role="menuitem"><UserCircle />Profile</a>
            <a href="/payments" className="profile-dropdown-item" role="menuitem"><CreditCard />Payments</a>
            <button className="profile-dropdown-item logout" role="menuitem" onClick={onLogout}><LogOut />Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span key={i} className="ticker-item">
            <span className="t-sym">{t.sym}</span>
            <span>{t.val}</span>
            <span className={t.up ? 't-up' : 't-dn'}>{t.up ? '▲' : '▼'} {t.pct.replace(/[+-]/, '')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Hero: balance + performance chart ───────────────────────────────────────
function smoothPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function PerformanceChart({ bars }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const W = 600, H = 200, pad = 8;
  const vals = bars.map(b => Number(b.height_pct) * (b.is_negative ? -.35 : 1));
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, 1);
  const pts = vals.map((v, i) => [pad + (i / Math.max(1, vals.length - 1)) * (W - pad * 2), H - 14 - ((v - lo) / (hi - lo || 1)) * (H - 40)]);
  const line = pts.length > 1 ? smoothPath(pts) : `M0,${H / 2} L${W},${H / 2}`;
  const zeroY = H - 14 - ((0 - lo) / (hi - lo || 1)) * (H - 40);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(pts[best][0] - x)) best = i; });
    setHover(best);
  };
  const hp = hover != null ? pts[hover] : null;

  return (
    <>
      <div className="chart-wrap" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Performance over the selected period" role="img">
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity=".32" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0,1,2,3].map(i => <line key={i} x1="0" x2={W} y1={20 + i * ((H - 34) / 3)} y2={20 + i * ((H - 34) / 3)} stroke="var(--border)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />)}
          {lo < 0 && <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--border2)" vectorEffect="non-scaling-stroke" />}
          {pts.length > 1 && <path d={`${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`} fill="url(#perfFill)" />}
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {bars.map((b, i) => b.is_negative && <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="4" fill="var(--red)" vectorEffect="non-scaling-stroke" />)}
          {hp && <line x1={hp[0]} x2={hp[0]} y1="0" y2={H} stroke="var(--border2)" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hp && (
          <>
            <span style={{ position:'absolute', left:`${(hp[0] / W) * 100}%`, top:`${(hp[1] / H) * 100}%`, width:12, height:12, margin:'-6px 0 0 -6px', borderRadius:'50%', background:'var(--accent)', border:'3px solid var(--surface)' }} />
            <div className="chart-tip" style={{ left:`${Math.min(88, Math.max(12, (hp[0] / W) * 100))}%` }}>
              <strong>{bars[hover].period_label}</strong> <span className={bars[hover].is_negative ? 'dn' : 'up'}>{bars[hover].is_negative ? 'Down month' : 'Up month'}</span>
            </div>
          </>
        )}
      </div>
      <div className="chart-labels">{bars.map((b, i) => <span key={i}>{b.period_label}</span>)}</div>
    </>
  );
}

function Hero({ snapshot, currSymbol, allocated, bars }) {
  const [range, setRange] = useState('12M');
  const n = { '3M':3, '6M':6, '12M':12 }[range];
  const total = Number(snapshot?.total_value ?? 0);
  const pnl = Number(snapshot?.total_pnl ?? 0);
  const pnlPct = Number(snapshot?.total_pnl_pct ?? 0);
  const [whole, cents] = money(currSymbol, total).split('.');
  return (
    <section className="card hero">
      <div style={{ display:'flex', flexDirection:'column' }}>
        <div className="hero-lbl">Total balance</div>
        <div className="hero-val">{whole}<small>.{cents}</small></div>
        <div><span className={`hero-chg ${pnl >= 0 ? 'up' : 'dn'}`}>{pnl >= 0 ? '▲' : '▼'} {Math.abs(pnlPct).toFixed(2)}% all-time</span></div>
        <div className="hero-split" style={{ marginTop:'auto' }}>
          <div><span>Realized P&amp;L</span><strong className={pnl >= 0 ? 'up' : 'dn'}>{signed(currSymbol, pnl)}</strong></div>
          <div><span>Copy allocations</span><strong>{money(currSymbol, allocated, 0)}</strong></div>
        </div>
      </div>
      <div style={{ minWidth:0 }}>
        <div className="card-header" style={{ marginBottom:4 }}>
          <div>
            <div className="card-title">Performance</div>
            <div className="card-sub">Monthly results, last {n} months</div>
          </div>
          <div className="seg-tabs" role="tablist" aria-label="Chart range">
            {['3M','6M','12M'].map(p => <button key={p} role="tab" aria-selected={range === p} className={`seg-tab${range === p ? ' active' : ''}`} onClick={() => setRange(p)}>{p}</button>)}
          </div>
        </div>
        {bars.length > 1 ? <PerformanceChart bars={bars.slice(-n)} /> : (
          <div className="empty" style={{ height:230, justifyContent:'center' }}>
            <strong>Your performance history starts here</strong>
            <span>Monthly results will chart here once you have a full month of activity.</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── KPI strip ───────────────────────────────────────────────────────────────
function Ring({ pct }) {
  const R = 18, L = 2 * Math.PI * R;
  return (
    <svg className="ring" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--surface2)" strokeWidth="5" />
      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * L} ${L}`} transform="rotate(-90 22 22)" />
    </svg>
  );
}

function Kpis({ snapshot, copies }) {
  const wins = snapshot?.total_wins ?? 0, losses = snapshot?.total_losses ?? 0;
  const win = Number(snapshot?.win_rate_pct ?? 0);
  const items = [
    { lbl:'Open positions', val:String(snapshot?.open_positions ?? 0), note:`${Math.round(snapshot?.alloc_crypto_pct ?? 0)}% crypto, ${Math.round(snapshot?.alloc_forex_pct ?? 0)}% forex`, Icon:CandlestickChart },
    { lbl:'Win rate', val:`${win.toFixed(0)}%`, note:'Across closed trades', ring:win },
    { lbl:'Closed trades', val:String(wins + losses), note:`${wins} won, ${losses} lost`, Icon:LineChart },
    { lbl:'Traders copied', val:String(copies), note:copies ? 'Active copy relationships' : 'None yet', Icon:Copy },
  ];
  return (
    <div className="kpis">
      {items.map(k => (
        <div key={k.lbl} className="card kpi">
          <div className="kpi-top">
            <span className="kpi-lbl">{k.lbl}</span>
            {k.ring != null ? <Ring pct={k.ring} /> : <span className="kpi-ico"><k.Icon /></span>}
          </div>
          <div className="kpi-val" style={{ marginTop: k.ring != null ? 0 : 10 }}>{k.val}</div>
          <div className="kpi-note">{k.note}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Your investments (four products) ────────────────────────────────────────
function Products({ snapshot, currSymbol, allocated, copies }) {
  const tiles = [
    { href:'/stocks',       Icon:LineChart, color:'var(--blue)',   bg:'var(--blue-dim)',   name:'Stocks and trading', val:`${snapshot?.open_positions ?? 0} open`, note:'Positions across markets' },
    { href:'/copy-trading', Icon:Copy,      color:'var(--accent)', bg:'var(--accent-dim)', name:'Copy trading',       val:money(currSymbol, allocated, 0), note:`${copies} ${copies === 1 ? 'trader' : 'traders'} copied` },
    { href:'/hire-trader',  Icon:Users,     color:'var(--teal)',   bg:'rgba(54,194,180,.14)', name:'Hire a trader',   val:'Get started', note:'A pro manages your account' },
    { href:'/real-estate',  Icon:Building2, color:'var(--purple)', bg:'rgba(180,155,255,.15)', name:'Real estate',     val:'From $100', note:'Shares of rental property' },
  ];
  return (
    <section className="card">
      <div className="card-header">
        <div><div className="card-title">Your investments</div><div className="card-sub">Four ways to invest from one balance</div></div>
      </div>
      <div className="products">
        {tiles.map(t => (
          <a key={t.name} href={t.href} className="product">
            <ArrowUpRight className="go" />
            <span className="product-ico" style={{ background:t.bg, color:t.color }}><t.Icon /></span>
            <span className="product-name">{t.name}</span>
            <span className="product-val">{t.val}</span>
            <span className="product-note">{t.note}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

// ─── Positions ───────────────────────────────────────────────────────────────
function PositionsCard({ positions, currSymbol = '$' }) {
  const rows = (positions ?? []).map(p => {
    const pl = Number(p.profit_loss ?? 0);
    const buy = String(p.trade_type).toUpperCase() === 'BUY';
    const move = Number(p.open_price) > 0 ? ((Number(p.current_price) - Number(p.open_price)) / Number(p.open_price)) * 100 : 0;
    const pct = buy ? move : -move; // a short gains when price falls
    return { ...p, pl, pct, buy };
  });
  return (
    <section className="card">
      <div className="card-header">
        <div><div className="card-title">Open positions</div><div className="card-sub">{rows.length} {rows.length === 1 ? 'position' : 'positions'} live</div></div>
        <a href="/terminal" className="card-link">Open terminal <ChevronRight /></a>
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <strong>No open positions</strong>
          <span>Place a trade or copy a trader and your positions will appear here.</span>
          <a href="/terminal" className="btn btn-ghost btn-sm" style={{ marginTop:8 }}><Plus />New trade</a>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Asset</th><th>Side</th><th className="r">Entry</th><th className="r">Current</th><th className="r">P&amp;L</th><th className="r">Change</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={`${p.symbol}-${i}`}>
                  <td><div className="asset-cell"><div className="asset-icon">{String(p.symbol).slice(0, 2)}</div><span className="asset-name">{p.symbol}</span></div></td>
                  <td><span className={`badge badge-${p.buy ? 'buy' : 'sell'}`}>{String(p.trade_type).toLowerCase()}</span></td>
                  <td className="r">{fmtPrice(p.open_price)}</td>
                  <td className="r">{fmtPrice(p.current_price)}</td>
                  <td className={`r ${p.pl >= 0 ? 'up' : 'dn'}`} style={{ fontWeight:600 }}>{signed(currSymbol, p.pl)}</td>
                  <td className={`r ${p.pct >= 0 ? 'up' : 'dn'}`}>{p.pct >= 0 ? '+' : ''}{p.pct.toFixed(2)}%</td>
                  <td><span className={`badge badge-${p.status === 'open' ? 'open' : 'closed'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Right column cards ──────────────────────────────────────────────────────
function AllocationCard({ snapshot }) {
  const segs = [
    { label:'Crypto', pct:Math.round(snapshot?.alloc_crypto_pct ?? 0), color:'var(--accent)' },
    { label:'Forex',  pct:Math.round(snapshot?.alloc_forex_pct ?? 0),  color:'var(--blue)' },
    { label:'Stocks', pct:Math.round(snapshot?.alloc_stocks_pct ?? 0), color:'var(--teal)' },
    { label:'Cash',   pct:Math.round(snapshot?.alloc_cash_pct ?? 0),   color:'var(--faint)' },
  ];
  const R = 46, L = 2 * Math.PI * R, total = segs.reduce((s, x) => s + x.pct, 0);
  let acc = 0;
  return (
    <section className="card">
      <div className="card-header"><div className="card-title">Allocation</div><span className="card-sub" style={{ margin:0 }}>Open positions</span></div>
      <div className="alloc">
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface2)" strokeWidth="14" />
          {total > 0 && segs.filter(s => s.pct > 0).map(s => {
            const len = (s.pct / 100) * L; const el = <circle key={s.label} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${Math.max(0, len - 2)} ${L}`} strokeDashoffset={-acc} transform="rotate(-90 60 60)" />;
            acc += len; return el;
          })}
          <text x="60" y="56" textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="var(--sans)">{total > 0 ? 'Largest' : 'Nothing'}</text>
          <text x="60" y="73" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--text)" fontFamily="var(--sans)">{total > 0 ? segs.reduce((a, b) => (b.pct > a.pct ? b : a)).label : 'open yet'}</text>
        </svg>
        <div className="alloc-legend">
          {segs.map(s => <div key={s.label} className="alloc-row"><i style={{ background:s.color }} />{s.label}<b>{s.pct}%</b></div>)}
        </div>
      </div>
    </section>
  );
}

function CopyCard({ copyRels, currSymbol }) {
  const traders = (copyRels ?? []).map(r => {
    const roi = r.trader_profiles?.trader_performance?.[0]?.roi_pct;
    return {
      initials: r.trader_profiles?.initials || r.trader_profiles?.display_name?.slice(0, 2).toUpperCase() || '??',
      name: r.trader_profiles?.display_name || r.trader_profiles?.handle || '—',
      roi: roi != null ? Number(roi) : null,
      amount: Number(r.allocated_amount ?? 0),
      color: r.trader_profiles?.color_hex || 'var(--accent)',
    };
  });
  const max = Math.max(1, ...traders.map(t => t.amount));
  return (
    <section className="card">
      <div className="card-header">
        <div><div className="card-title">Copy trading</div><div className="card-sub">{traders.length} active</div></div>
        <a href="/copy-trading" className="card-link">Manage <ChevronRight /></a>
      </div>
      {traders.length === 0 ? (
        <div className="empty" style={{ paddingTop:8 }}>
          <span>You aren't copying anyone yet.</span>
          <a href="/copy-trading" className="btn btn-ghost btn-sm" style={{ marginTop:4 }}>Find a trader</a>
        </div>
      ) : traders.map(t => (
        <div key={t.name} className="list-row">
          <div className="avatar" style={{ background:t.color, color:'#07101E', borderColor:'transparent' }}>{t.initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="list-name">{t.name}</div>
            <div className="mini-bar"><span style={{ width:`${(t.amount / max) * 100}%`, background:t.color }} /></div>
          </div>
          <div className="list-end">
            <strong className={t.roi == null ? '' : t.roi >= 0 ? 'up' : 'dn'}>{t.roi == null ? '—' : `${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(1)}%`}</strong>
            <span className="list-sub">{money(currSymbol, t.amount, 0)}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function RealEstateArt() {
  return (
    <svg viewBox="0 0 360 132" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="reDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14264A" /><stop offset=".6" stopColor="#3B4C7A" /><stop offset="1" stopColor="#E7A95A" /></linearGradient>
      </defs>
      <rect width="360" height="132" fill="url(#reDusk)" />
      <circle cx="286" cy="104" r="22" fill="#F4C77A" opacity=".75" />
      <path d="M0,108 h24 v-22 h18 v-14 h20 v36 h26 v-28 h16 v28 h32 v-18 h22 v18 h28 v-40 h18 v40 h34 v-26 h24 v26 h40 v-16 h20 v16 h38 V132 H0 Z" fill="#1A2B4A" />
      <path d="M150,132 V30 L186,16 V132 Z" fill="#23385F" /><path d="M186,16 L206,26 V132 H186 Z" fill="#172846" />
      {Array.from({ length:14 }).map((_, r) => [0,1,2].map(c => <rect key={`${r}${c}`} x={156 + c * 9.5} y={36 + r * 6.6} width="6.5" height="3.6" fill={(r * 3 + c) % 4 ? '#E2AE4A' : '#2A4166'} />))}
      <rect x="220" y="62" width="40" height="70" fill="#1E3052" />
      {Array.from({ length:8 }).map((_, r) => [0,1,2].map(c => <rect key={`b${r}${c}`} x={225 + c * 11.5} y={68 + r * 8} width="7" height="4" fill={(r + c) % 3 ? '#E2AE4A' : '#2A4166'} />))}
      <rect x="92" y="70" width="44" height="62" fill="#2B3F66" />
      {Array.from({ length:7 }).map((_, r) => [0,1,2,3].map(c => <rect key={`c${r}${c}`} x={96 + c * 10} y={75 + r * 8} width="6" height="4" fill={(r * 2 + c) % 5 ? '#E2AE4A' : '#2A4166'} />))}
    </svg>
  );
}

function RealEstateCard() {
  return (
    <section className="card re-card">
      <div className="re-art"><RealEstateArt /><span className="re-new">New</span></div>
      <div className="re-body">
        <div className="card-title">Real estate</div>
        <p className="card-sub" style={{ marginTop:4 }}>Buy shares of income-producing property from $100 and receive your share of the rent each quarter. Your holdings will appear here.</p>
        <a href="/real-estate" className="btn btn-accent btn-sm" style={{ marginTop:14, width:'100%' }}><Building2 />Browse properties</a>
      </div>
    </section>
  );
}

function MarketplaceCard({ mpItems }) {
  const items = mpItems?.length ? mpItems.map(item => ({
    Icon: Bot, name: item.name, tag: item.tag || '',
    roi: item.roi_12m_pct != null ? `+${Number(item.roi_12m_pct).toFixed(1)}%` : '—',
    price: item.price_monthly != null ? `$${Number(item.price_monthly).toFixed(0)}/mo` : 'Free',
    color: item.color_hex || 'var(--accent)',
  })) : MP_ITEMS;
  return (
    <section className="card">
      <div className="card-header">
        <div><div className="card-title">Bots and signals</div><div className="card-sub">Most subscribed this month</div></div>
        <a href="/market-place" className="card-link">Browse <ChevronRight /></a>
      </div>
      {items.map(item => (
        <div key={item.name} className="list-row">
          <span className="kpi-ico" style={{ background:'var(--surface2)', color:item.color, width:38, height:38 }}><item.Icon /></span>
          <div style={{ flex:1, minWidth:0 }}><div className="list-name">{item.name}</div><div className="list-sub">{item.tag}</div></div>
          <div className="list-end"><strong className="up">{item.roi}</strong><span className="list-sub">{item.price}</span></div>
        </div>
      ))}
    </section>
  );
}

function QuickActions() {
  return (
    <section className="card">
      <div className="card-title" style={{ marginBottom:14 }}>Quick actions</div>
      <div className="quick-list">
        {[
          { href:'/payments',     Icon:Plus,      label:'Deposit funds' },
          { href:'/copy-trading', Icon:Copy,      label:'Copy a trader' },
          { href:'/hire-trader',  Icon:Users,     label:'Hire a trader' },
          { href:'/real-estate',  Icon:Building2, label:'Buy property' },
        ].map(a => <a key={a.label} href={a.href} className="quick-btn"><a.Icon />{a.label}</a>)}
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user,        setUser]        = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [snapshot,    setSnapshot]    = useState(null);
  const [perfBars,    setPerfBars]    = useState([]);
  const [positions,   setPositions]   = useState([]);
  const [copyRels,    setCopyRels]    = useState([]);
  const [mpItems,     setMpItems]     = useState([]);

  // Apply cached appearance immediately on mount (before DB responds)
  useEffect(() => { applyAppearance(); }, []);

  // Chatway live chat is loaded once for the whole app in App.js (ChatwayWidget)

  useEffect(() => {
    let mounted = true;

    const bootstrap = async (session) => {
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;

      const [
        { data: profile, error: profileError },
        { data: bars },
        { data: allPositions },
        { data: stockOrders },
        { data: copies },
        { data: mp },
        { data: userSettings },
        { data: activeSub },
      ] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).single(),
        supabase.from('performance_bars').select('period_label,height_pct,is_negative').eq('user_id', uid).order('period_start', { ascending:true }).limit(12),
        supabase.from('open_positions').select('symbol,trade_type,open_price,current_price,profit_loss,status,opened_at,closed_at').eq('user_id', uid).order('opened_at', { ascending:false }),
        supabase.from('stock_orders').select('symbol,side,order_type,quantity,limit_price,filled_price,status,created_at').eq('user_id', uid).eq('status','filled').order('created_at', { ascending:true }),
        supabase.from('copy_relationships').select(`allocated_amount,trader_profiles(display_name,handle,initials,color_hex,trader_performance(roi_pct,period))`).eq('copier_id', uid).eq('status','active'),
        supabase.from('marketplace_items').select('name,tag,icon_class,color_hex,price_monthly,roi_12m_pct').eq('is_active', true).order('subscriber_count', { ascending:false }).limit(3),
        supabase.from('user_settings').select('theme,accent_color,layout_density').eq('user_id', uid).maybeSingle(),
        // The active subscription is the source of truth for the plan; users.plan can lag behind
        supabase.from('user_subscriptions').select('status, subscription_plans(name)')
          .eq('user_id', uid).eq('status', 'active').order('created_at', { ascending:false }).limit(1).maybeSingle(),
      ]);

      if (profileError) {
        console.error('Dashboard: failed to load users row (plan will fall back to Free):', profileError);
      }

      if (!mounted) return;

      const currency = profile?.currency ?? 'USD';

      // Full currency → symbol map (matches the CURRENCIES list in settings)
      const CURRENCY_SYMBOLS = {
        USD:'$', EUR:'€', GBP:'£', JPY:'¥', CHF:'Fr', CAD:'CA$', AUD:'A$',
        NZD:'NZ$', CNY:'¥', HKD:'HK$', SGD:'S$', SEK:'kr', NOK:'kr', DKK:'kr',
        MXN:'$', BRL:'R$', ZAR:'R', NGN:'₦', KES:'KSh', GHS:'₵', EGP:'E£',
        INR:'₹', KRW:'₩', IDR:'Rp', THB:'฿', MYR:'RM', PHP:'₱', TWD:'NT$',
        PKR:'₨', BDT:'৳', VND:'₫', AED:'د.إ', SAR:'﷼', QAR:'﷼', KWD:'د.ك',
        BHD:'.د.ب', OMR:'﷼', JOD:'JD', TRY:'₺', PLN:'zł', CZK:'Kč', HUF:'Ft',
        RON:'lei', BGN:'лв', HRK:'kn', RUB:'₽', UAH:'₴', ILS:'₪', ARS:'$',
        CLP:'$', COP:'$', PEN:'S/', UYU:'$U', VEF:'Bs', DZD:'دج', MAD:'د.م.',
        TND:'DT', LYD:'LD', AOA:'Kz', ETB:'Br', TZS:'TSh', UGX:'USh', ZMW:'ZK',
        MWK:'MK', BTC:'₿', ETH:'Ξ',
      };
      const currSymbol = CURRENCY_SYMBOLS[currency] ?? currency;

      const fmtCurr = (n, decimals = 2) =>
        `${currSymbol}${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

      // Fetch live wallet balance (wallets are stored in USD)
      const { data: wallets } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', uid);

      const totalWalletBalanceUsd = wallets?.reduce((sum, w) => sum + Number(w?.balance ?? 0), 0) ?? 0;

      // Convert USD → the user's selected currency (live rate, 1hr cached)
      const fxRate = await getUsdRate(currency);
      const totalWalletBalance = totalWalletBalanceUsd * fxRate;

      // ── Live metrics computation ────────────────────────────────────────
      const positionRows = allPositions ?? [];
      const openTrades   = positionRows.filter(p => p.status === 'open').map(p => ({
        ...p,
        profit_loss: Number(p.profit_loss ?? 0) * fxRate, // convert P&L to selected currency too
      }));
      const closedTrades = positionRows.filter(p => p.status === 'closed');

      const tradesPnl   = closedTrades.reduce((s, p) => s + Number(p.profit_loss ?? 0), 0) * fxRate;
      const tradeWins   = closedTrades.filter(p => Number(p.profit_loss ?? 0) > 0).length;
      const tradeLosses = closedTrades.filter(p => Number(p.profit_loss ?? 0) < 0).length;

      const { realizedPnl: stockPnlUsd, wins: stockWins, losses: stockLosses, openLots: openStockLots }
        = computeStockFifo(stockOrders ?? []);
      const stockPnl = stockPnlUsd * fxRate;

      const totalPnl       = tradesPnl + stockPnl;
      const totalWins      = tradeWins + stockWins;
      const totalLosses    = tradeLosses + stockLosses;
      const totalDecided   = totalWins + totalLosses;
      const winRatePct     = totalDecided > 0 ? (totalWins / totalDecided) * 100 : 0;

      const openPositionsCount = openTrades.length + openStockLots;

      const cryptoSymbols = new Set(['BTC','ETH','BTCUSD','ETHUSD','BTCUSDT','ETHUSDT','LTC','XRP','SOL','DOGE']);
      const isCrypto = (sym) => cryptoSymbols.has((sym ?? '').toUpperCase().replace(/USD[T]?$/,'').replace(/[^A-Z]/g,'')) || cryptoSymbols.has((sym ?? '').toUpperCase());
      const cryptoCount     = openTrades.filter(p => isCrypto(p.symbol)).length;
      const allocCryptoPct  = openTrades.length ? Math.round((cryptoCount / openTrades.length) * 100) : 0;
      const allocForexPct   = openTrades.length ? 100 - allocCryptoPct : 0;

      const totalPnlPct = totalWalletBalance > 0 ? (totalPnl / totalWalletBalance) * 100 : 0;

      const computedSnapshot = {
        total_value:      totalWalletBalance,
        daily_pnl:        0,
        total_pnl:        totalPnl,
        total_pnl_pct:    totalPnlPct,
        open_positions:   openPositionsCount,
        win_rate_pct:     winRatePct,
        total_wins:       totalWins,
        total_losses:     totalLosses,
        alloc_crypto_pct: allocCryptoPct,
        alloc_forex_pct:  allocForexPct,
      };

      const enrichedUser = {
        ...(profile ?? {
          first_name: session.user.user_metadata?.first_name ?? '',
          last_name: '',
          email: session.user.email,
          plan: 'free',
          is_verified: false,
        }),
        plan: activeSub?.subscription_plans?.name || profile?.plan || 'free',
        currency,
        currSymbol,
        _portfolioVal: fmtCurr(totalWalletBalance),
        _dailyChange:  '',
      };

      setUser(enrichedUser);
      setSnapshot(computedSnapshot);
      if (bars?.length)      setPerfBars(bars);
      if (openTrades.length) setPositions(openTrades);
      if (copies?.length) {
        setCopyRels(copies.map(r => ({
          ...r,
          trader_profiles: r.trader_profiles ? {
            ...r.trader_profiles,
            trader_performance: (r.trader_profiles.trader_performance ?? [])
              .sort((a,b) => (b.period === '1Y' ? 1 : -1)).slice(0,1),
          } : null,
        })));
      }
      if (mp?.length) setMpItems(mp);
      // Apply appearance from DB settings (and sync to localStorage for other pages)
      if (userSettings) {
        localStorage.setItem('tf_appearance', JSON.stringify(userSettings));
        applyAppearance(userSettings);
      } else {
        // Fall back to whatever is already in localStorage
        applyAppearance();
      }
      setAuthChecked(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => bootstrap(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) window.location.href = '/login';
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const currSymbol = user?.currSymbol ?? '$';
  const allocated  = copyRels.reduce((s, r) => s + Number(r.allocated_amount ?? 0), 0);
  const marketOpen = nyseStatus();
  const firstName  = user?.first_name || user?.email?.split('@')[0] || 'there';
  const today      = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  if (!authChecked) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:'var(--bg)' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--border2)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
          <span style={{ fontSize:14, color:'var(--muted)' }}>Loading your desk…</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div className={`sb-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />

        <div className="right-panel">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} />
          <Ticker />

          <main className="main db-main">
            <div className="page-header">
              <div>
                <h1 className="page-greeting">{greeting()}, {firstName}</h1>
                <div className="page-sub">
                  <span>{today}</span>
                  <span className="mkt-pill"><span className={`live-dot${marketOpen ? '' : ' off'}`} />New York {marketOpen ? 'open' : 'closed'}</span>
                  <span className="mkt-pill"><span className="live-dot" />Crypto open 24/7</span>
                </div>
              </div>
              <div className="header-actions">
                <button type="button" className="btn btn-ghost hide-sm" onClick={() => window.print()}><Download />Export</button>
                <a href="/terminal" className="btn btn-ghost"><Plus />New trade</a>
                <a href="/payments" className="btn btn-accent"><Wallet2 />Deposit</a>
              </div>
            </div>

            {/* Shows until the user's identity is verified */}
            <IdentityBanner />

            <Hero snapshot={snapshot} currSymbol={currSymbol} allocated={allocated} bars={perfBars} />
            <Kpis snapshot={snapshot} copies={copyRels.length} />

            <div className="dashboard-grid">
              <div className="col">
                <Products snapshot={snapshot} currSymbol={currSymbol} allocated={allocated} copies={copyRels.length} />
                <PositionsCard positions={positions} currSymbol={currSymbol} />
                <MarketplaceCard mpItems={mpItems} />
              </div>
              <div className="col">
                <AllocationCard snapshot={snapshot} />
                <CopyCard copyRels={copyRels} currSymbol={currSymbol} />
                <RealEstateCard />
                <QuickActions />
              </div>
            </div>

            <p className="disclaimer">Trading and property investing involve risk. Past performance doesn't guarantee future results.</p>
          </main>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Quick navigation">
        <a href="/dashboard" className="bn-item active" aria-current="page"><LayoutDashboard />Home</a>
        <a href="/terminal" className="bn-item"><CandlestickChart />Trade</a>
        <a href="/copy-trading" className="bn-item"><Copy />Copy</a>
        <a href="/real-estate" className="bn-item"><Building2 />Property</a>
        <a href="/profile" className="bn-item"><UserCircle />Profile</a>
      </nav>
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
