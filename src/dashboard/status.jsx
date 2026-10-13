/**
 * status.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * System Status — Route: /status
 * Placeholder uptime + incident data. Wire `SERVICES`/`INCIDENTS` up to a real
 * status source (Supabase table your ops team updates, or a status-page
 * provider's API) later.
 */
import { useState, useEffect, useRef } from "react";
import supabase from "../supabase";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Activity, Clock,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, Layers as DkLayers, Repeat as DkRepeat, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, ShieldCheck as DkShield, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";

const PAGE_CSS = `
  .st-banner {
    display:flex; align-items:center; gap:12px; padding:16px 20px;
    background:var(--green-dim); border:1px solid rgba(52,211,153,.25);
    border-radius:var(--r-lg); margin-bottom:24px;
  }
  .st-banner.degraded { background:var(--amber-dim); border-color:rgba(245,158,11,.25); }
  .st-banner-icon { color:var(--green); flex-shrink:0; }
  .st-banner.degraded .st-banner-icon { color:var(--amber); }
  .st-banner-title { font-size:14px; font-weight:700; }
  .st-banner-sub { font-size:11.5px; color:var(--muted); margin-top:2px; }

  .st-service { display:flex; align-items:center; gap:14px; padding:15px 20px; border-bottom:1px solid var(--border); }
  .st-service:last-child { border-bottom:none; }
  .st-service-name { font-size:13px; font-weight:600; flex:1; }
  .st-bars { display:flex; gap:2px; }
  .st-bar { width:5px; height:20px; border-radius:2px; background:var(--green); }
  .st-bar.degraded { background:var(--amber); }
  .st-bar.down { background:var(--red); }
  .st-bar.empty { background:var(--border2); }
  .st-uptime { font-family:var(--mono); font-size:12px; color:var(--muted); width:64px; text-align:right; }

  .st-incident { padding:16px 20px; border-bottom:1px solid var(--border); }
  .st-incident:last-child { border-bottom:none; }
  .st-incident-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .st-incident-title { font-size:13px; font-weight:700; }
  .st-incident-time { font-size:11px; color:var(--faint); margin-left:auto; }
  .st-incident-desc { font-size:12px; color:var(--muted); line-height:1.6; }
`;

const SERVICES = [
  { name: "Trading Terminal & Live Prices", uptime: "99.98%", bars: Array(30).fill("ok") },
  { name: "Wallets & Deposits", uptime: "99.99%", bars: Array(30).fill("ok") },
  { name: "Copy Trading Engine", uptime: "99.95%", bars: [...Array(27).fill("ok"), "degraded", "ok", "ok"] },
  { name: "Marketplace & Subscriptions", uptime: "100%", bars: Array(30).fill("ok") },
  { name: "Notifications", uptime: "99.91%", bars: [...Array(25).fill("ok"), "down", "ok", "ok", "ok", "ok"] },
  { name: "Support & Ticketing", uptime: "100%", bars: Array(30).fill("ok") },
];

const INCIDENTS = [
  { title: "Notifications delayed for some users", time: "3 days ago", status: "resolved", desc: "Push notifications were delayed by up to 20 minutes due to a queue backlog. Resolved after scaling the notification worker." },
  { title: "Copy trading sync lag on EUR pairs", time: "6 days ago", status: "resolved", desc: "A small subset of copy-trading accounts experienced a 30–60 second sync delay on EUR pairs during high volatility. Fixed by increasing broker connection throughput." },
];

function statusMeta(status) {
  if (status === "resolved") return { Icon: CheckCircle2, color: "var(--green)" };
  if (status === "monitoring") return { Icon: AlertTriangle, color: "var(--amber)" };
  return { Icon: XCircle, color: "var(--red)" };
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
const DK_ACTIVE = 'support';
const DK_TITLE  = 'Status';
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
/* Hold these pages to the desk palette */
:root {
  --bg:#07101E !important; --surface:#0C1A2E !important; --surface2:#112238 !important;
  --border:#1C2C45 !important; --border2:#2A3D5C !important; --text:#EEF2F7 !important;
  --muted:#8A9AB2 !important; --faint:#56677F !important;
  --accent:#E2AE4A !important; --accent-rgb:226,174,74 !important;
  --accent-dim:rgba(226,174,74,.14) !important; --accent-glow:rgba(226,174,74,.07) !important;
  --sans:'Instrument Sans', system-ui, sans-serif !important; --mono:'Instrument Sans', system-ui, sans-serif !important;
}
body, #root { background: var(--bg); color: var(--text); }

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


/* ─── Page shell (self-contained; no shared/AppShell dependency) ──────────── */
const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#07101E; --surface:#0C1A2E; --surface2:#112238; --border:#1C2C45; --border2:#2A3D5C;
  --text:#EEF2F7; --muted:#8A9AB2; --faint:#56677F;
  --accent:#E2AE4A; --accent-rgb:226,174,74; --accent-dim:rgba(226,174,74,.14); --accent-glow:rgba(226,174,74,.07);
  --green:#2FD394; --green-dim:rgba(47,211,148,.12); --amber:#F5A524; --amber-dim:rgba(245,165,36,.12);
  --red:#FF6470; --blue:#5B8CFF; --purple:#B49BFF;
  --sans:'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; --mono:var(--sans);
  --sidebar-w:264px; --topbar-h:64px; --r-sm:10px; --r-md:12px; --r-lg:16px; --layout-gap:16px;
}
html, body, #root { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; }
a { color:inherit; text-decoration:none; }
button { font-family:inherit; color:inherit; background:none; border:none; cursor:pointer; }
.in-shell { display:grid; grid-template-columns:var(--sidebar-w) minmax(0,1fr); height:100vh; height:100dvh; overflow:hidden; }
.in-sidebar { position:relative; z-index:300; }
.in-right { display:flex; flex-direction:column; min-width:0; height:100vh; height:100dvh; overflow:hidden; }
.in-topbar { flex-shrink:0; display:flex; align-items:center; padding:0 28px; z-index:50; }
.in-hamburger { display:none; flex-direction:column; gap:4px; padding:8px; cursor:pointer; }
.in-hamburger span { display:block; width:20px; height:2px; border-radius:2px; background:var(--text); }
.in-main { flex:1; overflow-y:auto; overflow-x:hidden; padding:24px 28px 48px; }
.in-main > * { max-width:1280px; margin-left:auto; margin-right:auto; }
.in-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:40px; padding:0 16px; border-radius:10px; font-size:14px; font-weight:600; white-space:nowrap; }
.in-btn-accent { background:var(--accent); color:#07101E; }
.in-btn-accent:hover { filter:brightness(1.07); }
.pg-back { display:inline-flex; align-items:center; gap:6px; cursor:pointer; margin-bottom:16px; }
.pg-hero { position:relative; overflow:hidden; padding:28px; margin-bottom:24px; }
.pg-hero-content { position:relative; }
.pg-hero-label { margin-bottom:8px; }
.pg-hero-sub { margin-top:10px; max-width:40em; }
.pg-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); }
.pg-card-title { display:flex; align-items:center; gap:8px; }
@media (max-width:960px) {
  .in-shell { grid-template-columns:1fr; }
  .in-sidebar { position:fixed !important; top:0; left:0; transform:translateX(-100%); transition:transform .3s cubic-bezier(.22,1,.36,1); }
  .in-sidebar.open { transform:none; box-shadow:30px 0 60px rgba(0,0,0,.45); }
  .in-hamburger { display:flex; }
  .in-topbar { padding:0 16px; }
  .in-main { padding:16px 16px 40px; }
  .pg-hero { padding:22px 18px; }
}
`;

/* Signed-in user's profile row; null until loaded */
function useCurrentUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const { data } = await supabase.from('users')
        .select('first_name,last_name,email,plan,is_verified,currency').eq('id', session.user.id).maybeSingle();
      if (live) setUser(data || { email: session.user.email });
    })();
    return () => { live = false; };
  }, []);
  return user;
}

export default function StatusPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useCurrentUser();

  const allOperational = SERVICES.every((s) => s.bars.every((b) => b === "ok"));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS + PAGE_CSS + DESK_CSS }} />
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 299 }} />}
      <div className="in-shell">
        <Sidebar open={sidebarOpen} user={user} />
        <div className="in-right">
          <Topbar onMenu={() => setSidebarOpen((v) => !v)} user={user} title="System" accent="Status" />
          <main className="in-main">
            <div className="pg-back" onClick={() => (window.location.href = "/support")}>
              <ArrowLeft size={13} /> Back to Help Center
            </div>

            <div className="pg-hero">
              <div className="pg-hero-grid" />
              <div className="pg-hero-content">
                <div className="pg-hero-label">Status</div>
                <div className="pg-hero-title">Platform <em>uptime</em></div>
                <div className="pg-hero-sub">Live status of every core service, plus a history of past incidents.</div>
              </div>
            </div>

            <div className={`st-banner${allOperational ? "" : " degraded"}`}>
              <Activity size={20} className="st-banner-icon" />
              <div>
                <div className="st-banner-title">{allOperational ? "All systems operational" : "Minor issues detected"}</div>
                <div className="st-banner-sub">Last checked just now · Updates automatically every few minutes</div>
              </div>
            </div>

            <div className="pg-card" style={{ marginBottom: 24 }}>
              <div className="pg-card-head"><div className="pg-card-title"><Activity size={16} /> Services (last 30 days)</div></div>
              <div>
                {SERVICES.map((s, i) => (
                  <div key={i} className="st-service">
                    <div className="st-service-name">{s.name}</div>
                    <div className="st-bars">
                      {s.bars.map((b, j) => <div key={j} className={`st-bar ${b}`} />)}
                    </div>
                    <div className="st-uptime">{s.uptime}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pg-card">
              <div className="pg-card-head"><div className="pg-card-title"><Clock size={16} /> Past incidents</div></div>
              <div>
                {INCIDENTS.map((inc, i) => {
                  const { Icon, color } = statusMeta(inc.status);
                  return (
                    <div key={i} className="st-incident">
                      <div className="st-incident-head">
                        <Icon size={15} style={{ color }} />
                        <div className="st-incident-title">{inc.title}</div>
                        <div className="st-incident-time">{inc.time}</div>
                      </div>
                      <div className="st-incident-desc">{inc.desc}</div>
                    </div>
                  );
                })}
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
