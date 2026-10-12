/**
 * mining.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cloud Mining — Route: /mining
 * Rent hashrate on a mining plan, pay from the wallet, watch earnings build up
 * in real time and see daily payouts land in the wallet.
 *
 * Data (see dashboard/mining_schema.sql):
 *   mining_plans              plans an admin publishes (coin, hashrate, price, term, daily return)
 *   mining_contracts          a user's contracts
 *   mining_payouts            daily earnings paid into the wallet
 *   start_mining_contract()   RPC: checks the wallet, debits it and starts the contract
 *   process_mining_payouts()  RPC: pays every full day earned (run by an admin or pg_cron)
 *
 * Paying: the user pays in crypto to a platform address and attaches a
 * screenshot (payment/CryptoCheckout.jsx). That files a *pending* contract,
 * which starts mining once an admin checks the proof (Admin → Mining).
 *
 * Until mining_plans has rows the page shows clearly labelled sample plans and
 * buying is turned off.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Pickaxe, Cpu, Zap, Search, X, ShieldCheck, CheckCircle2, Info, Wallet,
  Clock, TrendingUp, Activity, Coins, Gauge, ChevronRight,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, Settings as DkSettings, Headset as DkHeadset,
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
const DK_ACTIVE = 'mining';
const DK_TITLE  = 'Mining';
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


/* ─── Sample plans (shown only until mining_plans has rows) ───────────────── */
const SAMPLE_PLANS = [
  { id:'sample-btc-starter', name:'Bitcoin Starter', coin:'BTC', algorithm:'SHA-256', hashrate:10, hashrate_unit:'TH/s', min_investment:100, max_investment:999, duration_days:30, daily_return_pct:1.2,
    description:'An entry contract on our SHA-256 fleet. Earnings are paid daily to your wallet in USD for the full 30-day term.' },
  { id:'sample-btc-pro', name:'Bitcoin Pro', coin:'BTC', algorithm:'SHA-256', hashrate:120, hashrate_unit:'TH/s', min_investment:1000, max_investment:9999, duration_days:60, daily_return_pct:1.5, featured:true,
    description:'Dedicated hashrate on latest-generation ASIC miners with priority pool allocation and a longer 60-day term.' },
  { id:'sample-ltc', name:'Litecoin Scrypt', coin:'LTC', algorithm:'Scrypt', hashrate:500, hashrate_unit:'MH/s', min_investment:250, max_investment:5000, duration_days:45, daily_return_pct:1.3,
    description:'Merged Litecoin and Dogecoin mining on Scrypt hardware, settled daily to your wallet.' },
  { id:'sample-kas', name:'Kaspa Turbo', coin:'KAS', algorithm:'kHeavyHash', hashrate:2, hashrate_unit:'TH/s', min_investment:500, max_investment:20000, duration_days:90, daily_return_pct:1.8,
    description:'High-throughput kHeavyHash contract for Kaspa with a 90-day term.' },
  { id:'sample-etc', name:'Ethereum Classic', coin:'ETC', algorithm:'Etchash', hashrate:1, hashrate_unit:'GH/s', min_investment:200, max_investment:4000, duration_days:30, daily_return_pct:1.1,
    description:'GPU-based Etchash mining for Ethereum Classic, paid out daily.' },
  { id:'sample-doge', name:'Dogecoin Sprint', coin:'DOGE', algorithm:'Scrypt', hashrate:300, hashrate_unit:'MH/s', min_investment:100, max_investment:2500, duration_days:14, daily_return_pct:1.0,
    description:'A short two-week contract for trying cloud mining with a small amount.' },
];

const COIN_STYLE = {
  BTC:  { color:'#F7931A', label:'Bitcoin' },
  LTC:  { color:'#A6A9AA', label:'Litecoin' },
  KAS:  { color:'#49EACB', label:'Kaspa' },
  ETC:  { color:'#3AB83A', label:'Ethereum Classic' },
  DOGE: { color:'#C2A633', label:'Dogecoin' },
  XMR:  { color:'#FF6600', label:'Monero' },
  RVN:  { color:'#384182', label:'Ravencoin' },
};
const coinStyle = (c) => COIN_STYLE[String(c || '').toUpperCase()] || { color:'#5B8CFF', label:String(c || '').toUpperCase() };

const usd = (n, d = 2) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })}`;
const DAY = 86400000;

/* Contract maths: earnings accrue linearly over the term */
const dailyOf    = (c) => Number(c.amount || 0) * Number(c.daily_return_pct || 0) / 100;
const elapsedDays = (c, now = Date.now()) => {
  if (c.status !== 'active' && c.status !== 'completed') return 0;
  const start = new Date(c.started_at || c.created_at).getTime();
  return Math.max(0, Math.min(Number(c.duration_days || 0), (now - start) / DAY));
};
const accruedOf  = (c, now) => dailyOf(c) * elapsedDays(c, now);
const hashOf     = (c) => Number(c.hashrate || 0);

function CoinBadge({ coin, size = 44 }) {
  const s = coinStyle(coin);
  return (
    <div className="mn-coin" style={{ width:size, height:size, background:`${s.color}22`, color:s.color, border:`1px solid ${s.color}55` }}>
      {String(coin || '').toUpperCase().slice(0, 4)}
    </div>
  );
}

/* ─── Plan card ───────────────────────────────────────────────────────────── */
function PlanCard({ p, onOpen }) {
  const total = Number(p.daily_return_pct) * Number(p.duration_days);
  return (
    <button type="button" className={`re-card mn-plan${p.featured ? ' featured' : ''}`} onClick={() => onOpen(p)}>
      {p.featured && <span className="mn-flag">Most popular</span>}
      <div className="mn-plan-top">
        <CoinBadge coin={p.coin} />
        <div>
          <div className="mn-plan-name">{p.name}</div>
          <div className="mn-plan-algo">{coinStyle(p.coin).label} · {p.algorithm}</div>
        </div>
      </div>
      <div className="mn-rate">
        <strong>{Number(p.daily_return_pct).toFixed(2)}%</strong>
        <span>a day for {p.duration_days} days</span>
      </div>
      <div className="mn-facts">
        <div>From<strong>{usd(p.min_investment, 0)}</strong></div>
        <div>Hashrate<strong>{Number(p.hashrate)} {p.hashrate_unit}</strong></div>
        <div>Total return<strong className="up">{total.toFixed(0)}%</strong></div>
      </div>
      <span className="re-btn re-btn-ghost re-btn-sm" style={{ alignSelf:'flex-start' }}>Start mining <ChevronRight /></span>
    </button>
  );
}

/* ─── Buy drawer ──────────────────────────────────────────────────────────── */
function PlanDrawer({ p, isSample, userId, onClose, onBought }) {
  const min = Number(p.min_investment || 100);
  const max = Number(p.max_investment || 0) || 100000;
  const [amount, setAmount] = useState(String(min));
  const [stage, setStage]   = useState('form');   // form | pay | done
  const val     = Number(amount) || 0;
  const daily   = val * Number(p.daily_return_pct) / 100;
  const total   = daily * Number(p.duration_days);
  const hash    = Number(p.hashrate) * (val / min);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);

  const problem =
    isSample ? 'This is a sample plan, so buying is turned off.' :
    val < min ? `The minimum for this plan is ${usd(min, 0)}.` :
    val > max ? `The maximum for this plan is ${usd(max, 0)}.` : '';

  /* Called by CryptoCheckout once the proof is uploaded: file a pending contract */
  const submitPayment = async (pay) => {
    const { error: insErr } = await supabase.from('mining_contracts').insert({
      user_id: userId, plan_id: p.id, coin: p.coin, amount: val,
      daily_return_pct: p.daily_return_pct, duration_days: p.duration_days,
      hashrate: Number(hash.toFixed(4)), hashrate_unit: p.hashrate_unit, status: 'pending',
      pay_coin: pay.coin, pay_network: pay.network, pay_tx_hash: pay.txHash, proof_url: pay.proofPath,
    });
    if (insErr) throw insErr;
    setStage('done');
    onBought?.();
  };

  return (
    <>
      <div className="mn-overlay" onClick={onClose} />
      <aside className="mn-drawer" role="dialog" aria-modal="true" aria-label={p.name}>
        <div className="mn-drawer-head">
          <CoinBadge coin={p.coin} />
          <div>
            <div className="mn-drawer-name">{p.name}</div>
            <div className="mn-plan-algo">{coinStyle(p.coin).label} · {p.algorithm}</div>
          </div>
          <button className="mn-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {stage === 'done' ? (
          <div className="mn-drawer-body">
            <div className="mn-success">
              <CheckCircle2 size={48} />
              <div className="mn-drawer-name">Payment submitted</div>
              <p className="mn-desc">We've received your {usd(val)} payment for {p.name}. Your contract starts mining as soon as we confirm it, usually within a few hours, and then pays out every day for {p.duration_days} days.</p>
              <button className="re-btn re-btn-accent" style={{ marginTop:10 }} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : stage === 'pay' ? (
          <div className="mn-drawer-body">
            <p className="mn-desc">Send the payment and attach a screenshot. Your {hash.toLocaleString('en-US', { maximumFractionDigits:2 })} {p.hashrate_unit} contract starts once we confirm it.</p>
            <CryptoCheckout amount={val} label={`${p.name} · ${p.duration_days}-day contract`} userId={userId}
              context={`mining-${p.id}`} onSubmit={submitPayment} onBack={() => setStage('form')} />
          </div>
        ) : (
          <>
            <div className="mn-drawer-body">
              {p.description && <p className="mn-desc">{p.description}</p>}
              <div className="mn-facts-list">
                <div><span>Daily return</span><strong className="up">{Number(p.daily_return_pct).toFixed(2)}%</strong></div>
                <div><span>Term</span><strong>{p.duration_days} days</strong></div>
                <div><span>Hashrate from</span><strong>{Number(p.hashrate)} {p.hashrate_unit}</strong></div>
                <div><span>Limits</span><strong>{usd(min, 0)} – {usd(max, 0)}</strong></div>
                <div><span>Capital back at end</span><strong>{p.returns_principal === false ? 'No' : 'Yes'}</strong></div>
                <div><span>Paid</span><strong>Daily, in USD</strong></div>
              </div>

              <div className="mn-calc">
                <div className="mn-section-h">How much would you like to put in?</div>
                <label className="mn-amount">
                  <span>$</span>
                  <input inputMode="decimal" value={amount} aria-label="Contract amount in US dollars"
                    onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setStage('form'); }} />
                </label>
                <input className="mn-range" type="range" min={min} max={max} step={Math.max(1, Math.round(min / 10))}
                  value={Math.min(Math.max(val, min), max)} aria-label="Contract amount slider"
                  onChange={e => { setAmount(e.target.value); setStage('form'); }} />
                <div className="mn-proj">
                  <div><span>Your hashrate</span><strong>{hash.toLocaleString('en-US', { maximumFractionDigits:2 })} {p.hashrate_unit}</strong></div>
                  <div><span>Per day</span><strong className="up">{usd(daily)}</strong></div>
                  <div><span>Over {p.duration_days} days</span><strong className="up">+{usd(total)}</strong></div>
                </div>
                <p style={{ fontSize:12.5, color:'var(--faint)', marginTop:10 }}>Returns depend on network difficulty and coin prices. Figures shown are the plan's target, not a guarantee.</p>
                {problem && <div className="mn-err">{problem}</div>}
              </div>
            </div>
            <div className="mn-drawer-foot">
              <button className="re-btn re-btn-accent" disabled={!!problem || !userId} onClick={() => setStage('pay')}><Pickaxe />Continue to payment{val ? ` · ${usd(val, 0)}` : ''}</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ─── Live earnings counter ───────────────────────────────────────────────── */
function useNow(active, ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function Mining() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]           = useState(null);
  const [userId, setUserId]       = useState(null);
  const [balance, setBalance]     = useState(null);
  const [plans, setPlans]         = useState(null);   // null = loading
  const [isSample, setIsSample]   = useState(false);
  const [contracts, setContracts] = useState([]);
  const [payouts, setPayouts]     = useState([]);
  const [tab, setTab]             = useState('plans');
  const [coin, setCoin]           = useState('all');
  const [query, setQuery]         = useState('');
  const [sort, setSort]           = useState('return');
  const [open, setOpen]           = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;
      setUserId(uid);

      const [profileRes, walletRes, settingsRes, plansRes, conRes, payRes] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance,currency').eq('user_id', uid).eq('currency', 'USD').maybeSingle(),
        supabase.from('user_settings').select('theme,accent_color').eq('user_id', uid).maybeSingle(),
        supabase.from('mining_plans').select('*').eq('is_active', true).order('sort_order', { ascending:true }),
        supabase.from('mining_contracts').select('*, mining_plans(name,algorithm)').eq('user_id', uid).order('created_at', { ascending:false }),
        supabase.from('mining_payouts').select('*').eq('user_id', uid).order('created_at', { ascending:false }).limit(100),
      ]);
      if (!live) return;

      const st = settingsRes.data;
      if (st) {
        const dark = st.theme === 'dark' || (st.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || !st.theme;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        if (st.accent_color) {
          document.documentElement.style.setProperty('--accent', st.accent_color);
          document.documentElement.style.setProperty('--accent-dim', `${st.accent_color}24`);
          document.documentElement.style.setProperty('--accent-glow', `${st.accent_color}12`);
        }
      }

      const bal = walletRes.data ? Number(walletRes.data.balance) : null;
      setBalance(bal);
      setUser({ ...(profileRes.data || { email: session.user.email }), balance: bal ?? undefined, currency: 'USD' });

      const rows = plansRes.error ? [] : (plansRes.data || []);
      if (rows.length) { setPlans(rows); setIsSample(false); }
      else { setPlans(SAMPLE_PLANS); setIsSample(true); }

      setContracts(conRes.error ? [] : (conRes.data || []));
      setPayouts(payRes.error ? [] : (payRes.data || []));
    })();
    return () => { live = false; };
  }, [reloadKey]);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const active   = contracts.filter(c => c.status === 'active');
  const pending  = contracts.filter(c => c.status === 'pending');
  const now      = useNow(active.length > 0);
  const accrued  = active.reduce((s, c) => s + accruedOf(c, now), 0);
  const paidOut  = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
  const perDay   = active.reduce((s, c) => s + dailyOf(c), 0);
  const invested = active.reduce((s, c) => s + Number(c.amount || 0), 0);
  const hashByUnit = active.reduce((m, c) => { const u = c.hashrate_unit || 'TH/s'; m[u] = (m[u] || 0) + hashOf(c); return m; }, {});
  const hashText = Object.entries(hashByUnit).map(([u, v]) => `${v.toLocaleString('en-US', { maximumFractionDigits:2 })} ${u}`).join(' + ') || '0 TH/s';

  const coins = useMemo(() => ['all', ...Array.from(new Set((plans || []).map(p => String(p.coin).toUpperCase())))], [plans]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (plans || []).filter(p =>
      (coin === 'all' || String(p.coin).toUpperCase() === coin) &&
      (!q || `${p.name} ${p.coin} ${p.algorithm}`.toLowerCase().includes(q)));
    const by = {
      return: (a, b) => b.daily_return_pct * b.duration_days - a.daily_return_pct * a.duration_days,
      daily:  (a, b) => b.daily_return_pct - a.daily_return_pct,
      min:    (a, b) => a.min_investment - b.min_investment,
      short:  (a, b) => a.duration_days - b.duration_days,
    }[sort];
    return rows.slice().sort(by);
  }, [plans, coin, query, sort]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div className={`re-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="re-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="re-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} onRefresh={() => setReloadKey(k => k + 1)} />

          <main className="re-main">
            <div className="mn-head">
              <div>
                <h1 className="re-page-title">Cloud mining</h1>
                <p className="re-page-sub">Rent hashrate on our mining fleet without buying hardware. Pick a plan, pay from your wallet, and earnings are paid back to you every day of the term.</p>
              </div>
              <a href="/payments" className="re-btn re-btn-ghost"><Wallet />{balance != null ? `Wallet ${usd(balance)}` : 'Deposit funds'}</a>
            </div>

            {isSample && (
              <div className="mn-note">
                <Info size={18} />
                <span><strong>These are sample plans.</strong> Live plans appear here once an admin publishes them. Buying is turned off for samples.</span>
              </div>
            )}
            {pending.length > 0 && (
              <div className="mn-note">
                <Clock size={18} />
                <span><strong>{pending.length} {pending.length === 1 ? 'contract is' : 'contracts are'} awaiting approval.</strong> Mining starts as soon as it's confirmed.</span>
              </div>
            )}

            <section className="re-card mn-rig" aria-label="Mining status">
              <div className="mn-rig-main">
                <div className={`mn-live${active.length ? '' : ' idle'}`}><i />{active.length ? `Mining on ${active.length} ${active.length === 1 ? 'contract' : 'contracts'}` : 'No rigs running'}</div>
                <div className="mn-ticker" aria-live="off">{usd(accrued, 6)}<small>earned this term</small></div>
                <div className="mn-ticker-sub">{active.length ? `About ${usd(perDay)} a day · ${usd(perDay / 24, 4)} an hour` : 'Buy a contract below and your earnings will count up here in real time.'}</div>
                <div className={`mn-bars${active.length ? '' : ' idle'}`} aria-hidden="true">
                  {Array.from({ length: 36 }).map((_, i) => <span key={i} style={{ animationDelay:`${(i * 137) % 1600}ms`, height:`${30 + ((i * 53) % 70)}%` }} />)}
                </div>
              </div>
              <div className="mn-rig-side">
                <div><span><Gauge />Hashrate</span><strong>{hashText}</strong><em>Across active contracts</em></div>
                <div><span><Coins />In contracts</span><strong>{usd(invested)}</strong><em>{active.length} active</em></div>
                <div><span><TrendingUp />Paid out</span><strong className="up">{usd(paidOut)}</strong><em>To your wallet</em></div>
                <div><span><Activity />Per day</span><strong>{usd(perDay)}</strong><em>Expected</em></div>
              </div>
            </section>

            <div className="mn-bar">
              <div className="re-tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'plans'} className={`re-tab${tab === 'plans' ? ' active' : ''}`} onClick={() => setTab('plans')}>Plans</button>
                <button role="tab" aria-selected={tab === 'contracts'} className={`re-tab${tab === 'contracts' ? ' active' : ''}`} onClick={() => setTab('contracts')}>My contracts <b>{contracts.length}</b></button>
                <button role="tab" aria-selected={tab === 'payouts'} className={`re-tab${tab === 'payouts' ? ' active' : ''}`} onClick={() => setTab('payouts')}>Payouts</button>
              </div>
              {tab === 'plans' && (
                <div className="mn-filters">
                  <label className="mn-search"><Search size={16} /><input placeholder="Search plans" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search plans" /></label>
                  <select className="re-select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort plans">
                    <option value="return">Highest total return</option>
                    <option value="daily">Highest daily rate</option>
                    <option value="min">Lowest minimum</option>
                    <option value="short">Shortest term</option>
                  </select>
                </div>
              )}
            </div>

            {tab === 'plans' && (
              <>
                <div className="mn-chips">
                  {coins.map(c => <button key={c} className={`mn-chip${coin === c ? ' active' : ''}`} onClick={() => setCoin(c)}>{c === 'all' ? 'All coins' : c}</button>)}
                </div>
                {plans === null ? (
                  <div className="re-card mn-empty">Loading plans…</div>
                ) : list.length === 0 ? (
                  <div className="re-card mn-empty"><strong>No plans match</strong><span>Try a different coin or search term.</span></div>
                ) : (
                  <div className="mn-grid">{list.map(p => <PlanCard key={p.id} p={p} onOpen={setOpen} />)}</div>
                )}
              </>
            )}

            {tab === 'contracts' && (
              <div className="re-card">
                {contracts.length === 0 ? (
                  <div className="mn-empty">
                    <Cpu size={36} style={{ color:'var(--faint)' }} />
                    <strong>You haven't started mining yet</strong>
                    <span>Contracts you buy will show here with their progress and earnings.</span>
                    <button className="re-btn re-btn-accent" style={{ marginTop:6 }} onClick={() => setTab('plans')}>Browse plans</button>
                  </div>
                ) : (
                  <div className="mn-table-wrap">
                    <table className="re-table">
                      <thead><tr><th>Plan</th><th className="r">Amount</th><th className="r">Hashrate</th><th className="r">Per day</th><th className="r">Earned</th><th>Progress</th><th>Ends</th><th>Status</th></tr></thead>
                      <tbody>
                        {contracts.map(c => {
                          const days = elapsedDays(c, now);
                          const pct = Number(c.duration_days) ? Math.round(days / Number(c.duration_days) * 100) : 0;
                          return (
                            <tr key={c.id}>
                              <td>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                  <CoinBadge coin={c.coin} size={34} />
                                  <div><div style={{ fontWeight:600 }}>{c.mining_plans?.name || `${c.coin} contract`}</div><div style={{ fontSize:13, color:'var(--muted)' }}>{c.mining_plans?.algorithm || coinStyle(c.coin).label}</div></div>
                                </div>
                              </td>
                              <td className="r">{usd(c.amount)}</td>
                              <td className="r">{Number(c.hashrate || 0).toLocaleString('en-US', { maximumFractionDigits:2 })} {c.hashrate_unit}</td>
                              <td className="r">{usd(dailyOf(c))}</td>
                              <td className="r up">{usd(c.status === 'active' ? accruedOf(c, now) : Number(c.total_earned || 0))}</td>
                              <td>
                                <div className="mn-progress"><span style={{ width:`${pct}%` }} /></div>
                                <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:4 }}>Day {Math.floor(days)} of {c.duration_days}</div>
                              </td>
                              <td>{fmtDate(c.ends_at)}</td>
                              <td><span className={`mn-status ${c.status}`}>{c.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'payouts' && (
              <div className="re-card">
                {payouts.length === 0 ? (
                  <div className="mn-empty"><Zap size={36} style={{ color:'var(--faint)' }} /><strong>No payouts yet</strong><span>Daily earnings from active contracts are listed here once they're paid.</span></div>
                ) : (
                  <div className="mn-table-wrap">
                    <table className="re-table">
                      <thead><tr><th>Date</th><th>Coin</th><th>Days covered</th><th className="r">Amount</th></tr></thead>
                      <tbody>
                        {payouts.map(p => (
                          <tr key={p.id}>
                            <td>{new Date(p.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                            <td>{p.coin || '—'}</td>
                            <td>{p.days ?? 1}</td>
                            <td className="r up">+{usd(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="mn-how">
              {[
                { t:'Pick a plan', d:'Each plan sets the coin, the hashrate you rent, the term and the daily rate.' },
                { t:'Pay from your wallet', d:'Your contract starts mining straight away, with hashrate in proportion to what you put in.' },
                { t:'Earn every day', d:'Your share of mining rewards is paid into your wallet in USD each day.' },
                { t:'Term ends', d:'The contract closes. On plans with capital back, the amount you put in returns to your wallet too.' },
              ].map((s, i) => (
                <div key={s.t} className="re-card mn-how-step">
                  <div className="mn-how-n">{i + 1}</div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
            <p className="mn-risk"><ShieldCheck size={14} style={{ verticalAlign:'-2px', marginRight:6 }} />Mining income depends on network difficulty, coin prices and hardware uptime, so actual returns can be lower than the plan's target. Check each plan's terms for whether your capital is returned at the end of the contract.</p>
          </main>
        </div>
      </div>

      {open && (
        <PlanDrawer
          p={open} isSample={isSample || String(open.id).startsWith('sample-')} userId={userId}
          onClose={() => setOpen(null)}
          onBought={() => setReloadKey(k => k + 1)}
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
