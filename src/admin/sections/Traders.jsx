import React, { useState } from 'react';
import { PageHead, DataTable, Tabs, Pill, UserCell, CrudTable, StatusSelect, useRows, useUsers, usd, fmtDateTime } from '../adminShared';

export default function Traders({ refreshCounts }) {
  const users = useUsers();
  const [tab, setTab] = useState('profiles');
  const copies = useRows('copy_relationships', { select: '*, trader_profiles(display_name,handle)', order: 'started_at' });
  const hires = useRows('hire_requests');
  const agreements = useRows('hire_agreements', { order: 'started_at' });
  const profiles = useRows('trader_profiles', { select: 'id,display_name,handle' });
  const traderName = (id) => profiles.rows.find(t => t.id === id)?.display_name || '—';
  const openHires = hires.rows.filter(h => ['open', 'pending'].includes(h.status)).length;

  return (
    <>
      <PageHead title="Traders & copying" sub="Manage the traders users can copy or hire, and keep an eye on copy relationships and hire requests." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'profiles',   label:'Trader profiles' },
        { key:'copies',     label:'Copy relationships', count: copies.rows.length || undefined },
        { key:'hires',      label:'Hire requests', count: openHires || undefined },
        { key:'agreements', label:'Hire agreements' },
      ]} />

      {tab === 'profiles' && (
        <CrudTable table="trader_profiles" itemName="trader"
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

      {tab === 'copies' && (
        <DataTable rows={copies.rows} loading={copies.loading} error={copies.error} missing={copies.missing} table="copy_relationships" empty="Nobody is copying a trader yet"
          columns={[
            { key:'started_at', label:'Started', render:c => fmtDateTime(c.started_at || c.created_at) },
            { key:'copier', label:'Copier', render:c => <UserCell user={users[c.copier_id]} id={c.copier_id} /> },
            { key:'trader', label:'Trader', render:c => c.trader_profiles?.display_name || '—' },
            { key:'allocated_amount', label:'Allocated', align:'right', render:c => usd(c.allocated_amount) },
            { key:'copy_ratio', label:'Ratio' },
            { key:'realised_gain', label:'Realised', align:'right', render:c => <span className={Number(c.realised_gain) < 0 ? 'down' : 'up'}>{usd(c.realised_gain)}</span> },
            { key:'act', label:'Status', align:'right', render:c => <StatusSelect table="copy_relationships" row={c} options={['active', 'paused', 'stopped']} onDone={copies.reload}
                patchFor={v => v === 'paused' ? { paused_at: new Date().toISOString() } : v === 'stopped' ? { stopped_at: new Date().toISOString() } : {}} /> },
          ]} />
      )}

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
