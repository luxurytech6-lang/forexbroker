import React, { useMemo, useState } from 'react';
import { Check, X, Zap, Ban, Flag } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Chips, Pill, UserCell, CrudTable, ApproveModal, useRows, useUsers, useAction,
  walletAdjust, notify, audit, isMissingFn, usd, fmtDate, fmtDateTime,
} from '../adminShared';

const DAY = 86400000;
const daily = (c) => Number(c.amount || 0) * Number(c.daily_return_pct || 0) / 100;

/* Pays every full day earned on active contracts. Mirrors process_mining_payouts() in SQL. */
async function payoutsFallback() {
  const { data: rows, error } = await supabase.from('mining_contracts').select('*, mining_plans(returns_principal)').eq('status', 'active');
  if (error) throw error;
  let paid = 0, count = 0;
  for (const c of rows || []) {
    const start = new Date(c.last_payout_at || c.started_at || c.created_at).getTime();
    const end = new Date(c.ends_at || (new Date(c.started_at).getTime() + c.duration_days * DAY)).getTime();
    const upTo = Math.min(Date.now(), end);
    const days = Math.floor((upTo - start) / DAY);
    const patch = {};
    if (days > 0) {
      const amount = Math.round(daily(c) * days * 100) / 100;
      await walletAdjust(c.user_id, amount, { type: 'mining_payout', description: `Mining payout · ${c.coin} · ${days} day${days > 1 ? 's' : ''}` });
      await supabase.from('mining_payouts').insert({ user_id: c.user_id, contract_id: c.id, amount, coin: c.coin, days });
      patch.total_earned = Number(c.total_earned || 0) + amount;
      patch.last_payout_at = new Date(start + days * DAY).toISOString();
      paid += amount; count++;
    }
    const lastPaid = patch.last_payout_at ? new Date(patch.last_payout_at).getTime() : start;
    if (Date.now() >= end && end - lastPaid < DAY) {
      patch.status = 'completed';
      if (c.mining_plans?.returns_principal !== false) {
        await walletAdjust(c.user_id, Number(c.amount), { type: 'mining_principal', description: `Mining contract ended · capital returned` });
      }
      await notify(c.user_id, { title: `Your ${c.coin} mining contract has ended`, description: 'Your earnings have been paid to your wallet.', category: 'payment', icon_class: 'ti-pick', action_url: '/mining' });
    }
    if (Object.keys(patch).length) await supabase.from('mining_contracts').update(patch).eq('id', c.id);
  }
  return { paid, count };
}

export default function MiningAdmin({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('contracts');
  const [status, setStatus] = useState('pending');
  const contracts = useRows('mining_contracts', { select: '*, mining_plans(name,returns_principal)' });
  const payouts = useRows('mining_payouts');
  const [busy, run] = useAction();
  const [approving, setApproving] = useState(null);

  const counts = useMemo(() => contracts.rows.reduce((m, c) => { m[c.status] = (m[c.status] || 0) + 1; return m; }, {}), [contracts.rows]);
  const list = status === 'all' ? contracts.rows : contracts.rows.filter(c => c.status === status);

  const activate = async (c, charge) => {
    if (charge) await walletAdjust(c.user_id, -Number(c.amount), { type: 'mining_purchase', description: `Mining contract · ${c.mining_plans?.name || c.coin}` });
    const now = new Date();
    const ends = new Date(now.getTime() + Number(c.duration_days) * DAY);
    const { error } = await supabase.from('mining_contracts').update({ status: 'active', started_at: now.toISOString(), ends_at: ends.toISOString(), last_payout_at: now.toISOString() }).eq('id', c.id);
    if (error) throw error;
    audit('approve', 'mining_contracts', c.id, { status: 'pending' }, { status: 'active', charged: charge });
    await notify(c.user_id, { title: 'Your mining contract is live', description: `${c.mining_plans?.name || c.coin} has started mining. Earnings are paid daily.`, category: 'payment', icon_class: 'ti-pick', action_url: '/mining' });
    contracts.reload(); refreshCounts?.();
  };

  const setState = (c, next, msg) => {
    if (!window.confirm(`${msg}?`)) return;
    run(c.id, async () => {
      const { error } = await supabase.from('mining_contracts').update({ status: next }).eq('id', c.id);
      if (error) throw error;
      audit(`set_status`, 'mining_contracts', c.id, { status: c.status }, { status: next });
      if (next === 'cancelled' && c.status === 'pending') {
        await notify(c.user_id, { title: 'Your mining contract request was declined', description: 'Contact support if you have questions.', category: 'payment', icon_class: 'ti-circle-x', action_url: '/mining' });
      }
      contracts.reload(); refreshCounts?.();
    }, msg);
  };

  const runPayouts = () => run('pay', async () => {
    let res;
    const { data, error } = await supabase.rpc('process_mining_payouts');
    if (error) { if (!isMissingFn(error)) throw error; res = await payoutsFallback(); }
    else res = Array.isArray(data) ? data[0] : data;
    contracts.reload(); payouts.reload();
    audit('run_payouts', 'mining_payouts', '', null, res || null);
    return res;
  }, 'Payouts processed');

  return (
    <>
      <PageHead title="Mining" sub="Publish mining plans, approve contracts and pay out daily earnings. Payouts pay every full day earned since the last run, so it's safe to run any time.">
        <button className="ad-btn ad-btn-accent" onClick={runPayouts} disabled={busy === 'pay'}><Zap />{busy === 'pay' ? 'Paying…' : 'Pay earnings now'}</button>
      </PageHead>
      <Tabs value={tab} onChange={setTab} items={[
        { key:'contracts', label:'Contracts', count: counts.pending || undefined },
        { key:'plans',     label:'Plans' },
        { key:'payouts',   label:'Payouts' },
      ]} />

      {tab === 'contracts' && (
        <DataTable rows={list} loading={contracts.loading} error={contracts.error} missing={contracts.missing} table="mining_contracts" empty="No contracts here"
          toolbar={<Chips value={status} onChange={setStatus} items={[
            { key:'pending', label:`Pending (${counts.pending || 0})` }, { key:'active', label:`Active (${counts.active || 0})` },
            { key:'completed', label:'Completed' }, { key:'cancelled', label:'Cancelled' }, { key:'all', label:'All' },
          ]} />}
          columns={[
            { key:'created_at', label:'Bought', render:c => fmtDateTime(c.created_at) },
            { key:'user', label:'User', render:c => <UserCell user={users[c.user_id]} id={c.user_id} /> },
            { key:'plan', label:'Plan', render:c => <div className="ad-user"><span>{c.mining_plans?.name || '—'}</span><small>{c.coin} · {Number(c.hashrate || 0)} {c.hashrate_unit}</small></div> },
            { key:'amount', label:'Amount', align:'right', render:c => usd(c.amount) },
            { key:'rate', label:'Daily', align:'right', render:c => <span>{Number(c.daily_return_pct)}% · {usd(daily(c))}</span> },
            { key:'term', label:'Term', render:c => c.ends_at ? `${fmtDate(c.started_at)} → ${fmtDate(c.ends_at)}` : `${c.duration_days} days` },
            { key:'total_earned', label:'Paid out', align:'right', render:c => <span className="up">{usd(c.total_earned)}</span> },
            { key:'status', label:'Status', render:c => <Pill status={c.status} /> },
            { key:'act', label:'', align:'right', render:c => (
              <div className="ad-row-actions">
                {c.status === 'pending' && <>
                  <button className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setApproving(c)}><Check />Approve</button>
                  <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === c.id} onClick={() => setState(c, 'cancelled', 'Reject this contract')}><X />Reject</button>
                </>}
                {c.status === 'active' && <>
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={busy === c.id} onClick={() => setState(c, 'completed', 'Mark this contract completed')}><Flag />Complete</button>
                  <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === c.id} onClick={() => setState(c, 'cancelled', 'Cancel this active contract')}><Ban />Cancel</button>
                </>}
              </div>
            ) },
          ]} />
      )}

      {tab === 'plans' && (
        <CrudTable table="mining_plans" itemName="plan" order="sort_order" asc
          defaults={{ is_active: true, hashrate_unit: 'TH/s', returns_principal: true, duration_days: 30, sort_order: 0 }}
          fields={[
            { key:'name', required:true },
            { key:'coin', required:true, help:'Ticker, e.g. BTC, LTC, KAS, ETC, DOGE' },
            { key:'algorithm', help:'e.g. SHA-256, Scrypt' },
            { key:'hashrate', type:'number', required:true, help:'Hashrate given for the minimum amount; scales with what the user puts in' },
            { key:'hashrate_unit', type:'select', options:['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'], required:true },
            { key:'min_investment', type:'number', required:true, label:'Minimum ($)' },
            { key:'max_investment', type:'number', label:'Maximum ($)' },
            { key:'duration_days', type:'number', required:true, label:'Term (days)' },
            { key:'daily_return_pct', type:'number', required:true, label:'Daily return (%)' },
            { key:'sort_order', type:'number', help:'Lower shows first' },
            { key:'is_active', type:'bool', label:'Visible to users' },
            { key:'featured', type:'bool', label:'Mark as most popular' },
            { key:'returns_principal', type:'bool', label:'Return capital at the end' },
            { key:'description', type:'textarea' },
          ]}
          columns={[
            { key:'name', label:'Plan', render:p => <div className="ad-user"><strong>{p.name}</strong><small>{p.coin} · {p.algorithm}</small></div> },
            { key:'hashrate', label:'Hashrate', render:p => `${p.hashrate} ${p.hashrate_unit}` },
            { key:'range', label:'Amount', render:p => `${usd(p.min_investment, 0)} – ${p.max_investment ? usd(p.max_investment, 0) : 'no max'}` },
            { key:'daily_return_pct', label:'Daily', align:'right', render:p => `${p.daily_return_pct}%` },
            { key:'duration_days', label:'Term', align:'right', render:p => `${p.duration_days} d` },
            { key:'is_active', label:'Visible', render:p => <Pill status={p.is_active ? 'active' : 'paused'}>{p.is_active ? 'Live' : 'Hidden'}</Pill> },
          ]} />
      )}

      {tab === 'payouts' && (
        <DataTable rows={payouts.rows} loading={payouts.loading} error={payouts.error} missing={payouts.missing} table="mining_payouts" empty="No payouts yet"
          columns={[
            { key:'created_at', label:'Date', render:p => fmtDateTime(p.created_at) },
            { key:'user', label:'User', render:p => <UserCell user={users[p.user_id]} id={p.user_id} /> },
            { key:'coin', label:'Coin' },
            { key:'days', label:'Days', align:'right' },
            { key:'amount', label:'Amount', align:'right', render:p => <span className="up">{usd(p.amount)}</span> },
          ]} />
      )}

      {approving && (
        <ApproveModal title="Approve mining contract" sub={`${users[approving.user_id]?.email || ''} · ${approving.mining_plans?.name || approving.coin}`}
          amount={Number(approving.amount)} onClose={() => setApproving(null)}
          onConfirm={(charge) => activate(approving, charge)}>
          <p style={{ color:'var(--muted)' }}>The contract starts mining now and runs for {approving.duration_days} days at {approving.daily_return_pct}% a day ({usd(daily(approving))}).</p>
        </ApproveModal>
      )}
    </>
  );
}
