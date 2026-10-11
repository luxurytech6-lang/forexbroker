import React from 'react';
import { Star } from 'lucide-react';
import { supabase, PageHead, CrudTable, Pill, useAction, audit } from '../adminShared';

export default function CryptoWallets() {
  const [busy, run] = useAction();

  const makeDefault = (w, reload) => run(w.id, async () => {
    await supabase.from('platform_crypto_wallets').update({ is_default: false }).neq('id', w.id);
    const { error } = await supabase.from('platform_crypto_wallets').update({ is_default: true }).eq('id', w.id);
    if (error) throw error;
    audit('set_default', 'platform_crypto_wallets', w.id, null, { symbol: w.symbol });
    reload();
  }, `${w.symbol} is now the default`);

  return (
    <>
      <PageHead title="Deposit addresses" sub="The crypto addresses users are shown when they deposit or pay for a plan. Double-check every address and network — funds sent to a wrong address can't be recovered." />
      <CrudTable table="platform_crypto_wallets" itemName="address" order="symbol" asc defaults={{ is_active: true, is_default: false }}
        beforeSave={(p) => ({ ...p, updated_at: new Date().toISOString() })}
        fields={[
          { key:'symbol', required:true, help:'Unique, e.g. BTC, ETH, USDT' },
          { key:'name', required:true, help:'e.g. Bitcoin, Tether' },
          { key:'network', required:true, help:'e.g. Bitcoin, ERC-20, TRC-20' },
          { key:'address', required:true, full:true },
          { key:'icon', required:true, help:'Tabler icon class, e.g. ti-currency-bitcoin' },
          { key:'color', required:true, placeholder:'#F7931A' },
          { key:'is_active', type:'bool', label:'Show to users' },
          { key:'is_default', type:'bool', label:'Selected by default' },
        ]}
        columns={[
          { key:'symbol', label:'Coin', render:w => <div className="ad-user"><strong>{w.symbol}</strong><small>{w.name}</small></div> },
          { key:'network', label:'Network' },
          { key:'address', label:'Address', render:w => <span className="ad-mono" title={w.address}>{w.address ? `${w.address.slice(0, 10)}…${w.address.slice(-8)}` : '—'}</span> },
          { key:'is_active', label:'Shown', render:w => <Pill status={w.is_active ? 'active' : 'paused'}>{w.is_active ? 'Live' : 'Hidden'}</Pill> },
          { key:'is_default', label:'Default', render:w => w.is_default ? <Pill status="ok">Default</Pill> : null },
        ]}
        rowActions={(w, reload) => !w.is_default && (
          <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={busy === w.id} onClick={() => makeDefault(w, reload)}><Star />Make default</button>
        )} />
    </>
  );
}
