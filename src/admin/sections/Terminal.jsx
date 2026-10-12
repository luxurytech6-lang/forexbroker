import React, { useMemo, useState } from 'react';
import { Check, X, Pencil, Square } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, Modal, useRows, useUsers, useAction,
  walletAdjust, notify, audit, usd, fmtDateTime,
} from '../adminShared';

/* open_positions — trades placed from /terminal.
   approval_status: pending → approved | rejected.  status: open → closed | cancelled. */
const num = (v, d = 5) => (v == null || v === '' ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }));

export default function TerminalAdmin({ refreshCounts }) {
  const users = useUsers();
  const pos = useRows('open_positions', { order: 'opened_at', limit: 3000 });
  const [tab, setTab] = useState('approvals');
  const [busy, run] = useAction();
  const [editing, setEditing] = useState(null);
  const [closing, setClosing] = useState(null);

  const groups = useMemo(() => ({
    approvals: pos.rows.filter(p => p.status === 'open' && p.approval_status === 'pending'),
    open:      pos.rows.filter(p => p.status === 'open' && p.approval_status !== 'pending'),
    history:   pos.rows.filter(p => p.status !== 'open'),
  }), [pos.rows]);

  const review = (p, approve) => {
    if (!window.confirm(`${approve ? 'Approve' : 'Reject'} ${p.trade_type} ${p.lots} lots ${p.symbol} for ${users[p.user_id]?.email || 'this user'}?`)) return;
    run(p.id, async () => {
      const patch = approve
        ? { approval_status: 'approved' }
        : { approval_status: 'rejected', status: 'cancelled', closed_at: new Date().toISOString() };
      const { error } = await supabase.from('open_positions').update(patch).eq('id', p.id);
      if (error) throw error;
      audit(approve ? 'approve' : 'reject', 'open_positions', p.id, { approval_status: p.approval_status }, patch);
      await notify(p.user_id, {
        title: approve ? `Your ${p.symbol} trade is live` : `Your ${p.symbol} trade was declined`,
        description: `${p.trade_type} ${p.lots} lots at ${p.open_price}.`,
        category: 'trade', icon_class: approve ? 'ti-circle-check' : 'ti-circle-x', action_url: '/terminal',
      });
      pos.reload(); refreshCounts?.();
    }, approve ? 'Trade approved' : 'Trade rejected');
  };

  const base = [
    { key:'opened_at', label:'Opened', render:p => fmtDateTime(p.opened_at) },
    { key:'user', label:'Trader', render:p => <UserCell user={users[p.user_id]} id={p.user_id} /> },
    { key:'symbol', label:'Symbol', render:p => <strong>{p.symbol}</strong> },
    { key:'trade_type', label:'Side', render:p => <Pill status={String(p.trade_type).toUpperCase() === 'BUY' ? 'ok' : 'bad'}>{p.trade_type}</Pill> },
    { key:'lots', label:'Lots', align:'right' },
    { key:'open_price', label:'Open', align:'right', render:p => num(p.open_price) },
    { key:'sltp', label:'S/L · T/P', render:p => <span className="ad-mono">{num(p.stop_loss)} · {num(p.take_profit)}</span> },
  ];

  return (
    <>
      <PageHead title="Terminal trading" sub="Trades placed from the trading terminal. New trades wait here for approval; you can also adjust or close open positions. Closing pays the profit or loss into the trader's wallet." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'approvals', label:'Awaiting approval', count: groups.approvals.length },
        { key:'open',      label:'Open positions',    count: groups.open.length },
        { key:'history',   label:'History' },
      ]} />

      {tab === 'approvals' && (
        <DataTable rows={groups.approvals} loading={pos.loading} error={pos.error} missing={pos.missing} table="open_positions" empty="No trades waiting for approval"
          columns={[...base,
            { key:'act', label:'', align:'right', render:p => (
              <div className="ad-row-actions">
                <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={busy === p.id} onClick={() => review(p, true)}><Check />Approve</button>
                <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === p.id} onClick={() => review(p, false)}><X />Reject</button>
              </div>
            ) },
          ]} />
      )}

      {tab === 'open' && (
        <DataTable rows={groups.open} loading={pos.loading} error={pos.error} missing={pos.missing} table="open_positions" empty="No open positions"
          columns={[...base,
            { key:'current_price', label:'Current', align:'right', render:p => num(p.current_price) },
            { key:'profit_loss', label:'P/L', align:'right', render:p => <span className={Number(p.profit_loss) < 0 ? 'down' : 'up'}>{usd(p.profit_loss)}</span> },
            { key:'act', label:'', align:'right', render:p => (
              <div className="ad-row-actions">
                <button className="ad-icon-btn" title="Edit stop loss / take profit" aria-label="Edit position" onClick={() => setEditing(p)}><Pencil /></button>
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setClosing(p)}><Square />Close</button>
              </div>
            ) },
          ]} />
      )}

      {tab === 'history' && (
        <DataTable rows={groups.history} loading={pos.loading} error={pos.error} missing={pos.missing} table="open_positions" empty="No closed trades yet"
          columns={[...base.filter(c => c.key !== 'sltp'),
            { key:'close_price', label:'Close', align:'right', render:p => num(p.close_price) },
            { key:'profit_loss', label:'P/L', align:'right', render:p => <span className={Number(p.profit_loss) < 0 ? 'down' : 'up'}>{usd(p.profit_loss)}</span> },
            { key:'closed_at', label:'Closed', render:p => fmtDateTime(p.closed_at) },
            { key:'status', label:'Status', align:'right', render:p => <Pill status={p.approval_status === 'rejected' ? 'rejected' : p.status} /> },
          ]} />
      )}

      {editing && <EditPosition p={editing} onClose={() => setEditing(null)} onDone={pos.reload} />}
      {closing && <ClosePosition p={closing} user={users[closing.user_id]} onClose={() => setClosing(null)} onDone={() => { pos.reload(); refreshCounts?.(); }} />}
    </>
  );
}

function EditPosition({ p, onClose, onDone }) {
  const [sl, setSl] = useState(p.stop_loss ?? '');
  const [tp, setTp] = useState(p.take_profit ?? '');
  const [cur, setCur] = useState(p.current_price ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    const patch = { stop_loss: sl === '' ? null : Number(sl), take_profit: tp === '' ? null : Number(tp), current_price: Number(cur) };
    const { error } = await supabase.from('open_positions').update(patch).eq('id', p.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    audit('update', 'open_positions', p.id, { stop_loss: p.stop_loss, take_profit: p.take_profit, current_price: p.current_price }, patch);
    onDone(); onClose();
  };
  return (
    <Modal title={`Edit ${p.symbol} position`} sub={`#${p.id} · ${p.trade_type} ${p.lots} lots @ ${p.open_price}`} onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button><button className="ad-btn ad-btn-accent" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="ad-form">
        <label className="ad-field"><span>Stop loss</span><input className="ad-input" type="number" step="any" value={sl} onChange={e => setSl(e.target.value)} /></label>
        <label className="ad-field"><span>Take profit</span><input className="ad-input" type="number" step="any" value={tp} onChange={e => setTp(e.target.value)} /></label>
        <label className="ad-field full"><span>Current price</span><input className="ad-input" type="number" step="any" value={cur} onChange={e => setCur(e.target.value)} /></label>
      </div>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}

/* Closes a position at a price the admin sets, records P/L and (optionally) pays it to the wallet */
function ClosePosition({ p, user, onClose, onDone }) {
  const [price, setPrice] = useState(p.current_price ?? p.open_price);
  const [pl, setPl] = useState(p.profit_loss ?? 0);
  const [pay, setPay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try {
      const realised = Number(pl) || 0;
      if (pay && realised) {
        await walletAdjust(p.user_id, realised, { type: 'trade_pnl', description: `${p.symbol} ${p.trade_type} ${p.lots} lots closed by admin` });
      }
      const patch = { status: 'closed', close_price: Number(price), profit_loss: realised, closed_at: new Date().toISOString() };
      const { error } = await supabase.from('open_positions').update(patch).eq('id', p.id);
      if (error) throw error;
      audit('close', 'open_positions', p.id, { status: 'open' }, { ...patch, paid_to_wallet: pay });
      await notify(p.user_id, { title: `Your ${p.symbol} position was closed`, description: `Closed at ${price}. Result: ${usd(realised)}.`, category: 'trade', icon_class: 'ti-chart-candle', action_url: '/terminal' });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not close the position.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Close ${p.symbol} position`} sub={`${user?.email || ''} · ${p.trade_type} ${p.lots} lots @ ${p.open_price}`} onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ad-btn ad-btn-accent" disabled={busy} onClick={go}>{busy ? 'Closing…' : 'Close position'}</button></>}>
      <div className="ad-form">
        <label className="ad-field"><span>Close price</span><input className="ad-input" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label className="ad-field"><span>Profit / loss ($)</span><input className="ad-input" type="number" step="0.01" value={pl} onChange={e => setPl(e.target.value)} /><small>Negative for a loss</small></label>
      </div>
      <label className="ad-check"><input type="checkbox" checked={pay} onChange={e => setPay(e.target.checked)} />Pay the result into the trader's wallet ({usd(Number(pl) || 0)})</label>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}
