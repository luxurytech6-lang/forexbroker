/**
 * RealEstate.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real Estate — Route: /real-estate
 * Fractional property investing: browse listings, model returns, invest from
 * the wallet, and track holdings and rent received.
 *
 * Data (see real_estate_schema.sql):
 *   properties            listings
 *   property_investments  a user's positions
 *   property_payouts      rent paid out to a user
 *   invest_in_property()  RPC that checks the wallet, debits it and records the position
 *
 * Until the `properties` table exists (or while it's empty) the page shows
 * clearly labelled sample listings and disables investing.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2, MapPin, Search, X, ChevronRight, ShieldCheck,
  CheckCircle2, Info, Percent, Wallet, CalendarDays,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";

/* ─── Page layout + visual system ─────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
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
.re-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
.re-page-title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(34px,3.6vw,48px); line-height: 1.02; letter-spacing: -.01em; }
.re-page-sub { font-size: 15.5px; color: var(--muted); margin-top: 8px; max-width: 40em; }
.re-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 18px; border-radius: 10px; font-size: 14.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: filter .15s, background .15s, border-color .15s; }
.re-btn svg { width: 16px; height: 16px; }
.re-btn-sm { height: 36px; padding: 0 14px; font-size: 13.5px; }
.re-btn-accent { background: var(--accent); color: #07101E; }
.re-btn-accent:hover:not(:disabled) { filter: brightness(1.07); }
.re-btn-accent:disabled { opacity: .45; cursor: not-allowed; }
.re-btn-ghost { background: transparent; border-color: var(--border2); color: var(--text); }
.re-btn-ghost:hover { background: var(--surface); }

.re-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 24px 48px -36px rgba(0,0,0,.6); }
.re-note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border-radius: 12px; background: var(--accent-glow); border: 1px solid var(--accent-dim); font-size: 14px; color: var(--muted); margin-bottom: 20px; }
.re-note svg { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
.re-note strong { color: var(--text); }

/* Stats */
.re-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-bottom: 24px; }
.re-stat { padding: 18px 20px; }
.re-stat-lbl { font-size: 13.5px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
.re-stat-lbl svg { width: 16px; height: 16px; color: var(--faint); }
.re-stat-val { font-size: 26px; font-weight: 600; margin-top: 8px; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.re-stat-sub { font-size: 13px; color: var(--muted); }

/* Tabs + filters */
.re-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.re-tabs { display: inline-flex; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }
.re-tab { height: 34px; padding: 0 14px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--muted); background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.re-tab.active { background: var(--accent); color: #07101E; }
.re-tab b { font-size: 12px; padding: 1px 7px; border-radius: 999px; background: rgba(0,0,0,.12); }
.re-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.re-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--muted); min-width: 220px; }
.re-search:focus-within { border-color: var(--accent); }
.re-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font: inherit; font-size: 14.5px; }
.re-select { height: 40px; padding: 0 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: 14px; cursor: pointer; }
.re-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.re-chip { height: 34px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
.re-chip:hover { color: var(--text); border-color: var(--border2); }
.re-chip.active { background: var(--accent-dim); border-color: var(--accent); color: var(--text); }

/* Featured */
.re-feature { display: grid; grid-template-columns: minmax(0,1.25fr) minmax(0,1fr); overflow: hidden; margin-bottom: 24px; cursor: pointer; }
.re-feature-img { position: relative; min-height: 320px; background: var(--surface2); }
.re-feature-body { padding: 28px; display: flex; flex-direction: column; gap: 14px; }
.re-feature-name { font-family: 'Instrument Serif', Georgia, serif; font-size: 36px; line-height: 1.05; }
.re-kv { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; padding: 16px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.re-kv span { display: block; font-size: 13px; color: var(--muted); }
.re-kv strong { font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums; }

/* Grid of listings */
.re-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
.re-prop { display: flex; flex-direction: column; overflow: hidden; cursor: pointer; transition: transform .2s, border-color .2s; text-align: left; padding: 0; color: inherit; font: inherit; }
.re-prop:hover { transform: translateY(-3px); border-color: var(--border2); }
.re-prop-img { position: relative; height: 180px; background: var(--surface2); }
.re-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.re-img svg { width: 100%; height: 100%; display: block; }
.re-tag { position: absolute; top: 12px; left: 12px; height: 26px; padding: 0 10px; border-radius: 7px; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; background: rgba(7,16,30,.78); color: #EEF2F7; backdrop-filter: blur(6px); }
.re-tag.gold { background: var(--accent); color: #07101E; }
.re-yield { position: absolute; right: 12px; bottom: 12px; padding: 6px 10px; border-radius: 9px; background: rgba(7,16,30,.82); color: #EEF2F7; font-size: 12.5px; line-height: 1.2; text-align: right; backdrop-filter: blur(6px); }
.re-yield strong { display: block; font-size: 18px; color: #E2AE4A; }
.re-prop-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.re-prop-name { font-size: 17px; font-weight: 600; line-height: 1.3; }
.re-loc { display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--muted); }
.re-loc svg { width: 14px; height: 14px; }
.re-facts { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; font-size: 13px; color: var(--muted); }
.re-facts strong { display: block; color: var(--text); font-size: 14.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.re-progress { height: 8px; border-radius: 4px; background: var(--surface2); overflow: hidden; }
.re-progress span { display: block; height: 100%; border-radius: 4px; background: var(--accent); transition: width .6s cubic-bezier(.22,1,.36,1); }
.re-prog-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted); margin-top: 6px; font-variant-numeric: tabular-nums; }
.re-empty { padding: 48px 20px; text-align: center; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.re-empty strong { color: var(--text); font-size: 16px; }

/* Holdings table */
.re-table-wrap { overflow-x: auto; }
.re-table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
.re-table th { text-align: left; font-size: 12.5px; font-weight: 600; color: var(--faint); padding: 14px 20px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.re-table td { padding: 14px 20px; border-bottom: 1px solid var(--border); white-space: nowrap; font-variant-numeric: tabular-nums; }
.re-table tr:last-child td { border-bottom: none; }
.re-table .r { text-align: right; }
.re-thumb { width: 56px; height: 40px; border-radius: 8px; overflow: hidden; position: relative; flex-shrink: 0; }
.re-status { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 7px; font-size: 12.5px; font-weight: 700; text-transform: capitalize; }
.re-status.active { background: var(--green-dim); color: var(--green); }
.re-status.pending { background: var(--accent-dim); color: var(--accent); }
.re-status.exited { background: var(--surface2); color: var(--muted); }

/* How it works */
.re-how { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-top: 40px; }
.re-how-step { padding: 20px; }
.re-how-n { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--accent-dim); color: var(--accent); font-weight: 700; margin-bottom: 12px; }
.re-how-step h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.re-how-step p { font-size: 14px; color: var(--muted); }
.re-risk { margin-top: 20px; font-size: 13px; color: var(--faint); line-height: 1.6; }

/* Drawer */
.re-overlay { position: fixed; inset: 0; z-index: 600; background: rgba(3,8,16,.62); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: reFade .2s ease both; }
.re-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 601; width: min(560px, 100vw); background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; box-shadow: -40px 0 80px -30px rgba(0,0,0,.7); animation: reSlide .32s cubic-bezier(.22,1,.36,1) both; }
.re-drawer-img { position: relative; height: 240px; flex-shrink: 0; background: var(--surface2); }
.re-close { position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(7,16,30,.78); color: #EEF2F7; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }
.re-drawer-body > * { flex-shrink: 0; }
.re-drawer-body { flex: 1; overflow-y: auto; padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 20px; }
.re-drawer-name { font-family: 'Instrument Serif', Georgia, serif; font-size: 34px; line-height: 1.05; }
.re-desc { font-size: 15px; color: var(--muted); line-height: 1.65; }
.re-section-h { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.re-facts-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.re-facts-list div { background: var(--surface); padding: 12px 14px; }
.re-facts-list span { display: block; font-size: 12.5px; color: var(--muted); }
.re-facts-list strong { font-size: 15.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.re-calc { padding: 18px; border-radius: 14px; background: var(--surface2); border: 1px solid var(--border); }
.re-amount { display: flex; align-items: center; gap: 6px; height: 54px; padding: 0 16px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border2); margin: 10px 0 12px; }
.re-amount:focus-within { border-color: var(--accent); }
.re-amount span { font-size: 22px; font-weight: 600; color: var(--muted); }
.re-amount input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font: inherit; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.re-range { width: 100%; accent-color: #E2AE4A; }
.re-proj { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 14px; }
.re-proj div { padding: 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); }
.re-proj span { display: block; font-size: 12.5px; color: var(--muted); }
.re-proj strong { font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
.re-err { font-size: 13.5px; color: var(--red); margin-top: 8px; }
.re-drawer-foot { flex-shrink: 0; padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); display: flex; align-items: center; gap: 14px; background: var(--surface); }
.re-drawer-foot .re-btn { flex: 1; height: 50px; font-size: 15.5px; }
.re-success { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 24px 8px; }
.re-success svg { color: var(--green); }

@keyframes reFade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes reSlide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes reRise  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.re-main > * { animation: reRise .55s cubic-bezier(.22,1,.36,1) both; }

@media (max-width: 1200px) {
  .re-stats { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .re-how { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .re-feature { grid-template-columns: 1fr; }
  .re-feature-img { min-height: 240px; }
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
  .re-stats { gap: 10px; }
  .re-stat { padding: 14px; }
  .re-stat-val { font-size: 21px; }
  .re-how { grid-template-columns: 1fr; }
  .re-search { min-width: 0; flex: 1; }
  .re-filters { width: 100%; }
  .re-kv { grid-template-columns: repeat(3,1fr); }
  .re-feature-name { font-size: 30px; }
  .re-proj { grid-template-columns: 1fr 1fr; }
  .re-proj div:last-child { grid-column: 1 / -1; }
  .re-drawer { width: 100vw; border-left: none; }
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
const DK_ACTIVE = 'realestate';
const DK_TITLE  = 'Real Estate';
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

/* ─── Sample listings (shown only until the properties table has rows) ───── */
const SAMPLE_PROPERTIES = [
  { id:'sample-riverside', name:'Riverside Apartments', city:'Manchester', country:'United Kingdom', type:'residential', art:'flats', featured:true,
    description:'A 48-unit apartment block a short walk from Manchester city centre, fully let on 12-month tenancies with a professional managing agent. Rent is collected monthly and distributed to shareholders each quarter.',
    target_yield:7.2, appreciation:3.0, hold_years:5, min_investment:100, share_price:10, total_value:2400000, funded_amount:1968000, investors_count:1284, occupancy:97 },
  { id:'sample-marina', name:'Marina Business Suites', city:'Dubai', country:'United Arab Emirates', type:'commercial', art:'office',
    description:'Twelve floors of Grade A office space in Dubai Marina, leased to a mix of regional firms on five-year terms with built-in annual rent reviews.',
    target_yield:8.1, appreciation:2.5, hold_years:7, min_investment:250, share_price:25, total_value:5200000, funded_amount:3328000, investors_count:2210, occupancy:92 },
  { id:'sample-garden', name:'Garden Terraces', city:'Lisbon', country:'Portugal', type:'residential', art:'terraces',
    description:'Twenty-two renovated family homes in a quiet Lisbon neighbourhood with strong long-term rental demand from local families.',
    target_yield:6.4, appreciation:4.0, hold_years:4, min_investment:100, share_price:10, total_value:3100000, funded_amount:1271000, investors_count:640, occupancy:100 },
  { id:'sample-lekki', name:'Lekki Waterfront Residences', city:'Lagos', country:'Nigeria', type:'residential', art:'flats',
    description:'A gated block of serviced apartments on the Lekki peninsula, let to corporate tenants on annual leases paid in advance.',
    target_yield:9.4, appreciation:5.0, hold_years:5, min_investment:100, share_price:10, total_value:1800000, funded_amount:1530000, investors_count:915, occupancy:95 },
  { id:'sample-logistics', name:'Northgate Logistics Park', city:'Rotterdam', country:'Netherlands', type:'industrial', art:'warehouse',
    description:'A modern warehouse and distribution hub near the Port of Rotterdam, fully let to a single logistics operator on a 10-year lease.',
    target_yield:6.9, appreciation:2.0, hold_years:6, min_investment:500, share_price:50, total_value:7500000, funded_amount:2625000, investors_count:430, occupancy:100 },
  { id:'sample-harbour', name:'Harbour View Hotel', city:'Cape Town', country:'South Africa', type:'hospitality', art:'hotel',
    description:'A 96-room hotel on the Cape Town waterfront run by an established operator under a long-term management agreement.',
    target_yield:8.6, appreciation:3.5, hold_years:7, min_investment:250, share_price:25, total_value:6400000, funded_amount:5760000, investors_count:1790, occupancy:81 },
];

const TYPES = [
  { key:'all',         label:'All properties' },
  { key:'residential', label:'Residential' },
  { key:'commercial',  label:'Commercial' },
  { key:'industrial',  label:'Industrial' },
  { key:'hospitality', label:'Hospitality' },
];
const TYPE_ART = { residential:'flats', commercial:'office', industrial:'warehouse', hospitality:'hotel' };

const usd = (n, d = 0) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })}`;
const compact = (n) => {
  const v = Number(n || 0);
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return usd(v);
};
const fundedPct = (p) => Math.min(100, Math.round((Number(p.funded_amount || 0) / Math.max(1, Number(p.total_value || 0))) * 100));

/* ─── Drawn property renders (used when a listing has no image_url) ──────── */
function PropertyArt({ kind = 'flats', seed = 1 }) {
  const id = `re-dusk-${kind}-${seed}`;
  const lit = (i) => ((i * 7 + seed * 3) % 5) !== 0;
  const grid = (x, y, cols, rows, w, h, gx, gy) => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      out.push(<rect key={`${x}-${r}-${c}`} x={x + c * gx} y={y + r * gy} width={w} height={h} fill={lit(r * cols + c) ? '#E2AE4A' : '#2A4166'} />);
    }
    return out;
  };
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12223F" /><stop offset=".6" stopColor="#3A4B79" /><stop offset="1" stopColor="#E6A65A" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${id})`} />
      <circle cx={kind === 'terraces' ? 90 : 318} cy="188" r="30" fill="#F4C77A" opacity=".7" />
      <path d="M0,196 h26 v-26 h20 v-16 h22 v42 h30 v-32 h18 v32 h36 v-20 h24 v20 h32 v-46 h20 v46 h38 v-30 h26 v30 h44 v-18 h22 v18 h42 V240 H0 Z" fill="#192A49" />
      {kind === 'flats' && <g>
        <rect x="120" y="70" width="130" height="170" fill="#2B3F66" /><rect x="116" y="62" width="138" height="10" fill="#1B2C4B" />
        {grid(132, 84, 6, 9, 11, 8, 19.5, 16)}
        <rect x="262" y="118" width="64" height="122" fill="#22355A" />{grid(270, 128, 3, 6, 10, 7, 18, 17)}
      </g>}
      {kind === 'office' && <g>
        <path d="M150,240 V46 L204,24 V240 Z" fill="#23385F" /><path d="M204,24 L236,40 V240 H204 Z" fill="#172846" />
        {grid(158, 56, 3, 18, 10, 5, 14.5, 10)}
        <rect x="248" y="112" width="58" height="128" fill="#1E3052" />{grid(255, 120, 3, 10, 10, 5, 16, 11)}
        <rect x="92" y="138" width="50" height="102" fill="#2B3F66" />{grid(98, 146, 3, 8, 8, 5, 14, 11)}
      </g>}
      {kind === 'terraces' && <g>
        {[0,1,2,3,4,5].map(i => (
          <g key={i}>
            <rect x={60 + i * 48} y="150" width="46" height="90" fill={i % 2 ? '#2B3F66' : '#324874'} />
            <polygon points={`${57 + i * 48},150 ${83 + i * 48},124 ${109 + i * 48},150`} fill="#1B2C4B" />
            <rect x={68 + i * 48} y="162" width="11" height="13" fill={lit(i) ? '#E2AE4A' : '#2A4166'} /><rect x={88 + i * 48} y="162" width="11" height="13" fill={lit(i + 3) ? '#E2AE4A' : '#2A4166'} />
            <rect x={76 + i * 48} y="200" width="14" height="40" fill="#1B2C4B" />
          </g>
        ))}
      </g>}
      {kind === 'warehouse' && <g>
        <path d="M70,240 V150 L150,118 L230,150 L310,118 L330,126 V240 Z" fill="#2B3F66" />
        {[0,1,2,3,4].map(i => <rect key={i} x={92 + i * 46} y="186" width="32" height="54" fill="#1B2C4B" stroke="#3E5480" />)}
        {grid(92, 160, 10, 1, 14, 6, 23, 0)}
      </g>}
      {kind === 'hotel' && <g>
        <rect x="110" y="56" width="180" height="184" rx="4" fill="#2B3F66" />
        <rect x="110" y="56" width="180" height="16" fill="#1B2C4B" />
        {grid(122, 82, 8, 10, 12, 9, 21, 15)}
        <rect x="178" y="206" width="44" height="34" fill="#E2AE4A" opacity=".85" />
      </g>}
    </svg>
  );
}

function PropertyImage({ p, seed }) {
  if (p.image_url) return <img className="re-img" src={p.image_url} alt={p.name} loading="lazy" />;
  return <div className="re-img"><PropertyArt kind={p.art || TYPE_ART[p.type] || 'flats'} seed={seed} /></div>;
}

/* ─── Listing card ────────────────────────────────────────────────────────── */
function PropertyCard({ p, i, onOpen }) {
  const pct = fundedPct(p);
  return (
    <button type="button" className="re-card re-prop" onClick={() => onOpen(p)}>
      <div className="re-prop-img">
        <PropertyImage p={p} seed={i + 1} />
        <span className={`re-tag${pct >= 90 ? ' gold' : ''}`}>{pct >= 100 ? 'Fully funded' : pct >= 90 ? 'Closing soon' : p.type.charAt(0).toUpperCase() + p.type.slice(1)}</span>
        <div className="re-yield"><strong>{Number(p.target_yield).toFixed(1)}%</strong>target yield</div>
      </div>
      <div className="re-prop-body">
        <div>
          <div className="re-prop-name">{p.name}</div>
          <div className="re-loc"><MapPin />{p.city}, {p.country}</div>
        </div>
        <div className="re-facts">
          <div>Min<strong>{usd(p.min_investment)}</strong></div>
          <div>Hold<strong>{p.hold_years} yrs</strong></div>
          <div>Value<strong>{compact(p.total_value)}</strong></div>
        </div>
        <div style={{ marginTop:'auto' }}>
          <div className="re-progress"><span style={{ width:`${pct}%` }} /></div>
          <div className="re-prog-row"><span>{pct}% funded</span><span>{Number(p.investors_count || 0).toLocaleString('en-US')} investors</span></div>
        </div>
      </div>
    </button>
  );
}

/* ─── Detail drawer with returns calculator and invest flow ───────────────── */
function PropertyDrawer({ p, seed, isSample, balance, onClose, onInvested }) {
  const min = Number(p.min_investment || 100);
  const [amount, setAmount] = useState(String(Math.max(min, 1000)));
  const [stage, setStage] = useState('form');       // form | confirm | busy | done
  const [error, setError] = useState('');
  const val = Number(amount) || 0;
  const shares = Math.floor(val / Number(p.share_price || 10));
  const yearly = val * (Number(p.target_yield) / 100);
  const growth = val * (Math.pow(1 + Number(p.appreciation || 0) / 100, Number(p.hold_years || 1)) - 1);
  const total = yearly * Number(p.hold_years || 1) + growth;
  const pct = fundedPct(p);
  const remaining = Math.max(0, Number(p.total_value) - Number(p.funded_amount));

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);

  const problem =
    isSample ? 'This is a sample listing, so investing is turned off.' :
    pct >= 100 ? 'This property is fully funded.' :
    val < min ? `The minimum investment is ${usd(min)}.` :
    val > remaining ? `Only ${usd(remaining)} of this property is still available.` :
    balance != null && val > balance ? `Your wallet balance is ${usd(balance, 2)}. Deposit funds to invest this amount.` : '';

  const invest = async () => {
    setStage('busy'); setError('');
    try {
      const { error: rpcErr } = await supabase.rpc('invest_in_property', { p_property_id: p.id, p_amount: val });
      if (rpcErr) {
        // RPC not installed yet: record a pending request for an admin to approve
        if (rpcErr.code === 'PGRST202' || /function .* does not exist/i.test(rpcErr.message || '')) {
          const { data: { session } } = await supabase.auth.getSession();
          const { error: insErr } = await supabase.from('property_investments').insert({
            user_id: session?.user?.id, property_id: p.id, amount: val, shares, status: 'pending',
          });
          if (insErr) throw insErr;
        } else throw rpcErr;
      }
      setStage('done');
      onInvested?.();
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setStage('confirm');
    }
  };

  return (
    <>
      <div className="re-overlay" onClick={onClose} />
      <aside className="re-drawer" role="dialog" aria-modal="true" aria-label={p.name}>
        <div className="re-drawer-img">
          <PropertyImage p={p} seed={seed} />
          <button className="re-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {stage === 'done' ? (
          <div className="re-drawer-body">
            <div className="re-success">
              <CheckCircle2 size={48} />
              <div className="re-drawer-name" style={{ fontSize:30 }}>You're an owner</div>
              <p className="re-desc">Your investment of <strong style={{ color:'var(--text)' }}>{usd(val)}</strong> in {p.name} has been received. It will appear under My holdings, and rent is paid to your wallet each quarter.</p>
              <button className="re-btn re-btn-accent" style={{ marginTop:10 }} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="re-drawer-body">
              <div>
                <div className="re-loc" style={{ marginBottom:6 }}><MapPin />{p.city}, {p.country}</div>
                <div className="re-drawer-name">{p.name}</div>
              </div>
              <p className="re-desc">{p.description}</p>

              <div>
                <div className="re-progress"><span style={{ width:`${pct}%` }} /></div>
                <div className="re-prog-row"><span>{usd(p.funded_amount)} of {usd(p.total_value)} raised</span><span>{pct}%</span></div>
              </div>

              <div className="re-facts-list num">
                <div><span>Target yield</span><strong>{Number(p.target_yield).toFixed(1)}% a year</strong></div>
                <div><span>Expected growth</span><strong>{Number(p.appreciation || 0).toFixed(1)}% a year</strong></div>
                <div><span>Hold period</span><strong>{p.hold_years} years</strong></div>
                <div><span>Share price</span><strong>{usd(p.share_price)}</strong></div>
                <div><span>Occupancy</span><strong>{p.occupancy != null ? `${p.occupancy}%` : '—'}</strong></div>
                <div><span>Investors</span><strong>{Number(p.investors_count || 0).toLocaleString('en-US')}</strong></div>
              </div>

              <div className="re-calc">
                <div className="re-section-h">How much would you like to invest?</div>
                <label className="re-amount">
                  <span>$</span>
                  <input inputMode="decimal" value={amount} aria-label="Investment amount in US dollars"
                    onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setStage('form'); }} />
                </label>
                <input className="re-range" type="range" min={min} max={Math.max(min, Math.min(50000, remaining || 50000))} step={min}
                  value={Math.min(Math.max(val, min), Math.max(min, Math.min(50000, remaining || 50000)))}
                  onChange={e => { setAmount(e.target.value); setStage('form'); }} aria-label="Investment amount slider" />
                <div className="re-proj num">
                  <div><span>Shares</span><strong>{shares.toLocaleString('en-US')}</strong></div>
                  <div><span>Rent a year</span><strong className="up">{usd(yearly, 2)}</strong></div>
                  <div><span>Over {p.hold_years} years</span><strong className="up">+{usd(total)}</strong></div>
                </div>
                <p style={{ fontSize:12.5, color:'var(--faint)', marginTop:10 }}>Projections use the target yield and expected growth. They aren't guaranteed, and the value of your shares can fall.</p>
                {problem && stage !== 'busy' && <div className="re-err">{problem}</div>}
                {error && <div className="re-err">{error}</div>}
              </div>
            </div>

            <div className="re-drawer-foot">
              {stage === 'form' && (
                <button className="re-btn re-btn-accent" disabled={!!problem} onClick={() => setStage('confirm')}>
                  <Building2 />Invest {val ? usd(val) : ''}
                </button>
              )}
              {(stage === 'confirm' || stage === 'busy') && (
                <>
                  <button className="re-btn re-btn-ghost" style={{ flex:'0 0 auto' }} disabled={stage === 'busy'} onClick={() => setStage('form')}>Back</button>
                  <button className="re-btn re-btn-accent" disabled={stage === 'busy' || !!problem} onClick={invest}>
                    {stage === 'busy' ? 'Processing…' : `Confirm ${usd(val)} from wallet`}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function RealEstate() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]             = useState(null);
  const [balance, setBalance]       = useState(null);
  const [properties, setProperties] = useState(null);   // null = loading
  const [isSample, setIsSample]     = useState(false);
  const [holdings, setHoldings]     = useState([]);
  const [rentPaid, setRentPaid]     = useState(0);
  const [tab, setTab]               = useState('browse');
  const [type, setType]             = useState('all');
  const [query, setQuery]           = useState('');
  const [sort, setSort]             = useState('yield');
  const [open, setOpen]             = useState(null);
  const [reloadKey, setReloadKey]   = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;

      const [profileRes, walletRes, settingsRes, propsRes, holdRes, payRes] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance,currency').eq('user_id', uid).eq('currency', 'USD').maybeSingle(),
        supabase.from('user_settings').select('theme,accent_color').eq('user_id', uid).maybeSingle(),
        supabase.from('properties').select('*').in('status', ['open', 'funded']).order('created_at', { ascending:false }),
        supabase.from('property_investments').select('id,amount,shares,status,created_at,property_id,properties(*)').eq('user_id', uid).order('created_at', { ascending:false }),
        supabase.from('property_payouts').select('amount').eq('user_id', uid),
      ]);
      if (!live) return;

      // Appearance (same settings the rest of the app uses)
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

      const rows = propsRes.error ? [] : (propsRes.data || []);
      if (rows.length) { setProperties(rows); setIsSample(false); }
      else { setProperties(SAMPLE_PROPERTIES); setIsSample(true); }

      setHoldings(holdRes.error ? [] : (holdRes.data || []));
      setRentPaid(payRes.error ? 0 : (payRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0));
    })();
    return () => { live = false; };
  }, [reloadKey]);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (properties || []).filter(p =>
      (type === 'all' || p.type === type) &&
      (!q || `${p.name} ${p.city} ${p.country}`.toLowerCase().includes(q)));
    const by = {
      yield:  (a, b) => b.target_yield - a.target_yield,
      funded: (a, b) => fundedPct(b) - fundedPct(a),
      min:    (a, b) => a.min_investment - b.min_investment,
      hold:   (a, b) => a.hold_years - b.hold_years,
    }[sort];
    return rows.slice().sort(by);
  }, [properties, type, query, sort]);

  const featured = useMemo(() => {
    if (!properties?.length) return null;
    return properties.find(p => p.featured && fundedPct(p) < 100) || null;
  }, [properties]);

  const activeHoldings = holdings.filter(h => h.status !== 'exited');
  const invested = activeHoldings.reduce((s, h) => s + Number(h.amount || 0), 0);
  const annualIncome = activeHoldings.reduce((s, h) => s + Number(h.amount || 0) * (Number(h.properties?.target_yield || 0) / 100), 0);
  const ownedCount = new Set(activeHoldings.map(h => h.property_id)).size;
  const seedOf = (p) => Math.max(1, (properties || []).findIndex(x => x.id === p.id) + 1);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div className={`re-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="re-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="re-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} />

          <main className="re-main">
            <div className="re-head">
              <div>
                <h1 className="re-page-title">Real estate</h1>
                <p className="re-page-sub">Own shares of income-producing property from $100. Rent is paid to your wallet every quarter, and you share in any rise in value when the property is sold.</p>
              </div>
              <a href="/payments" className="re-btn re-btn-ghost"><Wallet />{balance != null ? `Wallet ${usd(balance, 2)}` : 'Deposit funds'}</a>
            </div>

            {isSample && (
              <div className="re-note">
                <Info size={18} />
                <span><strong>These are sample listings.</strong> Live properties will appear here once they're added to the properties table. Investing is turned off for samples.</span>
              </div>
            )}

            <div className="re-stats">
              {[
                { Icon:Building2,   lbl:'Invested in property', val:usd(invested, 2),      sub: invested ? 'Across all your holdings' : 'Nothing invested yet' },
                { Icon:Percent,     lbl:'Expected rent a year', val:usd(annualIncome, 2),  sub:'Based on target yields' },
                { Icon:CalendarDays,lbl:'Rent received',         val:usd(rentPaid, 2),      sub:'Paid to your wallet' },
                { Icon:MapPin,      lbl:'Properties owned',      val:String(ownedCount),    sub: ownedCount ? `${activeHoldings.length} ${activeHoldings.length === 1 ? 'position' : 'positions'}` : 'Browse listings below' },
              ].map(s => (
                <div key={s.lbl} className="re-card re-stat">
                  <div className="re-stat-lbl"><s.Icon />{s.lbl}</div>
                  <div className="re-stat-val">{s.val}</div>
                  <div className="re-stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="re-bar">
              <div className="re-tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'browse'} className={`re-tab${tab === 'browse' ? ' active' : ''}`} onClick={() => setTab('browse')}>Browse properties</button>
                <button role="tab" aria-selected={tab === 'holdings'} className={`re-tab${tab === 'holdings' ? ' active' : ''}`} onClick={() => setTab('holdings')}>My holdings <b>{holdings.length}</b></button>
              </div>
              {tab === 'browse' && (
                <div className="re-filters">
                  <label className="re-search"><Search size={16} /><input placeholder="Search by name or city" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search properties" /></label>
                  <select className="re-select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort properties">
                    <option value="yield">Highest yield</option>
                    <option value="funded">Most funded</option>
                    <option value="min">Lowest minimum</option>
                    <option value="hold">Shortest hold</option>
                  </select>
                </div>
              )}
            </div>

            {tab === 'browse' ? (
              <>
                <div className="re-chips">
                  {TYPES.map(t => <button key={t.key} className={`re-chip${type === t.key ? ' active' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>)}
                </div>

                {properties === null ? (
                  <div className="re-card re-empty">Loading properties…</div>
                ) : (
                  <>
                    {featured && type === 'all' && !query && (
                      <div className="re-card re-feature" role="button" tabIndex={0} onClick={() => setOpen(featured)} onKeyDown={e => e.key === 'Enter' && setOpen(featured)}>
                        <div className="re-feature-img">
                          <PropertyImage p={featured} seed={seedOf(featured)} />
                          <span className="re-tag gold">Featured</span>
                        </div>
                        <div className="re-feature-body">
                          <div className="re-loc"><MapPin />{featured.city}, {featured.country}</div>
                          <div className="re-feature-name">{featured.name}</div>
                          <p className="re-desc" style={{ display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{featured.description}</p>
                          <div className="re-kv">
                            <div><span>Target yield</span><strong style={{ color:'var(--accent)' }}>{Number(featured.target_yield).toFixed(1)}%</strong></div>
                            <div><span>Hold</span><strong>{featured.hold_years} years</strong></div>
                            <div><span>From</span><strong>{usd(featured.min_investment)}</strong></div>
                          </div>
                          <div>
                            <div className="re-progress"><span style={{ width:`${fundedPct(featured)}%` }} /></div>
                            <div className="re-prog-row"><span>{fundedPct(featured)}% funded</span><span>{Number(featured.investors_count || 0).toLocaleString('en-US')} investors</span></div>
                          </div>
                          <div><span className="re-btn re-btn-accent">View property <ChevronRight /></span></div>
                        </div>
                      </div>
                    )}

                    {list.length === 0 ? (
                      <div className="re-card re-empty"><strong>No properties match</strong><span>Try a different type or search term.</span></div>
                    ) : (
                      <div className="re-grid">
                        {list.map(p => <PropertyCard key={p.id} p={p} i={seedOf(p) - 1} onOpen={setOpen} />)}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="re-card">
                {holdings.length === 0 ? (
                  <div className="re-empty">
                    <Building2 size={36} style={{ color:'var(--faint)' }} />
                    <strong>You don't own any property yet</strong>
                    <span>Buy your first shares from $100 and your holdings will appear here.</span>
                    <button className="re-btn re-btn-accent" style={{ marginTop:6 }} onClick={() => setTab('browse')}>Browse properties</button>
                  </div>
                ) : (
                  <div className="re-table-wrap">
                    <table className="re-table">
                      <thead><tr><th>Property</th><th className="r">Invested</th><th className="r">Shares</th><th className="r">Yield</th><th className="r">Rent a year</th><th>Since</th><th>Status</th></tr></thead>
                      <tbody>
                        {holdings.map((h, i) => {
                          const p = h.properties || {};
                          return (
                            <tr key={h.id} style={{ cursor: p.id ? 'pointer' : 'default' }} onClick={() => p.id && setOpen(p)}>
                              <td>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                  <div className="re-thumb"><PropertyImage p={{ ...p, name:p.name || 'Property' }} seed={i + 1} /></div>
                                  <div><div style={{ fontWeight:600 }}>{p.name || 'Property'}</div><div style={{ fontSize:13, color:'var(--muted)' }}>{[p.city, p.country].filter(Boolean).join(', ')}</div></div>
                                </div>
                              </td>
                              <td className="r">{usd(h.amount, 2)}</td>
                              <td className="r">{Number(h.shares || 0).toLocaleString('en-US')}</td>
                              <td className="r">{p.target_yield != null ? `${Number(p.target_yield).toFixed(1)}%` : '—'}</td>
                              <td className="r up">{usd(Number(h.amount || 0) * Number(p.target_yield || 0) / 100, 2)}</td>
                              <td>{new Date(h.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
                              <td><span className={`re-status ${h.status}`}>{h.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="re-how">
              {[
                { t:'Choose a property', d:'Every listing is reviewed, valued and let before it opens to investors.' },
                { t:'Buy shares from $100', d:'Pay from your wallet. You own a share of the property in proportion to what you put in.' },
                { t:'Collect rent quarterly', d:'Your share of the rent, after costs, is paid into your wallet every three months.' },
                { t:'Exit at the end', d:'When the hold period ends the property is sold, and you receive your share of the proceeds.' },
              ].map((s, i) => (
                <div key={s.t} className="re-card re-how-step">
                  <div className="re-how-n">{i + 1}</div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
            <p className="re-risk"><ShieldCheck size={14} style={{ verticalAlign:'-2px', marginRight:6 }} />Property investments can fall as well as rise in value, rental income isn't guaranteed, and your money is tied up for the hold period. Target yields and growth figures are estimates, not promises.</p>
          </main>
        </div>
      </div>

      {open && (
        <PropertyDrawer
          p={open} seed={seedOf(open)} isSample={isSample || String(open.id).startsWith('sample-')} balance={balance}
          onClose={() => setOpen(null)}
          onInvested={() => setReloadKey(k => k + 1)}
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
