import React, { useMemo, useState } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, ProofButton, useRows, useUsers, useAction,
  walletAdjust, notify, audit, usd, fmtDateTime, WITHDRAWALS_DEBIT_ON_REQUEST, PURCHASE_TYPES,
} from '../adminShared';

const isDeposit    = (t) => /deposit/i.test(t.type || '');
const isWithdrawal = (t) => /withdraw/i.test(t.type || '');

/**
 * Approve / reject a pending transaction.
 * Deposits credit the wallet on approval (net_amount if present, else amount).
 * Withdrawals debit on approval, unless WITHDRAWALS_DEBIT_ON_REQUEST, in which
 * case rejecting refunds instead.
 */
async function review(tx, approve) {
  const { error: rpcErr } = await supabase.rpc('admin_review_transaction', {
    p_tx_id: tx.id, p_approve: approve, p_withdrawal_debited: WITHDRAWALS_DEBIT_ON_REQUEST,
  });
  if (!rpcErr) { audit(approve ? 'approve' : 'reject', 'transactions', tx.id, { status: tx.status }, { status: approve ? 'completed' : 'rejected' }); return; }
  if (!/function .* does not exist|could not find the function/i.test(rpcErr.message || '') && rpcErr.code !== 'PGRST202') throw rpcErr;

  // Fallback without the RPC
  const amt = Math.abs(Number(tx.net_amount ?? tx.amount ?? 0));
  const cur = tx.currency || 'USD';
  if (approve && isDeposit(tx)) await walletAdjust(tx.user_id, amt, { currency: cur, record: false });
  if (approve && isWithdrawal(tx) && !WITHDRAWALS_DEBIT_ON_REQUEST) await walletAdjust(tx.user_id, -Math.abs(Number(tx.amount)), { currency: cur, record: false });
  if (!approve && isWithdrawal(tx) && WITHDRAWALS_DEBIT_ON_REQUEST) await walletAdjust(tx.user_id, Math.abs(Number(tx.amount)), { currency: cur, record: false });
  const { error } = await supabase.from('transactions').update({ status: approve ? 'completed' : 'rejected', updated_at: new Date().toISOString() }).eq('id', tx.id);
  if (error) throw error;
  audit(approve ? 'approve' : 'reject', 'transactions', tx.id, { status: tx.status }, { status: approve ? 'completed' : 'rejected' });
}

export default function Transactions({ refreshCounts, go }) {
  const users = useUsers();
  const { rows, loading, error, missing, reload } = useRows('transactions', { limit: 3000 });
  const [tab, setTab] = useState('deposits');
  const [busy, run] = useAction();

  const pending = rows.filter(t => t.status === 'pending');
  const groups = useMemo(() => ({
    deposits:    pending.filter(isDeposit),
    withdrawals: pending.filter(isWithdrawal),
    other:       pending.filter(t => !isDeposit(t) && !isWithdrawal(t)),
    all:         rows,
  }), [rows, pending]);

  const act = (tx, approve) => {
    const verb = approve ? 'Approve' : 'Reject';
    const who = users[tx.user_id]?.email || 'this user';
    if (!window.confirm(`${verb} ${String(tx.type).replace(/_/g, ' ')} of ${usd(Math.abs(tx.amount))} for ${who}?`)) return;
    run(tx.id, async () => {
      await review(tx, approve);
      const kind = isDeposit(tx) ? 'deposit' : isWithdrawal(tx) ? 'withdrawal' : 'payment';
      await notify(tx.user_id, {
        title: approve ? `Your ${kind} of ${usd(Math.abs(tx.amount))} was approved` : `Your ${kind} of ${usd(Math.abs(tx.amount))} was declined`,
        description: approve ? (isDeposit(tx) ? 'The funds are now in your wallet.' : 'It has been processed.') : 'Contact support if you have questions.',
        category: 'payment', icon_class: approve ? 'ti-circle-check' : 'ti-circle-x', action_url: '/payments',
      });
      reload(); refreshCounts?.();
    }, approve ? 'Approved' : 'Rejected');
  };

  const columns = [
    { key:'created_at', label:'Date', render:r => fmtDateTime(r.created_at) },
    { key:'user', label:'User', render:r => <UserCell user={users[r.user_id]} id={r.user_id} /> },
    { key:'type', label:'Type', render:r => <span style={{ textTransform:'capitalize' }}>{String(r.type || '').replace(/_/g, ' ')}</span> },
    { key:'description', label:'Details', wrap:true, render:r => <span style={{ fontSize:13.5 }}>{r.description || '—'}</span> },
    { key:'amount', label:'Amount', align:'right', render:r => (
      <div><span className={Number(r.amount) < 0 || isWithdrawal(r) ? 'down' : 'up'}>{usd(r.amount)}{r.currency && r.currency !== 'USD' ? ` ${r.currency}` : ''}</span>
        {Number(r.fee) > 0 && <div style={{ fontSize:12, color:'var(--muted)' }}>fee {usd(r.fee)} · net {usd(r.net_amount)}</div>}</div>
    ) },
    { key:'reference', label:'Reference', render:r => { const ref = r.reference || r.invoice_number || ''; return ref ? <span className="ad-mono" title={ref}>{ref.length > 18 ? `${ref.slice(0, 16)}…` : ref}</span> : '—'; } },
    { key:'proof', label:'Proof', render:r => <ProofButton path={r.proof_url} /> },
    { key:'act', label:'Status', align:'right', render:r => r.status === 'pending' && PURCHASE_TYPES[r.type] ? (
      // Paid purchases are approved where the purchase lives, which also settles this payment
      <button className="ad-btn ad-btn-ghost ad-btn-sm" title="Approving it there switches the purchase on and completes this payment" onClick={() => go?.(PURCHASE_TYPES[r.type].section)}>
        Review in {PURCHASE_TYPES[r.type].label}<ArrowRight />
      </button>
    ) : r.status === 'pending' ? (
      <div className="ad-row-actions">
        <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={busy === r.id} onClick={() => act(r, true)}><Check />Approve</button>
        <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === r.id} onClick={() => act(r, false)}><X />Reject</button>
      </div>
    ) : <Pill status={r.status} /> },
  ];

  return (
    <>
      <PageHead title="Deposits & withdrawals" sub="Check the payment proof before approving. Approving a deposit credits the user's wallet; approving a withdrawal releases the funds." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'deposits',    label:'Pending deposits',    count:groups.deposits.length },
        { key:'withdrawals', label:'Pending withdrawals', count:groups.withdrawals.length },
        { key:'other',       label:'Other pending',       count:groups.other.length },
        { key:'all',         label:'All transactions' },
      ]} />
      <DataTable rows={groups[tab]} columns={columns} loading={loading} error={error} missing={missing} table="transactions"
        empty={tab === 'all' ? 'No transactions yet' : 'Nothing waiting for review'} />
    </>
  );
}
