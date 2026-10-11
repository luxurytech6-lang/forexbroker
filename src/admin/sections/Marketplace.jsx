import React, { useState } from 'react';
import { PageHead, DataTable, Tabs, Pill, UserCell, CrudTable, StatusSelect, useRows, useUsers, usd, fmtDateTime } from '../adminShared';

export default function Marketplace() {
  const users = useUsers();
  const [tab, setTab] = useState('items');
  const subs = useRows('marketplace_subscriptions', { select: '*, marketplace_items(name)', order: 'started_at' });

  return (
    <>
      <PageHead title="Marketplace" sub="The bots and signal services users can subscribe to, and who is subscribed. Crypto payments for these show under Transactions → Other pending." />
      <Tabs value={tab} onChange={setTab} items={[{ key:'items', label:'Items' }, { key:'subs', label:'Subscribers', count: subs.rows.length || undefined }]} />

      {tab === 'items' && (
        <CrudTable table="marketplace_items" itemName="item" defaults={{ is_active: true, subscriber_count: 0 }}
          beforeSave={(p) => ({ ...p, markets: typeof p.markets === 'string' ? p.markets.split(',').map(x => x.trim()).filter(Boolean) : p.markets })}
          fields={[
            { key:'name', required:true },
            { key:'slug', required:true, help:'Unique, lowercase, e.g. btc-scalper' },
            { key:'type', type:'select', required:true, options:['bot', 'signal'] },
            { key:'tag', help:'Short label, e.g. Scalping' },
            { key:'price_monthly', type:'number', required:true, label:'Price a month ($)' },
            { key:'delivery_method', help:'e.g. Telegram, In-app, API' },
            { key:'markets', help:'Comma-separated, e.g. Crypto, Forex' },
            { key:'roi_12m_pct', type:'number', label:'12-month return (%)' },
            { key:'win_rate_pct', type:'number', label:'Win rate (%)' },
            { key:'accuracy_pct', type:'number', label:'Accuracy (%)' },
            { key:'total_trades', type:'number' },
            { key:'subscriber_count', type:'number' },
            { key:'badge_label' }, { key:'badge_type' },
            { key:'icon_class', help:'Tabler icon class, e.g. ti-robot' },
            { key:'color_hex', placeholder:'#E2AE4A' },
            { key:'is_active', type:'bool', label:'Visible to users' },
            { key:'description', type:'textarea' },
          ]}
          columns={[
            { key:'name', label:'Item', render:i => <div className="ad-user"><strong>{i.name}</strong><small style={{ textTransform:'capitalize' }}>{i.type}{i.tag ? ` · ${i.tag}` : ''}</small></div> },
            { key:'price_monthly', label:'Price', align:'right', render:i => `${usd(i.price_monthly)}/mo` },
            { key:'roi_12m_pct', label:'12m return', align:'right', render:i => i.roi_12m_pct != null ? `${i.roi_12m_pct}%` : '—' },
            { key:'subscriber_count', label:'Subscribers', align:'right' },
            { key:'is_active', label:'Visible', render:i => <Pill status={i.is_active ? 'active' : 'paused'}>{i.is_active ? 'Live' : 'Hidden'}</Pill> },
          ]} />
      )}

      {tab === 'subs' && (
        <DataTable rows={subs.rows} loading={subs.loading} error={subs.error} missing={subs.missing} table="marketplace_subscriptions" empty="No subscribers yet"
          columns={[
            { key:'started_at', label:'Started', render:s => fmtDateTime(s.started_at) },
            { key:'user', label:'User', render:s => <UserCell user={users[s.user_id]} id={s.user_id} /> },
            { key:'item', label:'Item', render:s => s.marketplace_items?.name || '—' },
            { key:'renews_at', label:'Renews', render:s => fmtDateTime(s.renews_at) },
            { key:'pnl_30d', label:'30-day P&L', align:'right', render:s => <span className={Number(s.pnl_30d) < 0 ? 'down' : 'up'}>{usd(s.pnl_30d)}</span> },
            { key:'act', label:'Status', align:'right', render:s => <StatusSelect table="marketplace_subscriptions" row={s} options={['pending', 'active', 'cancelled', 'expired']} onDone={subs.reload}
                patchFor={v => v === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}} /> },
          ]} />
      )}
    </>
  );
}
