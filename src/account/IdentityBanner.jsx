/**
 * IdentityBanner.jsx — "Verify your identity" card for the dashboard.
 * Shows until the user is verified:
 *   none      → prompt to start
 *   pending   → "we're checking your documents"
 *   rejected  → reason + "try again"
 * Renders nothing once verified (or while loading).
 */
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import supabase from '../supabase';
import { fetchIdentity } from './accountState';

const CSS = `
.idb { display: flex; align-items: center; gap: 16px; padding: 18px 20px; margin-bottom: 20px; border-radius: 16px;
  background: linear-gradient(100deg, var(--accent-dim, rgba(226,174,74,.14)), transparent 70%), var(--surface, #0C1A2E);
  border: 1px solid var(--accent, #E2AE4A); color: var(--text, #EEF2F7); }
.idb.wait { border-color: var(--border2, #2A3D5C); background: var(--surface, #0C1A2E); }
.idb.bad { border-color: rgba(255,100,112,.45); background: linear-gradient(100deg, rgba(255,100,112,.1), transparent 70%), var(--surface, #0C1A2E); }
.idb-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: var(--accent-dim, rgba(226,174,74,.14)); color: var(--accent, #E2AE4A); }
.idb.bad .idb-icon { background: rgba(255,100,112,.12); color: var(--red, #FF6470); }
.idb-icon svg { width: 22px; height: 22px; }
.idb-text { flex: 1; min-width: 0; }
.idb-text strong { display: block; font-size: 16px; font-weight: 600; margin-bottom: 2px; }
.idb-text span { display: block; font-size: 14px; color: var(--muted, #8A9AB2); line-height: 1.5; }
.idb-btn { display: inline-flex; align-items: center; gap: 6px; height: 42px; padding: 0 18px; border-radius: 10px; flex-shrink: 0;
  background: var(--accent, #E2AE4A); color: #07101E !important; font-size: 14.5px; font-weight: 700; text-decoration: none; white-space: nowrap; }
.idb-btn svg { width: 16px; height: 16px; }
.idb-btn.ghost { background: transparent; border: 1px solid var(--border2, #2A3D5C); color: var(--text, #EEF2F7) !important; font-weight: 600; }
@media (max-width: 640px) {
  .idb { flex-wrap: wrap; padding: 16px; }
  .idb-text { flex-basis: calc(100% - 60px); }
  .idb-btn { width: 100%; justify-content: center; }
}
`;

export default function IdentityBanner() {
  const [id, setId] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const r = await fetchIdentity(session.user.id).catch(() => null);
      if (live && r && !r.tableMissing) setId(r);
    })();
    return () => { live = false; };
  }, []);

  if (!id || id.state === 'verified') return null;

  const v = {
    none: {
      cls: '', Icon: ShieldCheck,
      title: 'Verify your identity',
      text: 'Confirm who you are to unlock withdrawals and every feature. It takes about 3 minutes — you’ll need an ID and a selfie.',
      cta: 'Verify now',
    },
    pending: {
      cls: 'wait', Icon: Clock,
      title: 'We’re checking your identity',
      text: 'Your documents are with our team. Most checks are done within 1–2 business days — we’ll notify you.',
      cta: 'View status', ghost: true,
    },
    rejected: {
      cls: 'bad', Icon: AlertCircle,
      title: 'Identity verification needs attention',
      text: id.latest?.rejection_reason ? `We couldn’t verify your documents: ${id.latest.rejection_reason}` : 'We couldn’t verify your documents. Please submit them again.',
      cta: 'Try again',
    },
  }[id.state];

  return (
    <>
      <style>{CSS}</style>
      <section className={`idb ${v.cls}`} role="status" aria-label={v.title}>
        <div className="idb-icon"><v.Icon /></div>
        <div className="idb-text"><strong>{v.title}</strong><span>{v.text}</span></div>
        <a href="/verify-identity" className={`idb-btn${v.ghost ? ' ghost' : ''}`}>{v.cta}<ChevronRight /></a>
      </section>
    </>
  );
}
