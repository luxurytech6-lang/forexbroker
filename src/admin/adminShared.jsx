/**
 * adminShared.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything the admin pages share: the visual system, the admin check,
 * data hooks, wallet + notification helpers, and UI building blocks
 * (tables, modals, forms, a generic create/edit/delete table).
 *
 * Security: the checks in this file only decide what the UI shows. What an
 * admin can actually read and change is enforced by Row Level Security —
 * run admin_schema.sql so the `is_admin()` policies exist.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { X, Search, Plus, Pencil, Trash2, RefreshCw, Image as ImageIcon, AlertTriangle, Loader2 } from 'lucide-react';
import supabase from '../supabase';

export { supabase };

/* ─── Settings ────────────────────────────────────────────────────────────── */
export const PAYMENT_PROOF_BUCKET = 'payment-proofs';
/* Set to true if your paymentService debits the wallet as soon as a user
   requests a withdrawal. Then approving only marks it complete, and rejecting
   refunds the amount. With false (default) the wallet is debited on approval. */
export const WITHDRAWALS_DEBIT_ON_REQUEST = false;

/* ─── Visual system ───────────────────────────────────────────────────────── */
export const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
:root {
  --bg:#07101E; --surface:#0C1A2E; --surface2:#112238; --border:#1C2C45; --border2:#2A3D5C;
  --text:#EEF2F7; --muted:#8A9AB2; --faint:#56677F;
  --accent:#E2AE4A; --accent-dim:rgba(226,174,74,.14); --accent-glow:rgba(226,174,74,.07);
  --green:#2FD394; --green-dim:rgba(47,211,148,.12); --red:#FF6470; --red-dim:rgba(255,100,112,.12);
  --blue:#5B8CFF; --blue-dim:rgba(91,140,255,.14); --purple:#B49BFF;
  --sidebar-w:248px; --topbar-h:64px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--bg); color: var(--text); font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 14.5px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button, input, select, textarea { font-family: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.num, .ad-table td { font-variant-numeric: tabular-nums; }
.up { color: var(--green); } .down { color: var(--red); }

/* Shell */
.ad-shell { display: grid; grid-template-columns: var(--sidebar-w) minmax(0,1fr); min-height: 100vh; }
.ad-side { position: sticky; top: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column; background: var(--surface); border-right: 1px solid var(--border); z-index: 200; }
.ad-brand { height: var(--topbar-h); display: flex; align-items: center; gap: 10px; padding: 0 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.ad-brand-mark { font-family: 'Instrument Serif', Georgia, serif; font-size: 23px; line-height: 1; white-space: nowrap; }
.ad-brand-mark b { font-weight: 400; color: var(--accent); }
.ad-brand-tag { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); }
.ad-nav { flex: 1; overflow-y: auto; padding: 8px 12px 16px; scrollbar-width: thin; }
.ad-nav-h { font-size: 12px; font-weight: 600; color: var(--faint); padding: 14px 12px 6px; }
.ad-link { position: relative; display: flex; align-items: center; gap: 11px; width: 100%; padding: 8px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--muted); background: none; border: none; cursor: pointer; text-align: left; }
.ad-link svg { width: 17px; height: 17px; flex-shrink: 0; }
.ad-link:hover { background: var(--surface2); color: var(--text); }
.ad-link.active { background: var(--surface2); color: var(--text); font-weight: 600; }
.ad-link.active::before { content: ''; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent); }
.ad-link.active svg { color: var(--accent); }
.ad-count { margin-left: auto; min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--accent); color: #07101E; font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.ad-side-foot { padding: 14px 18px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.ad-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; background: linear-gradient(145deg, #1C3A6E, #07101E); color: var(--accent); border: 1px solid var(--border2); flex-shrink: 0; }
.ad-who { min-width: 0; flex: 1; }
.ad-who strong { display: block; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ad-who span { font-size: 12px; color: var(--muted); }
.ad-right { min-width: 0; display: flex; flex-direction: column; }
.ad-top { position: sticky; top: 0; z-index: 100; height: var(--topbar-h); display: flex; align-items: center; gap: 10px; padding: 0 28px; background: rgba(7,16,30,.85); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
.ad-crumb { font-size: 15px; font-weight: 600; }
.ad-crumb span { color: var(--muted); font-weight: 500; }
.ad-burger { display: none; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: none; cursor: pointer; align-items: center; justify-content: center; }
.ad-backdrop { display: none; }
.ad-main { padding: 28px 28px 64px; max-width: 1500px; width: 100%; margin: 0 auto; }

/* Page header */
.ad-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.ad-title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(30px,3vw,42px); line-height: 1.05; letter-spacing: -.01em; }
.ad-sub { color: var(--muted); margin-top: 6px; max-width: 46em; font-size: 15px; }
.ad-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* Buttons */
.ad-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; padding: 0 15px; border-radius: 10px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: filter .15s, background .15s, border-color .15s; }
.ad-btn svg { width: 15px; height: 15px; }
.ad-btn:disabled { opacity: .5; cursor: not-allowed; }
.ad-btn-accent { background: var(--accent); color: #07101E; }
.ad-btn-accent:hover:not(:disabled) { filter: brightness(1.07); }
.ad-btn-ghost { background: transparent; border-color: var(--border2); }
.ad-btn-ghost:hover:not(:disabled) { background: var(--surface2); }
.ad-btn-ok { background: var(--green-dim); color: var(--green); border-color: rgba(47,211,148,.3); }
.ad-btn-no { background: var(--red-dim); color: var(--red); border-color: rgba(255,100,112,.3); }
.ad-btn-sm { height: 30px; padding: 0 10px; font-size: 13px; border-radius: 8px; }
.ad-icon-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: none; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.ad-icon-btn:hover { color: var(--text); border-color: var(--border2); background: var(--surface2); }
.ad-icon-btn.danger:hover { color: var(--red); }
.ad-icon-btn svg { width: 15px; height: 15px; }

/* Cards, stats */
.ad-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; }
.ad-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; margin-bottom: 22px; }
.ad-stat { padding: 16px 18px; display: block; transition: border-color .15s; }
a.ad-stat:hover { border-color: var(--border2); }
.ad-stat-lbl { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
.ad-stat-lbl svg { width: 15px; height: 15px; color: var(--faint); }
.ad-stat-val { font-size: 25px; font-weight: 600; margin-top: 6px; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.ad-stat-sub { font-size: 12.5px; color: var(--muted); }
.ad-stat.alert .ad-stat-val { color: var(--accent); }

/* Toolbar + tabs */
.ad-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.ad-tabs { display: inline-flex; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); flex-wrap: wrap; margin-bottom: 16px; }
.ad-tab { height: 32px; padding: 0 13px; border-radius: 9px; font-size: 13.5px; font-weight: 600; color: var(--muted); background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
.ad-tab.active { background: var(--accent); color: #07101E; }
.ad-tab b { font-size: 11.5px; padding: 0 6px; border-radius: 999px; background: rgba(0,0,0,.14); }
.ad-search { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 11px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); color: var(--muted); min-width: 240px; }
.ad-search:focus-within { border-color: var(--accent); }
.ad-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; font-size: 14px; }
.ad-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.ad-chip { height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border); background: none; color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer; text-transform: capitalize; }
.ad-chip.active { background: var(--accent-dim); border-color: var(--accent); color: var(--text); }

/* Tables */
.ad-table-wrap { overflow-x: auto; }
.ad-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.ad-table th { text-align: left; font-size: 12px; font-weight: 600; color: var(--faint); padding: 12px 14px 9px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.ad-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; vertical-align: middle; }
.ad-table th:last-child, .ad-table td:last-child { position: sticky; right: 0; background: var(--surface); }
.ad-table td:last-child:has(.ad-row-actions:not(:empty)) { box-shadow: -14px 0 14px -14px rgba(0,0,0,.6); }
.ad-table tr:last-child td { border-bottom: none; }
.ad-table tbody tr.click { cursor: pointer; }
.ad-table tbody tr:hover td { background: var(--surface2); }
.ad-table .r { text-align: right; }
.ad-table .wrap { white-space: normal; min-width: 150px; max-width: 320px; }
.ad-row-actions { display: flex; gap: 6px; justify-content: flex-end; }
.ad-user { display: flex; flex-direction: column; line-height: 1.3; }
.ad-user small { color: var(--muted); font-size: 12.5px; }
.ad-mono { font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 12.5px; color: var(--muted); }
.ad-pager { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); }
.ad-empty { padding: 44px 20px; text-align: center; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ad-empty strong { color: var(--text); font-size: 15.5px; }
.ad-warn { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border-radius: 12px; background: var(--accent-glow); border: 1px solid var(--accent-dim); font-size: 13.5px; color: var(--muted); margin: 14px 16px; }
.ad-warn svg { color: var(--accent); flex-shrink: 0; margin-top: 1px; width: 17px; height: 17px; }
.ad-warn strong { color: var(--text); }
.ad-warn code { font-size: 12.5px; color: var(--text); }

/* Pills */
.ad-pill { display: inline-flex; align-items: center; gap: 6px; height: 23px; padding: 0 9px; border-radius: 7px; font-size: 12px; font-weight: 700; text-transform: capitalize; background: var(--surface2); color: var(--muted); }
.ad-pill.ok { background: var(--green-dim); color: var(--green); }
.ad-pill.warn { background: var(--accent-dim); color: var(--accent); }
.ad-pill.bad { background: var(--red-dim); color: var(--red); }
.ad-pill.info { background: var(--blue-dim); color: var(--blue); }

/* Modal + drawer */
.ad-overlay { position: fixed; inset: 0; z-index: 600; background: rgba(3,8,16,.66); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: adFade .18s ease both; }
.ad-modal { width: min(560px, 100%); max-height: calc(100vh - 40px); display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8); animation: adRise .25s cubic-bezier(.22,1,.36,1) both; }
.ad-modal.wide { width: min(860px, 100%); }
.ad-modal-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.ad-modal-head h2 { font-size: 17px; font-weight: 600; }
.ad-modal-head p { font-size: 13px; color: var(--muted); }
.ad-modal-head .ad-icon-btn { margin-left: auto; }
.ad-modal-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.ad-modal-foot { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

/* Forms */
.ad-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ad-field { display: flex; flex-direction: column; gap: 6px; }
.ad-field.full { grid-column: 1 / -1; }
.ad-field > span { font-size: 13px; font-weight: 600; color: var(--muted); }
.ad-field small { font-size: 12px; color: var(--faint); }
.ad-input, .ad-select, .ad-textarea { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); font-size: 14px; outline: none; }
.ad-textarea { height: auto; min-height: 96px; padding: 10px 12px; resize: vertical; line-height: 1.5; }
.ad-textarea.code { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; }
.ad-input:focus, .ad-select:focus, .ad-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.ad-check { display: inline-flex; align-items: center; gap: 9px; font-size: 14px; cursor: pointer; height: 40px; }
.ad-check input { width: 17px; height: 17px; accent-color: #E2AE4A; }
.ad-err { color: var(--red); font-size: 13.5px; }
.ad-kv { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.ad-kv div { background: var(--surface); padding: 10px 12px; min-width: 0; }
.ad-kv > div:last-child:nth-child(odd) { grid-column: 1 / -1; }
.ad-kv span { display: block; font-size: 12px; color: var(--muted); }
.ad-kv strong { font-size: 14px; font-weight: 600; word-break: break-word; }
.ad-proof-img { width: 100%; max-height: 70vh; object-fit: contain; border-radius: 12px; background: var(--bg); }

/* Toast */
.ad-toasts { position: fixed; right: 20px; bottom: 20px; z-index: 900; display: flex; flex-direction: column; gap: 8px; }
.ad-toast { min-width: 260px; max-width: 380px; padding: 12px 14px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border2); box-shadow: 0 20px 40px -16px rgba(0,0,0,.6); font-size: 14px; animation: adRise .25s cubic-bezier(.22,1,.36,1) both; }
.ad-toast.ok { border-color: rgba(47,211,148,.45); }
.ad-toast.bad { border-color: rgba(255,100,112,.5); }

.ad-spin { animation: adSpin .8s linear infinite; }
.ad-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--muted); }
@keyframes adSpin { to { transform: rotate(360deg); } }
@keyframes adFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes adRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

@media (max-width: 1200px) { .ad-stats { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 960px) {
  .ad-shell { grid-template-columns: 1fr; }
  .ad-side { position: fixed; inset: 0 auto 0 0; width: var(--sidebar-w); transform: translateX(-100%); transition: transform .3s cubic-bezier(.22,1,.36,1); }
  .ad-side.open { transform: none; box-shadow: 30px 0 60px rgba(0,0,0,.45); }
  .ad-backdrop { display: block; position: fixed; inset: 0; z-index: 150; background: rgba(3,8,16,.55); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .ad-backdrop.open { opacity: 1; pointer-events: auto; }
  .ad-burger { display: inline-flex; }
  .ad-top { padding: 0 16px; }
}
@media (max-width: 640px) {
  .ad-main { padding: 20px 16px 48px; }
  .ad-top .ad-btn span, .ad-crumb span { display: none; }
  .ad-top .ad-btn { width: 36px; padding: 0; }
  .ad-stats { gap: 10px; }
  .ad-stat-val { font-size: 20px; }
  .ad-form, .ad-kv { grid-template-columns: 1fr; }
  .ad-search { min-width: 0; flex: 1; }
  .ad-overlay { padding: 0; align-items: flex-end; }
  .ad-modal, .ad-modal.wide { width: 100%; max-height: 92vh; border-radius: 18px 18px 0 0; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
`;

/* ─── Formatting ──────────────────────────────────────────────────────────── */
export const usd = (n, d = 2) => {
  const v = Number(n || 0);
  return `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })}`;
};
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
export const userName = (u) => u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'User') : 'Unknown user';
export const initials = (u) => u ? ((`${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`).toUpperCase() || u.email?.[0]?.toUpperCase() || 'A') : 'A';
export const prettyKey = (k) => String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bPct\b/, '%').replace(/\bUrl\b/, 'URL').replace(/\bId\b/, 'ID');

/* ─── Error shapes ────────────────────────────────────────────────────────── */
export const isMissingTable = (e) => !!e && (e.code === '42P01' || e.code === 'PGRST205' || /relation .* does not exist|could not find the table/i.test(e.message || ''));
export const isMissingFn    = (e) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /function .* does not exist|could not find the function/i.test(e.message || ''));

/* ─── Admin check ─────────────────────────────────────────────────────────── */
/* An admin is a Supabase Auth account whose email has an active row in the
   `admins` table. (admins.password_hash isn't used: sign-in goes through
   Supabase Auth, so passwords are never handled by this app.) */
export async function getAdminRow(email) {
  if (!email) return null;
  const { data } = await supabase.from('admins').select('id,email,full_name,is_active,last_login').ilike('email', email).maybeSingle();
  return data && data.is_active ? data : null;
}
export async function checkIsAdmin(email) {
  const { data, error } = await supabase.rpc('is_admin');
  if (!error) return data === true;
  // is_admin() not installed yet: fall back to reading the admins table
  return !!(await getAdminRow(email));
}

/* Admin actions are written to admin_audit_log (admin_id → admins.id) */
let adminIdReq = null;
const currentAdminId = () => {
  if (!adminIdReq) {
    adminIdReq = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return (await getAdminRow(session?.user?.email))?.id || null;
    })().catch(() => null);
  }
  return adminIdReq;
};
/** Records an admin action. Never throws, so logging can't block the action itself. */
export async function audit(action, targetTable, targetId, oldValue = null, newValue = null) {
  try {
    const adminId = await currentAdminId();
    if (!adminId) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId, action, target_table: targetTable, target_id: String(targetId ?? ''),
      old_value: oldValue, new_value: newValue,
    });
  } catch (_) { /* ignore */ }
}

/** Guards an admin page: redirects to /admin/login unless the session belongs to an admin. */
export function useAdminGuard() {
  const [state, setState] = useState({ loading: true, session: null, profile: null });
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace('/admin/login'); return; }
      const ok = await checkIsAdmin(session.user.email).catch(() => false);
      if (!ok) { await supabase.auth.signOut(); window.location.replace('/admin/login?denied=1'); return; }
      const row = await getAdminRow(session.user.email);
      const [first_name, ...rest] = String(row?.full_name || '').split(' ');
      const profile = { first_name, last_name: rest.join(' '), email: session.user.email };
      if (live) setState({ loading: false, session, profile });
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') window.location.replace('/admin/login'); });
    return () => { live = false; sub?.subscription?.unsubscribe?.(); };
  }, []);
  return state;
}

export const adminLogout = async () => { try { await supabase.auth.signOut(); } catch (_) {} window.location.href = '/admin/login'; };

/* ─── Data hooks ──────────────────────────────────────────────────────────── */
/**
 * Loads rows from a table. `build(query)` can add filters.
 * Returns { rows, loading, error, missing, reload }.
 */
export function useRows(table, { select = '*', order = 'created_at', asc = false, limit = 1000, build, deps = [] } = {}) {
  const [state, setState] = useState({ rows: [], loading: true, error: null, missing: false });
  const [tick, setTick] = useState(0);
  const buildRef = useRef(build); buildRef.current = build;
  useEffect(() => {
    let live = true;
    setState(s => ({ ...s, loading: true }));
    (async () => {
      let q = supabase.from(table).select(select);
      if (buildRef.current) q = buildRef.current(q);
      if (order) q = q.order(order, { ascending: asc });
      if (limit) q = q.limit(limit);
      let { data, error } = await q;
      // Table exists but lacks the sort column: retry unordered
      if (error && order && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
        let q2 = supabase.from(table).select(select);
        if (buildRef.current) q2 = buildRef.current(q2);
        ({ data, error } = await q2.limit(limit));
      }
      if (!live) return;
      setState({ rows: data || [], loading: false, error: error && !isMissingTable(error) ? error : null, missing: isMissingTable(error) });
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, order, asc, limit, tick, ...deps]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { ...state, reload };
}

/* Users are looked up a lot (to show names next to records), so load them once */
let usersReq = null;
export function loadUsers(force = false) {
  if (!usersReq || force) {
    usersReq = supabase.from('users').select('*').limit(10000)
      .then(({ data }) => { const m = {}; (data || []).forEach(u => { m[u.id] = u; }); return m; })
      .catch(() => ({}));
  }
  return usersReq;
}
export function useUsers() {
  const [map, setMap] = useState({});
  useEffect(() => { let live = true; loadUsers().then(m => live && setMap(m)); return () => { live = false; }; }, []);
  return map;
}

/* ─── Wallet + notification helpers ───────────────────────────────────────── */
/**
 * Adds `delta` (negative to debit) to a user's wallet and writes a matching
 * transaction. Uses the atomic admin_wallet_adjust() RPC when installed.
 */
export async function walletAdjust(userId, delta, { type = 'adjustment', description = 'Balance adjustment by admin', currency = 'USD', record = true } = {}) {
  const amt = Number(delta);
  if (!userId || !amt) return;
  const { error } = await supabase.rpc('admin_wallet_adjust', {
    p_user_id: userId, p_amount: amt, p_currency: currency, p_type: type, p_description: description, p_record: record,
  });
  if (!error) { audit('wallet_adjust', 'wallets', userId, null, { amount: amt, currency, type, description }); return; }
  if (!isMissingFn(error)) throw error;

  // Fallback without the RPC (not atomic)
  const { data: w, error: wErr } = await supabase.from('wallets').select('balance').eq('user_id', userId).eq('currency', currency).maybeSingle();
  if (wErr) throw wErr;
  const next = Number(w?.balance || 0) + amt;
  if (next < 0) throw new Error(`Not enough balance: the wallet holds ${usd(w?.balance || 0)}.`);
  const { error: upErr } = w
    ? await supabase.from('wallets').update({ balance: next, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('currency', currency)
    : await supabase.from('wallets').insert({ user_id: userId, currency, balance: next });
  if (upErr) throw upErr;
  if (record) {
    await supabase.from('transactions').insert({ user_id: userId, type, amount: amt, fee: 0, net_amount: amt, currency, status: 'completed', description });
  }
  audit('wallet_adjust', 'wallets', userId, { balance: Number(w?.balance || 0) }, { balance: next, amount: amt, type, description });
}

/** Sends an in-app notification (shows on /notification). Never throws. */
export async function notify(userIds, { title, description = '', category = 'system', action_url = null, icon_class = 'ti-bell' }) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (!ids.length) return { error: null };
  const rows = ids.map(user_id => ({ user_id, title, description, category, action_url, icon_class, is_read: false, is_dismissed: false }));
  try {
    let error = null;
    for (let i = 0; i < rows.length; i += 500) {
      ({ error } = await supabase.from('notifications').insert(rows.slice(i, i + 500)));
      if (error) break;
    }
    return { error };
  } catch (error) { return { error }; }
}

/* ─── Toasts ──────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems(a => [...a, { id, msg, kind }]);
    setTimeout(() => setItems(a => a.filter(t => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite">
        {items.map(t => <div key={t.id} className={`ad-toast ${t.kind}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Wraps an async action with busy state + toast feedback. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const run = useCallback(async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); if (okMsg) toast(okMsg, 'ok'); return true; }
    catch (e) { toast(e?.message || 'Something went wrong.', 'bad'); return false; }
    finally { setBusy(null); }
  }, [toast]);
  return [busy, run];
}

/* ─── UI building blocks ──────────────────────────────────────────────────── */
const PILL_KIND = {
  ok:   ['active','approved','completed','complete','paid','delivered','verified','resolved','closed','success','open_ok','live','yes'],
  warn: ['pending','processing','awaiting','review','in_progress','in progress','shipped','open','waiting'],
  bad:  ['rejected','declined','failed','cancelled','canceled','blocked','refunded','expired','suspended','locked','no'],
  info: ['frozen','exited','funded','draft','paused'],
};
export function Pill({ status, children }) {
  const s = String(status ?? '').toLowerCase();
  const kind = Object.keys(PILL_KIND).find(k => PILL_KIND[k].includes(s)) || '';
  return <span className={`ad-pill ${kind}`}>{children ?? (s ? s.replace(/_/g, ' ') : '—')}</span>;
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="ad-head">
      <div><h1 className="ad-title">{title}</h1>{sub && <p className="ad-sub">{sub}</p>}</div>
      {children && <div className="ad-actions">{children}</div>}
    </div>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="ad-tabs" role="tablist">
      {items.map(t => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={`ad-tab${value === t.key ? ' active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}{t.count != null && <b>{t.count}</b>}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="ad-search"><Search size={15} /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>
  );
}

export function Chips({ value, onChange, items }) {
  return (
    <div className="ad-chips">
      {items.map(i => {
        const key = typeof i === 'string' ? i : i.key;
        const label = typeof i === 'string' ? i : i.label;
        return <button key={key} className={`ad-chip${value === key ? ' active' : ''}`} onClick={() => onChange(key)}>{label}</button>;
      })}
    </div>
  );
}

export function MissingTable({ table }) {
  return (
    <div className="ad-warn"><AlertTriangle /><span><strong>The <code>{table}</code> table doesn't exist yet.</strong> Run <code>admin_schema.sql</code> (or the page's own schema file) in the Supabase SQL editor, then refresh.</span></div>
  );
}

export function UserCell({ user, id }) {
  if (!user) return <span className="ad-mono">{id ? `${String(id).slice(0, 8)}…` : '—'}</span>;
  return <div className="ad-user"><span>{userName(user)}</span><small>{user.email}</small></div>;
}

export function Modal({ title, sub, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="ad-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`ad-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ad-modal-head">
          <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
          <button className="ad-icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="ad-modal-body">{children}</div>
        {footer && <div className="ad-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Opens a private payment-proof image with a short-lived signed URL. */
export function ProofButton({ path, label = 'Proof' }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');
  if (!path) return <span style={{ color:'var(--faint)' }}>—</span>;
  const open = async (e) => {
    e.stopPropagation();
    setErr('');
    if (/^https?:\/\//.test(path)) { setUrl(path); return; }
    const { data, error } = await supabase.storage.from(PAYMENT_PROOF_BUCKET).createSignedUrl(path, 600);
    if (error) { setErr(error.message); setUrl('error'); return; }
    setUrl(data.signedUrl);
  };
  return (
    <>
      <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={open}><ImageIcon />{label}</button>
      {url && (
        <Modal title="Payment proof" sub={path} onClose={() => setUrl(null)} wide
          footer={url !== 'error' && <a className="ad-btn ad-btn-ghost" href={url} target="_blank" rel="noreferrer">Open full size</a>}>
          {url === 'error' ? <div className="ad-err">Couldn't open the file: {err}</div> : <img className="ad-proof-img" src={url} alt="Payment proof uploaded by the user" />}
        </Modal>
      )}
    </>
  );
}

/**
 * Data table with search + pagination.
 * columns: [{ key, label, render?(row), align?, wrap?, search?(row) }]
 */
export function DataTable({ rows, columns, loading, error, missing, table, onRowClick, empty = 'Nothing here yet', toolbar, pageSize = 25, searchable = true, searchText }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [q, rows]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => (searchText ? searchText(r) : Object.values(r).map(v => (v && typeof v === 'object') ? JSON.stringify(v) : v).join(' ')).toLowerCase().includes(s));
  }, [rows, q, searchText]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);
  return (
    <div className="ad-card">
      {(searchable || toolbar) && (
        <div className="ad-toolbar">
          {searchable ? <SearchBox value={q} onChange={setQ} /> : <span />}
          {toolbar}
        </div>
      )}
      {missing ? <MissingTable table={table} /> : error ? (
        <div className="ad-warn"><AlertTriangle /><span><strong>Couldn't load this list.</strong> {error.message}</span></div>
      ) : loading ? (
        <div className="ad-empty"><Loader2 className="ad-spin" />Loading…</div>
      ) : view.length === 0 ? (
        <div className="ad-empty"><strong>{q ? 'No matches' : empty}</strong>{q && <span>Try a different search.</span>}</div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr>{columns.map(c => <th key={c.key} className={c.align === 'right' ? 'r' : ''}>{c.label}</th>)}</tr></thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={r.id ?? r.user_id ?? i} className={onRowClick ? 'click' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {columns.map(c => (
                    <td key={c.key} className={[c.align === 'right' ? 'r' : '', c.wrap ? 'wrap' : ''].join(' ')}>
                      {c.render ? c.render(r) : fmtCell(r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !missing && filtered.length > pageSize && (
        <div className="ad-pager">
          <span>{page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} of {filtered.length}</span>
          <div style={{ display:'flex', gap:8 }}>
            <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function fmtCell(v) {
  if (v === null || v === undefined || v === '') return <span style={{ color:'var(--faint)' }}>—</span>;
  if (typeof v === 'boolean') return <Pill status={v ? 'yes' : 'no'}>{v ? 'Yes' : 'No'}</Pill>;
  if (typeof v === 'object') return <span className="ad-mono">{JSON.stringify(v).slice(0, 60)}</span>;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmtDateTime(v);
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

/* ─── Forms ───────────────────────────────────────────────────────────────── */
/**
 * field: { key, label?, type: text|number|bool|select|textarea|json|list|date|datetime, options?, required?, help?, full?, default? }
 * `list` edits a Postgres text[] as comma-separated text.
 */
export function FieldInput({ f, value, onChange }) {
  const label = f.label || prettyKey(f.key);
  if (f.type === 'bool') {
    return (
      <div className={`ad-field${f.full ? ' full' : ''}`}>
        <span>{label}</span>
        <label className="ad-check"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />{f.checkLabel || 'Yes'}</label>
        {f.help && <small>{f.help}</small>}
      </div>
    );
  }
  let input;
  if (f.type === 'select') {
    input = (
      <select className="ad-select" value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required}>
        {!f.required && <option value="">—</option>}
        {(f.options || []).map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (f.type === 'textarea' || f.type === 'json') {
    input = <textarea className={`ad-textarea${f.type === 'json' ? ' code' : ''}`} value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required} placeholder={f.placeholder} />;
  } else {
    const t = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : 'text';
    input = <input className="ad-input" type={t} step={f.type === 'number' ? (f.step || 'any') : undefined} value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required} placeholder={f.placeholder} />;
  }
  return (
    <label className={`ad-field${f.full || f.type === 'textarea' || f.type === 'json' ? ' full' : ''}`}>
      <span>{label}{f.required && ' *'}</span>
      {input}
      {f.help && <small>{f.help}</small>}
    </label>
  );
}

/* Guess form fields from existing rows so any table can be edited */
const SKIP_KEYS = new Set(['id', 'created_at', 'updated_at']);
export function inferFields(rows, configured = []) {
  const known = new Set(configured.map(f => f.key));
  const sample = rows.find(Boolean) || {};
  const extra = Object.keys(sample)
    .filter(k => !known.has(k) && !SKIP_KEYS.has(k))
    // skip joined relations such as `users(...)` that come back as nested rows
    .filter(k => !(sample[k] && typeof sample[k] === 'object' && !Array.isArray(sample[k]) && 'id' in sample[k]))
    .map(k => {
      const v = rows.map(r => r[k]).find(x => x !== null && x !== undefined);
      const type = typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'number' : (v && typeof v === 'object') ? 'json' : (typeof v === 'string' && v.length > 80) ? 'textarea' : 'text';
      return { key: k, type };
    });
  return [...configured, ...extra];
}

const toFormValue = (f, v) => {
  if (v === null || v === undefined) return f.default ?? (f.type === 'bool' ? false : '');
  if (f.type === 'json') return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  if (f.type === 'list') return Array.isArray(v) ? v.join(', ') : String(v);
  if (f.type === 'datetime' && v) {
    // <input type="datetime-local"> wants local time; the database stores UTC
    const d = new Date(v);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  if (f.type === 'date' && v) return String(v).slice(0, 10);
  return v;
};
const fromFormValue = (f, v) => {
  if (f.type === 'bool') return !!v;
  if (f.type === 'list') return String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  if (v === '' || v === undefined) return null;
  if (f.type === 'number') return Number(v);
  if (f.type === 'json') { try { return JSON.parse(v); } catch (_) { throw new Error(`${f.label || prettyKey(f.key)} must be valid JSON.`); } }
  if (f.type === 'datetime') return new Date(v).toISOString();
  return v;
};

/** Create / edit form in a modal. Calls onSave(payload) and closes on success. */
export function RecordForm({ title, fields, record, onSave, onClose }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(f => [f.key, toFormValue(f, record?.[f.key])])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr('');
    try {
      const payload = {};
      fields.forEach(f => { if (!f.readOnly) payload[f.key] = fromFormValue(f, form[f.key]); });
      await onSave(payload);
      onClose();
    } catch (ex) { setErr(ex?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose} wide={fields.length > 6}
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </>}>
      <form className="ad-form" onSubmit={submit}>
        {fields.map(f => <FieldInput key={f.key} f={f} value={form[f.key]} onChange={v => setForm(s => ({ ...s, [f.key]: v }))} />)}
        <button type="submit" hidden />
      </form>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}

/**
 * A complete list + create + edit + delete screen for one table.
 * Configure `fields` for the form (extra columns found in the data are added
 * automatically) and `columns` for the list.
 */
export function CrudTable({ table, columns, fields = [], select = '*', order = 'created_at', asc = false, build, deps = [], itemName = 'record', canCreate = true, canDelete = true, rowActions, toolbarExtra, empty, onChanged, defaults = {}, pk = 'id', beforeSave }) {
  const { rows, loading, error, missing, reload } = useRows(table, { select, order, asc, build, deps });
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [busy, run] = useAction();
  // Embedded relations in `select` (e.g. "*, trader_profiles(name)") are not columns of this table
  const relations = useMemo(() => new Set([...String(select).matchAll(/([a-z_]+)\s*\(/gi)].map(m => m[1])), [select]);
  const allFields = useMemo(() => inferFields(rows, fields).filter(f => !f.hidden && !relations.has(f.key)), [rows, fields, relations]);

  const isEdit = editing && editing[pk] !== undefined;
  const save = async (raw) => {
    const payload = beforeSave ? beforeSave(raw, isEdit ? editing : null) : raw;
    if (isEdit) {
      const { error: e } = await supabase.from(table).update(payload).eq(pk, editing[pk]);
      if (e) throw e;
      audit('update', table, editing[pk], editing, payload);
    } else {
      const { data, error: e } = await supabase.from(table).insert({ ...defaults, ...payload }).select().maybeSingle();
      if (e) throw e;
      audit('create', table, data?.[pk] ?? '', null, data || payload);
    }
    reload(); onChanged?.();
  };
  const remove = (row) => {
    if (!window.confirm(`Delete this ${itemName}? This can't be undone.`)) return;
    run(`del-${row[pk]}`, async () => {
      const { error: e } = await supabase.from(table).delete().eq(pk, row[pk]);
      if (e) throw e;
      audit('delete', table, row[pk], row, null);
      reload(); onChanged?.();
    }, `${prettyKey(itemName)} deleted`);
  };

  const cols = [
    ...columns,
    { key: '_actions', label: '', align: 'right', render: (r) => (
      <div className="ad-row-actions" onClick={e => e.stopPropagation()}>
        {rowActions?.(r, reload)}
        <button className="ad-icon-btn" onClick={() => setEditing(r)} aria-label={`Edit ${itemName}`} title="Edit"><Pencil /></button>
        {canDelete && <button className="ad-icon-btn danger" disabled={busy === `del-${r[pk]}`} onClick={() => remove(r)} aria-label={`Delete ${itemName}`} title="Delete"><Trash2 /></button>}
      </div>
    ) },
  ];

  return (
    <>
      <DataTable rows={rows} columns={cols} loading={loading} error={error} missing={missing} table={table} empty={empty || `No ${itemName}s yet`}
        toolbar={<div className="ad-actions">
          {toolbarExtra}
          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={reload} aria-label="Refresh"><RefreshCw /></button>
          {canCreate && !missing && <button className="ad-btn ad-btn-accent ad-btn-sm" onClick={() => setEditing({})}><Plus />Add {itemName}</button>}
        </div>} />
      {editing && (
        <RecordForm
          title={isEdit ? `Edit ${itemName}` : `New ${itemName}`}
          fields={allFields.length ? allFields : [{ key:'name', required:true }]}
          record={isEdit ? editing : defaults}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

/**
 * Purchases paid through the crypto checkout also have a pending row in
 * `transactions` (payment_tx_id). When the purchase is approved or rejected,
 * mark that payment completed / rejected so the user's history matches.
 */
export async function settlePayment(row, approved) {
  if (!row?.payment_tx_id) return;
  const status = approved ? 'completed' : 'rejected';
  const { error } = await supabase.from('transactions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', row.payment_tx_id).eq('status', 'pending');
  if (error) console.warn('Could not update the payment transaction:', error.message);
}
/* transactions.type → the admin section where that purchase is approved */
export const PURCHASE_TYPES = {
  property_investment: { section: 'real-estate',  label: 'Real estate' },
  mining_purchase:     { section: 'mining',       label: 'Mining' },
  card_order:          { section: 'cards',        label: 'Cards' },
  copy_trading:        { section: 'copy-trading', label: 'Copy trading' },
};

/** How a purchase was paid: crypto details + proof screenshot, or "Wallet" when there's no proof */
export const paidByCrypto = (row) => !!(row?.proof_url || row?.pay_coin);
export function PaymentCell({ row }) {
  if (!paidByCrypto(row)) return <span style={{ color:'var(--faint)', fontSize:13 }}>Wallet / not paid</span>;
  const tx = row.pay_tx_hash || '';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div className="ad-user">
        <span>{row.pay_coin || 'Crypto'}{row.pay_network ? ` · ${row.pay_network}` : ''}</span>
        <small className="ad-mono" title={tx}>{tx ? `${tx.slice(0, 10)}…${tx.slice(-4)}` : 'no tx hash'}</small>
      </div>
      <ProofButton path={row.proof_url} />
    </div>
  );
}

/**
 * Confirms approving a request that may need charging to the user's wallet
 * (mining contracts, property investments, card orders filed while the
 * charging RPC wasn't installed). onConfirm(charge:boolean)
 */
export function ApproveModal({ title, sub, amount, chargeLabel = 'Charge this to the user’s wallet', defaultCharge = true, onConfirm, onClose, children }) {
  const [charge, setCharge] = useState(defaultCharge);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await onConfirm(charge); onClose(); }
    catch (e) { setErr(e?.message || 'Could not approve.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={title} sub={sub} onClose={onClose}
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ad-btn ad-btn-accent" onClick={go} disabled={busy}>{busy ? 'Approving…' : 'Approve'}</button>
      </>}>
      {children}
      {amount != null && (
        <label className="ad-check">
          <input type="checkbox" checked={charge} onChange={e => setCharge(e.target.checked)} />
          {chargeLabel} ({usd(amount)})
        </label>
      )}
      <small style={{ color:'var(--faint)' }}>Untick if the user already paid another way, for example by a crypto transfer you've confirmed.</small>
      {err && <div className="ad-err">{err}</div>}
    </Modal>
  );
}

/** Small "set status" dropdown that updates one column on a row. */
export function StatusSelect({ table, row, field = 'status', options, onDone, after, patchFor }) {
  const [busy, run] = useAction();
  return (
    <select className="ad-select" style={{ height:30, width:'auto', fontSize:13, padding:'0 8px' }} value={row[field] ?? ''} disabled={!!busy}
      onClick={e => e.stopPropagation()}
      onChange={e => {
        const v = e.target.value;
        run('s', async () => {
          const { error } = await supabase.from(table).update({ [field]: v, ...(patchFor?.(v) || {}) }).eq('id', row.id);
          if (error) throw error;
          audit(`set_${field}`, table, row.id, { [field]: row[field] }, { [field]: v });
          await after?.(row, v);
          onDone?.();
        }, `Marked ${v.replace(/_/g, ' ')}`);
      }}>
      {(row[field] && !options.includes(row[field]) ? [row[field], ...options] : options).map(o => <option key={o} value={o}>{prettyKey(o)}</option>)}
    </select>
  );
}
