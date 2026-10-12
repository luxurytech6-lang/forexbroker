import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Chips, Pill, UserCell, CrudTable, Modal, useRows, useUsers, useAction,
  walletAdjust, notify, audit, usd, fmtDateTime,
} from '../adminShared';

/* stock_orders statuses written by /stocks: market orders are 'filled' straight away,
   limit orders are 'open' until filled or cancelled. 'pending' is the table default. */
const WAITING = ['open', 'pending'];

/* Fills an order at `price`: moves cash and updates portfolio_holdings the same way stock.jsx does */
async function fillOrder(o, price) {
  const qty = Number(o.quantity);
  const total = qty * price;
  const { data: h } = await supabase.from('portfolio_holdings').select('*').eq('user_id', o.user_id).eq('symbol', o.symbol).maybeSingle();

  if (o.side === 'buy') {
    await walletAdjust(o.user_id, -total, { type: 'stock_buy', description: `Bought ${qty} ${o.symbol} @ ${price}` });
    const newQty = Number(h?.quantity || 0) + qty;
    const avg = (Number(h?.quantity || 0) * Number(h?.avg_cost || 0) + total) / newQty;
    const { error } = h
      ? await supabase.from('portfolio_holdings').update({ quantity: newQty, avg_cost: avg, updated_at: new Date().toISOString() }).eq('id', h.id)
      : await supabase.from('portfolio_holdings').insert({ user_id: o.user_id, symbol: o.symbol, quantity: qty, avg_cost: price });
    if (error) throw error;
  } else {
    if (!h || Number(h.quantity) < qty) throw new Error(`The user only holds ${Number(h?.quantity || 0)} ${o.symbol}.`);
    const left = Number(h.quantity) - qty;
    const { error } = left > 0
      ? await supabase.from('portfolio_holdings').update({ quantity: left, updated_at: new Date().toISOString() }).eq('id', h.id)
      : await supabase.from('portfolio_holdings').delete().eq('id', h.id);
    if (error) throw error;
    await walletAdjust(o.user_id, total, { type: 'stock_sell', description: `Sold ${qty} ${o.symbol} @ ${price}` });
  }
  const { error } = await supabase.from('stock_orders').update({ status: 'filled', filled_price: price }).eq('id', o.id);
  if (error) throw error;
}

export default function StocksAdmin({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('orders');
  const [status, setStatus] = useState('waiting');
  const orders = useRows('stock_orders', { limit: 3000 });
  const stocks = useRows('stocks', { order: 'symbol', asc: true });
  const [busy, run] = useAction();
  const [filling, setFilling] = useState(null);

  const waiting = orders.rows.filter(o => WAITING.includes(o.status));
  const list = useMemo(() => status === 'waiting' ? waiting : status === 'all' ? orders.rows : orders.rows.filter(o => o.status === status), [orders.rows, status, waiting]);
  const symbolOptions = stocks.rows.map(s => ({ value: s.symbol, label: `${s.symbol} · ${s.name}` }));

  const cancel = (o) => {
    if (!window.confirm(`Cancel this ${o.side} order for ${o.quantity} ${o.symbol}?`)) return;
    run(o.id, async () => {
      const { error } = await supabase.from('stock_orders').update({ status: 'cancelled' }).eq('id', o.id);
      if (error) throw error;
      audit('cancel', 'stock_orders', o.id, { status: o.status }, { status: 'cancelled' });
      await notify(o.user_id, { title: `Your ${o.symbol} order was cancelled`, category: 'trade', icon_class: 'ti-circle-x', action_url: '/stocks' });
      orders.reload(); refreshCounts?.();
    }, 'Order cancelled');
  };

  return (
    <>
      <PageHead title="Stock trading" sub="Fill or cancel waiting limit orders, manage the stocks users can trade, set their prices, and view everyone's holdings." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'orders',   label:'Orders', count: waiting.length || undefined },
        { key:'holdings', label:'Holdings' },
        { key:'stocks',   label:'Stocks' },
        { key:'quotes',   label:'Prices' },
      ]} />

      {tab === 'orders' && (
        <DataTable rows={list} loading={orders.loading} error={orders.error} missing={orders.missing} table="stock_orders" empty="No orders here"
          toolbar={<Chips value={status} onChange={setStatus} items={[
            { key:'waiting', label:`Waiting (${waiting.length})` }, { key:'filled', label:'Filled' }, { key:'cancelled', label:'Cancelled' }, { key:'all', label:'All' },
          ]} />}
          columns={[
            { key:'created_at', label:'Placed', render:o => fmtDateTime(o.created_at) },
            { key:'user', label:'User', render:o => <UserCell user={users[o.user_id]} id={o.user_id} /> },
            { key:'symbol', label:'Stock', render:o => <strong>{o.symbol}</strong> },
            { key:'side', label:'Side', render:o => <Pill status={o.side === 'buy' ? 'ok' : 'bad'}>{o.side}</Pill> },
            { key:'order_type', label:'Type', render:o => <span style={{ textTransform:'capitalize' }}>{o.order_type}</span> },
            { key:'quantity', label:'Qty', align:'right' },
            { key:'limit_price', label:'Limit', align:'right', render:o => o.limit_price != null ? usd(o.limit_price) : '—' },
            { key:'filled_price', label:'Filled at', align:'right', render:o => o.filled_price != null ? usd(o.filled_price) : '—' },
            { key:'act', label:'Status', align:'right', render:o => WAITING.includes(o.status) ? (
              <div className="ad-row-actions">
                <button className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setFilling(o)}><Check />Fill</button>
                <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === o.id} onClick={() => cancel(o)}><X />Cancel</button>
              </div>
            ) : <Pill status={o.status === 'filled' ? 'completed' : o.status}>{o.status}</Pill> },
          ]} />
      )}

      {tab === 'holdings' && (
        <CrudTable table="portfolio_holdings" itemName="holding" order="updated_at"
          beforeSave={(p) => ({ ...p, updated_at: new Date().toISOString() })}
          fields={[
            { key:'user_id', required:true, label:'User ID', help:'Copy it from the Users page' },
            { key:'symbol', type:'select', required:true, options: symbolOptions },
            { key:'quantity', type:'number', required:true },
            { key:'avg_cost', type:'number', required:true, label:'Average cost ($)' },
          ]}
          columns={[
            { key:'user', label:'User', render:h => <UserCell user={users[h.user_id]} id={h.user_id} /> },
            { key:'symbol', label:'Stock', render:h => <strong>{h.symbol}</strong> },
            { key:'quantity', label:'Shares', align:'right' },
            { key:'avg_cost', label:'Avg cost', align:'right', render:h => usd(h.avg_cost) },
            { key:'value', label:'Cost basis', align:'right', render:h => usd(Number(h.quantity) * Number(h.avg_cost)) },
            { key:'updated_at', label:'Updated', render:h => fmtDateTime(h.updated_at) },
          ]} />
      )}

      {tab === 'stocks' && (
        <CrudTable table="stocks" pk="symbol" itemName="stock" order="symbol" asc defaults={{ is_active: true, currency: 'USD' }} onChanged={stocks.reload}
          fields={[
            { key:'symbol', required:true, help:'Ticker, e.g. AAPL. Can’t be changed once orders exist' },
            { key:'name', required:true },
            { key:'exchange', required:true, type:'select', options:['NASDAQ', 'NYSE', 'LSE', 'NGX', 'TSX', 'XETRA', 'HKEX', 'Other'] },
            { key:'sector' },
            { key:'currency', required:true, help:'e.g. USD' },
            { key:'initials', required:true, help:'Shown in the logo circle, e.g. AP' },
            { key:'color_hex', required:true, label:'Logo colour', placeholder:'#5B8CFF' },
            { key:'is_active', type:'bool', label:'Tradable' },
          ]}
          columns={[
            { key:'symbol', label:'Stock', render:s => <div className="ad-user"><strong>{s.symbol}</strong><small>{s.name}</small></div> },
            { key:'exchange', label:'Exchange' },
            { key:'sector', label:'Sector' },
            { key:'currency', label:'Currency' },
            { key:'is_active', label:'Tradable', render:s => <Pill status={s.is_active ? 'active' : 'paused'}>{s.is_active ? 'Live' : 'Hidden'}</Pill> },
          ]} />
      )}

      {tab === 'quotes' && (
        <CrudTable table="stock_quotes" pk="stock_symbol" itemName="price" order="stock_symbol" asc
          beforeSave={(p) => ({ ...p, updated_at: new Date().toISOString() })}
          fields={[
            { key:'stock_symbol', type:'select', required:true, label:'Stock', options: symbolOptions },
            { key:'current_price', type:'number', required:true },
            { key:'prev_close', type:'number', required:true, label:'Previous close' },
            { key:'day_open', type:'number' }, { key:'day_high', type:'number' }, { key:'day_low', type:'number' },
            { key:'volume', type:'number' }, { key:'market_cap', type:'number' }, { key:'pe_ratio', type:'number', label:'P/E ratio' },
            { key:'week52_high', type:'number', label:'52-week high' }, { key:'week52_low', type:'number', label:'52-week low' },
            { key:'sparkline', type:'json', default:'[]', help:'Recent prices for the mini chart, e.g. [101.2, 102.5, 101.9]' },
          ]}
          columns={[
            { key:'stock_symbol', label:'Stock', render:q => <strong>{q.stock_symbol}</strong> },
            { key:'current_price', label:'Price', align:'right', render:q => usd(q.current_price) },
            { key:'change', label:'Day change', align:'right', render:q => {
              const ch = Number(q.prev_close) ? (Number(q.current_price) - Number(q.prev_close)) / Number(q.prev_close) * 100 : 0;
              return <span className={ch < 0 ? 'down' : 'up'}>{ch >= 0 ? '+' : ''}{ch.toFixed(2)}%</span>;
            } },
            { key:'market_cap', label:'Market cap', align:'right', render:q => q.market_cap ? `$${(Number(q.market_cap) / 1e9).toFixed(1)}B` : '—' },
            { key:'updated_at', label:'Updated', render:q => fmtDateTime(q.updated_at) },
          ]} />
      )}

      {filling && <FillOrder o={filling} user={users[filling.user_id]} onClose={() => setFilling(null)} onDone={() => { orders.reload(); refreshCounts?.(); }} />}
    </>
  );
}

function FillOrder({ o, user, onClose, onDone }) {
  const [price, setPrice] = useState(o.limit_price ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const total = Number(o.quantity) * (Number(price) || 0);
  const go = async () => {
    if (!Number(price)) { setErr('Enter the fill price.'); return; }
    setBusy(true); setErr('');
    try {
      await fillOrder(o, Number(price));
      audit('fill', 'stock_orders', o.id, { status: o.status }, { status: 'filled', filled_price: Number(price) });
      await notify(o.user_id, { title: `Your ${o.symbol} order was filled`, description: `${o.side === 'buy' ? 'Bought' : 'Sold'} ${o.quantity} at ${usd(price)}.`, category: 'trade', icon_class: 'ti-circle-check', action_url: '/stocks' });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not fill the order.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Fill ${o.side} order`} sub={`${user?.email || ''} · ${o.quantity} ${o.symbol}${o.limit_price != null ? ` · limit ${usd(o.limit_price)}` : ''}`} onClose={onClose}
      footer={<><button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ad-btn ad-btn-accent" disabled={busy} onClick={go}>{busy ? 'Filling…' : 'Fill order'}</button></>}>
      <label className="ad-field"><span>Fill price ($)</span><input className="ad-input" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
      <p style={{ color:'var(--muted)', fontSize:14 }}>
        {o.side === 'buy' ? `${usd(total)} will be taken from the user's wallet and ${o.quantity} shares added to their holdings.`
          : `${o.quantity} shares will be removed from their holdings and ${usd(total)} paid into their wallet.`}
      </p>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}
