/**
 * Staking.jsx — Route: /staking
 * ─────────────────────────────────────────────────────────────────────────────
 * Pick a staking plan (coin, APY, lock period) and pay in crypto with a proof
 * screenshot (payment/CryptoCheckout.jsx). The stake is pending until an admin
 * confirms the payment (Admin → Staking); rewards are then paid into the USD
 * wallet daily and the stake is returned when the lock ends.
 * Data: staking_plans, stakes — database/15_staking_swap_schema.sql
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X, Layers, Clock, Info, ShieldCheck, CheckCircle2, ChevronRight,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";
import CryptoCheckout from "../payment/CryptoCheckout";

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
const DK_ACTIVE = 'staking';
const DK_TITLE  = 'Staking';
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


/* ─── Staking page styles ─────────────────────────────────────────────────── */
const ST_CSS = `
.st-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 22px; }
.st-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
.st-stat { padding: 18px; }
.st-stat span { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
.st-stat strong { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.st-stat small { display: block; font-size: 12.5px; color: var(--faint); margin-top: 4px; }
.st-tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); margin-bottom: 18px; }
.st-tab { height: 36px; padding: 0 16px; border-radius: 9px; border: none; background: none; color: var(--muted); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.st-tab.on { background: var(--accent); color: #07101E; }
.st-tab em { font-style: normal; margin-left: 6px; font-size: 12px; opacity: .8; }
.st-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.st-plan { position: relative; padding: 20px; display: flex; flex-direction: column; gap: 14px; text-align: left; cursor: pointer; color: inherit; font: inherit; border: 1px solid var(--border); transition: border-color .15s, transform .15s; }
.st-plan:hover { border-color: var(--accent); transform: translateY(-2px); }
.st-plan-top { display: flex; align-items: center; gap: 12px; }
.st-coin { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; letter-spacing: .02em; flex-shrink: 0; }
.st-plan h3 { font-size: 16px; font-weight: 600; }
.st-plan-sub { font-size: 13px; color: var(--muted); }
.st-apy { font-family: 'Instrument Serif', Georgia, serif; font-size: 42px; line-height: 1; color: var(--accent); }
.st-apy small { font-family: 'Instrument Sans', system-ui, sans-serif; font-size: 13px; color: var(--muted); margin-left: 6px; }
.st-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; }
.st-facts div { padding: 8px 10px; border-radius: 9px; background: var(--surface2); }
.st-facts span { display: block; color: var(--faint); font-size: 11.5px; }
.st-badge { position: absolute; top: 14px; right: 14px; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); }
.st-cta { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: var(--accent); }
.st-table-wrap { overflow-x: auto; }
.st-status { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; text-transform: capitalize; background: var(--surface2); color: var(--muted); }
.st-status.active { background: var(--green-dim); color: var(--green); }
.st-status.pending { background: var(--accent-dim); color: var(--accent); }
.st-status.rejected { background: rgba(255,100,112,.12); color: var(--red); }
.st-progress { height: 6px; width: 120px; border-radius: 3px; background: var(--surface2); overflow: hidden; }
.st-progress span { display: block; height: 100%; background: var(--accent); }
.st-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 46px 20px; text-align: center; color: var(--muted); font-size: 14px; }
.st-empty strong { color: var(--text); font-size: 16px; }
.st-note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; margin-bottom: 18px; border-radius: 12px; background: var(--accent-dim); border: 1px solid rgba(226,174,74,.25); font-size: 14px; }
.st-note svg { flex-shrink: 0; color: var(--accent); margin-top: 2px; }
.st-how { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 26px; }
.st-how > div { padding: 18px; }
.st-how b { display: inline-flex; width: 26px; height: 26px; border-radius: 50%; align-items: center; justify-content: center; background: var(--accent-dim); color: var(--accent); font-size: 13px; margin-bottom: 10px; }
.st-how h4 { font-size: 15px; margin-bottom: 4px; }
.st-how p { font-size: 13.5px; color: var(--muted); }
.st-risk { font-size: 12.5px; color: var(--faint); margin-top: 18px; }

/* drawer */
.st-overlay { position: fixed; inset: 0; z-index: 900; background: rgba(3,8,18,.6); backdrop-filter: blur(3px); }
.st-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 901; width: min(460px, 100%); background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; animation: stIn .2s ease; }
@keyframes stIn { from { transform: translateX(30px); opacity: 0; } }
.st-drawer-head { display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid var(--border); }
.st-close { margin-left: auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface2); color: var(--text); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.st-drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: grid; gap: 16px; align-content: start; }
.st-amount { display: flex; align-items: center; gap: 6px; height: 54px; padding: 0 14px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); }
.st-amount span { font-size: 20px; color: var(--muted); }
.st-amount input { flex: 1; min-width: 0; height: 100%; background: none; border: none; outline: none; color: var(--text); font: inherit; font-size: 22px; font-weight: 600; }
.st-amount:focus-within { border-color: var(--accent); }
.st-proj { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.st-proj div { padding: 10px; border-radius: 10px; background: var(--surface2); }
.st-proj span { display: block; font-size: 11.5px; color: var(--faint); }
.st-proj strong { font-size: 15px; }
.st-err { font-size: 13.5px; color: var(--red); }
.st-drawer-foot { padding: 16px 20px; border-top: 1px solid var(--border); }
.st-drawer-foot .re-btn { width: 100%; height: 50px; font-size: 15.5px; }
.st-success { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 30px 10px; }
.st-success svg { color: var(--green); }

@media (max-width: 1000px) { .st-stats, .st-how { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .st-stats, .st-how { grid-template-columns: 1fr 1fr; } .st-stat strong { font-size: 19px; } .st-proj { grid-template-columns: 1fr 1fr; } }
`;

const COIN_COLORS = { BTC:['#f59e0b','rgba(245,158,11,.15)'], ETH:['#8B9EFF','rgba(139,158,255,.15)'], SOL:['#36C2B4','rgba(54,194,180,.15)'], USDT:['#2FD394','rgba(47,211,148,.15)'], BNB:['#F3BA2F','rgba(243,186,47,.15)'] };
const coinStyle = (c) => { const [col, bg] = COIN_COLORS[String(c).toUpperCase()] || ['#E2AE4A', 'rgba(226,174,74,.15)']; return { color: col, background: bg }; };
const usd = (n, d = 2) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
const dailyOf = (s) => Number(s.amount) * Number(s.apy_pct) / 100 / 365;

/* ─── Stake drawer ────────────────────────────────────────────────────────── */
function StakeDrawer({ p, userId, onClose, onStaked }) {
  const min = Number(p.min_amount || 100);
  const max = Number(p.max_amount || 0) || null;
  const [amount, setAmount] = useState(String(Math.max(min, 500)));
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const val = Number(amount) || 0;
  const daily = val * Number(p.apy_pct) / 100 / 365;
  const total = daily * Number(p.lock_days);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && !paying) onClose(); };
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose, paying]);

  const problem = val < min ? `The minimum for this plan is ${usd(min, 0)}.` : max && val > max ? `The maximum for this plan is ${usd(max, 0)}.` : '';

  /* Called by the payment popup once the proof is uploaded: file a pending stake */
  const submitPayment = async (pay) => {
    const { error } = await supabase.from('stakes').insert({
      user_id: userId, plan_id: p.id, plan_name: p.name, coin: p.coin, status: 'pending', amount: val, apy_pct: p.apy_pct, lock_days: p.lock_days,
      pay_coin: pay.coin, pay_network: pay.network, pay_tx_hash: pay.txHash, proof_url: pay.proofPath, payment_tx_id: pay.transactionId,
    });
    if (error) throw new Error(error.message);
    setPaying(false); setDone(true); onStaked?.();
  };

  return (
    <>
      <div className="st-overlay" onClick={() => !paying && onClose()} />
      <aside className="st-drawer" role="dialog" aria-modal="true" aria-label={`Stake in ${p.name}`}>
        <div className="st-drawer-head">
          <div className="st-coin" style={coinStyle(p.coin)}>{p.coin}</div>
          <div><h3 style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</h3><div className="st-plan-sub">{Number(p.apy_pct)}% APY · {p.lock_days}-day lock</div></div>
          <button className="st-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {done ? (
          <div className="st-drawer-body">
            <div className="st-success">
              <CheckCircle2 size={48} />
              <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 28 }}>Payment submitted</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>We've received your {usd(val)} payment for {p.name}. Your stake starts as soon as we confirm it, usually within a few hours, and rewards are paid into your wallet every day after that.</p>
              <button className="re-btn re-btn-accent" style={{ marginTop: 8 }} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="st-drawer-body">
              {p.description && <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>{p.description}</p>}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>How much would you like to stake?</div>
                <label className="st-amount"><span>$</span>
                  <input inputMode="decimal" value={amount} aria-label="Stake amount in US dollars" onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                </label>
                <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 6 }}>Limits {usd(min, 0)}{max ? ` – ${usd(max, 0)}` : '+'}</div>
              </div>
              <div className="st-proj">
                <div><span>Per day</span><strong className="up">{usd(daily)}</strong></div>
                <div><span>Over {p.lock_days} days</span><strong className="up">+{usd(total)}</strong></div>
                <div><span>Unlocks</span><strong>{fmtDate(Date.now() + p.lock_days * 86400000)}</strong></div>
              </div>
              <div className="st-note" style={{ marginBottom: 0 }}><Info size={16} /><span>Your {usd(val || 0)} is locked for {p.lock_days} days and returned to your wallet at the end. Rewards are paid daily in USD.</span></div>
              {problem && <div className="st-err">{problem}</div>}
            </div>
            <div className="st-drawer-foot">
              <button className="re-btn re-btn-accent" disabled={!!problem || !userId} onClick={() => setPaying(true)}><Layers size={17} />Stake {usd(val, 0)}</button>
            </div>
          </>
        )}
      </aside>
      {paying && (
        <CryptoCheckout
          title="Staking payment"
          amount={val}
          label={`${p.name} · ${p.lock_days}-day lock`}
          confirmLabel="Confirm staking payment"
          userId={userId}
          context={`staking-${p.id}`}
          transaction={{ type: 'staking_purchase', description: `Staking: ${p.name} (${p.lock_days} days)` }}
          onSubmit={submitPayment}
          onClose={() => setPaying(false)}
        />
      )}
    </>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function Staking() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]       = useState(null);
  const [userId, setUserId]   = useState(null);
  const [plans, setPlans]     = useState(null);
  const [stakes, setStakes]   = useState([]);
  const [tab, setTab]         = useState('plans');
  const [open, setOpen]       = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;
      setUserId(uid);
      const [profileRes, walletRes, settingsRes, plansRes, stakesRes] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance,currency').eq('user_id', uid).eq('currency', 'USD').maybeSingle(),
        supabase.from('user_settings').select('theme,accent_color').eq('user_id', uid).maybeSingle(),
        supabase.from('staking_plans').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('stakes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      if (!live) return;
      const st = settingsRes.data;
      if (st) {
        const dark = st.theme === 'dark' || (st.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || !st.theme;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        if (st.accent_color) { document.documentElement.style.setProperty('--accent', st.accent_color); document.documentElement.style.setProperty('--accent-dim', `${st.accent_color}24`); }
      }
      const bal = walletRes.data ? Number(walletRes.data.balance) : null;
      setUser({ ...(profileRes.data || { email: session.user.email }), balance: bal ?? undefined, currency: 'USD' });
      setMissing(!!plansRes.error);
      setPlans(plansRes.error ? [] : (plansRes.data || []));
      setStakes(stakesRes.error ? [] : (stakesRes.data || []));
    })();
    return () => { live = false; };
  }, [reloadKey]);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };
  const active   = stakes.filter(s => s.status === 'active');
  const pending  = stakes.filter(s => s.status === 'pending');
  const staked   = active.reduce((a, s) => a + Number(s.amount), 0);
  const earned   = stakes.reduce((a, s) => a + Number(s.rewards_paid || 0), 0);
  const perDay   = active.reduce((a, s) => a + dailyOf(s), 0);
  const avgApy   = staked ? active.reduce((a, s) => a + Number(s.apy_pct) * Number(s.amount), 0) / staked : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: ST_CSS }} />
      <div className={`re-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="re-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="re-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} onRefresh={() => setReloadKey(k => k + 1)} />
          <main className="re-main">
            <div className="st-head">
              <div>
                <h1 className="re-page-title">Staking</h1>
                <p className="re-page-sub">Lock your funds in a staking plan and earn a fixed yearly rate, paid into your wallet every day. Your stake comes back to you when the lock ends.</p>
              </div>
            </div>

            {pending.length > 0 && (
              <div className="st-note"><Clock size={18} /><span><strong>{pending.length} {pending.length === 1 ? 'stake is' : 'stakes are'} awaiting confirmation.</strong> Rewards start as soon as we confirm the payment.</span></div>
            )}

            <section className="st-stats" aria-label="Your staking">
              <div className="re-card st-stat"><span>Staked now</span><strong>{usd(staked)}</strong><small>{active.length} active</small></div>
              <div className="re-card st-stat"><span>Rewards earned</span><strong className="up">+{usd(earned)}</strong><small>Paid to your wallet</small></div>
              <div className="re-card st-stat"><span>Earning per day</span><strong>{usd(perDay)}</strong><small>About {usd(perDay * 30)} a month</small></div>
              <div className="re-card st-stat"><span>Average APY</span><strong>{avgApy.toFixed(2)}%</strong><small>Across active stakes</small></div>
            </section>

            <div className="st-tabs" role="tablist">
              <button className={`st-tab${tab === 'plans' ? ' on' : ''}`} onClick={() => setTab('plans')} role="tab" aria-selected={tab === 'plans'}>Plans</button>
              <button className={`st-tab${tab === 'mine' ? ' on' : ''}`} onClick={() => setTab('mine')} role="tab" aria-selected={tab === 'mine'}>My stakes<em>{stakes.length}</em></button>
            </div>

            {tab === 'plans' && (plans === null ? <div className="re-card st-empty">Loading plans…</div>
              : plans.length === 0 ? (
                <div className="re-card st-empty"><Layers size={34} style={{ color: 'var(--faint)' }} /><strong>No staking plans yet</strong><span>{missing ? 'Staking isn’t set up yet. Please check back soon.' : 'New plans will appear here soon.'}</span></div>
              ) : (
                <div className="st-grid">
                  {plans.map(p => (
                    <button key={p.id} type="button" className="re-card st-plan" onClick={() => setOpen(p)}>
                      {p.featured && <span className="st-badge">Popular</span>}
                      <div className="st-plan-top"><div className="st-coin" style={coinStyle(p.coin)}>{p.coin}</div><div><h3>{p.name}</h3><div className="st-plan-sub">{p.coin} staking</div></div></div>
                      <div className="st-apy">{Number(p.apy_pct)}%<small>APY</small></div>
                      <div className="st-facts">
                        <div><span>Lock period</span>{p.lock_days} days</div>
                        <div><span>Minimum</span>{usd(p.min_amount, 0)}</div>
                      </div>
                      <span className="st-cta">Stake now<ChevronRight size={16} /></span>
                    </button>
                  ))}
                </div>
              ))}

            {tab === 'mine' && (stakes.length === 0 ? (
              <div className="re-card st-empty"><Layers size={34} style={{ color: 'var(--faint)' }} /><strong>No stakes yet</strong><span>Choose a plan to start earning.</span></div>
            ) : (
              <div className="re-card st-table-wrap">
                <table className="re-table">
                  <thead><tr><th>Plan</th><th className="r">Amount</th><th className="r">APY</th><th className="r">Rewards</th><th>Progress</th><th>Unlocks</th><th>Status</th></tr></thead>
                  <tbody>
                    {stakes.map(s => {
                      const pct = s.started_at && s.ends_at ? Math.min(100, Math.max(0, (Date.now() - new Date(s.started_at)) / (new Date(s.ends_at) - new Date(s.started_at)) * 100)) : 0;
                      return (
                        <tr key={s.id}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="st-coin" style={{ ...coinStyle(s.coin), width: 34, height: 34, fontSize: 11 }}>{s.coin}</div><div>{s.plan_name || s.coin}<div style={{ fontSize: 12, color: 'var(--faint)' }}>{fmtDate(s.created_at)}</div></div></div></td>
                          <td className="r">{usd(s.amount)}</td>
                          <td className="r">{Number(s.apy_pct)}%</td>
                          <td className="r up">+{usd(s.rewards_paid)}</td>
                          <td>{s.status === 'active' ? <><div className="st-progress"><span style={{ width: `${pct}%` }} /></div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{Math.round(pct)}% of {s.lock_days} days</div></> : '—'}</td>
                          <td>{fmtDate(s.ends_at)}</td>
                          <td><span className={`st-status ${s.status}`}>{s.status === 'pending' ? 'Confirming' : s.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            <div className="st-how">
              {[
                { t: 'Pick a plan', d: 'Each plan sets the coin, the yearly rate (APY) and how long your funds are locked.' },
                { t: 'Pay in crypto', d: 'Send the amount to our address and upload the payment proof. We confirm it within hours.' },
                { t: 'Earn every day', d: 'Rewards are worked out daily from the APY and paid into your USD wallet.' },
                { t: 'Lock ends', d: 'The amount you staked is returned to your wallet automatically.' },
              ].map((s, i) => <div key={s.t} className="re-card"><b>{i + 1}</b><h4>{s.t}</h4><p>{s.d}</p></div>)}
            </div>
            <p className="st-risk"><ShieldCheck size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Staking rewards depend on network conditions and the plan's terms. Your stake can't be withdrawn before the lock period ends.</p>
          </main>
        </div>
      </div>
      {open && <StakeDrawer p={open} userId={userId} onClose={() => setOpen(null)} onStaked={() => setReloadKey(k => k + 1)} />}
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

