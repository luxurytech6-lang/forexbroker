/**
 * CryptoCheckout.jsx — the payment modal
 * ─────────────────────────────────────────────────────────────────────────────
 * Pops up when the user clicks the main action (Start copying, Invest, Buy
 * contract, Order card). It shows:
 *
 *   1. the amount the user entered
 *   2. the wallet address to send it to (with Copy)
 *   3. a place to upload the payment proof
 *   4. a "Confirm … payment" button
 *
 * On confirm the proof is uploaded to the private `payment-proofs` bucket,
 * `onSubmit(payment)` records the pending purchase, and the payment is written
 * to `transactions` as a pending row with the proof (Marketplace style).
 * Nothing is activated here — an admin checks the proof and approves it.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, Upload, X, AlertTriangle, AlertCircle, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { createPortal } from 'react-dom';
import supabase from '../supabase';

export const PAYMENT_PROOF_BUCKET = 'payment-proofs';
const MAX_PROOF_MB = 5;
const PROOF_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/** Uploads a proof screenshot and returns its storage path (the bucket is private). */
export async function uploadPaymentProof(file, userId, context = 'payment') {
  if (!file) throw new Error('Upload your payment proof first.');
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
.pm-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(3,8,18,.72); backdrop-filter: blur(4px); animation: pmFade .15s ease; }
.pm { width: 100%; max-width: 440px; max-height: calc(100vh - 32px); overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 22px; border-radius: 18px; background: var(--surface, #0E1729); border: 1px solid var(--border2, rgba(255,255,255,.12)); color: var(--text, #E8EDF5); box-shadow: 0 24px 60px rgba(0,0,0,.5); animation: pmUp .18s ease; }
.pm-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pm-head h3 { margin: 0; font-size: 17px; font-weight: 700; }
.pm-x { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border, rgba(255,255,255,.08)); background: transparent; color: var(--muted, #94A3B8); cursor: pointer; }
.pm-x:hover { color: var(--text, #fff); }
.pm-lbl { font-size: 12.5px; font-weight: 600; color: var(--muted, #94A3B8); margin-bottom: 8px; }
.pm-amount { padding: 14px 16px; border-radius: 12px; background: var(--surface2, rgba(255,255,255,.04)); border: 1px solid var(--border, rgba(255,255,255,.08)); }
.pm-amount span { display: block; font-size: 12.5px; color: var(--muted, #94A3B8); }
.pm-amount strong { display: block; margin-top: 2px; font-size: 28px; font-weight: 700; color: var(--accent, #E2AE4A); font-variant-numeric: tabular-nums; }
.pm-coins { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.pm-coin { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--border, rgba(255,255,255,.08)); background: transparent; color: var(--text, #fff); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.pm-coin i { width: 9px; height: 9px; border-radius: 50%; }
.pm-coin.sel { border-color: var(--accent, #E2AE4A); background: var(--accent-dim, rgba(226,174,74,.12)); }
.pm-addr { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: var(--surface2, rgba(255,255,255,.04)); border: 1px solid var(--border, rgba(255,255,255,.08)); }
.pm-addr code { flex: 1; min-width: 0; font-size: 12.5px; word-break: break-all; font-family: ui-monospace, Menlo, monospace; }
.pm-copy { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; border-radius: 8px; border: none; background: var(--accent-dim, rgba(226,174,74,.12)); color: var(--accent, #E2AE4A); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
.pm-warn { display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; font-size: 12px; line-height: 1.5; color: #f59e0b; }
.pm-warn svg { flex-shrink: 0; margin-top: 2px; }
.pm-drop { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 14px; border-radius: 10px; border: 1px dashed var(--border2, rgba(255,255,255,.16)); background: var(--surface2, rgba(255,255,255,.04)); color: var(--muted, #94A3B8); font: inherit; font-size: 13px; cursor: pointer; text-align: center; }
.pm-drop:hover { border-color: var(--accent, #E2AE4A); color: var(--text, #fff); }
.pm-file { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border, rgba(255,255,255,.08)); background: var(--surface2, rgba(255,255,255,.04)); font-size: 13px; }
.pm-file img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; }
.pm-file span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-file button { background: none; border: none; color: var(--muted, #94A3B8); cursor: pointer; display: flex; }
.pm-err { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: rgba(255,100,112,.08); border: 1px solid rgba(255,100,112,.25); color: var(--red, #FF6470); font-size: 13px; }
.pm-go { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 50px; border-radius: 12px; border: none; background: var(--accent, #E2AE4A); color: #07101E; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.pm-go:disabled { opacity: .45; cursor: not-allowed; }
.pm-note { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: var(--faint, #64748B); text-align: center; }
.pm-spin { animation: pmSpin .8s linear infinite; }
@keyframes pmSpin { to { transform: rotate(360deg); } }
@keyframes pmFade { from { opacity: 0; } }
@keyframes pmUp { from { opacity: 0; transform: translateY(12px); } }
@media (max-width: 560px) {
  .pm-overlay { align-items: flex-end; padding: 0; }
  .pm { max-width: none; max-height: 92vh; border-radius: 18px 18px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); }
}
`;

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const newId = () => (window.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));

/**
 * props
 *   title        modal heading, e.g. "Copy trading payment"
 *   amount       number (USD) the user entered
 *   label        what it's for, shown above the amount
 *   confirmLabel button text, e.g. "Confirm copy trading payment"
 *   userId       signed-in user's id (proof is stored under it)
 *   context      short tag for the proof file name
 *   onSubmit     async ({ coin, network, address, txHash, proofPath, amount, transactionId }) => void; throw to show an error
 *   onClose      closes the modal
 *   transaction  optional { type, description } — also record the payment in `transactions` (pending)
 */
export default function CryptoCheckout({ title = 'Payment', amount, label = 'Amount', confirmLabel = 'Confirm payment', userId, context = 'payment', onSubmit, onClose, transaction }) {
  const { coins, error: loadErr } = useCryptoWallets();
  const [coinId, setCoinId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const coin = useMemo(() => (coins || []).find(c => c.id === coinId) || (coins || [])[0] || null, [coins, coinId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Escape closes; lock page scroll while open
  useEffect(() => {
    // Capture on window so Escape closes only this modal, not the drawer underneath
    const onKey = (e) => { if (e.key !== 'Escape') return; e.stopPropagation(); if (!busy) onClose?.(); };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = prev; };
  }, [busy, onClose]);

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
      // 1. the purchase itself (pending) — the page decides what that is
      await onSubmit({ coin: coin.symbol, network: coin.network, address: coin.address, txHash: null, proofPath, amount: Number(amount), transactionId });
      // 2. the payment, in transactions, exactly like the Marketplace checkout
      if (transaction) {
        const { error: txErr } = await supabase.from('transactions').insert({
          id: transactionId, user_id: userId, type: transaction.type,
          amount: -Number(amount), fee: 0, net_amount: -Number(amount), currency: 'USD',
          description: `${transaction.description} — paid in ${coin.symbol}${coin.network ? ` (${coin.network})` : ''}, awaiting confirmation`,
          status: 'pending', reference: null, proof_url: proofPath,
        });
        if (txErr) console.warn('Payment saved on the purchase, but not in transactions:', txErr.message);
      }
    } catch (e) {
      setErr(e?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  // Portal to <body> so a transformed parent (drawer, modal) can't trap the fixed overlay
  return createPortal(
    <div className="pm-overlay" onClick={e => e.stopPropagation()} onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
      <style>{CSS}</style>
      <div className="pm" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pm-head">
          <h3>{title}</h3>
          <button type="button" className="pm-x" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="pm-amount"><span>{label}</span><strong>{usd(amount)}</strong></div>

        {coins === null ? (
          <div className="pm-note"><Loader2 size={16} className="pm-spin" />Loading wallet address…</div>
        ) : !coins.length ? (
          <div className="pm-err"><AlertCircle size={16} style={{ flexShrink: 0 }} />{loadErr || 'Crypto payments aren’t set up yet. Please contact support.'}</div>
        ) : (
          <>
            <div>
              <div className="pm-lbl">Send {usd(amount)} to this wallet address</div>
              {coins.length > 1 && (
                <div className="pm-coins" role="radiogroup" aria-label="Coin">
                  {coins.map(c => (
                    <button key={c.id} type="button" role="radio" aria-checked={coin?.id === c.id} className={`pm-coin${coin?.id === c.id ? ' sel' : ''}`} onClick={() => setCoinId(c.id)}>
                      <i style={{ background: c.color }} />{c.symbol}
                    </button>
                  ))}
                </div>
              )}
              <div className="pm-addr">
                <Wallet size={16} style={{ flexShrink: 0, color: 'var(--muted, #94A3B8)' }} />
                <code>{coin.address}</code>
                <button type="button" className="pm-copy" onClick={copy}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy</>}</button>
              </div>
              <div className="pm-warn"><AlertTriangle size={14} /><span>{coin.name} ({coin.symbol}){coin.network ? ` · ${coin.network} network` : ''}. Send only this coin on this network.</span></div>
            </div>

            <div>
              <div className="pm-lbl">Upload payment proof</div>
              {!file ? (
                <button type="button" className="pm-drop" onClick={() => inputRef.current?.click()}>
                  <Upload size={18} />Tap to upload a screenshot of your payment<br />JPG or PNG, up to {MAX_PROOF_MB}MB
                </button>
              ) : (
                <div className="pm-file">
                  {preview && <img src={preview} alt="Payment proof preview" />}
                  <span>{file.name}</span>
                  <button type="button" disabled={busy} onClick={() => { setFile(null); setPreview(null); }} aria-label="Remove proof"><X size={16} /></button>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={pick} />
            </div>
          </>
        )}

        {err && <div className="pm-err"><AlertCircle size={16} style={{ flexShrink: 0 }} />{err}</div>}

        <button type="button" className="pm-go" disabled={busy || !coin || !file} onClick={submit}>
          {busy ? <><Loader2 size={16} className="pm-spin" />Confirming…</> : confirmLabel}
        </button>
        <div className="pm-note"><ShieldCheck size={14} />Starts once we confirm your payment, usually within a few hours</div>
      </div>
    </div>,
    document.body
  );
}
