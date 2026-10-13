/**
 * Staking.jsx — Admin → Staking
 * Approve stake payments, see active stakes, pay out daily rewards, manage plans.
 * Uses admin_review_stake() and process_staking_rewards() (database/15_staking_swap_schema.sql).
 */
import React, { useMemo, useState } from 'react';
import { Check, X, Coins } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Chips, Pill, UserCell, CrudTable, PaymentCell, useRows, useUsers, useAction,
  usd, fmtDate, fmtDateTime,
} from '../adminShared';

export default function StakingAdmin({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('stakes');
  const [status, setStatus] = useState('pending');
  const stakes = useRows('stakes');
  const [busy, run] = useAction();

  const counts = useMemo(() => stakes.rows.reduce((m, s) => { m[s.status] = (m[s.status] || 0) + 1; return m; }, {}), [stakes.rows]);
  const list = status === 'all' ? stakes.rows : stakes.rows.filter(s => s.status === status);
  const active = stakes.rows.filter(s => s.status === 'active');
  const totalStaked = active.reduce((a, s) => a + Number(s.amount), 0);
  const perDay = active.reduce((a, s) => a + Number(s.amount) * Number(s.apy_pct) / 100 / 365, 0);

  const review = (s, approve) => {
    const note = approve ? null : window.prompt('Reason for declining (shown to the user):', 'We couldn’t confirm your payment.');
    if (!approve && note === null) return;
    if (approve && !window.confirm(`Approve ${usd(s.amount)} ${s.coin} stake for ${users[s.user_id]?.email || 'this user'}? The ${s.lock_days}-day lock starts now.`)) return;
    run(s.id, async () => {
      const { error } = await supabase.rpc('admin_review_stake', { p_id: s.id, p_approve: approve, p_note: note });
      if (error) throw error;
      stakes.reload(); refreshCounts?.();
    }, approve ? 'Stake approved' : 'Stake declined');
  };

  const payRewards = () => run('pay', async () => {
    const { data, error } = await supabase.rpc('process_staking_rewards');
    if (error) throw error;
    stakes.reload();
    return data;
  }, 'Rewards paid');

  return (
    <>
      <PageHead title="Staking" sub="Approve stake payments, then rewards are paid daily into the user's USD wallet and the stake is returned when the lock ends.">
        <button className="ad-btn ad-btn-accent" disabled={busy === 'pay'} onClick={payRewards}><Coins />{busy === 'pay' ? 'Paying…' : 'Pay rewards now'}</button>
      </PageHead>
      <div className="ad-kv" style={{ marginBottom:16 }}>
        <div><span>Active stakes</span><strong>{active.length}</strong></div>
        <div><span>Total staked</span><strong>{usd(totalStaked)}</strong></div>
        <div><span>Rewards per day</span><strong>{usd(perDay)}</strong></div>
        <div><span>Rewards paid so far</span><strong>{usd(stakes.rows.reduce((a, s) => a + Number(s.rewards_paid || 0), 0))}</strong></div>
      </div>
      <Tabs value={tab} onChange={setTab} items={[
        { key:'stakes', label:'Stakes', count: counts.pending || 0 },
        { key:'plans',  label:'Plans' },
      ]} />

      {tab === 'stakes' && (
        <DataTable rows={list} loading={stakes.loading} error={stakes.error} missing={stakes.missing} table="stakes"
          empty={status === 'pending' ? 'No stakes waiting for approval' : 'Nothing here'}
          toolbar={<Chips value={status} onChange={setStatus} items={['pending', 'active', 'completed', 'rejected', 'all']} />}
          searchText={s => `${users[s.user_id]?.email || ''} ${s.coin} ${s.plan_name || ''}`}
          columns={[
            { key:'created_at', label:'Submitted', render:s => fmtDateTime(s.created_at) },
            { key:'user', label:'User', render:s => <UserCell user={users[s.user_id]} id={s.user_id} /> },
            { key:'plan', label:'Plan', render:s => <div className="ad-user"><span>{s.plan_name || s.coin}</span><small>{s.apy_pct}% APY · {s.lock_days} days</small></div> },
            { key:'amount', label:'Amount', align:'right', render:s => usd(s.amount) },
            { key:'pay', label:'Payment', render:s => <PaymentCell row={s} /> },
            { key:'rewards_paid', label:'Rewards', align:'right', render:s => <span className="up">{usd(s.rewards_paid)}</span> },
            { key:'ends_at', label:'Unlocks', render:s => fmtDate(s.ends_at) },
            { key:'act', label:'Status', align:'right', render:s => s.status === 'pending' ? (
              <div className="ad-row-actions">
                <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={busy === s.id} onClick={() => review(s, true)}><Check />Approve</button>
                <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === s.id} onClick={() => review(s, false)}><X />Decline</button>
              </div>
            ) : <Pill status={s.status} /> },
          ]} />
      )}

      {tab === 'plans' && (
        <CrudTable table="staking_plans" itemName="plan" order="sort_order" asc
          defaults={{ is_active: true, lock_days: 30, min_amount: 100, sort_order: 0 }}
          fields={[
            { key:'name', required:true },
            { key:'coin', required:true, help:'Ticker, e.g. ETH, SOL, USDT' },
            { key:'apy_pct', type:'number', required:true, label:'APY (% a year)' },
            { key:'lock_days', type:'number', required:true, label:'Lock period (days)' },
            { key:'min_amount', type:'number', required:true, label:'Minimum ($)' },
            { key:'max_amount', type:'number', label:'Maximum ($)' },
            { key:'sort_order', type:'number', help:'Lower shows first' },
            { key:'is_active', type:'bool', label:'Visible to users' },
            { key:'featured', type:'bool', label:'Mark as popular' },
            { key:'description', type:'textarea' },
          ]}
          columns={[
            { key:'name', label:'Plan', render:p => <div className="ad-user"><strong>{p.name}</strong><small>{p.coin}</small></div> },
            { key:'apy_pct', label:'APY', align:'right', render:p => `${p.apy_pct}%` },
            { key:'lock_days', label:'Lock', align:'right', render:p => `${p.lock_days} days` },
            { key:'range', label:'Amount', render:p => `${usd(p.min_amount, 0)} – ${p.max_amount ? usd(p.max_amount, 0) : 'no max'}` },
            { key:'is_active', label:'Visible', render:p => <Pill status={p.is_active ? 'active' : 'draft'}>{p.is_active ? 'Yes' : 'Hidden'}</Pill> },
          ]} />
      )}
    </>
  );
}
