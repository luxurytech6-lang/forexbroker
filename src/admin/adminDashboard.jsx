/**
 * adminDashboard.jsx — Routes: /admin and /admin/:section
 * The admin console shell: guard, sidebar with pending-work counts, topbar,
 * and the section pages in ./sections.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Users as UsersIcon, ArrowLeftRight, Crown, Pickaxe, Building2, CreditCard,
  Headset, LineChart, Bot, Wallet, Bell, LogOut, Menu, ExternalLink, Loader2, RefreshCw, ScrollText,
  CandlestickChart, Copy, Users2, Lightbulb, BadgeCheck,
} from 'lucide-react';
import { ADMIN_CSS, supabase, useAdminGuard, adminLogout, ToastProvider, userName, initials } from './adminShared';

import Overview       from './sections/Overview';
import UsersSection   from './sections/Users';
import IdentityAdmin  from './sections/Identity';
import Transactions   from './sections/Transactions';
import Subscriptions  from './sections/Subscriptions';
import MiningAdmin    from './sections/Mining';
import RealEstateAdm  from './sections/RealEstate';
import CardsAdmin     from './sections/Cards';
import SupportAdmin   from './sections/Support';
import HireTrader     from './sections/HireTrader';
import TerminalAdmin  from './sections/Terminal';
import StocksAdmin    from './sections/Stocks';
import CopyTrading    from './sections/CopyTrading';
import InsightsAdmin  from './sections/Insights';
import Marketplace    from './sections/Marketplace';
import CryptoWallets  from './sections/CryptoWallets';
import Notifications  from './sections/Notifications';
import AuditLog       from './sections/AuditLog';

/* Sidebar sections. `count` names the pending-work counter shown as a badge. */
export const SECTIONS = [
  { group:'Overview', items:[
    { key:'overview',      label:'Overview',          Icon:LayoutDashboard, Comp:Overview },
  ]},
  { group:'People & money', items:[
    { key:'users',         label:'Users',             Icon:UsersIcon,       Comp:UsersSection },
    { key:'identity',      label:'Identity checks',   Icon:BadgeCheck,      Comp:IdentityAdmin, count:'identity' },
    { key:'transactions',  label:'Transactions',      Icon:ArrowLeftRight, Comp:Transactions, count:'transactions' },
    { key:'subscriptions', label:'Subscriptions',     Icon:Crown,           Comp:Subscriptions, count:'subscriptions' },
    { key:'wallets',       label:'Deposit addresses', Icon:Wallet,          Comp:CryptoWallets },
  ]},
  { group:'Products', items:[
    { key:'mining',        label:'Mining',            Icon:Pickaxe,         Comp:MiningAdmin, count:'mining' },
    { key:'real-estate',   label:'Real estate',       Icon:Building2,       Comp:RealEstateAdm, count:'property' },
    { key:'cards',         label:'Cards',             Icon:CreditCard,      Comp:CardsAdmin, count:'cards' },
    { key:'marketplace',   label:'Marketplace',       Icon:Bot,             Comp:Marketplace },
  ]},
  { group:'Trading', items:[
    { key:'terminal',      label:'Terminal trading',  Icon:CandlestickChart, Comp:TerminalAdmin, count:'terminal' },
    { key:'stocks',        label:'Stock trading',     Icon:LineChart,       Comp:StocksAdmin, count:'stocks' },
    { key:'copy-trading',  label:'Copy trading',      Icon:Copy,            Comp:CopyTrading, count:'copy' },
    { key:'hire',          label:'Hire a trader',     Icon:Users2,          Comp:HireTrader, count:'hire' },
  ]},
  { group:'Engagement', items:[
    { key:'insights',      label:'Insights',          Icon:Lightbulb,       Comp:InsightsAdmin },
    { key:'support',       label:'Support tickets',   Icon:Headset,         Comp:SupportAdmin, count:'support' },
    { key:'notifications', label:'Notifications',     Icon:Bell,            Comp:Notifications },
  ]},
  { group:'Security', items:[
    { key:'audit',         label:'Audit log',         Icon:ScrollText,      Comp:AuditLog },
  ]},
];
const ALL = SECTIONS.flatMap(g => g.items);

/* Each counter is one cheap HEAD request; missing tables just count as 0 */
const COUNTERS = {
  // purchases (property, mining, cards, copy trading) are counted in their own sections
  transactions:  () => supabase.from('transactions').select('id', { count:'exact', head:true }).eq('status', 'pending')
                        .not('type', 'in', '(property_investment,mining_purchase,card_order,copy_trading)'),
  identity:      () => supabase.from('identity_verifications').select('id', { count:'exact', head:true }).eq('status', 'pending'),
  subscriptions: () => supabase.from('subscription_payment_requests').select('id', { count:'exact', head:true }).eq('status', 'pending'),
  mining:        () => supabase.from('mining_contracts').select('id', { count:'exact', head:true }).eq('status', 'pending'),
  property:      () => supabase.from('property_investments').select('id', { count:'exact', head:true }).eq('status', 'pending'),
  cards:         () => supabase.from('card_orders').select('id', { count:'exact', head:true }).eq('status', 'pending'),
  support:       () => supabase.from('support_tickets').select('id', { count:'exact', head:true }).in('status', ['open', 'pending', 'in_progress']),
  terminal:      () => supabase.from('open_positions').select('id', { count:'exact', head:true }).eq('status', 'open').eq('approval_status', 'pending'),
  stocks:        () => supabase.from('stock_orders').select('id', { count:'exact', head:true }).in('status', ['open', 'pending']),
  copy:          () => supabase.from('copy_relationships').select('id', { count:'exact', head:true }).eq('status', 'pending'),
  hire:          () => supabase.from('hire_requests').select('id', { count:'exact', head:true }).in('status', ['open', 'pending']),
};

export function useCounts() {
  const [counts, setCounts] = useState({});
  const refresh = useCallback(async () => {
    const keys = Object.keys(COUNTERS);
    const res = await Promise.all(keys.map(k => COUNTERS[k]().then(r => (r.error ? 0 : r.count || 0)).catch(() => 0)));
    setCounts(Object.fromEntries(keys.map((k, i) => [k, res[i]])));
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 60000); return () => clearInterval(t); }, [refresh]);
  return [counts, refresh];
}

export default function AdminDashboard() {
  const { section = 'overview' } = useParams();
  const navigate = useNavigate();
  const { loading, session, profile } = useAdminGuard();
  const [open, setOpen] = useState(false);
  const [counts, refreshCounts] = useCounts();
  const [reloadKey, setReloadKey] = useState(0);

  const current = ALL.find(s => s.key === section) || ALL[0];
  const go = (key) => { setOpen(false); navigate(key === 'overview' ? '/admin' : `/admin/${key}`); window.scrollTo(0, 0); };

  useEffect(() => { document.title = `${current.label} · Admin`; }, [current]);

  if (loading) {
    return (<><style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} /><div className="ad-loading"><Loader2 className="ad-spin" />Checking admin access…</div></>);
  }

  const Comp = current.Comp;
  return (
    <ToastProvider>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <div className={`ad-backdrop${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
      <div className="ad-shell">
        <aside className={`ad-side${open ? ' open' : ''}`} aria-label="Admin navigation">
          <div className="ad-brand">
            <span className="ad-brand-mark">Profit<b>Gain</b>Signal</span>
            <span className="ad-brand-tag">Admin</span>
          </div>
          <nav className="ad-nav">
            {SECTIONS.map(g => (
              <div key={g.group}>
                <div className="ad-nav-h">{g.group}</div>
                {g.items.map(s => (
                  <button key={s.key} className={`ad-link${s.key === current.key ? ' active' : ''}`} aria-current={s.key === current.key ? 'page' : undefined} onClick={() => go(s.key)}>
                    <s.Icon />{s.label}
                    {s.count && counts[s.count] > 0 && <span className="ad-count">{counts[s.count] > 99 ? '99+' : counts[s.count]}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="ad-side-foot">
            <div className="ad-avatar">{initials(profile)}</div>
            <div className="ad-who"><strong>{userName(profile)}</strong><span>Administrator</span></div>
            <button className="ad-icon-btn danger" onClick={adminLogout} aria-label="Sign out" title="Sign out"><LogOut /></button>
          </div>
        </aside>

        <div className="ad-right">
          <header className="ad-top">
            <button className="ad-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
            <div className="ad-crumb"><span>Admin / </span>{current.label}</div>
            <div style={{ flex:1 }} />
            <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { setReloadKey(k => k + 1); refreshCounts(); }} aria-label="Refresh"><RefreshCw /><span>Refresh</span></button>
            <a className="ad-btn ad-btn-ghost ad-btn-sm" href="/dashboard" target="_blank" rel="noreferrer"><ExternalLink /><span>View app</span></a>
          </header>
          <main className="ad-main">
            <Comp key={`${current.key}-${reloadKey}`} session={session} counts={counts} refreshCounts={refreshCounts} go={go} />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
