import React, { useState } from 'react';
import { PageHead, DataTable, Tabs, UserCell, StatusSelect, useRows, useUsers, usd, fmtDateTime } from '../adminShared';

export default function HireTrader({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('hires');
  const hires = useRows('hire_requests');
  const agreements = useRows('hire_agreements', { order: 'started_at' });
  const profiles = useRows('trader_profiles', { select: 'id,display_name,handle' });
  const traderName = (id) => profiles.rows.find(t => t.id === id)?.display_name || '—';
  const openHires = hires.rows.filter(h => ['open', 'pending'].includes(h.status)).length;

  return (
    <>
      <PageHead title="Hire a trader" sub="Requests from users looking for a trader to manage their money, and the agreements that follow. Trader profiles are managed under Copy trading." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'hires',      label:'Hire requests', count: openHires || undefined },
        { key:'agreements', label:'Hire agreements' },
      ]} />

      {tab === 'hires' && (
        <DataTable rows={hires.rows} loading={hires.loading} error={hires.error} missing={hires.missing} table="hire_requests" empty="No hire requests yet"
          columns={[
            { key:'created_at', label:'Posted', render:h => fmtDateTime(h.created_at) },
            { key:'client', label:'Client', render:h => <UserCell user={users[h.client_id]} id={h.client_id} /> },
            { key:'capital_amount', label:'Capital', align:'right', render:h => usd(h.capital_amount, 0) },
            { key:'specialty', label:'Market' },
            { key:'risk_appetite', label:'Risk', render:h => <span style={{ textTransform:'capitalize' }}>{h.risk_appetite}</span> },
            { key:'notes', label:'Notes', wrap:true },
            { key:'fee_preference', label:'Fee', render:h => <span style={{ textTransform:'capitalize' }}>{h.fee_preference}</span> },
            { key:'act', label:'Status', align:'right', render:h => <StatusSelect table="hire_requests" row={h} options={['pending', 'open', 'matched', 'closed', 'cancelled']} onDone={() => { hires.reload(); refreshCounts?.(); }} /> },
          ]} />
      )}

      {tab === 'agreements' && (
        <DataTable rows={agreements.rows} loading={agreements.loading} error={agreements.error} missing={agreements.missing} table="hire_agreements" empty="No hire agreements yet"
          columns={[
            { key:'started_at', label:'Started', render:a => fmtDateTime(a.started_at) },
            { key:'client', label:'Client', render:a => <UserCell user={users[a.client_id]} id={a.client_id} /> },
            { key:'trader', label:'Trader', render:a => traderName(a.trader_id) },
            { key:'capital_amount', label:'Capital', align:'right', render:a => usd(a.capital_amount, 0) },
            { key:'duration_months', label:'Term', render:a => a.duration_months ? `${a.duration_months} mo` : '—' },
            { key:'total_return', label:'Return', align:'right', render:a => <span className={Number(a.total_return) < 0 ? 'down' : 'up'}>{usd(a.total_return)}</span> },
            { key:'fees_paid', label:'Fees', align:'right', render:a => usd(a.fees_paid) },
            { key:'act', label:'Status', align:'right', render:a => <StatusSelect table="hire_agreements" row={a} options={['pending', 'active', 'completed', 'cancelled']} onDone={agreements.reload}
                patchFor={v => ['completed', 'cancelled'].includes(v) ? { ended_at: new Date().toISOString() } : {}} /> },
          ]} />
      )}
    </>
  );
}
