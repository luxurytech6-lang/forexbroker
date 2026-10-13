/**
 * Swap.jsx — Admin → Swap
 * The coins users can swap between and their USD prices, the fee and limits,
 * and the history of every swap. Swaps use these prices (swap_currency() in
 * database/15_staking_swap_schema.sql) and pause if a price gets too old, so
 * refresh prices regularly — "Fetch market prices" pulls them from CoinGecko.
 */
import React, { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, CrudTable, useRows, useUsers, useAction, audit, usd, fmtDateTime,
} from '../adminShared';

/* CoinGecko ids for common tickers (add more here if you list other coins) */
const GECKO = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin', SOL: 'solana', XRP: 'ripple',
  LTC: 'litecoin', TRX: 'tron', DOGE: 'dogecoin', ADA: 'cardano', DOT: 'polkadot', MATIC: 'matic-network', AVAX: 'avalanche-2',
};
const mins = (d) => Math.max(0, Math.round((Date.now() - new Date(d)) / 60000));
const fmtAmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 8 });

export default function SwapAdmin() {
  const users = useUsers();
  const [tab, setTab] = useState('prices');
  const assets = useRows('swap_assets', { order: 'sort_order', asc: true });
  const swaps = useRows('swaps', { limit: 2000 });
  const [cfg, setCfg] = useState(null);
  const [busy, run] = useAction();
  const [msg, setMsg] = useState('');

  useEffect(() => { supabase.from('swap_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data || { fee_pct: 0.5, max_price_age_mins: 60, min_usd: 5 })); }, []);
  const maxAge = Number(cfg?.max_price_age_mins || 60);

  const fetchPrices = () => run('fetch', async () => {
    setMsg('');
    const list = assets.rows.filter(a => a.symbol !== 'USD');
    const ids = [...new Set(list.map(a => GECKO[a.symbol]).filter(Boolean))];
    if (!ids.length) throw new Error('None of your coins have a known market id. Edit prices by hand.');
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`Price service replied ${res.status}. Try again in a minute.`);
    const data = await res.json();
    const now = new Date().toISOString();
    const updated = [], skipped = [];
    for (const a of list) {
      const p = data?.[GECKO[a.symbol]]?.usd;
      if (!p) { skipped.push(a.symbol); continue; }
      const { error } = await supabase.from('swap_assets').update({ usd_price: p, updated_at: now }).eq('symbol', a.symbol);
      if (error) throw error;
      updated.push(`${a.symbol} ${usd(p, p < 10 ? 4 : 2)}`);
    }
    await supabase.from('swap_assets').update({ updated_at: now }).eq('symbol', 'USD');
    audit('update_prices', 'swap_assets', 'market', null, { updated, skipped });
    setMsg(`Updated: ${updated.join(' · ')}${skipped.length ? ` — no market price for ${skipped.join(', ')} (set by hand)` : ''}`);
    assets.reload();
  }, 'Prices updated');

  const saveCfg = () => run('cfg', async () => {
    const patch = { fee_pct: Number(cfg.fee_pct), max_price_age_mins: Number(cfg.max_price_age_mins), min_usd: Number(cfg.min_usd), updated_at: new Date().toISOString() };
    const { error } = await supabase.from('swap_settings').update(patch).eq('id', 1);
    if (error) throw error;
    audit('update', 'swap_settings', '1', null, patch);
  }, 'Settings saved');

  const volume = swaps.rows.reduce((a, s) => a + Number(s.usd_value || 0), 0);

  return (
    <>
      <PageHead title="Swap" sub={`Prices users swap at. Swaps for a coin pause if its price is older than ${maxAge} minutes, so refresh them regularly.`}>
        <button className="ad-btn ad-btn-accent" disabled={busy === 'fetch'} onClick={fetchPrices}><RefreshCw />{busy === 'fetch' ? 'Fetching…' : 'Fetch market prices'}</button>
      </PageHead>
      {msg && <div className="ad-card" style={{ padding:'10px 14px', fontSize:13.5, marginBottom:14 }} data-testid="price-msg">{msg}</div>}
      <Tabs value={tab} onChange={setTab} items={[
        { key:'prices',   label:'Coins & prices' },
        { key:'settings', label:'Fee & limits' },
        { key:'history',  label:'Swaps', count: swaps.rows.length },
      ]} />

      {tab === 'prices' && (
        <CrudTable table="swap_assets" pk="symbol" itemName="coin" order="sort_order" asc
          defaults={{ is_active: true, decimals: 8, sort_order: 10 }}
          beforeSave={(p) => ({ ...p, symbol: String(p.symbol || '').toUpperCase().trim(), updated_at: new Date().toISOString() })}
          fields={[
            { key:'symbol', required:true, help:'Ticker, e.g. BTC. Users need a wallet in this currency to receive it.' },
            { key:'name', required:true },
            { key:'usd_price', type:'number', required:true, label:'Price in USD' },
            { key:'decimals', type:'number', required:true, help:'Decimals amounts are kept to (2 for USD/USDT, 8 for BTC)' },
            { key:'sort_order', type:'number' },
            { key:'is_active', type:'bool', label:'Available for swaps' },
          ]}
          columns={[
            { key:'symbol', label:'Coin', render:a => <div className="ad-user"><strong>{a.symbol}</strong><small>{a.name}</small></div> },
            { key:'usd_price', label:'Price', align:'right', render:a => usd(a.usd_price, Number(a.usd_price) < 10 ? 4 : 2) },
            { key:'updated_at', label:'Updated', render:a => a.symbol === 'USD' ? '—' : (
              <span style={{ color: mins(a.updated_at) > maxAge ? 'var(--red)' : 'inherit' }}>{mins(a.updated_at)} min ago{mins(a.updated_at) > maxAge ? ' · swaps paused' : ''}</span>) },
            { key:'is_active', label:'Status', render:a => <Pill status={a.is_active ? 'active' : 'draft'}>{a.is_active ? 'Available' : 'Hidden'}</Pill> },
          ]} />
      )}

      {tab === 'settings' && cfg && (
        <div className="ad-card" style={{ padding:18, display:'grid', gap:14, maxWidth:560 }}>
          <div className="ad-form">
            <label className="ad-field"><span>Fee (%)</span><input className="ad-input" type="number" step="0.01" min="0" value={cfg.fee_pct} onChange={e => setCfg({ ...cfg, fee_pct: e.target.value })} /><small>Taken from what the user receives</small></label>
            <label className="ad-field"><span>Minimum swap ($)</span><input className="ad-input" type="number" step="1" min="0" value={cfg.min_usd} onChange={e => setCfg({ ...cfg, min_usd: e.target.value })} /></label>
            <label className="ad-field full"><span>Pause swaps when a price is older than (minutes)</span><input className="ad-input" type="number" step="1" min="1" value={cfg.max_price_age_mins} onChange={e => setCfg({ ...cfg, max_price_age_mins: e.target.value })} /></label>
          </div>
          <div><button className="ad-btn ad-btn-accent" disabled={busy === 'cfg'} onClick={saveCfg}><Save />Save</button></div>
        </div>
      )}

      {tab === 'history' && (
        <>
          <div className="ad-kv" style={{ marginBottom:14 }}>
            <div><span>Swaps</span><strong>{swaps.rows.length}</strong></div>
            <div><span>Volume</span><strong>{usd(volume)}</strong></div>
          </div>
          <DataTable rows={swaps.rows} loading={swaps.loading} error={swaps.error} missing={swaps.missing} table="swaps" empty="No swaps yet"
            searchText={s => `${users[s.user_id]?.email || ''} ${s.from_currency} ${s.to_currency}`}
            columns={[
              { key:'created_at', label:'Date', render:s => fmtDateTime(s.created_at) },
              { key:'user', label:'User', render:s => <UserCell user={users[s.user_id]} id={s.user_id} /> },
              { key:'from', label:'Paid', render:s => <span className="down">−{fmtAmt(s.from_amount)} {s.from_currency}</span> },
              { key:'to', label:'Received', render:s => <span className="up">+{fmtAmt(s.to_amount)} {s.to_currency}</span> },
              { key:'usd_value', label:'Value', align:'right', render:s => usd(s.usd_value) },
              { key:'fee_pct', label:'Fee', align:'right', render:s => `${s.fee_pct}%` },
            ]} />
        </>
      )}
    </>
  );
}
