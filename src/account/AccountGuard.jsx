/**
 * AccountGuard.jsx — enforces account suspensions and locks across the app.
 * Rendered once in App.js inside <Router> (next to ChatwayWidget).
 *
 *   locked     → full-screen notice and the user is signed out
 *   suspended  → a bar at the bottom of every page explaining that deposits,
 *                withdrawals, investments and trades are paused
 *
 * The database blocks the actions themselves (09_identity_account_schema.sql);
 * this component just tells the user what's going on. Public pages, sign-in
 * pages and the admin console are left alone.
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, PauseCircle } from 'lucide-react';
import supabase from '../supabase';
import { fetchAccountState, fmtUntil } from './accountState';

export const SUPPORT_EMAIL = 'support@profitgainsignals.com';
const PUBLIC = ['/', '/about', '/policy', '/privacy', '/terms', '/signup', '/login', '/forgot'];
const skip = (path) => PUBLIC.includes(path) || path === '/admin' || path.startsWith('/admin/');

const CSS = `
.ag-lock { position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 20px;
  background: #07101E; color: #EEF2F7; font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.ag-card { width: 100%; max-width: 440px; text-align: center; padding: 34px 28px; border-radius: 20px; background: #0C1A2E; border: 1px solid #1C2C45; }
.ag-icon { width: 60px; height: 60px; margin: 0 auto 18px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
  background: rgba(255,100,112,.12); color: #FF6470; }
.ag-card h1 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 32px; line-height: 1.1; margin: 0 0 10px; }
.ag-card p { font-size: 15px; line-height: 1.6; color: #8A9AB2; margin: 0 0 8px; }
.ag-reason { margin: 14px 0 4px; padding: 11px 14px; border-radius: 10px; background: #112238; border: 1px solid #1C2C45; font-size: 14px; color: #EEF2F7; text-align: left; }
.ag-actions { display: grid; gap: 10px; margin-top: 22px; }
.ag-btn { display: flex; align-items: center; justify-content: center; height: 46px; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; font-family: inherit; }
.ag-btn.primary { background: #E2AE4A; color: #07101E; }
.ag-btn.ghost { background: transparent; border: 1px solid #2A3D5C; color: #EEF2F7; }

.ag-bar { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 1500; width: min(760px, calc(100% - 32px));
  display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 16px; border-radius: 14px;
  background: #2A1A0E; border: 1px solid rgba(245,158,11,.45); color: #F8E3BC; box-shadow: 0 18px 40px -16px rgba(0,0,0,.6);
  font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.45; }
.ag-bar svg { color: #F2C46B; flex-shrink: 0; }
.ag-bar span { flex: 1; min-width: 0; }
.ag-bar strong { color: #FFE7B8; }
.ag-bar a { flex-shrink: 0; height: 34px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: 9px; background: #F2C46B; color: #2A1A0E; font-weight: 700; font-size: 13px; text-decoration: none; }
body.ag-has-bar { padding-bottom: 84px; }
@media (max-width: 560px) { .ag-bar { flex-wrap: wrap; bottom: 10px; } .ag-bar a { width: 100%; justify-content: center; } body.ag-has-bar { padding-bottom: 128px; } }
`;

export default function AccountGuard() {
  const { pathname } = useLocation();
  const [s, setS] = useState(null);
  const off = skip(pathname);

  useEffect(() => {
    if (off) { setS(null); return undefined; }
    let live = true;
    const check = () => fetchAccountState().then(r => { if (live) setS(r); });
    check();
    // Re-check now and then so a lock or suspension shows up without a reload
    const t = setInterval(check, 120000);
    return () => { live = false; clearInterval(t); };
  }, [pathname, off]);

  const locked = !off && s?.account === 'locked';
  const suspended = !off && s?.account === 'suspended';

  // A locked user is signed out straight away; the notice stays on screen
  useEffect(() => {
    if (locked) supabase.auth.signOut().catch(() => {});
  }, [locked]);

  useEffect(() => {
    document.body.classList.toggle('ag-has-bar', suspended);
    return () => document.body.classList.remove('ag-has-bar');
  }, [suspended]);

  if (locked) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ag-lock" role="alertdialog" aria-modal="true" aria-labelledby="ag-title">
          <div className="ag-card">
            <div className="ag-icon"><Lock size={28} /></div>
            <h1 id="ag-title">Your account is locked</h1>
            <p>For your security, access to this account has been locked by our team. You've been signed out.</p>
            {s.account_reason && <div className="ag-reason"><strong>Reason:</strong> {s.account_reason}</div>}
            <div className="ag-actions">
              <a className="ag-btn primary" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('My account is locked')}`}>Contact support</a>
              <a className="ag-btn ghost" href="/login">Back to sign in</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (suspended) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ag-bar" role="status">
          <PauseCircle size={20} />
          <span>
            <strong>Your account is suspended{s.account_until ? ` until ${fmtUntil(s.account_until)}` : ''}.</strong>{' '}
            {s.account_reason ? `${s.account_reason} ` : ''}You can view your account, but deposits, withdrawals, investments and trades are paused.
          </span>
          <a href="/support">Contact support</a>
        </div>
      </>
    );
  }
  return null;
}
