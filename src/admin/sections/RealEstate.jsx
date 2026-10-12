import React, { useMemo, useState } from 'react';
import { Check, X, LogOut as ExitIcon, HandCoins } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Chips, Pill, UserCell, CrudTable, ApproveModal, PaymentCell, paidByCrypto, settlePayment, Modal, useRows, useUsers, useAction,
  walletAdjust, notify, audit, usd, fmtDate, fmtDateTime,
} from '../adminShared';

export default function RealEstateAdmin({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('investments');
  const [status, setStatus] = useState('pending');
  const inv = useRows('property_investments', { select: '*, properties(name,city,funded_amount,investors_count,target_yield)' });
  const pays = useRows('property_payouts', { select: '*, properties(name)' });
  const props = useRows('properties', { select: 'id,name,status' });
  const [busy, run] = useAction();
  const [approving, setApproving] = useState(null);
  const [distributing, setDistributing] = useState(false);

  const counts = useMemo(() => inv.rows.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {}), [inv.rows]);
  const list = status === 'all' ? inv.rows : inv.rows.filter(r => r.status === status);

  const approve = async (r, charge) => {
    const name = r.properties?.name || 'property';
    if (charge) await walletAdjust(r.user_id, -Number(r.amount), { type: 'property_investment', description: `Investment in ${name}` });
    const { error } = await supabase.from('property_investments').update({ status: 'active' }).eq('id', r.id);
    if (error) throw error;
    audit('approve', 'property_investments', r.id, { status: 'pending' }, { status: 'active', charged: charge });
    await settlePayment(r, true);
    if (r.properties) {
      await supabase.from('properties').update({
        funded_amount: Number(r.properties.funded_amount || 0) + Number(r.amount),
        investors_count: Number(r.properties.investors_count || 0) + 1,
      }).eq('id', r.property_id);
    }
    await notify(r.user_id, { title: `You now own shares in ${name}`, description: `Your ${usd(r.amount)} investment is confirmed. Rent is paid to your wallet quarterly.`, category: 'payment', icon_class: 'ti-building', action_url: '/real-estate' });
    inv.reload(); refreshCounts?.();
  };

  const setState = (r, next, msg) => {
    if (!window.confirm(`${msg}?`)) return;
    run(r.id, async () => {
      const { error } = await supabase.from('property_investments').update({ status: next }).eq('id', r.id);
      if (error) throw error;
      if (next === 'rejected') {
        await settlePayment(r, false);
        await notify(r.user_id, { title: 'Your property investment wasn’t confirmed', description: `We couldn’t confirm your ${usd(r.amount)} payment for ${r.properties?.name || 'the property'}. Contact support if you think this is a mistake.`, category: 'payment', icon_class: 'ti-circle-x', action_url: '/real-estate' });
      }
      audit('set_status', 'property_investments', r.id, { status: r.status }, { status: next });
      inv.reload(); refreshCounts?.();
    }, msg);
  };

  return (
    <>
      <PageHead title="Real estate" sub="List properties, approve investments and distribute rent to investors.">
        <button className="ad-btn ad-btn-accent" onClick={() => setDistributing(true)}><HandCoins />Distribute rent</button>
      </PageHead>
      <Tabs value={tab} onChange={setTab} items={[
        { key:'investments', label:'Investments', count: counts.pending || undefined },
        { key:'properties',  label:'Properties' },
        { key:'payouts',     label:'Rent payouts' },
      ]} />

      {tab === 'investments' && (
        <DataTable rows={list} loading={inv.loading} error={inv.error} missing={inv.missing} table="property_investments" empty="No investments here"
          toolbar={<Chips value={status} onChange={setStatus} items={[
            { key:'pending', label:`Pending (${counts.pending || 0})` }, { key:'active', label:`Active (${counts.active || 0})` },
            { key:'exited', label:'Exited' }, { key:'rejected', label:'Rejected' }, { key:'all', label:'All' },
          ]} />}
          columns={[
            { key:'created_at', label:'Date', render:r => fmtDateTime(r.created_at) },
            { key:'user', label:'Investor', render:r => <UserCell user={users[r.user_id]} id={r.user_id} /> },
            { key:'property', label:'Property', render:r => <div className="ad-user"><span>{r.properties?.name || '—'}</span><small>{r.properties?.city}</small></div> },
            { key:'amount', label:'Amount', align:'right', render:r => usd(r.amount) },
            { key:'shares', label:'Shares', align:'right' },
            { key:'payment', label:'Payment', render:r => <PaymentCell row={r} /> },
            { key:'status', label:'Status', render:r => <Pill status={r.status} /> },
            { key:'act', label:'', align:'right', render:r => (
              <div className="ad-row-actions">
                {r.status === 'pending' && <>
                  <button className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setApproving(r)}><Check />Approve</button>
                  <button className="ad-btn ad-btn-no ad-btn-sm" disabled={busy === r.id} onClick={() => setState(r, 'rejected', 'Reject this investment')}><X />Reject</button>
                </>}
                {r.status === 'active' && <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={busy === r.id} onClick={() => setState(r, 'exited', 'Mark this position exited')}><ExitIcon />Exit</button>}
              </div>
            ) },
          ]} />
      )}

      {tab === 'properties' && (
        <CrudTable table="properties" itemName="property" defaults={{ status: 'open', type: 'residential', share_price: 10, min_investment: 100, funded_amount: 0, investors_count: 0 }}
          onChanged={props.reload}
          fields={[
            { key:'name', required:true },
            { key:'type', type:'select', options:['residential', 'commercial', 'industrial', 'hospitality'], required:true },
            { key:'city', required:true }, { key:'country', required:true },
            { key:'status', type:'select', options:['draft', 'open', 'funded', 'closed'], required:true, help:'Only open and funded are shown to users' },
            { key:'image_url', label:'Image URL', help:'Leave empty to use the drawn illustration' },
            { key:'total_value', type:'number', label:'Total value ($)', required:true },
            { key:'funded_amount', type:'number', label:'Raised so far ($)' },
            { key:'min_investment', type:'number', label:'Minimum ($)' },
            { key:'share_price', type:'number', label:'Share price ($)' },
            { key:'target_yield', type:'number', label:'Target yield (% a year)' },
            { key:'appreciation', type:'number', label:'Expected growth (% a year)' },
            { key:'hold_years', type:'number', label:'Hold period (years)' },
            { key:'occupancy', type:'number', label:'Occupancy (%)' },
            { key:'investors_count', type:'number' },
            { key:'featured', type:'bool', label:'Feature at the top' },
            { key:'description', type:'textarea' },
          ]}
          columns={[
            { key:'name', label:'Property', render:p => <div className="ad-user"><strong>{p.name}</strong><small>{p.city}, {p.country}</small></div> },
            { key:'type', label:'Type', render:p => <span style={{ textTransform:'capitalize' }}>{p.type}</span> },
            { key:'funded', label:'Raised', render:p => `${usd(p.funded_amount, 0)} of ${usd(p.total_value, 0)}` },
            { key:'target_yield', label:'Yield', align:'right', render:p => p.target_yield != null ? `${p.target_yield}%` : '—' },
            { key:'status', label:'Status', render:p => <Pill status={p.status} /> },
          ]} />
      )}

      {tab === 'payouts' && (
        <DataTable rows={pays.rows} loading={pays.loading} error={pays.error} missing={pays.missing} table="property_payouts" empty="No rent paid yet"
          columns={[
            { key:'created_at', label:'Date', render:p => fmtDate(p.created_at) },
            { key:'user', label:'Investor', render:p => <UserCell user={users[p.user_id]} id={p.user_id} /> },
            { key:'property', label:'Property', render:p => p.properties?.name || '—' },
            { key:'period', label:'Period', render:p => p.period || '—' },
            { key:'amount', label:'Amount', align:'right', render:p => <span className="up">{usd(p.amount)}</span> },
          ]} />
      )}

      {approving && (
        <ApproveModal title="Approve investment" sub={`${users[approving.user_id]?.email || ''} · ${approving.properties?.name || ''}`}
          amount={Number(approving.amount)} defaultCharge={!paidByCrypto(approving)}
          chargeLabel={paidByCrypto(approving) ? 'Also charge the user’s wallet (only if the crypto payment didn’t arrive)' : 'Charge this to the user’s wallet'}
          onClose={() => setApproving(null)} onConfirm={(c) => approve(approving, c)}>
          <div className="ad-card" style={{ padding:14, display:'grid', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--muted)' }}>Payment</div>
            <PaymentCell row={approving} />
            {paidByCrypto(approving) && <small style={{ color:'var(--faint)' }}>Open the screenshot and check your {approving.pay_coin || 'crypto'} wallet received {usd(approving.amount)} before approving.</small>}
          </div>
          <p style={{ color:'var(--muted)' }}>{Number(approving.shares || 0).toLocaleString('en-US')} shares. The investment becomes active and counts towards the property's funding.</p>
        </ApproveModal>
      )}
      {distributing && <DistributeRent properties={props.rows} onClose={() => setDistributing(false)} onDone={() => { pays.reload(); }} />}
    </>
  );
}

/* Splits a rent amount across a property's active investors, pro rata to what they put in */
function DistributeRent({ properties, onClose, onDone }) {
  const [propertyId, setPropertyId] = useState('');
  const [total, setTotal] = useState('');
  const [period, setPeriod] = useState(() => { const d = new Date(); return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`; });
  const [holders, setHolders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async (id) => {
    setPropertyId(id); setHolders(null);
    if (!id) return;
    const { data } = await supabase.from('property_investments').select('user_id,amount').eq('property_id', id).eq('status', 'active');
    const m = {};
    (data || []).forEach(r => { m[r.user_id] = (m[r.user_id] || 0) + Number(r.amount || 0); });
    setHolders(Object.entries(m).map(([user_id, amount]) => ({ user_id, amount })));
  };
  const invested = (holders || []).reduce((s, h) => s + h.amount, 0);
  const amt = Number(total) || 0;

  const go = async () => {
    setBusy(true); setErr('');
    try {
      const name = properties.find(p => p.id === propertyId)?.name || 'property';
      for (const h of holders) {
        const share = Math.floor(amt * (h.amount / invested) * 100) / 100;
        if (share <= 0) continue;
        await walletAdjust(h.user_id, share, { type: 'rent_payout', description: `Rent · ${name} · ${period}` });
        await supabase.from('property_payouts').insert({ user_id: h.user_id, property_id: propertyId, amount: share, period });
        await notify(h.user_id, { title: `Rent paid: ${usd(share)}`, description: `Your share of ${period} rent from ${name}.`, category: 'payment', icon_class: 'ti-building', action_url: '/real-estate' });
      }
      audit('distribute_rent', 'property_payouts', propertyId, null, { total: amt, period, investors: holders.length });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Could not distribute rent.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Distribute rent" sub="Each active investor gets a share in proportion to their investment." onClose={onClose}
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" onClick={go} disabled={busy || !amt || !holders?.length}>{busy ? 'Paying…' : `Pay ${usd(amt)}`}</button>
      </>}>
      <div className="ad-form">
        <label className="ad-field full"><span>Property</span>
          <select className="ad-select" value={propertyId} onChange={e => load(e.target.value)}>
            <option value="">Choose a property</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="ad-field"><span>Total rent to pay ($)</span><input className="ad-input" type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} /></label>
        <label className="ad-field"><span>Period label</span><input className="ad-input" value={period} onChange={e => setPeriod(e.target.value)} /></label>
      </div>
      {holders && (holders.length
        ? <p style={{ color:'var(--muted)', fontSize:14 }}>{holders.length} investors · {usd(invested)} invested · {invested ? `${((amt / invested) * 100).toFixed(2)}% of capital` : ''}</p>
        : <p style={{ color:'var(--muted)', fontSize:14 }}>This property has no active investors.</p>)}
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}
