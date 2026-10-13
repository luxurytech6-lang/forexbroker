import React, { useMemo, useState } from 'react';
import { Check, X, Pencil, Square, Plus, Search } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, Modal, useRows, useUsers, useAction,
  notify, audit, usd, fmtDateTime, userName,
} from '../adminShared';

/* open_positions — trades placed from /terminal, plus trades the desk records from the broker.
   approval_status: pending → approved | rejected.  status: open → closed | cancelled.
   Broker trades (source = 'broker') carry the broker ticket and are managed with the
   admin_record_trade / admin_update_trade_pnl / admin_close_trade functions
   (database/12_broker_trades_schema.sql), which keep the wallet in step with the P/L. */
const num = (v, d = 5) => (v == null || v === '' ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }));
const signed = (v) => `${Number(v) < 0 ? '−' : '+'}${usd(Math.abs(Number(v) || 0))}`;
const BROKER_KEY = 'pgs-admin-broker-name';
const lastBroker = () => { try { return localStorage.getItem(BROKER_KEY) || ''; } catch { return ''; } };
const rememberBroker = (b) => { try { localStorage.setItem(BROKER_KEY, b); } catch { /* ignore */ } };
const toLocalInput = (d = new Date()) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

export default function TerminalAdmin({ refreshCounts }) {
  const users = useUsers();
  const pos = useRows('open_positions', { order: 'opened_at', limit: 3000 });
  const [tab, setTab] = useState('approvals');
  const [busy, run] = useAction();
  const [editing, setEditing] = useState(null);
  const [closing, setClosing] = useState(null);
  const [pnlEdit, setPnlEdit] = useState(null);
  const [recording, setRecording] = useState(false);

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

  const done = () => { pos.reload(); refreshCounts?.(); };

  const base = [
    { key:'opened_at', label:'Opened', render:p => fmtDateTime(p.opened_at) },
    { key:'user', label:'Trader', render:p => <UserCell user={users[p.user_id]} id={p.user_id} /> },
    { key:'symbol', label:'Symbol', render:p => <strong>{p.symbol}</strong> },
    { key:'trade_type', label:'Side', render:p => <Pill status={String(p.trade_type).toUpperCase() === 'BUY' ? 'ok' : 'bad'}>{p.trade_type}</Pill> },
    { key:'lots', label:'Lots', align:'right' },
    { key:'open_price', label:'Open', align:'right', render:p => num(p.open_price) },
    { key:'ticket', label:'Ticket', render:p => p.broker_ref
        ? <span title={p.broker_name || 'Broker'}><span className="ad-mono">{p.broker_ref}</span>{p.broker_name ? <small style={{ display:'block', color:'var(--muted)' }}>{p.broker_name}</small> : null}</span>
        : <span style={{ color:'var(--faint)' }}>Terminal</span> },
  ];
  const pnlCell = { key:'profit_loss', label:'P/L', align:'right', render:p => <span className={Number(p.profit_loss) < 0 ? 'down' : 'up'}>{signed(p.profit_loss)}</span> };

  return (
    <>
      <PageHead title="Terminal trading" sub="Trades placed from the trading terminal, and trades you record from the broker for a user. New terminal trades wait here for approval. Closing a trade pays its profit or loss into the trader's wallet; correcting the P/L of a closed trade posts only the difference.">
        <button className="ad-btn ad-btn-accent" onClick={() => setRecording(true)}><Plus />Record broker trade</button>
      </PageHead>
      <Tabs value={tab} onChange={setTab} items={[
        { key:'approvals', label:'Awaiting approval', count: groups.approvals.length },
        { key:'open',      label:'Open positions',    count: groups.open.length },
        { key:'history',   label:'History' },
      ]} />

      {tab === 'approvals' && (
        <DataTable rows={groups.approvals} loading={pos.loading} error={pos.error} missing={pos.missing} table="open_positions" empty="No trades waiting for approval"
          searchText={p => `${p.symbol} ${users[p.user_id]?.email || ''} ${p.broker_ref || ''}`}
          columns={[...base,
            { key:'sltp', label:'S/L · T/P', render:p => <span className="ad-mono">{num(p.stop_loss)} · {num(p.take_profit)}</span> },
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
          searchText={p => `${p.symbol} ${users[p.user_id]?.email || ''} ${p.broker_ref || ''}`}
          columns={[...base,
            { key:'current_price', label:'Current', align:'right', render:p => num(p.current_price) },
            pnlCell,
            { key:'act', label:'', align:'right', render:p => (
              <div className="ad-row-actions">
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setPnlEdit(p)}><Pencil />P/L</button>
                {p.source !== 'broker' && <button className="ad-icon-btn" title="Edit stop loss / take profit" aria-label="Edit stop loss and take profit" onClick={() => setEditing(p)}><Pencil /></button>}
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setClosing(p)}><Square />Close</button>
              </div>
            ) },
          ]} />
      )}

      {tab === 'history' && (
        <DataTable rows={groups.history} loading={pos.loading} error={pos.error} missing={pos.missing} table="open_positions" empty="No closed trades yet"
          searchText={p => `${p.symbol} ${users[p.user_id]?.email || ''} ${p.broker_ref || ''}`}
          columns={[...base,
            { key:'close_price', label:'Close', align:'right', render:p => num(p.close_price) },
            pnlCell,
            { key:'closed_at', label:'Closed', render:p => fmtDateTime(p.closed_at) },
            { key:'status', label:'Status', render:p => <Pill status={p.approval_status === 'rejected' ? 'rejected' : p.status} /> },
            { key:'act', label:'', align:'right', render:p => p.status === 'closed'
                ? <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setPnlEdit(p)}><Pencil />P/L</button> : null },
          ]} />
      )}

      {recording && <RecordTrade users={users} onClose={() => setRecording(false)} onDone={() => { done(); setTab('open'); }} onDoneClosed={() => { done(); setTab('history'); }} />}
      {pnlEdit && <EditPnl p={pnlEdit} user={users[pnlEdit.user_id]} onClose={() => setPnlEdit(null)} onDone={done} />}
      {editing && <EditPosition p={editing} onClose={() => setEditing(null)} onDone={pos.reload} />}
      {closing && <ClosePosition p={closing} user={users[closing.user_id]} onClose={() => setClosing(null)} onDone={done} />}
    </>
  );
}

/* ─── Record a trade from the broker for a chosen user ────────────────────── */
function RecordTrade({ users, onClose, onDone, onDoneClosed }) {
  const [q, setQ] = useState('');
  const [userId, setUserId] = useState('');
  const [f, setF] = useState({
    broker_name: lastBroker(), broker_ref: '', symbol: '', side: 'BUY', lots: '', open_price: '', opened_at: toLocalInput(),
    status: 'open', current_price: '', close_price: '', closed_at: toLocalInput(), profit_loss: '', stop_loss: '', take_profit: '', note: '',
  });
  const [busy, run] = useAction();
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return Object.values(users)
      .filter(u => !t || `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase().includes(t))
      .sort((a, b) => userName(a).localeCompare(userName(b)))
      .slice(0, 50);
  }, [users, q]);
  const chosen = users[userId];

  const save = () => {
    setErr('');
    if (!userId) return setErr('Choose the user this trade belongs to.');
    if (!f.broker_ref.trim()) return setErr('Enter the broker ticket number.');
    if (!f.symbol.trim() || !Number(f.lots) || !Number(f.open_price)) return setErr('Enter the symbol, lots and open price.');
    if (f.status === 'closed' && !Number(f.close_price)) return setErr('Enter the close price.');
    if (f.profit_loss === '' || isNaN(Number(f.profit_loss))) return setErr('Enter the profit or loss from the broker (use a minus sign for a loss).');
    const closed = f.status === 'closed';
    if (closed && !window.confirm(`Record this closed trade? ${signed(f.profit_loss)} will be ${Number(f.profit_loss) < 0 ? 'taken from' : 'paid into'} ${chosen?.email}'s wallet.`)) return;
    run('save', async () => {
      const { error } = await supabase.rpc('admin_record_trade', {
        p_user_id: userId, p_symbol: f.symbol.trim(), p_side: f.side, p_lots: Number(f.lots), p_open_price: Number(f.open_price),
        p_profit_loss: Number(f.profit_loss), p_broker_ref: f.broker_ref.trim(), p_broker_name: f.broker_name.trim() || null,
        p_status: f.status,
        p_current_price: !closed && f.current_price !== '' ? Number(f.current_price) : null,
        p_close_price: closed ? Number(f.close_price) : null,
        p_opened_at: f.opened_at ? new Date(f.opened_at).toISOString() : null,
        p_closed_at: closed && f.closed_at ? new Date(f.closed_at).toISOString() : null,
        p_stop_loss: f.stop_loss !== '' ? Number(f.stop_loss) : null,
        p_take_profit: f.take_profit !== '' ? Number(f.take_profit) : null,
        p_note: f.note.trim() || null,
      });
      if (error) { setErr(error.message); throw error; }
      if (f.broker_name.trim()) rememberBroker(f.broker_name.trim());
      onClose(); closed ? onDoneClosed() : onDone();
    }, closed ? 'Closed trade recorded and settled' : 'Trade recorded');
  };

  return (
    <Modal wide title="Record broker trade" sub="Book a trade executed at your broker onto a user's account, using the broker's ticket and figures." onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" disabled={!!busy} onClick={save}>{busy ? 'Saving…' : f.status === 'closed' ? 'Record and settle' : 'Record trade'}</button></>}>

      <div className="ad-field"><span>User</span>
        {chosen ? (
          <div className="ad-card" style={{ padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <UserCell user={chosen} id={userId} />
            <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setUserId('')}>Change</button>
          </div>
        ) : (
          <>
            <div style={{ position:'relative' }}>
              <Search size={16} style={{ position:'absolute', left:12, top:12, color:'var(--muted)' }} />
              <input className="ad-input" style={{ paddingLeft:36 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email" autoFocus />
            </div>
            <div className="ad-card" style={{ maxHeight:190, overflowY:'auto' }} role="listbox" aria-label="Users">
              {list.length === 0 ? <div style={{ padding:12, color:'var(--muted)', fontSize:14 }}>No users match.</div>
                : list.map(u => (
                  <button key={u.id} type="button" role="option" aria-selected={false} onClick={() => setUserId(u.id)}
                    style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 12px', background:'none', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', color:'inherit', font:'inherit' }}>
                    <UserCell user={u} id={u.id} />
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      <div className="ad-form">
        <label className="ad-field"><span>Broker</span><input className="ad-input" value={f.broker_name} onChange={set('broker_name')} placeholder="e.g. IC Markets" /></label>
        <label className="ad-field"><span>Broker ticket / order ID</span><input className="ad-input" value={f.broker_ref} onChange={set('broker_ref')} placeholder="e.g. 88812345" /></label>
        <label className="ad-field"><span>Symbol</span><input className="ad-input" value={f.symbol} onChange={set('symbol')} placeholder="e.g. XAUUSD" style={{ textTransform:'uppercase' }} /></label>
        <div className="ad-field"><span>Side</span>
          <div className="ad-chips">{['BUY', 'SELL'].map(s => <button key={s} type="button" className={`ad-chip${f.side === s ? ' active' : ''}`} onClick={() => setF(p => ({ ...p, side: s }))}>{s}</button>)}</div>
        </div>
        <label className="ad-field"><span>Lots</span><input className="ad-input" type="number" step="any" min="0" value={f.lots} onChange={set('lots')} /></label>
        <label className="ad-field"><span>Open price</span><input className="ad-input" type="number" step="any" value={f.open_price} onChange={set('open_price')} /></label>
        <label className="ad-field"><span>Opened at</span><input className="ad-input" type="datetime-local" value={f.opened_at} onChange={set('opened_at')} /></label>
        <div className="ad-field"><span>Status at the broker</span>
          <div className="ad-chips">{[['open', 'Still open'], ['closed', 'Closed']].map(([k, l]) => <button key={k} type="button" className={`ad-chip${f.status === k ? ' active' : ''}`} style={{ textTransform:'none' }} onClick={() => setF(p => ({ ...p, status: k }))}>{l}</button>)}</div>
        </div>
        {f.status === 'open' ? (
          <label className="ad-field"><span>Current price <small>(optional)</small></span><input className="ad-input" type="number" step="any" value={f.current_price} onChange={set('current_price')} /></label>
        ) : (
          <>
            <label className="ad-field"><span>Close price</span><input className="ad-input" type="number" step="any" value={f.close_price} onChange={set('close_price')} /></label>
            <label className="ad-field"><span>Closed at</span><input className="ad-input" type="datetime-local" value={f.closed_at} onChange={set('closed_at')} /></label>
          </>
        )}
        <label className="ad-field"><span>{f.status === 'closed' ? 'Realised profit / loss ($)' : 'Current profit / loss ($)'}</span>
          <input className="ad-input" type="number" step="0.01" value={f.profit_loss} onChange={set('profit_loss')} placeholder="e.g. 125.40 or -60" />
          <small>From the broker. Use a minus sign for a loss.</small></label>
        {f.status === 'open' && <>
          <label className="ad-field"><span>Stop loss <small>(optional)</small></span><input className="ad-input" type="number" step="any" value={f.stop_loss} onChange={set('stop_loss')} /></label>
          <label className="ad-field"><span>Take profit <small>(optional)</small></span><input className="ad-input" type="number" step="any" value={f.take_profit} onChange={set('take_profit')} /></label>
        </>}
        <label className="ad-field full"><span>Note <small>(optional, internal)</small></span><input className="ad-input" value={f.note} onChange={set('note')} placeholder="e.g. Filled via desk on client's instruction" /></label>
      </div>

      {f.status === 'closed' && f.profit_loss !== '' && !isNaN(Number(f.profit_loss)) && (
        <div className="ad-card" style={{ padding:'10px 14px', fontSize:14 }}>
          On saving, <strong className={Number(f.profit_loss) < 0 ? 'down' : 'up'}>{signed(f.profit_loss)}</strong> is {Number(f.profit_loss) < 0 ? 'taken from' : 'paid into'} the user's USD wallet as a trade result.
        </div>
      )}
      {err && <div className="ad-err" role="alert">{err}</div>}
    </Modal>
  );
}

/* ─── Correct the P/L to match the broker ─────────────────────────────────── */
function EditPnl({ p, user, onClose, onDone }) {
  const closed = p.status === 'closed';
  const settled = Number(p.pnl_settled ?? (closed ? p.profit_loss : 0)) || 0;
  const [pl, setPl] = useState(p.profit_loss ?? 0);
  const [price, setPrice] = useState(closed ? (p.close_price ?? '') : (p.current_price ?? ''));
  const [reason, setReason] = useState('');
  const [busy, run] = useAction();
  const [err, setErr] = useState('');
  const diff = Math.round(((Number(pl) || 0) - settled) * 100) / 100;

  const save = () => {
    setErr('');
    if (pl === '' || isNaN(Number(pl))) return setErr('Enter the profit or loss.');
    if (!reason.trim()) return setErr('Give a reason, e.g. the broker statement or ticket reference.');
    run('pnl', async () => {
      const { error } = await supabase.rpc('admin_update_trade_pnl', {
        p_position_id: p.id, p_profit_loss: Number(pl), p_reason: reason.trim(),
        p_current_price: !closed && price !== '' ? Number(price) : null,
        p_close_price: closed && price !== '' ? Number(price) : null,
      });
      if (error) { setErr(error.message); throw error; }
      onDone(); onClose();
    }, closed && diff !== 0 ? `P/L updated · wallet ${signed(diff)}` : 'P/L updated');
  };

  return (
    <Modal title={`Edit P/L · ${p.symbol}`} sub={`${user?.email || ''} · ${p.trade_type} ${p.lots} lots @ ${p.open_price}${p.broker_ref ? ` · ticket ${p.broker_ref}` : ''}`} onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" disabled={!!busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="ad-kv">
        <div><span>Status</span><strong style={{ textTransform:'capitalize' }}>{p.status}</strong></div>
        <div><span>Current P/L</span><strong className={Number(p.profit_loss) < 0 ? 'down' : 'up'}>{signed(p.profit_loss)}</strong></div>
        {closed && <div><span>Already paid to wallet</span><strong>{signed(settled)}</strong></div>}
      </div>
      <div className="ad-form">
        <label className="ad-field"><span>New profit / loss ($)</span><input className="ad-input" type="number" step="0.01" value={pl} onChange={e => setPl(e.target.value)} autoFocus /><small>Use a minus sign for a loss</small></label>
        <label className="ad-field"><span>{closed ? 'Close price' : 'Current price'}</span><input className="ad-input" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label className="ad-field full"><span>Reason (kept in the audit log)</span><input className="ad-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Broker statement 12 Oct — commission and swap" /></label>
      </div>
      <div className="ad-card" style={{ padding:'10px 14px', fontSize:14, color:'var(--muted)' }}>
        {closed
          ? (diff === 0 ? 'No change to the wallet.' : <>The user's wallet will be adjusted by <strong className={diff < 0 ? 'down' : 'up'}>{signed(diff)}</strong>, recorded as a P/L correction.</>)
          : 'The trade is still open, so the wallet isn’t changed until it’s closed.'}
        {' '}The user is notified of the new figure.
      </div>
      {err && <div className="ad-err" role="alert">{err}</div>}
    </Modal>
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

/* Closes a position at the broker's close price, records P/L and (optionally) pays it to the wallet */
function ClosePosition({ p, user, onClose, onDone }) {
  const [price, setPrice] = useState(p.current_price ?? p.open_price);
  const [pl, setPl] = useState(p.profit_loss ?? 0);
  const [pay, setPay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try {
      const { error } = await supabase.rpc('admin_close_trade', { p_position_id: p.id, p_close_price: Number(price), p_profit_loss: Number(pl) || 0, p_pay: pay });
      if (error) throw error;
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not close the position.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Close ${p.symbol} position`} sub={`${user?.email || ''} · ${p.trade_type} ${p.lots} lots @ ${p.open_price}${p.broker_ref ? ` · ticket ${p.broker_ref}` : ''}`} onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ad-btn ad-btn-accent" disabled={busy} onClick={go}>{busy ? 'Closing…' : 'Close position'}</button></>}>
      <div className="ad-form">
        <label className="ad-field"><span>Close price</span><input className="ad-input" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label className="ad-field"><span>Realised profit / loss ($)</span><input className="ad-input" type="number" step="0.01" value={pl} onChange={e => setPl(e.target.value)} /><small>Negative for a loss</small></label>
      </div>
      <label className="ad-check"><input type="checkbox" checked={pay} onChange={e => setPay(e.target.checked)} />Pay the result into the trader's wallet ({signed(Number(pl) || 0)})</label>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}
