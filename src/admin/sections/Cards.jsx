import React, { useState } from 'react';
import { Check, CreditCard as CardIcon, Truck } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, CrudTable, ApproveModal, Modal, StatusSelect, useRows, useUsers,
  walletAdjust, notify, audit, usd, fmtDateTime,
} from '../adminShared';

/* Matches cards_schema.sql: card_orders.status check constraint */
const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const ORDER_MSG = { shipped: 'Your card is on its way', delivered: 'Your card has been delivered', cancelled: 'Your card order was cancelled' };

const fmtAddress = (d) => {
  if (!d) return 'Virtual · no delivery';
  if (typeof d !== 'object') return String(d);
  return [d.line1, d.line2, d.city, d.state, d.postal_code, d.country].filter(Boolean).join(', ');
};

export default function CardsAdmin({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('orders');
  const orders = useRows('card_orders');
  const products = useRows('card_products', { order: 'price', asc: true });
  const txs = useRows('card_transactions');
  const [approving, setApproving] = useState(null);
  const [issuing, setIssuing] = useState(null);
  const [shipping, setShipping] = useState(null);
  const pending = orders.rows.filter(o => o.status === 'pending').length;
  const productName = (k) => products.rows.find(p => p.key === k)?.name || k;

  /* order_card() already charges the fee, so by default approving doesn't charge again.
     Tick "charge" only for orders filed by the page's fallback (when order_card() wasn't installed). */
  const approve = async (o, charge) => {
    if (charge && Number(o.fee) > 0) await walletAdjust(o.user_id, -Number(o.fee), { type: 'card_fee', description: `Card order · ${productName(o.product)}` });
    const { error } = await supabase.from('card_orders').update({ status: 'processing' }).eq('id', o.id);
    if (error) throw error;
    audit('approve', 'card_orders', o.id, { status: 'pending' }, { status: 'processing', charged: charge });
    await notify(o.user_id, { title: 'Your card order is being processed', description: 'We’ll let you know when it ships.', category: 'payment', icon_class: 'ti-credit-card', action_url: '/cards' });
    orders.reload(); refreshCounts?.();
  };

  const onStatus = async (o, v) => {
    if (ORDER_MSG[v]) await notify(o.user_id, { title: ORDER_MSG[v], category: 'payment', icon_class: 'ti-credit-card', action_url: '/cards' });
    refreshCounts?.();
  };

  return (
    <>
      <PageHead title="Cards" sub="Review card orders, issue cards and manage the card range. Only the last four digits of a card are ever stored — full numbers stay with your card issuer." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'orders',   label:'Orders', count: pending || undefined },
        { key:'cards',    label:'Issued cards' },
        { key:'txs',      label:'Card payments' },
        { key:'products', label:'Card products' },
      ]} />

      {tab === 'orders' && (
        <DataTable rows={orders.rows} loading={orders.loading} error={orders.error} missing={orders.missing} table="card_orders" empty="No card orders yet"
          columns={[
            { key:'created_at', label:'Ordered', render:o => fmtDateTime(o.created_at) },
            { key:'user', label:'User', render:o => <UserCell user={users[o.user_id]} id={o.user_id} /> },
            { key:'product', label:'Card', render:o => <div className="ad-user"><span>{productName(o.product)} · {o.design}</span><small>{o.name_on_card}</small></div> },
            { key:'delivery', label:'Delivery', wrap:true, render:o => <span style={{ fontSize:13.5 }}>{fmtAddress(o.delivery)}{o.tracking_number && <><br /><span className="ad-mono">Tracking {o.tracking_number}</span></>}</span> },
            { key:'fee', label:'Fee', align:'right', render:o => usd(o.fee) },
            { key:'act', label:'Status', align:'right', render:o => (
              <div className="ad-row-actions">
                {o.status === 'pending' ? (
                  <button className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setApproving(o)}><Check />Approve</button>
                ) : <>
                  {!o.card_id && o.status !== 'cancelled' && <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setIssuing(o)}><CardIcon />Issue card</button>}
                  {o.status === 'processing' && o.delivery && <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setShipping(o)}><Truck />Ship</button>}
                  <StatusSelect table="card_orders" row={o} options={ORDER_STEPS} onDone={orders.reload} after={onStatus} />
                </>}
              </div>
            ) },
          ]} />
      )}

      {tab === 'cards' && (
        <CrudTable table="cards" itemName="card" canCreate={false}
          fields={[
            { key:'name_on_card', required:true },
            { key:'design', required:true },
            { key:'last4', required:true, label:'Last 4 digits', help:'Never enter a full card number' },
            { key:'exp_month', type:'number', required:true, label:'Expiry month' },
            { key:'exp_year', type:'number', required:true, label:'Expiry year' },
            { key:'status', type:'select', options:['active', 'frozen', 'blocked'], required:true },
            { key:'monthly_limit', type:'number', required:true, label:'Monthly limit ($)' },
            { key:'online_enabled', type:'bool', label:'Online payments' },
            { key:'contactless_enabled', type:'bool', label:'Contactless' },
            { key:'issuer_ref', label:'Issuer reference' },
            { key:'user_id', hidden:true }, { key:'order_id', hidden:true }, { key:'product', hidden:true },
          ]}
          columns={[
            { key:'user', label:'User', render:c => <UserCell user={users[c.user_id]} id={c.user_id} /> },
            { key:'product', label:'Card', render:c => <div className="ad-user"><span>{productName(c.product)}</span><small>{c.design}</small></div> },
            { key:'last4', label:'Number', render:c => <span className="ad-mono">•••• {c.last4}</span> },
            { key:'exp', label:'Expires', render:c => `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` },
            { key:'monthly_limit', label:'Monthly limit', align:'right', render:c => usd(c.monthly_limit, 0) },
            { key:'status', label:'Status', render:c => <Pill status={c.status} /> },
          ]} />
      )}

      {tab === 'txs' && (
        <DataTable rows={txs.rows} loading={txs.loading} error={txs.error} missing={txs.missing} table="card_transactions" empty="No card payments yet"
          columns={[
            { key:'created_at', label:'Date', render:t => fmtDateTime(t.created_at) },
            { key:'user', label:'User', render:t => <UserCell user={users[t.user_id]} id={t.user_id} /> },
            { key:'merchant', label:'Merchant' },
            { key:'category', label:'Type', render:t => <span style={{ textTransform:'capitalize' }}>{t.category || '—'}</span> },
            { key:'amount', label:'Amount', align:'right', render:t => `${usd(t.amount)}${t.currency && t.currency !== 'USD' ? ` ${t.currency}` : ''}` },
            { key:'status', label:'Status', render:t => <Pill status={t.status} /> },
          ]} />
      )}

      {tab === 'products' && (
        <CrudTable table="card_products" pk="key" itemName="product" order="price" asc
          beforeSave={(p) => ({ ...p, designs: String(p.designs || '').split(',').map(x => x.trim()).filter(Boolean) })}
          fields={[
            { key:'key', required:true, help:'Short id used in code, e.g. gold. Keep in step with PRODUCTS in Cards.jsx' },
            { key:'name', required:true },
            { key:'price', type:'number', required:true, label:'Price ($)' },
            { key:'monthly_cap', type:'number', required:true, label:'Highest monthly limit ($)' },
            { key:'physical', type:'bool', label:'Physical card (needs delivery)' },
            { key:'designs', required:true, help:'Comma-separated, e.g. midnight, graphite' },
          ]}
          columns={[
            { key:'name', label:'Product', render:p => <div className="ad-user"><strong>{p.name}</strong><small className="ad-mono">{p.key}</small></div> },
            { key:'price', label:'Price', align:'right', render:p => usd(p.price) },
            { key:'monthly_cap', label:'Monthly cap', align:'right', render:p => usd(p.monthly_cap, 0) },
            { key:'physical', label:'Physical' },
            { key:'designs', label:'Designs', render:p => (p.designs || []).join(', ') },
          ]} />
      )}

      {approving && (
        <ApproveModal title="Approve card order" sub={users[approving.user_id]?.email} amount={Number(approving.fee || 0)} defaultCharge={false}
          chargeLabel="Charge the card fee now (only if it wasn’t paid when ordering)" onClose={() => setApproving(null)} onConfirm={(c) => approve(approving, c)}>
          <p style={{ color:'var(--muted)' }}>{productName(approving.product)} · {approving.design} · {approving.name_on_card}. The order moves to processing.</p>
        </ApproveModal>
      )}
      {issuing && <IssueCard order={issuing} cap={products.rows.find(p => p.key === issuing.product)?.monthly_cap} onClose={() => setIssuing(null)} onDone={() => { orders.reload(); }} />}
      {shipping && <ShipOrder order={shipping} onClose={() => setShipping(null)} onDone={orders.reload} />}
    </>
  );
}

/* Creates the cards row for an order with the details your issuer gave you */
function IssueCard({ order, cap, onClose, onDone }) {
  const now = new Date();
  const [last4, setLast4] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear() + 4));
  const [issuerRef, setIssuerRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    if (!/^\d{4}$/.test(last4)) { setErr('Enter exactly four digits.'); return; }
    setBusy(true); setErr('');
    try {
      const { data: card, error } = await supabase.from('cards').insert({
        user_id: order.user_id, order_id: order.id, product: order.product, design: order.design, name_on_card: order.name_on_card,
        last4, exp_month: Number(month), exp_year: Number(year), monthly_limit: Number(cap || 5000), issuer_ref: issuerRef || null,
      }).select().single();
      if (error) throw error;
      const nextStatus = order.delivery ? order.status : 'delivered';   // virtual cards are ready straight away
      await supabase.from('card_orders').update({ card_id: card.id, status: nextStatus }).eq('id', order.id);
      audit('issue_card', 'cards', card.id, null, { order_id: order.id, last4 });
      await notify(order.user_id, { title: order.delivery ? 'Your card has been issued' : 'Your virtual card is ready', description: `Card ending ${last4}.`, category: 'payment', icon_class: 'ti-credit-card', action_url: '/cards' });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not issue the card.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Issue card" sub={`${order.name_on_card} · ${order.product} · ${order.design}`} onClose={onClose}
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" onClick={go} disabled={busy}>{busy ? 'Issuing…' : 'Issue card'}</button>
      </>}>
      <p style={{ color:'var(--muted)', fontSize:14 }}>Enter the details from your card issuer. Never type the full card number or CVV here.</p>
      <div className="ad-form">
        <label className="ad-field"><span>Last 4 digits *</span><input className="ad-input" inputMode="numeric" maxLength={4} value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="ad-field"><span>Issuer reference</span><input className="ad-input" value={issuerRef} onChange={e => setIssuerRef(e.target.value)} /></label>
        <label className="ad-field"><span>Expiry month *</span><input className="ad-input" type="number" min="1" max="12" value={month} onChange={e => setMonth(e.target.value)} /></label>
        <label className="ad-field"><span>Expiry year *</span><input className="ad-input" type="number" min={now.getFullYear()} value={year} onChange={e => setYear(e.target.value)} /></label>
      </div>
      <small style={{ color:'var(--faint)' }}>Monthly limit starts at the product's cap ({usd(cap || 5000, 0)}). The user can lower it on their Cards page.</small>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}

function ShipOrder({ order, onClose, onDone }) {
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try {
      const { error } = await supabase.from('card_orders').update({ status: 'shipped', tracking_number: tracking.trim() || null }).eq('id', order.id);
      if (error) throw error;
      audit('ship', 'card_orders', order.id, { status: order.status }, { status: 'shipped', tracking_number: tracking.trim() });
      await notify(order.user_id, { title: 'Your card is on its way', description: tracking.trim() ? `Tracking number: ${tracking.trim()}` : '', category: 'payment', icon_class: 'ti-truck', action_url: '/cards' });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not update the order.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Mark as shipped" sub={fmtAddress(order.delivery)} onClose={onClose}
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" onClick={go} disabled={busy}>{busy ? 'Saving…' : 'Mark shipped'}</button>
      </>}>
      <label className="ad-field"><span>Tracking number</span><input className="ad-input" value={tracking} onChange={e => setTracking(e.target.value)} /></label>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}
