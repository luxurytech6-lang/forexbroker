/**
 * CryptoCheckout.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The "pay with crypto" step used for real estate, mining, card orders and
 * copy trading. It follows the plan-payment flow on the Payments page:
 *
 *   pick a coin → send to the platform address (QR or copy) → paste the tx hash
 *   (optional) → attach a screenshot (required) → "I've sent the payment"
 *
 * The screenshot is uploaded to the private `payment-proofs` bucket, then
 * `onSubmit(payment)` is called so the page can record the pending purchase.
 * Like the Marketplace checkout, the payment is also written to `transactions`
 * as a *pending* row with the proof (pass the `transaction` prop), so it shows
 * in the user's payment history and in Admin → Transactions. Its id is handed
 * to onSubmit as `transactionId` so the purchase can point at it.
 * Nothing is activated here — an admin checks the proof and approves it.
 *
 * Renders inline (no overlay of its own), so it drops into any drawer or modal.
 * Styling uses the CSS variables every dashboard page already defines.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, QrCode, Upload, X, AlertTriangle, AlertCircle, Loader2, CheckCheck, ShieldCheck } from 'lucide-react';
import supabase from '../supabase';

export const PAYMENT_PROOF_BUCKET = 'payment-proofs';
const MAX_PROOF_MB = 5;
const PROOF_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/** Uploads a proof screenshot and returns its storage path (the bucket is private). */
export async function uploadPaymentProof(file, userId, context = 'payment') {
  if (!file) throw new Error('Attach a screenshot of your payment first.');
  if (!PROOF_TYPES.includes(file.type)) throw new Error('Only JPG or PNG images are accepted as payment proof.');
  if (file.size > MAX_PROOF_MB * 1024 * 1024) throw new Error(`Payment proof must be smaller than ${MAX_PROOF_MB}MB.`);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${context}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(PAYMENT_PROOF_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Could not upload the payment proof: ${error.message}`);
  return path;
}

/** Active deposit addresses from platform_crypto_wallets, default first. */
export function useCryptoWallets() {
  const [state, setState] = useState({ coins: null, error: '' });
  useEffect(() => {
    let live = true;
    supabase.from('platform_crypto_wallets').select('*').eq('is_active', true)
      .order('is_default', { ascending: false }).order('symbol', { ascending: true })
      .then(({ data, error }) => {
        if (!live) return;
        const coins = (data || []).filter(w => w.address).map(w => ({
          id: String(w.id), symbol: String(w.symbol || '').toUpperCase(), name: w.name || w.symbol,
          network: w.network || '', address: w.address, color: w.color || '#E2AE4A',
        }));
        setState({ coins, error: error ? error.message : '' });
      });
    return () => { live = false; };
  }, []);
  return state;
}

const CSS = `
.cc { display: flex; flex-direction: column; gap: 16px; }
.cc-lbl { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
.cc-lbl em { font-style: normal; font-weight: 400; color: var(--faint); }
.cc-amount { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); }
.cc-amount span { display: block; font-size: 12.5px; color: var(--muted); }
.cc-amount strong { font-size: 24px; font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums; }
.cc-net { font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); white-space: nowrap; }
.cc-coins { display: flex; flex-wrap: wrap; gap: 8px; }
.cc-coin { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.cc-coin i { width: 10px; height: 10px; border-radius: 50%; }
.cc-coin:hover { border-color: var(--border2); }
.cc-coin.sel { border-color: var(--accent); background: var(--accent-dim); }
.cc-tabs { display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); }
.cc-tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; border: none; border-radius: 8px; background: transparent; color: var(--muted); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.cc-tab.on { background: var(--accent); color: #07101E; }
.cc-qr { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 6px 0; text-align: center; font-size: 13px; color: var(--muted); }
.cc-qr img { width: 168px; height: 168px; padding: 8px; border-radius: 12px; background: #fff; }
.cc-addr { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); }
.cc-addr code { flex: 1; min-width: 0; font-size: 12.5px; color: var(--text); word-break: break-all; font-family: ui-monospace, Menlo, monospace; }
.cc-copy { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; border-radius: 8px; border: none; background: var(--accent-dim); color: var(--accent); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
.cc-warn { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.22); color: #f59e0b; font-size: 12.5px; line-height: 1.5; }
.cc-warn svg { flex-shrink: 0; margin-top: 1px; }
.cc-input { width: 100%; height: 42px; padding: 0 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; outline: none; }
.cc-input:focus { border-color: var(--accent); }
.cc-drop { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 14px; border-radius: 10px; border: 1px dashed var(--border2); background: var(--surface2); color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }
.cc-drop:hover { border-color: var(--accent); color: var(--text); }
.cc-file { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); font-size: 13px; }
.cc-file img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
.cc-file span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-file button { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; }
.cc-err { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: rgba(255,100,112,.08); border: 1px solid rgba(255,100,112,.25); color: var(--red, #FF6470); font-size: 13px; }
.cc-actions { display: flex; gap: 10px; }
.cc-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; border-radius: 12px; border: 1px solid transparent; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.cc-btn-accent { background: var(--accent); color: #07101E; }
.cc-btn-accent:disabled { opacity: .45; cursor: not-allowed; }
.cc-btn-ghost { flex: 0 0 auto; padding: 0 18px; background: transparent; border-color: var(--border2); color: var(--text); }
.cc-secure { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: var(--faint); }
.cc-spin { animation: ccSpin .8s linear infinite; }
@keyframes ccSpin { to { transform: rotate(360deg); } }
`;

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * props
 *   amount     number (USD) to pay
 *   label      what is being paid for, shown above the amount
 *   userId     signed-in user's id (proof is stored under it)
 *   context    short tag for the proof file name, e.g. "mining-<planId>"
 *   onSubmit   async ({ coin, network, address, txHash, proofPath, amount, transactionId }) => void — record the pending purchase; throw to show an error
 *   transaction optional { type, description } — also record the payment in `transactions` (pending)
 *   onBack     optional; shows a Back button
 *   submitLabel optional button text
 */
const newId = () => (window.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));

export default function CryptoCheckout({ amount, label, userId, context = 'payment', onSubmit, onBack, submitLabel = "I've sent the payment", transaction }) {
  const { coins, error: loadErr } = useCryptoWallets();
  const [coinId, setCoinId] = useState(null);
  const [view, setView] = useState('qr');
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const coin = useMemo(() => (coins || []).find(c => c.id === coinId) || (coins || [])[0] || null, [coins, coinId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!PROOF_TYPES.includes(f.type)) { setErr('Only JPG or PNG images are accepted as payment proof.'); return; }
    if (f.size > MAX_PROOF_MB * 1024 * 1024) { setErr(`Payment proof must be smaller than ${MAX_PROOF_MB}MB.`); return; }
    setErr(''); setFile(f); setPreview(URL.createObjectURL(f));
  };
  const copy = () => {
    navigator.clipboard?.writeText(coin.address).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const submit = async () => {
    if (!coin || !file || busy) return;
    setBusy(true); setErr('');
    try {
      const proofPath = await uploadPaymentProof(file, userId, context);
      const transactionId = transaction ? newId() : null;
      const hash = txHash.trim() || null;
      // 1. the purchase itself (pending) — the page decides what that is
      await onSubmit({ coin: coin.symbol, network: coin.network, address: coin.address, txHash: hash, proofPath, amount: Number(amount), transactionId });
      // 2. the payment, in transactions, exactly like the Marketplace checkout
      if (transaction) {
        const { error: txErr } = await supabase.from('transactions').insert({
          id:          transactionId,
          user_id:     userId,
          type:        transaction.type,
          amount:      -Number(amount),
          fee:         0,
          net_amount:  -Number(amount),
          currency:    'USD',
          description: `${transaction.description} — paid in ${coin.symbol}${coin.network ? ` (${coin.network})` : ''}, awaiting confirmation`,
          status:      'pending',
          reference:   hash,
          proof_url:   proofPath,
        });
        // The purchase is already filed with its proof, so don't fail the checkout over this
        if (txErr) console.warn('Payment saved on the purchase, but not in transactions:', txErr.message);
      }
    } catch (e) {
      setErr(e?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="cc">
      <style>{CSS}</style>

      <div className="cc-amount">
        <div><span>{label}</span><strong>{usd(amount)}</strong></div>
        {coin?.network && <span className="cc-net">{coin.network}</span>}
      </div>

      {coins === null ? (
        <div className="cc-secure"><Loader2 size={16} className="cc-spin" />Loading payment options…</div>
      ) : !coins.length ? (
        <div className="cc-err"><AlertCircle size={16} />{loadErr || 'Crypto payments aren’t set up yet. Please contact support.'}</div>
      ) : (
        <>
          <div>
            <div className="cc-lbl">Pay with</div>
            <div className="cc-coins" role="radiogroup" aria-label="Coin">
              {coins.map(c => (
                <button key={c.id} type="button" role="radio" aria-checked={coin?.id === c.id} className={`cc-coin${coin?.id === c.id ? ' sel' : ''}`} onClick={() => setCoinId(c.id)}>
                  <i style={{ background: c.color }} />{c.symbol}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="cc-tabs">
              <button type="button" className={`cc-tab${view === 'qr' ? ' on' : ''}`} onClick={() => setView('qr')}><QrCode size={15} />Scan QR</button>
              <button type="button" className={`cc-tab${view === 'address' ? ' on' : ''}`} onClick={() => setView('address')}><Copy size={15} />Copy address</button>
            </div>
          </div>

          {view === 'qr' ? (
            <div className="cc-qr">
              <img alt={`QR code for the ${coin.symbol} address`} src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(coin.address)}`} onError={() => setView('address')} />
              <div>Scan with your wallet app · <strong style={{ color: 'var(--text)' }}>{coin.name} ({coin.symbol})</strong></div>
            </div>
          ) : (
            <div>
              <div className="cc-lbl">{coin.name} ({coin.symbol}) address</div>
              <div className="cc-addr">
                <code>{coin.address}</code>
                <button type="button" className="cc-copy" onClick={copy}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy</>}</button>
              </div>
            </div>
          )}

          <div className="cc-warn"><AlertTriangle size={16} /><span>Send only <strong>{coin.symbol}</strong>{coin.network ? <> on the <strong>{coin.network}</strong> network</> : ''}, worth <strong>{usd(amount)}</strong>. Sending another coin or network can lose the funds for good.</span></div>

          <div>
            <div className="cc-lbl">Transaction hash <em>(optional — paste after sending)</em></div>
            <input className="cc-input" placeholder="e.g. 0xabc123… or txid" value={txHash} onChange={e => setTxHash(e.target.value)} />
          </div>

          <div>
            <div className="cc-lbl">Payment screenshot <em style={{ color: 'var(--red, #FF6470)' }}>(required)</em></div>
            {!file ? (
              <button type="button" className="cc-drop" onClick={() => inputRef.current?.click()}>
                <Upload size={18} />Upload a screenshot of your payment (JPG or PNG, up to {MAX_PROOF_MB}MB)
              </button>
            ) : (
              <div className="cc-file">
                {preview && <img src={preview} alt="Payment proof preview" />}
                <span>{file.name}</span>
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} aria-label="Remove screenshot"><X size={16} /></button>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={pick} />
          </div>
        </>
      )}

      {err && <div className="cc-err"><AlertCircle size={16} style={{ flexShrink: 0 }} />{err}</div>}

      <div className="cc-actions">
        {onBack && <button type="button" className="cc-btn cc-btn-ghost" disabled={busy} onClick={onBack}>Back</button>}
        <button type="button" className="cc-btn cc-btn-accent" disabled={busy || !coin || !file} onClick={submit}>
          {busy ? <><Loader2 size={16} className="cc-spin" />Submitting…</> : <><CheckCheck size={16} />{submitLabel}</>}
        </button>
      </div>
      <div className="cc-secure"><ShieldCheck size={14} />Your purchase starts once we confirm the payment, usually within a few hours</div>
    </div>
  );
}
