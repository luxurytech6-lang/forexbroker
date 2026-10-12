import React, { useEffect, useState } from 'react';
import { Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Crown, Pickaxe, Building2, Headset, CreditCard, LineChart, CandlestickChart } from 'lucide-react';
import { supabase, PageHead, DataTable, Pill, UserCell, useUsers, usd, fmtDateTime } from '../adminShared';

const headCount = (q) => q.then(r => (r.error ? null : r.count ?? 0)).catch(() => null);

export default function Overview({ counts, go }) {
  const users = useUsers();
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState({ rows: [], loading: true, missing: false });

  useEffect(() => {
    (async () => {
      const [userCount, newUsers, walletRows, pendDep, pendWd, activeMining, activeSubs] = await Promise.all([
        headCount(supabase.from('users').select('id', { count:'exact', head:true })),
        headCount(supabase.from('users').select('id', { count:'exact', head:true }).gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString())),
        supabase.from('wallets').select('balance,currency').limit(20000).then(r => r.data || []).catch(() => []),
        supabase.from('transactions').select('amount').eq('status', 'pending').eq('type', 'deposit').limit(5000).then(r => r.data || []).catch(() => []),
        supabase.from('transactions').select('amount').eq('status', 'pending').in('type', ['withdrawal', 'withdraw']).limit(5000).then(r => r.data || []).catch(() => []),
        supabase.from('mining_contracts').select('amount').eq('status', 'active').limit(10000).then(r => r.data || []).catch(() => []),
        headCount(supabase.from('user_subscriptions').select('id', { count:'exact', head:true }).eq('status', 'active')),
      ]);
      const sum = (rows) => rows.reduce((s, r) => s + Math.abs(Number(r.amount || r.balance || 0)), 0);
      setStats({
        userCount, newUsers, activeSubs,
        balances: walletRows.filter(w => (w.currency || 'USD') === 'USD').reduce((s, w) => s + Number(w.balance || 0), 0),
        pendDepCount: pendDep.length, pendDepSum: sum(pendDep),
        pendWdCount: pendWd.length, pendWdSum: sum(pendWd),
        miningCount: activeMining.length, miningSum: sum(activeMining),
      });
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending:false }).limit(12);
      setRecent({ rows: data || [], loading: false, missing: !!error, error });
    })();
  }, []);

  const v = (x) => (x == null ? '—' : Number(x).toLocaleString('en-US'));
  const tiles = [
    { Icon:Users,           lbl:'Users',              val:v(stats.userCount), sub: stats.newUsers != null ? `${v(stats.newUsers)} joined this week` : '', to:'users' },
    { Icon:Wallet,          lbl:'Held in USD wallets', val:usd(stats.balances || 0), sub:'Sum of all balances', to:'users' },
    { Icon:ArrowDownToLine, lbl:'Deposits to review',  val:v(stats.pendDepCount ?? 0), sub:usd(stats.pendDepSum || 0), to:'transactions', alert: stats.pendDepCount > 0 },
    { Icon:ArrowUpFromLine, lbl:'Withdrawals to review', val:v(stats.pendWdCount ?? 0), sub:usd(stats.pendWdSum || 0), to:'transactions', alert: stats.pendWdCount > 0 },
    { Icon:Crown,           lbl:'Plan payments to review', val:v(counts.subscriptions ?? 0), sub:`${v(stats.activeSubs ?? 0)} active subscriptions`, to:'subscriptions', alert: counts.subscriptions > 0 },
    { Icon:Pickaxe,         lbl:'Active mining contracts', val:v(stats.miningCount ?? 0), sub:`${usd(stats.miningSum || 0)} · ${v(counts.mining ?? 0)} pending`, to:'mining', alert: counts.mining > 0 },
    { Icon:Building2,       lbl:'Property investments to review', val:v(counts.property ?? 0), sub:'Pending approval', to:'real-estate', alert: counts.property > 0 },
    { Icon:Headset,         lbl:'Open support tickets', val:v(counts.support ?? 0), sub:'Waiting on the team', to:'support', alert: counts.support > 0 },
    { Icon:CreditCard,      lbl:'Card orders to review', val:v(counts.cards ?? 0), sub:'Pending', to:'cards', alert: counts.cards > 0 },
    { Icon:CandlestickChart, lbl:'Terminal trades to approve', val:v(counts.terminal ?? 0), sub:'Waiting before they go live', to:'terminal', alert: counts.terminal > 0 },
    { Icon:LineChart,       lbl:'Stock orders waiting', val:v(counts.stocks ?? 0), sub:'Limit orders to fill or cancel', to:'stocks', alert: counts.stocks > 0 },
    { Icon:Users,           lbl:'Open hire requests', val:v(counts.hire ?? 0), sub:'Clients looking for a trader', to:'hire', alert: counts.hire > 0 },
  ];

  return (
    <>
      <PageHead title="Overview" sub="What needs your attention right now. Highlighted numbers are waiting on an admin." />
      <div className="ad-stats">
        {tiles.map(t => (
          <a key={t.lbl} href={`/admin/${t.to}`} onClick={e => { e.preventDefault(); go(t.to); }} className={`ad-card ad-stat${t.alert ? ' alert' : ''}`}>
            <div className="ad-stat-lbl"><t.Icon />{t.lbl}</div>
            <div className="ad-stat-val">{t.val}</div>
            <div className="ad-stat-sub">{t.sub}</div>
          </a>
        ))}
      </div>

      <h2 style={{ fontSize:17, fontWeight:600, margin:'8px 0 12px' }}>Latest transactions</h2>
      <DataTable
        rows={recent.rows} loading={recent.loading} missing={recent.missing} table="transactions" searchable={false}
        empty="No transactions yet"
        columns={[
          { key:'created_at', label:'Date', render:r => fmtDateTime(r.created_at) },
          { key:'user', label:'User', render:r => <UserCell user={users[r.user_id]} id={r.user_id} /> },
          { key:'type', label:'Type', render:r => <span style={{ textTransform:'capitalize' }}>{String(r.type || '').replace(/_/g, ' ')}</span> },
          { key:'amount', label:'Amount', align:'right', render:r => <span className={Number(r.amount) < 0 ? 'down' : 'up'}>{usd(r.amount)}</span> },
          { key:'status', label:'Status', render:r => <Pill status={r.status} /> },
        ]}
        onRowClick={() => go('transactions')}
      />
    </>
  );
}
