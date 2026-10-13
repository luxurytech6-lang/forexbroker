/**
 * ProfileExtras.jsx — two cards for the profile page:
 *   <ConnectionCard />  the user's connection key and its status
 *                       (Not connected → Pending → Connected)
 *   <ReferralCard />    the user's referral link and who joined through it
 * Data: my_connection_referral() / request_connection() in
 * database/14_connection_referral_schema.sql.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Plug, Copy, Check, Gift, Share2, Clock, CircleCheck, CircleDashed, Loader2, Users } from 'lucide-react';
import supabase from '../supabase';

const CSS = `
.px-key { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); }
.px-key code { flex: 1; min-width: 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; letter-spacing: .06em; color: var(--text); overflow-wrap: anywhere; }
.px-copy { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border-radius: 8px; border: none; flex-shrink: 0;
  background: var(--accent-dim); color: var(--accent); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.px-status { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.px-status svg { width: 14px; height: 14px; }
.px-status.connected { background: var(--green-dim, rgba(52,211,153,.12)); color: var(--green, #34d399); }
.px-status.pending { background: var(--amber-dim, rgba(245,158,11,.12)); color: var(--amber, #f59e0b); }
.px-status.not_connected { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }
.px-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.px-label { font-size: 12px; font-weight: 600; color: var(--muted); }
.px-note { font-size: 12.5px; line-height: 1.55; color: var(--muted); margin-top: 10px; }
.px-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; margin-top: 12px; border-radius: 10px;
  border: 1px solid var(--border2); background: transparent; color: var(--text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%; }
.px-btn.primary { background: var(--accent); border-color: var(--accent); color: #07101E; }
.px-btn:disabled { opacity: .55; cursor: not-allowed; }
.px-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.px-stat { padding: 10px 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); }
.px-stat span { display: block; font-size: 11px; color: var(--muted); font-weight: 600; }
.px-stat strong { font-size: 18px; font-weight: 700; }
.px-refs { margin-top: 12px; display: grid; gap: 6px; }
.px-ref { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.px-ref:last-child { border-bottom: none; }
.px-ref small { color: var(--muted); font-size: 12px; }
.px-err { font-size: 12.5px; color: var(--red, #FF6470); margin-top: 8px; }
.px-spin { animation: pxSpin .8s linear infinite; }
@keyframes pxSpin { to { transform: rotate(360deg); } }
`;

const STATUS = {
  connected:     { label: 'Connected',     Icon: CircleCheck },
  pending:       { label: 'Pending',       Icon: Clock },
  not_connected: { label: 'Not connected', Icon: CircleDashed },
};
const fmtDay = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/* One request shared by both cards */
let req = null;
const load = (force) => {
  if (!req || force) req = supabase.rpc('my_connection_referral').then(({ data, error }) => (error ? { error } : { data: data || {} }));
  return req;
};
function useExtras() {
  const [state, setState] = useState(null);
  const reload = useCallback((force) => load(force).then(setState), []);
  useEffect(() => { reload(false); }, [reload]);
  return [state, reload];
}

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (__) { /* ignore */ } t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  return <button type="button" className="px-copy" onClick={copy}>{done ? <><Check size={13} />Copied</> : <><Copy size={13} />{label}</>}</button>;
}

export function ConnectionCard() {
  const [st, reload] = useExtras();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const d = st?.data;
  if (st?.error) return null;                       // schema not installed yet → hide quietly
  const status = d?.connection_status || 'not_connected';
  const S = STATUS[status] || STATUS.not_connected;

  const request = async () => {
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('request_connection');
    if (error) setErr(error.message); else await reload(true);
    setBusy(false);
  };

  return (
    <div className="pf-card" data-testid="connection-card">
      <style>{CSS}</style>
      <div className="pf-card-head">
        <div className="pf-card-title"><Plug size={16} />Connection</div>
        {d && <span className={`px-status ${status}`}><S.Icon />{S.label}</span>}
      </div>
      <div className="pf-card-body">
        {!d ? <div className="px-note"><Loader2 size={14} className="px-spin" /> Loading…</div> : (
          <>
            <div className="px-label" style={{ marginBottom: 6 }}>Your connection key</div>
            <div className="px-key"><code>{d.connection_key}</code><CopyButton text={d.connection_key} /></div>
            <div className="px-note">
              {status === 'connected' && <>Your account was connected on <strong>{fmtDay(d.connected_at)}</strong>.</>}
              {status === 'pending' && <>Connection requested on <strong>{fmtDay(d.connection_requested_at)}</strong>. Our team will connect your account with this key — no need to do anything else.</>}
              {status === 'not_connected' && <>Share this key with our team, or tap below to request a connection. Your status changes to Connected once they activate it.</>}
            </div>
            {status === 'not_connected' && (
              <button type="button" className="px-btn primary" disabled={busy} onClick={request}>
                {busy ? <><Loader2 size={14} className="px-spin" />Requesting…</> : <><Plug size={14} />Request connection</>}
              </button>
            )}
            {err && <div className="px-err" role="alert">{err}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export function ReferralCard() {
  const [st] = useExtras();
  const d = st?.data;
  if (st?.error) return null;
  const link = d?.referral_code ? `${window.location.origin}/signup?ref=${encodeURIComponent(d.referral_code)}` : '';
  const share = async () => {
    const payload = { title: 'Join me on Profit Gain Signals', text: 'Sign up with my link:', url: link };
    if (navigator.share) { try { await navigator.share(payload); } catch (_) { /* cancelled */ } }
    else { try { await navigator.clipboard.writeText(link); } catch (_) { /* ignore */ } }
  };
  return (
    <div className="pf-card" data-testid="referral-card">
      <style>{CSS}</style>
      <div className="pf-card-head">
        <div className="pf-card-title"><Gift size={16} />Refer a friend</div>
      </div>
      <div className="pf-card-body">
        {!d ? <div className="px-note"><Loader2 size={14} className="px-spin" /> Loading…</div> : (
          <>
            <div className="px-label" style={{ marginBottom: 6 }}>Your referral link</div>
            <div className="px-key"><code style={{ fontSize: 12.5, letterSpacing: 0 }}>{link}</code><CopyButton text={link} /></div>
            <button type="button" className="px-btn" onClick={share}><Share2 size={14} />Share link</button>
            <div className="px-stats">
              <div className="px-stat"><span>Your code</span><strong style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 16 }}>{d.referral_code}</strong></div>
              <div className="px-stat"><span>People joined</span><strong>{d.referral_count ?? 0}</strong></div>
            </div>
            {(d.referrals || []).length > 0 ? (
              <div className="px-refs">
                {d.referrals.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-ref"><span><Users size={13} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--muted)' }} />{r.name}</span><small>Joined {fmtDay(r.joined_at)}</small></div>
                ))}
              </div>
            ) : <div className="px-note">When someone signs up with your link, they'll show up here.</div>}
          </>
        )}
      </div>
    </div>
  );
}
