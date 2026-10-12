import React, { useMemo, useState } from 'react';
import { Send, Square, Check, X } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Chips, Pill, UserCell, CrudTable, Modal, PaymentCell, ApproveModal, settlePayment, useRows, useUsers, useAction,
  walletAdjust, notify, audit, usd, fmtDateTime,
} from '../adminShared';

/* Copy trading: trader profiles + performance (what /copy-trading lists),
   who copies whom (copy_relationships), and the trades copied to them (copy_trades). */
const PERIODS = ['7D', '30D', '90D', '1Y', 'ALL'];   // /copy-trading shows the 30D row

export default function CopyTradingAdmin({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('requests');   // opens on payments waiting for approval
  const profiles = useRows('trader_profiles', { select: 'id,display_name,handle,is_active' });
  const rels = useRows('copy_relationships', { select: '*, trader_profiles(display_name,handle)', order: 'started_at' });
  const trades = useRows('copy_trades', { order: 'opened_at', limit: 3000 });
  const [tradeFilter, setTradeFilter] = useState('open');
  const [posting, setPosting] = useState(false);
  const [closing, setClosing] = useState(null);     // { rows: [...], label }

  const traderOptions = profiles.rows.map(t => ({ value: t.id, label: `${t.display_name} (@${t.handle})` }));
  const traderName = (id) => profiles.rows.find(t => t.id === id)?.display_name || '—';
  const relById = useMemo(() => Object.fromEntries(rels.rows.map(r => [r.id, r])), [rels.rows]);
  const activeRels = rels.rows.filter(r => r.status === 'active');
  const requests = rels.rows.filter(r => r.status === 'pending');
  const [busy, run] = useAction();
  const [approving, setApproving] = useState(null);

  /* Paid copy requests: approve switches the copy on, reject closes it */
  const approve = async (r, charge) => {
    if (charge) await walletAdjust(r.copier_id, -Number(r.allocated_amount), { type: 'copy_allocation', description: `Copy trading · ${r.trader_profiles?.display_name || 'trader'}` });
    const { error } = await supabase.from('copy_relationships').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', r.id);
    if (error) throw error;
    audit('approve', 'copy_relationships', r.id, { status: 'pending' }, { status: 'active', charged: charge });
    await settlePayment(r, true);
    await notify(r.copier_id, { title: `You're now copying ${r.trader_profiles?.display_name || 'your trader'}`, description: `Your ${usd(r.allocated_amount)} payment is confirmed. New trades are copied to your account from now on.`, category: 'trade', icon_class: 'ti-copy', action_url: '/copy-trading' });
    rels.reload(); refreshCounts?.();
  };
  const reject = (r) => {
    if (!window.confirm(`Reject this ${usd(r.allocated_amount)} copy request?`)) return;
    run(r.id, async () => {
      const { error } = await supabase.from('copy_relationships').update({ status: 'rejected', stopped_at: new Date().toISOString() }).eq('id', r.id);
      if (error) throw error;
      audit('reject', 'copy_relationships', r.id, { status: 'pending' }, { status: 'rejected' });
      await settlePayment(r, false);
      await notify(r.copier_id, { title: 'Your copy trading payment wasn’t confirmed', description: `We couldn’t confirm your ${usd(r.allocated_amount)} payment to copy ${r.trader_profiles?.display_name || 'this trader'}. Contact support if you think this is a mistake.`, category: 'payment', icon_class: 'ti-circle-x', action_url: '/copy-trading' });
      rels.reload(); refreshCounts?.();
    }, 'Request rejected');
  };
  const openTrades = trades.rows.filter(t => t.status === 'open');
  const tradeList = tradeFilter === 'open' ? openTrades : tradeFilter === 'closed' ? trades.rows.filter(t => t.status !== 'open') : trades.rows;

  /* Open trades posted together share original_trade_id, so they can be closed together */
  const groupOf = (t) => t.original_trade_id ? openTrades.filter(x => x.original_trade_id === t.original_trade_id) : [t];

  return (
    <>
      <PageHead title="Copy trading" sub="The traders users can copy, their published performance, who is copying them, and the trades copied into each account.">
        <button className="ad-btn ad-btn-accent" onClick={() => setPosting(true)}><Send />Post a trade</button>
      </PageHead>
      <Tabs value={tab} onChange={setTab} items={[
        { key:'requests', label:'Requests', count: requests.length || undefined },
        { key:'traders',  label:'Traders' },
        { key:'perf',     label:'Performance' },
        { key:'copiers',  label:'Copiers', count: activeRels.length || undefined },
        { key:'trades',   label:'Copied trades', count: openTrades.length || undefined },
      ]} />

      {tab === 'requests' && (
        <DataTable rows={requests} loading={rels.loading} error={rels.error} missing={rels.missing} table="copy_relationships" empty="No copy requests waiting"
          columns={[
            { key:'created_at', label:'Requested', render:r => fmtDateTime(r.created_at || r.started_at) },
            { key:'copier', label:'Copier', render:r => <UserCell user={users[r.copier_id]} id={r.copier_id} /> },
            { key:'trader', label:'Wants to copy', render:r => r.trader_profiles?.display_name || '—' },
            { key:'allocated_amount', label:'Amount', align:'right', render:r => usd(r.allocated_amount) },
            { key:'copy_ratio', label:'Ratio', render:r => <span style={{ textTransform:'capitalize' }}>{r.copy_ratio}</span> },
            { key:'payment', label:'Payment', render:r => <PaymentCell row={r} /> },
            { key:'act', label:'', align:'right', render:r => (
              <div className="ad-row-actions">
                <button className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setApproving(r)}><Check />Approve</button>
                <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === r.id} onClick={() => reject(r)}><X />Reject</button>
              </div>
            ) },
          ]} />
      )}

      {tab === 'traders' && (
        <CrudTable table="trader_profiles" itemName="trader" onChanged={profiles.reload}
          defaults={{ is_active: true, is_verified: false, years_active: 0, total_copiers: 0, total_clients: 0 }}
          beforeSave={(p) => ({ ...p, updated_at: new Date().toISOString() })}
          fields={[
            { key:'user_id', required:true, label:'User ID', help:'The trader’s account — copy it from the Users page (one profile per user)' },
            { key:'display_name', required:true },
            { key:'handle', required:true, help:'Unique, without the @' },
            { key:'market', type:'select', required:true, options:['Crypto', 'Forex', 'Stocks', 'Commodities', 'Indices', 'Multi-asset'] },
            { key:'risk_level', type:'select', required:true, options:['low', 'medium', 'high'] },
            { key:'min_capital', type:'number', label:'Minimum capital ($)' },
            { key:'fee_type', type:'select', options:['performance', 'fixed', 'hybrid'] },
            { key:'fee_structure', help:'e.g. 20% of profits' },
            { key:'years_active', type:'number' },
            { key:'initials' },
            { key:'color_hex', label:'Avatar colour', placeholder:'#5B8CFF' },
            { key:'badge_label', help:'e.g. Top 1%' },
            { key:'badge_type' },
            { key:'is_verified', type:'bool', label:'Verified trader' },
            { key:'is_active', type:'bool', label:'Listed for users' },
            { key:'strategy_desc', type:'textarea', label:'Strategy' },
            { key:'bio', type:'textarea' },
            // duplicates kept by the schema; edited through the fields above
            { key:'verified', hidden:true }, { key:'status', hidden:true }, { key:'strategy', hidden:true },
            { key:'total_copiers', hidden:true }, { key:'total_clients', hidden:true },
          ]}
          columns={[
            { key:'display_name', label:'Trader', render:t => <div className="ad-user"><strong>{t.display_name}</strong><small>@{t.handle}</small></div> },
            { key:'market', label:'Market' },
            { key:'risk_level', label:'Risk', render:t => <span style={{ textTransform:'capitalize' }}>{t.risk_level}</span> },
            { key:'total_copiers', label:'Copiers', align:'right' },
            { key:'total_clients', label:'Clients', align:'right' },
            { key:'is_verified', label:'Verified' },
            { key:'is_active', label:'Listed', render:t => <Pill status={t.is_active ? 'active' : 'paused'}>{t.is_active ? 'Listed' : 'Hidden'}</Pill> },
          ]} />
      )}


      {tab === 'perf' && (
        <CrudTable table="trader_performance" itemName="performance record" order="recorded_at"
          select="*, trader_profiles(display_name)"
          defaults={{ period: '30D', recorded_at: new Date().toISOString().slice(0, 10) }}
          fields={[
            { key:'trader_id', type:'select', required:true, label:'Trader', options: traderOptions },
            { key:'period', type:'select', required:true, options: PERIODS, help:'The Copy trading page shows each trader’s 30D row' },
            { key:'recorded_at', type:'date', required:true, help:'One row per trader, period and date' },
            { key:'roi_pct', type:'number', required:true, label:'Return (%)' },
            { key:'win_rate_pct', type:'number', required:true, label:'Win rate (%)' },
            { key:'max_drawdown_pct', type:'number', required:true, label:'Max drawdown (%)' },
            { key:'total_trades', type:'number', required:true },
            { key:'sparkline', type:'json', default:'[]', help:'Equity curve points for the mini chart, e.g. [0, 1.2, 0.8, 2.5]' },
          ]}
          columns={[
            { key:'trader', label:'Trader', render:p => p.trader_profiles?.display_name || traderName(p.trader_id) },
            { key:'period', label:'Period', render:p => <Pill status={p.period === '30D' ? 'info' : ''}>{p.period}</Pill> },
            { key:'roi_pct', label:'Return', align:'right', render:p => <span className={Number(p.roi_pct) < 0 ? 'down' : 'up'}>{p.roi_pct}%</span> },
            { key:'win_rate_pct', label:'Win rate', align:'right', render:p => `${p.win_rate_pct}%` },
            { key:'max_drawdown_pct', label:'Drawdown', align:'right', render:p => `${p.max_drawdown_pct}%` },
            { key:'total_trades', label:'Trades', align:'right' },
            { key:'recorded_at', label:'Recorded' },
          ]} />
      )}

      {tab === 'copiers' && (
        <CrudTable table="copy_relationships" itemName="copy relationship" order="started_at" canCreate={false} onChanged={rels.reload}
          build={q => q.neq('status', 'pending')}
          select="*, trader_profiles(display_name,handle)"
          beforeSave={(p, old) => ({
            ...p,
            paused_at:  p.status === 'paused'  && old?.status !== 'paused'  ? new Date().toISOString() : old?.paused_at ?? null,
            stopped_at: p.status === 'stopped' && old?.status !== 'stopped' ? new Date().toISOString() : old?.stopped_at ?? null,
          })}
          fields={[
            { key:'allocated_amount', type:'number', required:true, label:'Allocated ($)' },
            { key:'copy_ratio', type:'select', required:true, options:['proportional', 'fixed'] },
            { key:'stop_loss_pct', type:'number', label:'Stop loss (%)' },
            { key:'realised_gain', type:'number', label:'Realised gain ($)' },
            { key:'status', type:'select', required:true, options:['active', 'paused', 'stopped', 'rejected'] },
            { key:'pay_coin', hidden:true }, { key:'pay_network', hidden:true }, { key:'pay_tx_hash', hidden:true }, { key:'proof_url', hidden:true }, { key:'created_at', hidden:true }, { key:'payment_tx_id', hidden:true },
            { key:'copier_id', hidden:true }, { key:'trader_id', hidden:true }, { key:'currency', hidden:true },
            { key:'started_at', hidden:true }, { key:'paused_at', hidden:true }, { key:'stopped_at', hidden:true },
          ]}
          columns={[
            { key:'started_at', label:'Started', render:c => fmtDateTime(c.started_at) },
            { key:'copier', label:'Copier', render:c => <UserCell user={users[c.copier_id]} id={c.copier_id} /> },
            { key:'trader', label:'Copying', render:c => c.trader_profiles?.display_name || '—' },
            { key:'allocated_amount', label:'Allocated', align:'right', render:c => usd(c.allocated_amount) },
            { key:'copy_ratio', label:'Ratio', render:c => <span style={{ textTransform:'capitalize' }}>{c.copy_ratio}</span> },
            { key:'realised_gain', label:'Realised', align:'right', render:c => <span className={Number(c.realised_gain) < 0 ? 'down' : 'up'}>{usd(c.realised_gain)}</span> },
            { key:'status', label:'Status', render:c => <Pill status={c.status} /> },
          ]} />
      )}

      {tab === 'trades' && (
        <DataTable rows={tradeList} loading={trades.loading} error={trades.error} missing={trades.missing} table="copy_trades" empty="No copied trades here"
          toolbar={<Chips value={tradeFilter} onChange={setTradeFilter} items={[{ key:'open', label:`Open (${openTrades.length})` }, { key:'closed', label:'Closed' }, { key:'all', label:'All' }]} />}
          columns={[
            { key:'opened_at', label:'Opened', render:t => fmtDateTime(t.opened_at) },
            { key:'copier', label:'Copier', render:t => <UserCell user={users[relById[t.copy_rel_id]?.copier_id]} id={relById[t.copy_rel_id]?.copier_id} /> },
            { key:'trader', label:'Trader', render:t => relById[t.copy_rel_id]?.trader_profiles?.display_name || '—' },
            { key:'symbol', label:'Symbol', render:t => <strong>{t.symbol}</strong> },
            { key:'trade_type', label:'Side', render:t => <Pill status={String(t.trade_type).toUpperCase() === 'BUY' ? 'ok' : 'bad'}>{t.trade_type}</Pill> },
            { key:'lots', label:'Lots', align:'right' },
            { key:'open_price', label:'Open', align:'right' },
            { key:'close_price', label:'Close', align:'right', render:t => t.close_price ?? '—' },
            { key:'profit_loss', label:'P/L', align:'right', render:t => <span className={Number(t.profit_loss) < 0 ? 'down' : 'up'}>{usd(t.profit_loss)}</span> },
            { key:'act', label:'Status', align:'right', render:t => t.status === 'open' ? (
              <div className="ad-row-actions">
                {groupOf(t).length > 1 && <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setClosing({ rows: groupOf(t), label: `${t.symbol} for all ${groupOf(t).length} copiers` })}><Square />Close all</button>}
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setClosing({ rows: [t], label: `${t.symbol} for one copier` })}><Square />Close</button>
              </div>
            ) : <Pill status={t.status} /> },
          ]} />
      )}

      {approving && (
        <ApproveModal title="Approve copy request" sub={`${users[approving.copier_id]?.email || ''} · copying ${approving.trader_profiles?.display_name || ''}`}
          amount={Number(approving.allocated_amount)} defaultCharge={false}
          chargeLabel="Also charge the user’s wallet (only if the crypto payment didn’t arrive)"
          onClose={() => setApproving(null)} onConfirm={(c) => approve(approving, c)}>
          <div className="ad-card" style={{ padding:14, display:'grid', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--muted)' }}>Payment</div>
            <PaymentCell row={approving} />
            <small style={{ color:'var(--faint)' }}>Open the screenshot and check your {approving.pay_coin || 'crypto'} wallet received {usd(approving.allocated_amount)} before approving.</small>
          </div>
          <p style={{ color:'var(--muted)' }}>The copy goes live straight away and trades you post for this trader will be copied to this account.</p>
        </ApproveModal>
      )}
      {posting && <PostTrade traders={profiles.rows} rels={activeRels} onClose={() => setPosting(false)} onDone={() => { trades.reload(); setTab('trades'); setTradeFilter('open'); }} />}
      {closing && <CloseTrades {...closing} relById={relById} onClose={() => setClosing(null)} onDone={() => { trades.reload(); rels.reload(); }} />}
    </>
  );
}

/* Opens the same trade in every account that's actively copying the chosen trader */
function PostTrade({ traders, rels, onClose, onDone }) {
  const [traderId, setTraderId] = useState('');
  const [f, setF] = useState({ symbol: '', trade_type: 'BUY', lots: '0.1', open_price: '', stop_loss: '', take_profit: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const copiers = rels.filter(r => r.trader_id === traderId);
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));

  const go = async () => {
    if (!traderId || !f.symbol.trim() || !Number(f.lots) || !Number(f.open_price)) { setErr('Choose a trader and fill in symbol, lots and open price.'); return; }
    if (!copiers.length) { setErr('Nobody is actively copying this trader.'); return; }
    setBusy(true); setErr('');
    try {
      const groupId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      const rows = copiers.map(r => ({
        copy_rel_id: r.id, original_trade_id: groupId, symbol: f.symbol.trim().toUpperCase(), trade_type: f.trade_type,
        lots: Number(f.lots), open_price: Number(f.open_price),
        stop_loss: f.stop_loss === '' ? null : Number(f.stop_loss), take_profit: f.take_profit === '' ? null : Number(f.take_profit),
        status: 'open',
      }));
      const { error } = await supabase.from('copy_trades').insert(rows);
      if (error) throw error;
      audit('post_trade', 'copy_trades', groupId, null, { trader_id: traderId, ...f, copiers: rows.length });
      await notify(copiers.map(r => r.copier_id), {
        title: `New copied trade: ${f.trade_type} ${f.symbol.toUpperCase()}`,
        description: `${traders.find(t => t.id === traderId)?.display_name || 'Your trader'} opened a position that was copied to your account.`,
        category: 'trade', icon_class: 'ti-copy', action_url: '/copy-trading',
      });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not post the trade.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Post a trade to copiers" sub="Opens this trade in every account actively copying the trader." onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ad-btn ad-btn-accent" disabled={busy || !copiers.length} onClick={go}>{busy ? 'Posting…' : `Post to ${copiers.length} ${copiers.length === 1 ? 'copier' : 'copiers'}`}</button></>}>
      <div className="ad-form">
        <label className="ad-field full"><span>Trader</span>
          <select className="ad-select" value={traderId} onChange={e => setTraderId(e.target.value)}>
            <option value="">Choose a trader</option>
            {traders.map(t => <option key={t.id} value={t.id}>{t.display_name} (@{t.handle}) · {rels.filter(r => r.trader_id === t.id).length} copiers</option>)}
          </select>
        </label>
        <label className="ad-field"><span>Symbol</span><input className="ad-input" value={f.symbol} onChange={set('symbol')} placeholder="EURUSD" /></label>
        <label className="ad-field"><span>Side</span><select className="ad-select" value={f.trade_type} onChange={set('trade_type')}><option>BUY</option><option>SELL</option></select></label>
        <label className="ad-field"><span>Lots</span><input className="ad-input" type="number" step="0.01" value={f.lots} onChange={set('lots')} /></label>
        <label className="ad-field"><span>Open price</span><input className="ad-input" type="number" step="any" value={f.open_price} onChange={set('open_price')} /></label>
        <label className="ad-field"><span>Stop loss</span><input className="ad-input" type="number" step="any" value={f.stop_loss} onChange={set('stop_loss')} /></label>
        <label className="ad-field"><span>Take profit</span><input className="ad-input" type="number" step="any" value={f.take_profit} onChange={set('take_profit')} /></label>
      </div>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}

/* Closes one or more copied trades. Each copier's result = their allocation × return %. */
function CloseTrades({ rows, label, relById, onClose, onDone }) {
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState(rows.length > 1 ? 'pct' : 'usd');
  const [value, setValue] = useState('');
  const [pay, setPay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const resultFor = (t) => {
    const v = Number(value) || 0;
    if (mode === 'usd') return v;
    return Math.round(Number(relById[t.copy_rel_id]?.allocated_amount || 0) * v) / 100;
  };
  const total = rows.reduce((s, t) => s + resultFor(t), 0);

  const go = async () => {
    if (!Number(price)) { setErr('Enter the close price.'); return; }
    setBusy(true); setErr('');
    try {
      const now = new Date().toISOString();
      const gains = {};   // running realised gain per relationship (one copier can have several trades here)
      for (const t of rows) {
        const pl = resultFor(t);
        const rel = relById[t.copy_rel_id];
        const { error } = await supabase.from('copy_trades').update({ status: 'closed', close_price: Number(price), profit_loss: pl, closed_at: now }).eq('id', t.id);
        if (error) throw error;
        if (rel) {
          gains[rel.id] = (gains[rel.id] ?? Number(rel.realised_gain || 0)) + pl;
          await supabase.from('copy_relationships').update({ realised_gain: gains[rel.id] }).eq('id', rel.id);
          if (pay && pl) await walletAdjust(rel.copier_id, pl, { type: 'copy_trade_pnl', description: `Copy trade ${t.symbol} closed` });
          await notify(rel.copier_id, { title: `Copied trade closed: ${t.symbol}`, description: `Result ${usd(pl)}.`, category: 'trade', icon_class: 'ti-copy', action_url: '/copy-trading' });
        }
      }
      audit('close_trades', 'copy_trades', rows[0]?.original_trade_id || rows[0]?.id, null, { count: rows.length, close_price: Number(price), mode, value: Number(value), total, paid_to_wallets: pay });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not close the trades.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Close copied trade" sub={label} onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ad-btn ad-btn-accent" disabled={busy} onClick={go}>{busy ? 'Closing…' : `Close ${rows.length > 1 ? `${rows.length} trades` : 'trade'}`}</button></>}>
      <div className="ad-form">
        <label className="ad-field"><span>Close price</span><input className="ad-input" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label className="ad-field"><span>Result as</span>
          <select className="ad-select" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="pct">% of each copier’s allocation</option>
            <option value="usd">Fixed $ per copier</option>
          </select>
        </label>
        <label className="ad-field full"><span>{mode === 'pct' ? 'Return (%)' : 'Profit / loss ($)'}</span><input className="ad-input" type="number" step="any" value={value} onChange={e => setValue(e.target.value)} /><small>Negative for a loss</small></label>
      </div>
      <p style={{ color:'var(--muted)', fontSize:14 }}>Total across {rows.length} {rows.length === 1 ? 'copier' : 'copiers'}: <strong className={total < 0 ? 'down' : 'up'}>{usd(total)}</strong></p>
      <label className="ad-check"><input type="checkbox" checked={pay} onChange={e => setPay(e.target.checked)} />Pay each result into the copier's wallet</label>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}
