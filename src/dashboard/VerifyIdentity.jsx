/**
 * VerifyIdentity.jsx — Route: /verify-identity
 * ─────────────────────────────────────────────────────────────────────────────
 * Identity verification (KYC). The user enters their details, uploads a
 * government ID; an admin reviews it (Admin → Identity).
 *
 *   identity_verifications   one row per submission (pending → approved / rejected)
 *   storage "identity-documents"  private bucket, files under <user id>/
 *   users.is_verified        set by the database when a submission is approved
 *
 * See database/09_identity_account_schema.sql.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck, BadgeCheck, Clock, AlertCircle, Upload, FileText, BookOpen, CreditCard, Car,
  Check, ChevronLeft, ChevronRight, Loader2, Lock, RefreshCcw,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";
import { fetchIdentity, IDENTITY_BUCKET } from "../account/accountState";

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
const DK_ACTIVE = 'identity';
const DK_TITLE  = 'Verify identity';
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



/* ─── Identity page styles ────────────────────────────────────────────────── */
const ID_CSS = `
.id-wrap { max-width: 920px; }
.id-head { margin-bottom: 22px; }
.id-status { display: flex; gap: 16px; align-items: flex-start; padding: 22px; margin-bottom: 20px; }
.id-status-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.id-status-icon svg { width: 24px; height: 24px; }
.id-status h2 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 26px; line-height: 1.15; margin-bottom: 4px; }
.id-status p { color: var(--muted); font-size: 14.5px; }
.id-status.ok .id-status-icon { background: var(--green-dim); color: var(--green); }
.id-status.wait .id-status-icon { background: var(--accent-dim); color: var(--accent); }
.id-status.bad { border-color: rgba(255,100,112,.35); }
.id-status.bad .id-status-icon { background: rgba(255,100,112,.12); color: var(--red); }
.id-status.intro .id-status-icon { background: var(--accent-dim); color: var(--accent); }
.id-reason { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(255,100,112,.08); border: 1px solid rgba(255,100,112,.22); color: var(--text); font-size: 14px; }
.id-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 14px; }
.id-facts div { padding: 10px 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); }
.id-facts span { display: block; font-size: 12px; color: var(--faint); }
.id-facts strong { font-size: 14px; font-weight: 600; }
.id-why { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
.id-why > div { display: flex; gap: 12px; padding: 16px; }
.id-why svg { width: 20px; height: 20px; color: var(--accent); flex-shrink: 0; margin-top: 2px; }
.id-why strong { display: block; font-size: 14.5px; margin-bottom: 2px; }
.id-why span { font-size: 13.5px; color: var(--muted); }

.id-form { padding: 0; overflow: hidden; }
.id-steps { display: flex; border-bottom: 1px solid var(--border); }
.id-step { flex: 1; display: flex; align-items: center; gap: 10px; padding: 16px 18px; font-size: 14px; font-weight: 600; color: var(--faint); border: none; background: none; cursor: default; text-align: left; font-family: inherit; }
.id-step i { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-style: normal; font-size: 13px; border: 1px solid var(--border2); flex-shrink: 0; }
.id-step.on { color: var(--text); }
.id-step.on i { background: var(--accent); border-color: var(--accent); color: #07101E; }
.id-step.done { color: var(--muted); cursor: pointer; }
.id-step.done i { background: var(--green-dim); border-color: transparent; color: var(--green); }
.id-step.done i svg { width: 14px; height: 14px; }
.id-body { padding: 24px; display: grid; gap: 18px; }
.id-body h3 { font-size: 17px; font-weight: 600; }
.id-body h3 + p { color: var(--muted); font-size: 14px; margin-top: -12px; }
.id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.id-grid .full { grid-column: 1 / -1; }
.id-field { display: grid; gap: 6px; }
.id-field > span { font-size: 13px; font-weight: 600; color: var(--muted); }
.id-field > span em { font-style: normal; font-weight: 400; color: var(--faint); }
.id-input { height: 44px; padding: 0 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: 14.5px; outline: none; width: 100%; }
.id-input:focus { border-color: var(--accent); }
.id-input[aria-invalid="true"] { border-color: var(--red); }
.id-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.id-type { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface2); cursor: pointer; font: inherit; color: var(--text); text-align: left; }
.id-type svg { width: 20px; height: 20px; color: var(--muted); }
.id-type strong { font-size: 14px; }
.id-type span { font-size: 12px; color: var(--faint); }
.id-type.sel { border-color: var(--accent); background: var(--accent-dim); }
.id-type.sel svg { color: var(--accent); }
.id-uploads { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.id-drop { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 170px; padding: 18px; border-radius: 12px; border: 1px dashed var(--border2); background: var(--surface2); color: var(--muted); font: inherit; font-size: 13.5px; text-align: center; cursor: pointer; overflow: hidden; }
.id-drop:hover { border-color: var(--accent); color: var(--text); }
.id-drop svg { width: 24px; height: 24px; }
.id-drop strong { color: var(--text); font-size: 14px; }
.id-drop.has { border-style: solid; padding: 0; }
.id-drop img { width: 100%; height: 100%; min-height: 170px; max-height: 220px; object-fit: cover; display: block; }
.id-drop .id-pdf { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px; }
.id-drop .id-swap { position: absolute; right: 8px; bottom: 8px; padding: 5px 10px; border-radius: 8px; background: rgba(7,16,30,.8); color: #fff; font-size: 12px; font-weight: 600; }
.id-tips { display: grid; gap: 6px; padding: 14px 16px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); font-size: 13.5px; color: var(--muted); }
.id-tips div { display: flex; gap: 8px; align-items: flex-start; }
.id-tips svg { width: 15px; height: 15px; color: var(--green); flex-shrink: 0; margin-top: 3px; }
.id-review { display: grid; gap: 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.id-review div { display: flex; justify-content: space-between; gap: 16px; padding: 11px 14px; font-size: 14px; border-bottom: 1px solid var(--border); }
.id-review div:last-child { border-bottom: none; }
.id-review span { color: var(--muted); }
.id-review strong { font-weight: 600; text-align: right; }
.id-thumbs { display: flex; gap: 10px; flex-wrap: wrap; }
.id-thumbs figure { width: 120px; }
.id-thumbs img, .id-thumbs .id-thumb-pdf { width: 120px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; background: var(--surface2); color: var(--muted); }
.id-thumbs figcaption { font-size: 12px; color: var(--faint); margin-top: 4px; }
.id-consent { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: var(--muted); cursor: pointer; }
.id-consent input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--accent); flex-shrink: 0; }
.id-err { display: flex; gap: 8px; align-items: flex-start; padding: 11px 14px; border-radius: 10px; background: rgba(255,100,112,.08); border: 1px solid rgba(255,100,112,.25); color: var(--red); font-size: 14px; }
.id-err svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
.id-foot { display: flex; justify-content: space-between; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border); background: var(--surface2); }
.id-foot .re-btn { min-width: 130px; }
.id-secure { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--faint); margin-top: 14px; }
.id-secure svg { width: 15px; height: 15px; }
.id-spin { animation: idSpin .8s linear infinite; }
@keyframes idSpin { to { transform: rotate(360deg); } }
.id-skel { height: 120px; border-radius: 16px; background: linear-gradient(90deg, var(--surface) 0%, var(--surface2) 50%, var(--surface) 100%); background-size: 200% 100%; animation: idShimmer 1.4s ease infinite; }
@keyframes idShimmer { to { background-position: -200% 0; } }

@media (max-width: 760px) {
  .id-grid, .id-uploads { grid-template-columns: 1fr; }
  .id-types { grid-template-columns: 1fr 1fr; }
  .id-step { padding: 14px 10px; font-size: 0; gap: 0; justify-content: center; }
  .id-step i { font-size: 13px; }
  .id-body { padding: 18px 16px; }
  .id-foot { padding: 14px 16px; }
  .id-foot .re-btn { min-width: 0; flex: 1; }
  .id-status { padding: 18px 16px; }
}
`;

/* ─── Constants ───────────────────────────────────────────────────────────── */
const DOC_TYPES = [
  { key:'passport',          label:'Passport',          sub:'Photo page only',  Icon:BookOpen,  back:false },
  { key:'national_id',       label:'National ID',       sub:'Front and back',   Icon:CreditCard, back:true },
  { key:'drivers_license',   label:"Driver's licence",  sub:'Front and back',   Icon:Car,       back:true },
  { key:'residence_permit',  label:'Residence permit',  sub:'Front and back',   Icon:FileText,  back:true },
];
const DOC_LABEL = Object.fromEntries(DOC_TYPES.map(d => [d.key, d.label]));
const MAX_MB = 10;
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const STEPS = ['Your details', 'Document', 'Review'];

const todayMinus = (years) => { const d = new Date(); d.setFullYear(d.getFullYear() - years); return d.toISOString().slice(0, 10); };
const fmtDay = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
const extOf = (f) => (f?.name?.split('.').pop() || (f?.type === 'application/pdf' ? 'pdf' : 'jpg')).toLowerCase();

/* ─── File picker with preview ────────────────────────────────────────────── */
function FileDrop({ label, hint, file, onPick, allowPdf, capture, Icon = Upload }) {
  const ref = useRef(null);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file || file.type === 'application/pdf') { setUrl(null); return undefined; }
    const u = URL.createObjectURL(file); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="id-field">
      <span>{label}</span>
      <button type="button" className={`id-drop${file ? ' has' : ''}`} onClick={() => ref.current?.click()} aria-label={file ? `Replace ${label}` : `Upload ${label}`}>
        {!file ? (<><Icon /><strong>Tap to upload</strong><span>{hint}</span></>)
          : url ? <img src={url} alt={label} />
          : <div className="id-pdf"><FileText /><strong>{file.name}</strong><span>PDF</span></div>}
        {file && <span className="id-swap">Replace</span>}
      </button>
      <input ref={ref} type="file" hidden
        accept={[...IMG_TYPES, ...(allowPdf ? ['application/pdf'] : [])].join(',')}
        {...(capture ? { capture } : {})}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function VerifyIdentity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]     = useState(null);
  const [userId, setUserId] = useState(null);
  const [identity, setIdentity] = useState(null);   // null = loading
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;
      setUserId(uid);
      const [profileRes, walletRes, settingsRes, id] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency,country_name,location').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance,currency').eq('user_id', uid).eq('currency', 'USD').maybeSingle(),
        supabase.from('user_settings').select('theme,accent_color').eq('user_id', uid).maybeSingle(),
        fetchIdentity(uid),
      ]);
      if (!live) return;
      const st = settingsRes.data;
      if (st) {
        const dark = st.theme === 'dark' || (st.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || !st.theme;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        if (st.accent_color) {
          document.documentElement.style.setProperty('--accent', st.accent_color);
          document.documentElement.style.setProperty('--accent-dim', `${st.accent_color}24`);
        }
      }
      const bal = walletRes.data ? Number(walletRes.data.balance) : null;
      setUser({ ...(profileRes.data || { email: session.user.email }), is_verified: id.verified, balance: bal ?? undefined, currency: 'USD' });
      setIdentity(id);
      setFormOpen(id.state === 'none');
    })();
    return () => { live = false; };
  }, [reloadKey]);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };
  const latest = identity?.latest;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: ID_CSS }} />
      <div className={`re-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="re-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="re-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} />

          <main className="re-main">
            <div className="id-wrap">
              <div className="id-head">
                <h1 className="re-page-title">Verify your identity</h1>
                <p className="re-page-sub">We're required to confirm who our customers are. It takes about 2 minutes: your details and a photo of an official ID.</p>
              </div>

              {identity === null ? <div className="id-skel" /> : (
                <>
                  {identity.state === 'verified' && (
                    <section className="re-card id-status ok">
                      <div className="id-status-icon"><BadgeCheck /></div>
                      <div>
                        <h2>Your identity is verified</h2>
                        <p>Thanks — there's nothing more to do. Your account shows as verified everywhere in the app.</p>
                        {latest && (
                          <div className="id-facts">
                            <div><span>Name</span><strong>{latest.first_name} {latest.last_name}</strong></div>
                            <div><span>Document</span><strong>{DOC_LABEL[latest.document_type] || latest.document_type}</strong></div>
                            <div><span>Verified on</span><strong>{fmtDay(latest.reviewed_at || latest.updated_at)}</strong></div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {identity.state === 'pending' && (
                    <section className="re-card id-status wait">
                      <div className="id-status-icon"><Clock /></div>
                      <div>
                        <h2>We're checking your documents</h2>
                        <p>Most checks are done within 1–2 business days. We'll send you a notification as soon as it's finished — you don't need to do anything else.</p>
                        <div className="id-facts">
                          <div><span>Submitted</span><strong>{fmtDay(latest.submitted_at)}</strong></div>
                          <div><span>Document</span><strong>{DOC_LABEL[latest.document_type] || latest.document_type}</strong></div>
                          <div><span>Name</span><strong>{latest.first_name} {latest.last_name}</strong></div>
                        </div>
                      </div>
                    </section>
                  )}

                  {identity.state === 'rejected' && (
                    <section className="re-card id-status bad">
                      <div className="id-status-icon"><AlertCircle /></div>
                      <div style={{ flex:1 }}>
                        <h2>We couldn't verify your identity</h2>
                        <p>Please fix the issue below and submit your details again.</p>
                        {latest?.rejection_reason && <div className="id-reason"><strong>Reason:</strong> {latest.rejection_reason}</div>}
                        {!formOpen && <button className="re-btn re-btn-accent" style={{ marginTop:14 }} onClick={() => setFormOpen(true)}><RefreshCcw />Try again</button>}
                      </div>
                    </section>
                  )}

                  {identity.state === 'none' && (
                    <div className="id-why">
                      <div className="re-card"><Lock /><div><strong>Protects your money</strong><span>Only you can withdraw from your account.</span></div></div>
                      <div className="re-card"><BadgeCheck /><div><strong>Unlocks every feature</strong><span>Withdrawals, investing and higher limits.</span></div></div>
                      <div className="re-card"><ShieldCheck /><div><strong>Kept private</strong><span>Documents are encrypted and only seen by our review team.</span></div></div>
                    </div>
                  )}

                  {identity.tableMissing && (
                    <div className="id-err" style={{ marginBottom:16 }}><AlertCircle />Identity verification isn't set up yet. Please try again later.</div>
                  )}

                  {formOpen && !identity.tableMissing && (identity.state === 'none' || identity.state === 'rejected') && (
                    <IdentityForm user={user} userId={userId} previous={latest} onDone={() => setReloadKey(k => k + 1)} />
                  )}

                  <div className="id-secure"><ShieldCheck />Your documents are stored encrypted and are never shared outside our verification team.</div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ─── The 4-step form ─────────────────────────────────────────────────────── */
function IdentityForm({ user, userId, previous, onDone }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => ({
    first_name: previous?.first_name || user?.first_name || '',
    last_name: previous?.last_name || user?.last_name || '',
    date_of_birth: previous?.date_of_birth || '',
    nationality: previous?.nationality || user?.country_name || '',
    country: previous?.country || user?.country_name || '',
    address_line: previous?.address_line || '',
    city: previous?.city || '',
    state_region: previous?.state_region || '',
    postal_code: previous?.postal_code || '',
    document_type: previous?.document_type || 'passport',
    document_number: '',
    document_expiry: '',
  }));
  const [front, setFront] = useState(null);
  const [back, setBack]   = useState(null);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const topRef = useRef(null);

  const docType = DOC_TYPES.find(d => d.key === f.document_type) || DOC_TYPES[0];
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const today = new Date().toISOString().slice(0, 10);

  const checkFile = (file, allowPdf) => {
    if (![...IMG_TYPES, ...(allowPdf ? ['application/pdf'] : [])].includes(file.type)) return allowPdf ? 'Use a JPG, PNG or PDF file.' : 'Use a JPG or PNG photo.';
    if (file.size > MAX_MB * 1024 * 1024) return `Files must be smaller than ${MAX_MB}MB.`;
    return '';
  };
  const pick = (setter, allowPdf) => (file) => { const e = checkFile(file, allowPdf); if (e) { setErr(e); return; } setErr(''); setter(file); };

  const problems = [
    // step 0
    () => {
      if (!f.first_name.trim() || !f.last_name.trim()) return 'Enter your first and last name exactly as they appear on your ID.';
      if (!f.date_of_birth) return 'Enter your date of birth.';
      if (f.date_of_birth > todayMinus(18)) return 'You must be at least 18 years old.';
      if (!f.country.trim() || !f.address_line.trim() || !f.city.trim()) return 'Enter your country, street address and city.';
      return '';
    },
    // step 1
    () => {
      if (!f.document_number.trim()) return 'Enter the document number.';
      if (f.document_expiry && f.document_expiry < today) return 'This document has expired. Please use a valid one.';
      if (!front) return `Upload a photo of ${docType.back ? 'the front of ' : ''}your ${docType.label.toLowerCase()}.`;
      if (docType.back && !back) return `Upload a photo of the back of your ${docType.label.toLowerCase()}.`;
      return '';
    },
    // step 2
    () => (!consent ? 'Please confirm the information is correct.' : ''),
  ];

  const go = (to) => { setErr(''); setTouched(false); setStep(to); topRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }); };
  const next = () => { const p = problems[step](); if (p) { setErr(p); setTouched(true); return; } go(step + 1); };
  const canJump = (i) => i < step;

  const submit = async () => {
    for (let i = 0; i < problems.length; i++) { const p = problems[i](); if (p) { setErr(p); if (i < step) setStep(i); return; } }
    setBusy(true); setErr('');
    const stamp = Date.now();
    const up = async (file, name) => {
      const path = `${userId}/${stamp}-${name}.${extOf(file)}`;
      const { error } = await supabase.storage.from(IDENTITY_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) throw new Error(`Couldn't upload your ${name.replace('-', ' ')}: ${error.message}`);
      return path;
    };
    try {
      const [frontPath, backPath] = await Promise.all([
        up(front, 'document-front'),
        docType.back && back ? up(back, 'document-back') : Promise.resolve(null),
      ]);
      const { error } = await supabase.from('identity_verifications').insert({
        user_id: userId, status: 'pending',
        first_name: f.first_name.trim(), last_name: f.last_name.trim(), date_of_birth: f.date_of_birth,
        nationality: f.nationality.trim() || null, country: f.country.trim(),
        address_line: f.address_line.trim(), city: f.city.trim(),
        state_region: f.state_region.trim() || null, postal_code: f.postal_code.trim() || null,
        document_type: f.document_type, document_number: f.document_number.trim(),
        document_expiry: f.document_expiry || null,
        doc_front_path: frontPath, doc_back_path: backPath,
      });
      if (error) throw new Error(error.message);
      onDone();
    } catch (e) {
      setErr(e?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const bad = (k) => touched && !String(f[k] || '').trim() ? 'true' : undefined;

  return (
    <section className="re-card id-form" ref={topRef} aria-label="Identity verification form">
      <div className="id-steps" role="list">
        {STEPS.map((s, i) => (
          <button key={s} type="button" role="listitem" className={`id-step${i === step ? ' on' : i < step ? ' done' : ''}`}
            onClick={() => canJump(i) && go(i)} aria-current={i === step ? 'step' : undefined} tabIndex={canJump(i) ? 0 : -1}>
            <i>{i < step ? <Check /> : i + 1}</i>{s}
          </button>
        ))}
      </div>

      <div className="id-body">
        {step === 0 && (
          <>
            <h3>Your details</h3>
            <p>Use your legal name and address, exactly as they appear on your ID.</p>
            <div className="id-grid">
              <label className="id-field"><span>First name</span><input className="id-input" value={f.first_name} onChange={set('first_name')} autoComplete="given-name" aria-invalid={bad('first_name')} /></label>
              <label className="id-field"><span>Last name</span><input className="id-input" value={f.last_name} onChange={set('last_name')} autoComplete="family-name" aria-invalid={bad('last_name')} /></label>
              <label className="id-field"><span>Date of birth</span><input className="id-input" type="date" max={todayMinus(18)} value={f.date_of_birth} onChange={set('date_of_birth')} autoComplete="bday" aria-invalid={bad('date_of_birth')} /></label>
              <label className="id-field"><span>Nationality <em>(optional)</em></span><input className="id-input" value={f.nationality} onChange={set('nationality')} placeholder="e.g. Nigerian" /></label>
              <label className="id-field full"><span>Country of residence</span><input className="id-input" value={f.country} onChange={set('country')} autoComplete="country-name" aria-invalid={bad('country')} /></label>
              <label className="id-field full"><span>Street address</span><input className="id-input" value={f.address_line} onChange={set('address_line')} autoComplete="street-address" aria-invalid={bad('address_line')} /></label>
              <label className="id-field"><span>City</span><input className="id-input" value={f.city} onChange={set('city')} autoComplete="address-level2" aria-invalid={bad('city')} /></label>
              <label className="id-field"><span>State / region <em>(optional)</em></span><input className="id-input" value={f.state_region} onChange={set('state_region')} autoComplete="address-level1" /></label>
              <label className="id-field"><span>Postal code <em>(optional)</em></span><input className="id-input" value={f.postal_code} onChange={set('postal_code')} autoComplete="postal-code" /></label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3>Your ID document</h3>
            <p>Choose a valid, government-issued document.</p>
            <div className="id-types" role="radiogroup" aria-label="Document type">
              {DOC_TYPES.map(d => (
                <button key={d.key} type="button" role="radio" aria-checked={f.document_type === d.key}
                  className={`id-type${f.document_type === d.key ? ' sel' : ''}`}
                  onClick={() => { setF(p => ({ ...p, document_type: d.key })); if (!d.back) setBack(null); }}>
                  <d.Icon /><strong>{d.label}</strong><span>{d.sub}</span>
                </button>
              ))}
            </div>
            <div className="id-grid">
              <label className="id-field"><span>Document number</span><input className="id-input" value={f.document_number} onChange={set('document_number')} aria-invalid={bad('document_number')} /></label>
              <label className="id-field"><span>Expiry date <em>(if shown)</em></span><input className="id-input" type="date" min={today} value={f.document_expiry} onChange={set('document_expiry')} /></label>
            </div>
            <div className="id-uploads">
              <FileDrop label={docType.back ? 'Front of document' : 'Photo page'} hint={`JPG, PNG or PDF · up to ${MAX_MB}MB`} file={front} onPick={pick(setFront, true)} allowPdf />
              {docType.back
                ? <FileDrop label="Back of document" hint={`JPG, PNG or PDF · up to ${MAX_MB}MB`} file={back} onPick={pick(setBack, true)} allowPdf />
                : <div className="id-tips" style={{ alignSelf:'end' }}>
                    <div><Check />All four corners visible</div>
                    <div><Check />No glare, blur or fingers over the text</div>
                    <div><Check />Not expired</div>
                  </div>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Check and submit</h3>
            <p>Make sure everything matches your document.</p>
            <div className="id-review">
              <div><span>Name</span><strong>{f.first_name} {f.last_name}</strong></div>
              <div><span>Date of birth</span><strong>{fmtDay(f.date_of_birth)}</strong></div>
              {f.nationality && <div><span>Nationality</span><strong>{f.nationality}</strong></div>}
              <div><span>Address</span><strong>{[f.address_line, f.city, f.state_region, f.postal_code, f.country].filter(Boolean).join(', ')}</strong></div>
              <div><span>Document</span><strong>{docType.label} · {f.document_number}</strong></div>
              {f.document_expiry && <div><span>Expires</span><strong>{fmtDay(f.document_expiry)}</strong></div>}
            </div>
            <div className="id-thumbs">
              {[[front, docType.back ? 'Front' : 'Photo page'], [back, 'Back']].filter(([x]) => x).map(([file, cap]) => (
                <figure key={cap}><Thumb file={file} alt={cap} /><figcaption>{cap}</figcaption></figure>
              ))}
            </div>
            <label className="id-consent">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>I confirm this information is true and the document is mine. I agree to Profit Gain Signals checking it to verify my identity.</span>
            </label>
          </>
        )}

        {err && <div className="id-err" role="alert"><AlertCircle />{err}</div>}
      </div>

      <div className="id-foot">
        {step > 0 ? <button type="button" className="re-btn re-btn-ghost" disabled={busy} onClick={() => go(step - 1)}><ChevronLeft />Back</button> : <span />}
        {step < STEPS.length - 1
          ? <button type="button" className="re-btn re-btn-accent" onClick={next}>Continue<ChevronRight /></button>
          : <button type="button" className="re-btn re-btn-accent" disabled={busy || !consent} onClick={submit}>
              {busy ? <><Loader2 className="id-spin" />Submitting…</> : <><ShieldCheck />Submit for review</>}
            </button>}
      </div>
    </section>
  );
}

function Thumb({ file, alt }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file || file.type === 'application/pdf') return undefined;
    const u = URL.createObjectURL(file); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={alt} /> : <div className="id-thumb-pdf"><FileText /></div>;
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

