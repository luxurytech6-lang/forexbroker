/**
 * Swap.jsx — Route: /swap
 * ─────────────────────────────────────────────────────────────────────────────
 * Swap between wallet currencies (USD, USDT, BTC, ETH …) at the prices an admin
 * keeps in swap_assets. The browser only shows an estimate; swap_currency() in
 * the database works out the real amount and moves both balances in one step.
 * Data: swap_assets, swap_settings, swaps — database/15_staking_swap_schema.sql
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowDownUp, Repeat, CheckCircle2, Loader2,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";


/* ─── Page layout + visual system ─────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&family=JetBrains+Mono:wght@500&display=swap');
:root {
  --bg:#07101E; --surface:#0C1A2E; --surface2:#112238; --border:#1C2C45; --border2:#2A3D5C;
  --text:#EEF2F7; --muted:#8A9AB2; --faint:#56677F;
  --accent:#E2AE4A; --accent-dim:rgba(226,174,74,.14); --accent-glow:rgba(226,174,74,.07);
  --green:#2FD394; --green-dim:rgba(47,211,148,.12); --red:#FF6470; --blue:#5B8CFF; --purple:#B49BFF; --teal:#36C2B4;
  --sidebar-w:264px; --topbar-h:64px;
}
:root[data-theme="light"] {
  --bg:#EEF2F7; --surface:#FFFFFF; --surface2:#F4F7FB; --border:#D5DDE8; --border2:#B7C3D3;
  --text:#0B1628; --muted:#4A5970; --faint:#8090A6; --green:#0F8F5F; --green-dim:rgba(15,143,95,.1); --red:#C8373F;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--bg); color: var(--text); font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; color: inherit; }
.num { font-variant-numeric: tabular-nums; }
.up { color: var(--green); }

.re-shell { display: grid; grid-template-columns: var(--sidebar-w) minmax(0,1fr); min-height: 100vh; }
.re-sidebar { position: sticky; top: 0; z-index: 200; }
.re-right { min-width: 0; display: flex; flex-direction: column; }
.re-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; padding: 0 28px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.re-hamburger { display: none; flex-direction: column; gap: 4px; padding: 8px; cursor: pointer; }
.re-hamburger span { width: 20px; height: 2px; border-radius: 1px; background: var(--text); }
.re-backdrop { display: none; }
.re-main { padding: 28px 28px 64px; max-width: 1480px; width: 100%; margin: 0 auto; }

/* Header */
.mn-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
.re-page-title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(34px,3.6vw,48px); line-height: 1.02; letter-spacing: -.01em; }
.re-page-sub { font-size: 15.5px; color: var(--muted); margin-top: 8px; max-width: 42em; }
.re-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 18px; border-radius: 10px; font-size: 14.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: filter .15s, background .15s, border-color .15s; }
.re-btn svg { width: 16px; height: 16px; }
.re-btn-sm { height: 36px; padding: 0 14px; font-size: 13.5px; }
.re-btn-accent { background: var(--accent); color: #07101E; }
.re-btn-accent:disabled { opacity: .45; cursor: not-allowed; }
.re-btn-ghost { background: transparent; border-color: var(--border2); color: var(--text); }
.re-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 24px 48px -36px rgba(0,0,0,.6); }
.mn-note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border-radius: 12px; background: var(--accent-glow); border: 1px solid var(--accent-dim); font-size: 14px; color: var(--muted); margin-bottom: 20px; }
.mn-note svg { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
.mn-note strong { color: var(--text); }

/* Live rig panel */
.mn-rig { display: grid; grid-template-columns: minmax(0,1.3fr) minmax(0,1fr); gap: 0; overflow: hidden; margin-bottom: 24px; }
.mn-rig-main { padding: 26px 28px; position: relative; background: radial-gradient(120% 140% at 0% 0%, var(--accent-glow) 0%, transparent 60%); }
.mn-live { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--green); }
.mn-live i { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 0 var(--green); animation: mnPulse 1.8s infinite; }
.mn-live.idle { color: var(--muted); }
.mn-live.idle i { background: var(--faint); animation: none; }
.mn-ticker { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: clamp(32px, 4.4vw, 52px); font-weight: 500; letter-spacing: -.02em; margin: 10px 0 4px; font-variant-numeric: tabular-nums; }
.mn-ticker small { font-size: .42em; color: var(--muted); margin-left: 8px; letter-spacing: 0; }
.mn-ticker-sub { font-size: 14px; color: var(--muted); }
.mn-bars { display: flex; align-items: flex-end; gap: 4px; height: 64px; margin-top: 22px; }
.mn-bars span { flex: 1; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, var(--accent), rgba(226,174,74,.25)); transform-origin: bottom; animation: mnBar 1.6s ease-in-out infinite; }
.mn-bars.idle span { animation: none; background: var(--surface2); }
.mn-rig-side { border-left: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr; }
.mn-rig-side div { padding: 20px 22px; border-bottom: 1px solid var(--border); }
.mn-rig-side div:nth-child(odd) { border-right: 1px solid var(--border); }
.mn-rig-side div:nth-last-child(-n+2) { border-bottom: none; }
.mn-rig-side span { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--muted); }
.mn-rig-side span svg { width: 15px; height: 15px; color: var(--faint); }
.mn-rig-side strong { display: block; font-size: 22px; font-weight: 600; margin-top: 6px; font-variant-numeric: tabular-nums; }
.mn-rig-side em { display: block; font-style: normal; font-size: 12.5px; color: var(--faint); }

/* Tabs + filters */
.mn-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.re-tabs { display: inline-flex; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }
.re-tab { height: 34px; padding: 0 14px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--muted); background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.re-tab.active { background: var(--accent); color: #07101E; }
.re-tab b { font-size: 12px; padding: 1px 7px; border-radius: 999px; background: rgba(0,0,0,.12); }
.mn-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.mn-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--muted); min-width: 220px; }
.mn-search:focus-within { border-color: var(--accent); }
.mn-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font: inherit; font-size: 14.5px; }
.re-select { height: 40px; padding: 0 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: 14px; cursor: pointer; }
.mn-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.mn-chip { height: 34px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
.mn-chip:hover { color: var(--text); border-color: var(--border2); }
.mn-chip.active { background: var(--accent-dim); border-color: var(--accent); color: var(--text); }

/* Plans */
.mn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px; }
.mn-plan { display: flex; flex-direction: column; gap: 16px; padding: 20px; text-align: left; cursor: pointer; font: inherit; color: inherit; transition: transform .2s, border-color .2s; position: relative; }
.mn-plan:hover { transform: translateY(-3px); border-color: var(--border2); }
.mn-plan.featured { border-color: var(--accent); }
.mn-plan-top { display: flex; align-items: center; gap: 12px; }
.mn-coin { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; font-family: 'JetBrains Mono', ui-monospace, monospace; }
.mn-plan-name { font-size: 17px; font-weight: 600; line-height: 1.25; }
.mn-plan-algo { font-size: 13px; color: var(--muted); }
.mn-flag { position: absolute; top: 16px; right: 16px; height: 24px; padding: 0 9px; border-radius: 7px; font-size: 12px; font-weight: 700; background: var(--accent); color: #07101E; display: inline-flex; align-items: center; }
.mn-rate { display: flex; align-items: baseline; gap: 8px; }
.mn-rate strong { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 44px; line-height: 1; color: var(--accent); }
.mn-rate span { font-size: 13.5px; color: var(--muted); }
.mn-facts { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; padding-top: 14px; border-top: 1px solid var(--border); font-size: 12.5px; color: var(--muted); }
.mn-facts strong { display: block; color: var(--text); font-size: 14.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mn-empty { padding: 48px 20px; text-align: center; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.mn-empty strong { color: var(--text); font-size: 16px; }

/* Tables */
.mn-table-wrap { overflow-x: auto; }
.re-table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
.re-table th { text-align: left; font-size: 12.5px; font-weight: 600; color: var(--faint); padding: 14px 20px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.re-table td { padding: 14px 20px; border-bottom: 1px solid var(--border); white-space: nowrap; font-variant-numeric: tabular-nums; }
.re-table tr:last-child td { border-bottom: none; }
.re-table .r { text-align: right; }
.mn-status { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 7px; font-size: 12.5px; font-weight: 700; text-transform: capitalize; }
.mn-status.active { background: var(--green-dim); color: var(--green); }
.mn-status.pending { background: var(--accent-dim); color: var(--accent); }
.mn-status.completed, .mn-status.cancelled { background: var(--surface2); color: var(--muted); }
.mn-progress { height: 6px; width: 120px; border-radius: 3px; background: var(--surface2); overflow: hidden; }
.mn-progress span { display: block; height: 100%; background: var(--accent); border-radius: 3px; }

/* How it works */
.mn-how { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-top: 40px; }
.mn-how-step { padding: 20px; }
.mn-how-n { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--accent-dim); color: var(--accent); font-weight: 700; margin-bottom: 12px; }
.mn-how-step h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.mn-how-step p { font-size: 14px; color: var(--muted); }
.mn-risk { margin-top: 20px; font-size: 13px; color: var(--faint); line-height: 1.6; }

/* Drawer */
.mn-overlay { position: fixed; inset: 0; z-index: 600; background: rgba(3,8,16,.62); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: mnFade .2s ease both; }
.mn-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 601; width: min(520px, 100vw); background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; box-shadow: -40px 0 80px -30px rgba(0,0,0,.7); animation: mnSlide .32s cubic-bezier(.22,1,.36,1) both; }
.mn-drawer-head { display: flex; align-items: center; gap: 14px; padding: 22px 24px; border-bottom: 1px solid var(--border); }
.mn-close { margin-left: auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface2); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.mn-drawer-body { flex: 1; overflow-y: auto; padding: 22px 24px; display: flex; flex-direction: column; gap: 20px; }
.mn-drawer-name { font-family: 'Instrument Serif', Georgia, serif; font-size: 30px; line-height: 1.05; }
.mn-desc { font-size: 15px; color: var(--muted); line-height: 1.65; }
.mn-facts-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.mn-facts-list div { background: var(--surface); padding: 12px 14px; }
.mn-facts-list span { display: block; font-size: 12.5px; color: var(--muted); }
.mn-facts-list strong { font-size: 15.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mn-calc { padding: 18px; border-radius: 14px; background: var(--surface2); border: 1px solid var(--border); }
.mn-section-h { font-size: 15px; font-weight: 600; }
.mn-amount { display: flex; align-items: center; gap: 6px; height: 54px; padding: 0 16px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border2); margin: 10px 0 12px; }
.mn-amount:focus-within { border-color: var(--accent); }
.mn-amount span { font-size: 22px; font-weight: 600; color: var(--muted); }
.mn-amount input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font: inherit; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mn-range { width: 100%; accent-color: #E2AE4A; }
.mn-proj { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 14px; }
.mn-proj div { padding: 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); }
.mn-proj span { display: block; font-size: 12.5px; color: var(--muted); }
.mn-proj strong { font-size: 16.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mn-err { font-size: 13.5px; color: var(--red); margin-top: 8px; }
.mn-drawer-foot { flex-shrink: 0; padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); display: flex; gap: 12px; }
.mn-drawer-foot .re-btn { flex: 1; height: 50px; font-size: 15.5px; }
.mn-success { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 32px 8px; }
.mn-success svg { color: var(--green); }

@keyframes mnFade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes mnSlide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes mnRise  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes mnPulse { 0% { box-shadow: 0 0 0 0 rgba(47,211,148,.5); } 70% { box-shadow: 0 0 0 8px rgba(47,211,148,0); } 100% { box-shadow: 0 0 0 0 rgba(47,211,148,0); } }
@keyframes mnBar   { 0%,100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
.re-main > * { animation: mnRise .55s cubic-bezier(.22,1,.36,1) both; }

@media (max-width: 1200px) {
  .mn-how { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .mn-rig { grid-template-columns: 1fr; }
  .mn-rig-side { border-left: none; border-top: 1px solid var(--border); }
}
@media (max-width: 960px) {
  .re-shell { grid-template-columns: 1fr; }
  .re-sidebar { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform .3s cubic-bezier(.22,1,.36,1); }
  .re-sidebar.open { transform: none; box-shadow: 30px 0 60px rgba(0,0,0,.45); }
  .re-backdrop { display: block; position: fixed; inset: 0; z-index: 150; background: rgba(3,8,16,.55); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .re-backdrop.open { opacity: 1; pointer-events: auto; }
  .re-hamburger { display: flex; }
  .re-topbar { padding: 0 16px; }
}
@media (max-width: 640px) {
  .re-main { padding: 20px 16px 48px; }
  .mn-rig-main { padding: 20px; }
  .mn-rig-side div { padding: 14px 16px; }
  .mn-rig-side strong { font-size: 18px; }
  .mn-how { grid-template-columns: 1fr; }
  .mn-search { min-width: 0; flex: 1; }
  .mn-filters { width: 100%; }
  .mn-proj { grid-template-columns: 1fr 1fr; }
  .mn-proj div:last-child { grid-column: 1 / -1; }
  .mn-drawer { width: 100vw; border-left: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
`;

/* ═════════════════════════════════════════════════════════════════════════
   GLOBAL DESK SHELL — shared sidebar + topbar (matches the dashboard)
   The page keeps its own layout classes (re-sidebar, re-topbar) so its
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
const DK_ACTIVE = 'swap';
const DK_TITLE  = 'Swap';
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
    <aside className={`re-sidebar dk-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
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
    <header className="re-topbar dk-topbar">
      <button className="re-hamburger dk-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
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

/* Visual layer: palette, type and component polish for the re- page */
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
.re-page-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.4vw,46px) !important; line-height: 1.05 !important; letter-spacing: -.01em !important; color: var(--text); }
.re-page-title em, .re-page-title span { font-style: normal; color: var(--text) !important; }
.re-page-sub { font-size: 15px !important; color: var(--muted) !important; margin-top: 8px; }

/* Buttons */
.re-btn { border-radius: 10px !important; font-family: inherit !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.re-btn-accent { background: var(--accent) !important; color: #07101E !important; border: 1px solid transparent !important; }
.re-btn-accent:hover { filter: brightness(1.07); }
.re-btn-ghost { background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text) !important; }
.re-btn-ghost:hover { background: var(--surface) !important; }

/* Cards and metrics */
.re-metric, .re-card, .re-trader-card, .re-copying-card, .re-item-card, .re-lb-wrap, .re-plan-card,
.fc-card, .pr-card, .ev-card, .eco-side-card, .fc-table-wrap {
  border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -36px rgba(0,0,0,.6);
}
.re-trader-card, .re-item-card, .re-copying-card { transition: border-color .15s, transform .2s; }
.re-trader-card:hover, .re-item-card:hover { border-color: var(--border2) !important; transform: translateY(-2px); }
.re-metric-label { font-size: 13.5px !important; color: var(--muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-family: inherit !important; }
.re-metric-value { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-weight: 600 !important; font-size: 26px !important; letter-spacing: -.01em; }
.re-metric-sub { font-size: 13px !important; color: var(--muted) !important; font-family: inherit !important; }
.re-metric-icon { border-radius: 10px !important; }

/* Tabs, selects, inputs */
.re-tabs { background: var(--surface) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; padding: 4px !important; }
.re-tab { border-radius: 9px !important; font-family: inherit !important; font-weight: 600 !important; color: var(--muted); }
.re-tab.active { background: var(--accent) !important; color: #07101E !important; }
.re-select, .re-input, .re-filter-select, .re-login-input {
  border-radius: 10px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: inherit !important;
}
.re-select:focus, .re-input:focus, .re-filter-select:focus, .re-login-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); outline: none; }

/* Tables */
.re-table th, .fc-table-head { font-family: inherit !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; color: var(--faint) !important; }
.re-table td { font-variant-numeric: tabular-nums; }

/* Badges */
[class^="re-badge"], [class*=" re-badge"] { border-radius: 7px !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0 !important; text-transform: none !important; }

/* Modals */
.re-modal-overlay, .re-upgrade-overlay { background: rgba(3,8,16,.7) !important; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.re-modal, .re-upgrade-modal { border-radius: 20px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8) !important; }

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
.re-live-dot { background: var(--green) !important; }

/* Mono labels become calm sentence-case text */
[class*="-lbl"], [class*="-label"] { letter-spacing: 0 !important; }
`;


/* ─── Swap page styles ────────────────────────────────────────────────────── */
const SW_CSS = `
.sw-layout { display: grid; grid-template-columns: minmax(0, 480px) minmax(0, 1fr); gap: 22px; align-items: start; }
.sw-card { padding: 20px; }
.sw-box { padding: 14px 16px; border-radius: 14px; background: var(--surface2); border: 1px solid var(--border); }
.sw-box:focus-within { border-color: var(--accent); }
.sw-box-top { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.sw-box-top button { background: none; border: none; color: var(--accent); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; padding: 0; }
.sw-row { display: flex; align-items: center; gap: 10px; }
.sw-row input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font: inherit; font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.sw-row output { flex: 1; min-width: 0; font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-select { height: 42px; padding: 0 34px 0 12px; border-radius: 11px; border: 1px solid var(--border2); background: var(--surface); color: var(--text); font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position: calc(100% - 17px) 18px, calc(100% - 12px) 18px; background-size: 5px 5px; background-repeat: no-repeat; }
.sw-usd { font-size: 12.5px; color: var(--faint); margin-top: 6px; }
.sw-flip { display: flex; justify-content: center; margin: -10px 0; position: relative; z-index: 1; }
.sw-flip button { width: 40px; height: 40px; border-radius: 12px; border: 4px solid var(--surface); background: var(--surface2); color: var(--text); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.sw-flip button:hover { color: var(--accent); }
.sw-lines { display: grid; gap: 8px; margin: 16px 0; font-size: 13.5px; }
.sw-lines div { display: flex; justify-content: space-between; gap: 10px; }
.sw-lines span { color: var(--muted); }
.sw-err { font-size: 13.5px; color: var(--red); margin-bottom: 12px; }
.sw-go { width: 100%; height: 52px; font-size: 16px; }
.sw-side { display: grid; gap: 16px; }
.sw-bal { display: grid; gap: 8px; }
.sw-bal div { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--surface2); font-size: 14px; }
.sw-bal small { color: var(--faint); font-size: 12.5px; }
.sw-sym { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; font-size: 10.5px; font-weight: 800; margin-right: 10px; }
.sw-h { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.sw-empty { color: var(--muted); font-size: 14px; padding: 8px 0; }
.sw-table-wrap { overflow-x: auto; }
.sw-ok { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 10px 0 4px; }
.sw-ok svg { color: var(--green); }
.sw-modal-bg { position: fixed; inset: 0; z-index: 950; background: rgba(3,8,18,.7); display: flex; align-items: center; justify-content: center; padding: 16px; }
.sw-modal { width: 100%; max-width: 420px; padding: 22px; display: grid; gap: 14px; }
@media (max-width: 900px) { .sw-layout { grid-template-columns: minmax(0, 1fr); } .sw-layout > * { min-width: 0; } }
@media (max-width: 560px) { .sw-row input, .sw-row output { font-size: 22px; } .sw-modal-bg { align-items: flex-end; padding: 0; } .sw-modal { border-radius: 18px 18px 0 0 !important; } }
.sw-spin { animation: swSpin .8s linear infinite; }
@keyframes swSpin { to { transform: rotate(360deg); } }
`;

const SYM_COLORS = { USD:['#2FD394','rgba(47,211,148,.15)'], USDT:['#26A17B','rgba(38,161,123,.15)'], BTC:['#f59e0b','rgba(245,158,11,.15)'], ETH:['#8B9EFF','rgba(139,158,255,.15)'], EUR:['#B49BFF','rgba(180,155,255,.15)'], SOL:['#36C2B4','rgba(54,194,180,.15)'] };
const symStyle = (c) => { const [col, bg] = SYM_COLORS[c] || ['#E2AE4A', 'rgba(226,174,74,.15)']; return { color: col, background: bg }; };
const fmtAmt = (n, dec = 8) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: Math.min(dec, 8), minimumFractionDigits: dec <= 2 ? 2 : 0 });
const fmtUsd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const agoMins = (d) => Math.max(0, Math.round((Date.now() - new Date(d)) / 60000));

export default function Swap() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]       = useState(null);
  const [assets, setAssets]   = useState(null);
  const [settings, setSettings] = useState({ fee_pct: 0.5, max_price_age_mins: 60, min_usd: 5 });
  const [wallets, setWallets] = useState({});
  const [history, setHistory] = useState([]);
  const [from, setFrom]       = useState('USD');
  const [to, setTo]           = useState('BTC');
  const [amount, setAmount]   = useState('');
  const [quote, setQuote]     = useState(null);
  const [qErr, setQErr]       = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;
      const [profileRes, walletRes, settingsRes, assetRes, cfgRes, histRes] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance,currency').eq('user_id', uid),
        supabase.from('user_settings').select('theme,accent_color').eq('user_id', uid).maybeSingle(),
        supabase.from('swap_assets').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('swap_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('swaps').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!live) return;
      const st = settingsRes.data;
      if (st) {
        const dark = st.theme === 'dark' || (st.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || !st.theme;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        if (st.accent_color) { document.documentElement.style.setProperty('--accent', st.accent_color); document.documentElement.style.setProperty('--accent-dim', `${st.accent_color}24`); }
      }
      const w = {}; (walletRes.data || []).forEach(x => { w[String(x.currency).toUpperCase()] = Number(x.balance); });
      setWallets(w);
      setUser({ ...(profileRes.data || { email: session.user.email }), balance: w.USD, currency: 'USD' });
      setMissing(!!assetRes.error);
      const list = assetRes.error ? [] : (assetRes.data || []);
      setAssets(list);
      if (cfgRes.data) setSettings(cfgRes.data);
      setHistory(histRes.error ? [] : (histRes.data || []));
      if (list.length >= 2) {
        setFrom(f => (list.some(a => a.symbol === f) ? f : list[0].symbol));
        setTo(t => (list.some(a => a.symbol === t) ? t : list[1].symbol));
      }
    })();
    return () => { live = false; };
  }, [reloadKey]);

  const bySym = useMemo(() => Object.fromEntries((assets || []).map(a => [a.symbol, a])), [assets]);
  const A = bySym[from], B = bySym[to];
  const val = Number(amount) || 0;
  const bal = wallets[from] ?? 0;

  // Live estimate in the browser (display only); the database works out the real amount
  const est = useMemo(() => {
    if (!A || !B || !val) return null;
    const usdValue = val * Number(A.usd_price);
    const out = usdValue * (1 - Number(settings.fee_pct) / 100) / Number(B.usd_price);
    return { usdValue, out, rate: Number(A.usd_price) / Number(B.usd_price) };
  }, [A, B, val, settings.fee_pct]);

  // Ask the database for the exact quote (debounced)
  useEffect(() => {
    setQuote(null); setQErr('');
    if (!A || !B || !val || from === to) return undefined;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('swap_quote', { p_from: from, p_to: to, p_amount: val });
      if (error) setQErr(error.message); else setQuote(data);
    }, 350);
    return () => clearTimeout(t);
  }, [from, to, val, A, B]);

  const stale = (a) => a && a.symbol !== 'USD' && agoMins(a.updated_at) > Number(settings.max_price_age_mins);
  const problem =
    !assets ? '' :
    assets.length < 2 ? 'Swaps aren’t available yet.' :
    from === to ? 'Choose two different currencies.' :
    !val ? '' :
    val > bal ? `You have ${fmtAmt(bal, A?.decimals)} ${from}.` :
    est && est.usdValue < Number(settings.min_usd) ? `The minimum swap is ${fmtUsd(settings.min_usd)}.` :
    stale(A) || stale(B) ? 'Prices are being refreshed. Please try again shortly.' :
    qErr || '';

  const flip = () => { setFrom(to); setTo(from); setAmount(''); };
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const doSwap = async () => {
    if (!quote) return;
    setBusy(true); setQErr('');
    const { data, error } = await supabase.rpc('swap_currency', { p_from: from, p_to: to, p_amount: val, p_min_to_amount: Number(quote.to_amount) });
    setBusy(false);
    if (error) { setQErr(error.message); setConfirm(false); return; }
    setDone(data); setAmount(''); setReloadKey(k => k + 1);
  };

  const out = quote ? Number(quote.to_amount) : est ? est.out : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: SW_CSS }} />
      <div className={`re-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="re-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="re-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} onRefresh={() => setReloadKey(k => k + 1)} />
          <main className="re-main">
            <div style={{ marginBottom: 22 }}>
              <h1 className="re-page-title">Swap</h1>
              <p className="re-page-sub">Exchange between the currencies in your wallets instantly, at the rate shown.</p>
            </div>

            <div className="sw-layout">
              <section className="re-card sw-card" aria-label="Swap">
                {assets === null ? <div className="sw-empty">Loading…</div> : assets.length < 2 ? (
                  <div className="sw-empty">{missing ? 'Swaps aren’t set up yet. Please check back soon.' : 'Swaps aren’t available right now.'}</div>
                ) : (
                  <>
                    <div className="sw-box">
                      <div className="sw-box-top"><span>You pay</span><span>Balance {fmtAmt(bal, A?.decimals)} {from} <button type="button" onClick={() => setAmount(String(bal))}>Max</button></span></div>
                      <div className="sw-row">
                        <input inputMode="decimal" placeholder="0" value={amount} aria-label={`Amount of ${from} to swap`} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                        <select className="sw-select" value={from} aria-label="Currency you pay" onChange={e => { const v = e.target.value; if (v === to) setTo(from); setFrom(v); }}>
                          {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                        </select>
                      </div>
                      <div className="sw-usd">{est ? `≈ ${fmtUsd(est.usdValue)}` : ' '}</div>
                    </div>
                    <div className="sw-flip"><button type="button" onClick={flip} aria-label="Swap direction"><ArrowDownUp size={18} /></button></div>
                    <div className="sw-box">
                      <div className="sw-box-top"><span>You receive</span><span>Balance {fmtAmt(wallets[to] ?? 0, B?.decimals)} {to}</span></div>
                      <div className="sw-row">
                        <output aria-live="polite">{val ? fmtAmt(out, B?.decimals) : '0'}</output>
                        <select className="sw-select" value={to} aria-label="Currency you receive" onChange={e => { const v = e.target.value; if (v === from) setFrom(to); setTo(v); }}>
                          {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                        </select>
                      </div>
                      <div className="sw-usd">{est ? `≈ ${fmtUsd(est.usdValue * (1 - Number(settings.fee_pct) / 100))}` : ' '}</div>
                    </div>

                    <div className="sw-lines">
                      <div><span>Rate</span><strong>1 {from} = {A && B ? fmtAmt(Number(A.usd_price) / Number(B.usd_price), B.decimals) : '—'} {to}</strong></div>
                      <div><span>Fee</span><strong>{Number(settings.fee_pct)}%</strong></div>
                      <div><span>Prices updated</span><strong>{A && B ? `${Math.max(agoMins(A.updated_at), agoMins(B.updated_at))} min ago` : '—'}</strong></div>
                    </div>
                    {problem && <div className="sw-err" role="alert">{problem}</div>}
                    <button className="re-btn re-btn-accent sw-go" disabled={!val || !!problem || !quote} onClick={() => { setDone(null); setConfirm(true); }}>
                      <Repeat size={18} />{val ? `Swap ${from} to ${to}` : 'Enter an amount'}
                    </button>
                  </>
                )}
              </section>

              <div className="sw-side">
                <section className="re-card sw-card">
                  <div className="sw-h">Your balances</div>
                  <div className="sw-bal">
                    {(assets || []).map(a => (
                      <div key={a.symbol}>
                        <span style={{ display: 'flex', alignItems: 'center' }}><span className="sw-sym" style={symStyle(a.symbol)}>{a.symbol}</span>{a.name}</span>
                        <span style={{ textAlign: 'right' }}>{fmtAmt(wallets[a.symbol] ?? 0, a.decimals)} {a.symbol}<small style={{ display: 'block' }}>{fmtUsd((wallets[a.symbol] ?? 0) * Number(a.usd_price))}</small></span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="re-card sw-card">
                  <div className="sw-h">Recent swaps</div>
                  {history.length === 0 ? <div className="sw-empty">Your swaps will show here.</div> : (
                    <div className="sw-table-wrap">
                      <table className="re-table">
                        <thead><tr><th>Date</th><th>From</th><th>To</th></tr></thead>
                        <tbody>
                          {history.map(h => (
                            <tr key={h.id}>
                              <td>{new Date(h.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                              <td>−{fmtAmt(h.from_amount, bySym[h.from_currency]?.decimals)} {h.from_currency}</td>
                              <td className="up">+{fmtAmt(h.to_amount, bySym[h.to_currency]?.decimals)} {h.to_currency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      {confirm && (
        <div className="sw-modal-bg" onClick={() => !busy && setConfirm(false)}>
          <div className="re-card sw-modal" role="dialog" aria-modal="true" aria-label="Confirm swap" onClick={e => e.stopPropagation()}>
            {done ? (
              <div className="sw-ok">
                <CheckCircle2 size={44} />
                <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 28 }}>Swap complete</h3>
                <p style={{ color: 'var(--muted)' }}>{fmtAmt(done.from_amount, bySym[done.from]?.decimals)} {done.from} → <strong style={{ color: 'var(--text)' }}>{fmtAmt(done.to_amount, bySym[done.to]?.decimals)} {done.to}</strong>. Your balances are updated.</p>
                <button className="re-btn re-btn-accent" style={{ width: '100%' }} onClick={() => { setConfirm(false); setDone(null); }}>Done</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>Confirm swap</h3>
                <div className="sw-lines" style={{ margin: 0 }}>
                  <div><span>You pay</span><strong>{fmtAmt(val, A?.decimals)} {from}</strong></div>
                  <div><span>You receive</span><strong className="up">{quote ? fmtAmt(quote.to_amount, B?.decimals) : '—'} {to}</strong></div>
                  <div><span>Value</span><strong>{quote ? fmtUsd(quote.usd_value) : '—'}</strong></div>
                  <div><span>Fee</span><strong>{Number(settings.fee_pct)}%</strong></div>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--faint)' }}>If the price moves against you before this completes, the swap is cancelled and nothing changes.</p>
                {qErr && <div className="sw-err" role="alert">{qErr}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="re-btn re-btn-ghost" style={{ flex: '0 0 auto' }} disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
                  <button className="re-btn re-btn-accent" style={{ flex: 1 }} disabled={busy || !quote} onClick={doSwap}>{busy ? <><Loader2 size={16} className="sw-spin" />Swapping…</> : 'Confirm swap'}</button>
                </div>
              </>
            )}
          </div>
        </div>
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

