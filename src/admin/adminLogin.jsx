/**
 * adminLogin.jsx — Route: /admin/login
 * Signs in with Supabase Auth, then checks the email has an active row in the
 * `admins` table and stamps admins.last_login. Non-admins are signed straight back out.
 */
import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { supabase, checkIsAdmin, getAdminRow, audit } from './adminShared';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #07101E; color: #EEF2F7; font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
.al-wrap { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); }
.al-art { position: relative; overflow: hidden; padding: 44px 52px; display: flex; flex-direction: column; justify-content: space-between; background:
  radial-gradient(90% 70% at 15% 10%, rgba(226,174,74,.16) 0%, transparent 60%),
  radial-gradient(70% 60% at 90% 100%, rgba(91,140,255,.12) 0%, transparent 60%), #0A1628; border-right: 1px solid #1C2C45; }
.al-art::after { content: ''; position: absolute; inset: 0; background-image: linear-gradient(#1C2C45 1px, transparent 1px), linear-gradient(90deg, #1C2C45 1px, transparent 1px); background-size: 56px 56px; opacity: .25; mask-image: radial-gradient(ellipse at 30% 40%, #000 0%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at 30% 40%, #000 0%, transparent 70%); pointer-events: none; }
.al-brand { position: relative; z-index: 1; font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; }
.al-brand b { font-weight: 400; color: #E2AE4A; }
.al-copy { position: relative; z-index: 1; max-width: 30em; }
.al-copy h1 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(40px, 4.4vw, 64px); line-height: 1.02; letter-spacing: -.015em; }
.al-copy h1 em { font-style: italic; color: #E2AE4A; }
.al-copy p { color: #8A9AB2; font-size: 16px; margin-top: 16px; line-height: 1.6; }
.al-list { position: relative; z-index: 1; display: grid; gap: 10px; font-size: 14px; color: #8A9AB2; }
.al-list div { display: flex; align-items: center; gap: 10px; }
.al-list i { width: 6px; height: 6px; border-radius: 50%; background: #E2AE4A; }
.al-form-side { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
.al-form { width: min(400px, 100%); }
.al-badge { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px; border-radius: 999px; background: rgba(226,174,74,.12); color: #E2AE4A; font-size: 13px; font-weight: 600; margin-bottom: 18px; }
.al-badge svg { width: 15px; height: 15px; }
.al-form h2 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 38px; line-height: 1.05; }
.al-form > p { color: #8A9AB2; margin: 8px 0 28px; font-size: 15px; }
.al-field { display: block; margin-bottom: 16px; }
.al-field span { display: block; font-size: 13.5px; font-weight: 600; color: #8A9AB2; margin-bottom: 7px; }
.al-input { display: flex; align-items: center; gap: 10px; height: 50px; padding: 0 14px; border-radius: 12px; background: #0C1A2E; border: 1px solid #1C2C45; color: #56677F; transition: border-color .15s, box-shadow .15s; }
.al-input:focus-within { border-color: #E2AE4A; box-shadow: 0 0 0 3px rgba(226,174,74,.14); color: #8A9AB2; }
.al-input input { flex: 1; min-width: 0; height: 100%; background: none; border: none; outline: none; color: #EEF2F7; font: inherit; font-size: 15px; }
.al-input button { background: none; border: none; color: inherit; cursor: pointer; display: flex; padding: 4px; }
.al-input svg { width: 18px; height: 18px; flex-shrink: 0; }
.al-err { padding: 11px 14px; border-radius: 10px; background: rgba(255,100,112,.1); border: 1px solid rgba(255,100,112,.3); color: #FF8A93; font-size: 14px; margin-bottom: 16px; }
.al-submit { width: 100%; height: 50px; border-radius: 12px; border: none; background: #E2AE4A; color: #07101E; font: inherit; font-size: 15.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-top: 6px; transition: filter .15s; }
.al-submit:hover:not(:disabled) { filter: brightness(1.07); }
.al-submit:disabled { opacity: .6; cursor: not-allowed; }
.al-foot { display: flex; justify-content: space-between; margin-top: 22px; font-size: 14px; color: #8A9AB2; }
.al-foot a { color: #8A9AB2; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
.al-foot a:hover { color: #EEF2F7; }
.al-spin { animation: alSpin .8s linear infinite; }
@keyframes alSpin { to { transform: rotate(360deg); } }
:focus-visible { outline: 2px solid #E2AE4A; outline-offset: 2px; }
@media (max-width: 900px) {
  .al-wrap { grid-template-columns: 1fr; }
  .al-art { padding: 28px 24px; min-height: auto; gap: 28px; border-right: none; border-bottom: 1px solid #1C2C45; }
  .al-list { display: none; }
  .al-copy h1 { font-size: 36px; }
}
`;

export default function AdminLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError]       = useState(() =>
    new URLSearchParams(window.location.search).get('denied') ? 'That account doesn’t have admin access.' : '');

  // Already signed in as an admin? Go straight to the dashboard.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && await checkIsAdmin(session.user.email).catch(() => false)) {
        window.location.replace('/admin');
        return;
      }
      setChecking(false);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) throw new Error(authErr.message === 'Invalid login credentials' ? 'The email or password is incorrect.' : authErr.message);
      const ok = await checkIsAdmin(data.user.email);
      if (!ok) {
        await supabase.auth.signOut();
        throw new Error('That account doesn’t have admin access.');
      }
      const admin = await getAdminRow(data.user.email);
      if (admin) {
        await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id);
        await audit('login', 'admins', admin.id);
      }
      window.location.replace('/admin');
    } catch (ex) {
      setError(ex.message || 'Could not sign in.');
      setBusy(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="al-wrap">
        <aside className="al-art">
          <div className="al-brand">Profit<b>Gain</b>Signal</div>
          <div className="al-copy">
            <h1>Run the platform from <em>one desk.</em></h1>
            <p>Approve deposits and withdrawals, manage users and plans, publish mining and property listings, and answer support — all in one place.</p>
          </div>
          <div className="al-list">
            <div><i />Every action is checked against admin permissions in the database</div>
            <div><i />Payment proofs open through short-lived private links</div>
          </div>
        </aside>

        <main className="al-form-side">
          <form className="al-form" onSubmit={submit} noValidate>
            <div className="al-badge"><ShieldCheck />Admin console</div>
            <h2>Sign in</h2>
            <p>Use the account that has been given admin access.</p>

            {error && <div className="al-err" role="alert">{error}</div>}

            <label className="al-field">
              <span>Email</span>
              <div className="al-input">
                <Mail />
                <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@company.com" disabled={busy || checking} />
              </div>
            </label>
            <label className="al-field">
              <span>Password</span>
              <div className="al-input">
                <Lock />
                <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" disabled={busy || checking} />
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff /> : <Eye />}</button>
              </div>
            </label>

            <button className="al-submit" type="submit" disabled={busy || checking}>
              {busy || checking ? <><Loader2 size={18} className="al-spin" />{checking ? 'Checking session…' : 'Signing in…'}</> : 'Sign in to admin'}
            </button>

            <div className="al-foot">
              <a href="/"><ArrowLeft size={15} />Back to site</a>
              <a href="/forgot">Forgot password?</a>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
