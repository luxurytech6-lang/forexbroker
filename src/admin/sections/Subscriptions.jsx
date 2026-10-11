import React, { useState } from 'react';
import { Check, X, Ban } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, ProofButton, CrudTable, useRows, useUsers, useAction,
  notify, audit, isMissingFn, usd, fmtDate, fmtDateTime,
} from '../adminShared';

async function reviewRequest(req, approve) {
  const { error: rpcErr } = await supabase.rpc('admin_review_subscription_request', { p_request_id: req.id, p_approve: approve });
  if (!rpcErr) { audit(approve ? 'approve' : 'reject', 'subscription_payment_requests', req.id, { status: 'pending' }, { status: approve ? 'approved' : 'rejected' }); return; }
  if (!isMissingFn(rpcErr)) throw rpcErr;

  // Fallback without the RPC
  if (approve) {
    const now = new Date();
    const end = new Date(now);
    if (req.billing_cycle === 'annual') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
    await supabase.from('user_subscriptions').update({ status: 'cancelled', cancelled_at: now.toISOString() })
      .eq('user_id', req.user_id).eq('status', 'active');
    const { error } = await supabase.from('user_subscriptions').insert({
      user_id: req.user_id, plan_id: req.plan_id, status: 'active', billing_cycle: req.billing_cycle || 'monthly',
      current_period_start: now.toISOString(), current_period_end: end.toISOString(),
    });
    if (error) throw error;
    if (req.plan_name) await supabase.from('users').update({ plan: req.plan_name }).eq('id', req.user_id);
  }
  const { error } = await supabase.from('subscription_payment_requests')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() }).eq('id', req.id);
  if (error) throw error;
  audit(approve ? 'approve' : 'reject', 'subscription_payment_requests', req.id, { status: 'pending' }, { status: approve ? 'approved' : 'rejected' });
}

export default function Subscriptions({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('requests');
  const reqs = useRows('subscription_payment_requests');
  const subs = useRows('user_subscriptions', { select: '*, subscription_plans(name)', build: q => q.eq('status', 'active') });
  const [busy, run] = useAction();
  const pending = reqs.rows.filter(r => r.status === 'pending');

  const act = (r, approve) => {
    if (!window.confirm(`${approve ? 'Approve' : 'Reject'} ${r.plan_name || 'plan'} payment of ${usd(r.amount)}?`)) return;
    run(r.id, async () => {
      await reviewRequest(r, approve);
      await notify(r.user_id, {
        title: approve ? `Your ${r.plan_name || ''} plan is active`.replace('  ', ' ') : 'Your plan payment was declined',
        description: approve ? 'Thanks for upgrading. Your new features are ready to use.' : 'We couldn’t confirm your payment. Contact support if you think this is a mistake.',
        category: 'payment', icon_class: approve ? 'ti-crown' : 'ti-circle-x', action_url: '/billing',
      });
      reqs.reload(); subs.reload(); refreshCounts?.();
    }, approve ? 'Plan activated' : 'Request rejected');
  };

  const cancelSub = (s) => {
    if (!window.confirm('Cancel this subscription now? The user drops back to the Free plan.')) return;
    run(s.id, async () => {
      const { error } = await supabase.from('user_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', s.id);
      if (error) throw error;
      await supabase.from('users').update({ plan: 'free' }).eq('id', s.user_id);
      audit('cancel', 'user_subscriptions', s.id, { status: 'active' }, { status: 'cancelled' });
      subs.reload();
    }, 'Subscription cancelled');
  };

  return (
    <>
      <PageHead title="Subscriptions" sub="Approve plan payments, manage active subscriptions and edit the plans users can buy." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'requests', label:'Payment requests', count: pending.length },
        { key:'active',   label:'Active subscriptions', count: subs.rows.length },
        { key:'plans',    label:'Plans' },
      ]} />

      {tab === 'requests' && (
        <DataTable rows={reqs.rows} loading={reqs.loading} error={reqs.error} missing={reqs.missing} table="subscription_payment_requests" empty="No plan payments yet"
          columns={[
            { key:'created_at', label:'Date', render:r => fmtDateTime(r.created_at) },
            { key:'user', label:'User', render:r => <UserCell user={users[r.user_id]} id={r.user_id} /> },
            { key:'plan', label:'Plan', render:r => <div className="ad-user"><span>{r.plan_name}</span><small style={{ textTransform:'capitalize' }}>{r.billing_cycle}</small></div> },
            { key:'amount', label:'Amount', align:'right', render:r => usd(r.amount) },
            { key:'coin', label:'Paid with', render:r => r.coin ? `${r.coin}${r.network ? ` · ${r.network}` : ''}` : '—' },
            { key:'tx_hash', label:'Tx hash', render:r => <span className="ad-mono">{r.tx_hash ? `${r.tx_hash.slice(0, 14)}…` : '—'}</span> },
            { key:'proof', label:'Proof', render:r => <ProofButton path={r.proof_url} /> },
            { key:'act', label:'Status', align:'right', render:r => r.status !== 'pending' ? <Pill status={r.status} /> : (
              <div className="ad-row-actions">
                <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={busy === r.id} onClick={() => act(r, true)}><Check />Approve</button>
                <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === r.id} onClick={() => act(r, false)}><X />Reject</button>
              </div>
            ) },
          ]} />
      )}

      {tab === 'active' && (
        <DataTable rows={subs.rows} loading={subs.loading} error={subs.error} missing={subs.missing} table="user_subscriptions" empty="No active subscriptions"
          columns={[
            { key:'user', label:'User', render:r => <UserCell user={users[r.user_id]} id={r.user_id} /> },
            { key:'plan', label:'Plan', render:r => r.subscription_plans?.name || '—' },
            { key:'billing_cycle', label:'Billing', render:r => <span style={{ textTransform:'capitalize' }}>{r.billing_cycle || '—'}</span> },
            { key:'current_period_start', label:'Started', render:r => fmtDate(r.current_period_start) },
            { key:'current_period_end', label:'Renews / ends', render:r => fmtDate(r.current_period_end) },
            { key:'act', label:'', align:'right', render:r => <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === r.id} onClick={() => cancelSub(r)}><Ban />Cancel</button> },
          ]} />
      )}

      {tab === 'plans' && (
        <CrudTable table="subscription_plans" itemName="plan" order="monthly_price" asc
          fields={[
            { key:'name', required:true, help:'Must be unique, e.g. Basic, Pro, Elite' },
            { key:'monthly_price', type:'number', label:'Monthly price ($)', required:true },
            { key:'annual_price', type:'number', label:'Annual price ($ / month)', required:true, help:'Price per month when billed yearly' },
            { key:'max_copy_traders', type:'number', required:true },
            { key:'max_allocation', type:'number', label:'Max allocation ($)', help:'Leave empty for no limit' },
            { key:'max_alerts', type:'number', required:true },
            { key:'max_watchlist', type:'number', required:true },
            { key:'api_calls_per_day', type:'number', required:true },
            { key:'features', type:'json', default:'{}', help:'JSON, e.g. {"priority_support": true, "ai_signals": true}' },
          ]}
          columns={[
            { key:'name', label:'Plan', render:r => <strong>{r.name}</strong> },
            { key:'monthly_price', label:'Monthly', align:'right', render:r => usd(r.monthly_price) },
            { key:'annual_price', label:'Annual (per month)', align:'right', render:r => usd(r.annual_price) },
            { key:'max_copy_traders', label:'Copy traders', align:'right' },
            { key:'max_allocation', label:'Max allocation', align:'right', render:r => r.max_allocation != null ? usd(r.max_allocation, 0) : '—' },
          ]} />
      )}
    </>
  );
}
