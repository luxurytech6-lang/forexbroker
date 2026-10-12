import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, ShieldCheck, Plus, Minus, Bell, Pencil, Ban, CircleCheck, Lock, Unlock, PauseCircle, Trash2, AlertTriangle, ExternalLink,
} from 'lucide-react';
import {
  supabase, PageHead, DataTable, Modal, Pill, Chips, RecordForm, useRows, useAction,
  walletAdjust, notify, loadUsers, audit, usd, fmtDate, fmtDateTime, userName, PAYMENT_PROOF_BUCKET,
} from '../adminShared';
import { IDENTITY_BUCKET } from './Identity';

/* Effective state: a suspension with an end date in the past no longer applies */
const effective = (status, until) => {
  const s = String(status || 'active').toLowerCase();
  if (['locked', 'banned', 'blocked', 'disabled'].includes(s)) return 'locked';
  if (['suspended', 'inactive'].includes(s) && (!until || new Date(until) > new Date())) return 'suspended';
  return 'active';
};
const accountOf = (u) => effective(u.status, u.status_until);
const withdrawalsOf = (u) => effective(u.withdrawal_status, u.withdrawal_until);

export default function UsersSection({ go }) {
  const { rows, loading, error, missing, reload } = useRows('users');
  const [wallets, setWallets] = useState({});
  const [admins, setAdmins] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  const loadExtras = async () => {
    const [{ data: w }, { data: a }] = await Promise.all([
      supabase.from('wallets').select('user_id,currency,balance').limit(20000),
      supabase.from('admins').select('email,is_active'),
    ]);
    const m = {};
    (w || []).forEach(x => { (m[x.user_id] ||= []).push(x); });
    setWallets(m);
    setAdmins(new Set((a || []).filter(x => x.is_active).map(x => String(x.email).toLowerCase())));
  };
  useEffect(() => { loadExtras(); }, []);

  const isAdm = (u) => admins.has(String(u.email || '').toLowerCase());
  const usdBal = (id) => Number((wallets[id] || []).find(w => (w.currency || 'USD') === 'USD')?.balance || 0);
  const list = useMemo(() => rows.filter(u =>
    filter === 'all' ? true :
    filter === 'verified' ? u.is_verified :
    filter === 'unverified' ? !u.is_verified :
    filter === 'admins' ? isAdm(u) :
    filter === 'suspended' ? accountOf(u) === 'suspended' :
    filter === 'locked' ? accountOf(u) === 'locked' :
    filter === 'withdrawals held' ? withdrawalsOf(u) !== 'active' :
    filter === 'funded' ? usdBal(u.id) > 0 : true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rows, filter, admins, wallets]);

  const refresh = () => { reload(); loadExtras(); loadUsers(true); };

  return (
    <>
      <PageHead title="Users" sub="Everyone with an account. Open a user to verify them, change their plan, adjust their balance, restrict their account or withdrawals, or delete them." />
      <DataTable
        rows={list} loading={loading} error={error} missing={missing} table="users" onRowClick={setOpen}
        searchText={u => `${u.first_name} ${u.last_name} ${u.email} ${u.handle || ''} ${u.phone || ''} ${u.country_name || ''}`}
        toolbar={<Chips value={filter} onChange={setFilter} items={['all', 'verified', 'unverified', 'funded', 'suspended', 'locked', 'withdrawals held', 'admins']} />}
        columns={[
          { key:'name', label:'Name', render:u => <div className="ad-user"><span>{userName(u)} {isAdm(u) && <Pill status="info">Admin</Pill>}</span><small>{u.email}</small></div> },
          { key:'country_name', label:'Country', render:u => u.country_name || '—' },
          { key:'plan', label:'Plan', render:u => <span style={{ textTransform:'capitalize' }}>{u.plan || 'Free'}</span> },
          { key:'is_verified', label:'Identity', render:u => <Pill status={u.is_verified ? 'verified' : 'pending'}>{u.is_verified ? 'Verified' : 'Unverified'}</Pill> },
          { key:'balance', label:'USD balance', align:'right', render:u => usd(usdBal(u.id)) },
          { key:'status', label:'Account', render:u => <Pill status={accountOf(u)} /> },
          { key:'withdrawal_status', label:'Withdrawals', render:u => withdrawalsOf(u) === 'active' ? <Pill status="active">Allowed</Pill> : <Pill status={withdrawalsOf(u)}>{withdrawalsOf(u) === 'locked' ? 'Locked' : 'On hold'}</Pill> },
          { key:'created_at', label:'Joined', render:u => fmtDate(u.created_at) },
        ]}
      />
      {open && (
        <UserDrawer user={open} wallets={wallets[open.id] || []} isAdmin={isAdm(open)} go={go}
          onClose={() => setOpen(null)}
          onChanged={(u) => { refresh(); if (u) setOpen(u); }}
          onDeleted={() => { setOpen(null); refresh(); }} />
      )}
    </>
  );
}

/* ─── Suspend / lock form ─────────────────────────────────────────────────── */
const PRESETS = [
  { key:'1',  label:'1 day',  days:1 },
  { key:'7',  label:'7 days', days:7 },
  { key:'30', label:'30 days', days:30 },
  { key:'none', label:'Until I lift it', days:null },
];
function RestrictForm({ kind, action, onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState('');
  const [preset, setPreset] = useState('7');
  const [date, setDate] = useState('');
  const what = kind === 'account' ? 'account' : 'withdrawals';
  const until = action === 'locked' ? null
    : date ? new Date(`${date}T23:59:59`).toISOString()
    : PRESETS.find(p => p.key === preset)?.days ? new Date(Date.now() + PRESETS.find(p => p.key === preset).days * 86400000).toISOString() : null;
  const effect = {
    'account:suspended':     'They can still sign in and look around, but can’t deposit, withdraw, invest, trade or buy anything.',
    'account:locked':        'They’re signed out straight away and can’t sign in until you unlock the account.',
    'withdrawals:suspended': 'They can’t request withdrawals. Everything else keeps working.',
    'withdrawals:locked':    'They can’t request withdrawals until you unlock them. Everything else keeps working.',
  }[`${kind}:${action}`];
  return (
    <div className="ad-card" style={{ padding:16, display:'grid', gap:12, borderColor: action === 'locked' ? 'rgba(255,100,112,.45)' : 'rgba(226,174,74,.45)' }}>
      <div style={{ fontWeight:700 }}>{action === 'locked' ? 'Lock' : 'Suspend'} {what}</div>
      <div style={{ fontSize:13.5, color:'var(--muted)' }}>{effect}</div>
      <label className="ad-field"><span>Reason (shown to the user)</span>
        <input className="ad-input" value={reason} onChange={e => setReason(e.target.value)} placeholder={kind === 'account' ? 'e.g. Unusual activity on your account' : 'e.g. Pending identity verification'} /></label>
      {action === 'suspended' && (
        <div className="ad-field"><span>Ends</span>
          <div className="ad-chips">
            {PRESETS.map(p => <button key={p.key} type="button" className={`ad-chip${!date && preset === p.key ? ' active' : ''}`} style={{ textTransform:'none' }} onClick={() => { setPreset(p.key); setDate(''); }}>{p.label}</button>)}
          </div>
          <input className="ad-input" type="date" style={{ maxWidth:220 }} value={date} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} />
          <small>{until ? `Lifts automatically on ${fmtDateTime(until)}.` : 'Stays until you lift it.'}</small>
        </div>
      )}
      <div style={{ display:'flex', gap:10 }}>
        <button className="ad-btn ad-btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="ad-btn ad-btn-no" disabled={busy} onClick={() => onConfirm({ reason: reason.trim(), until })}>
          {action === 'locked' ? <Lock /> : <PauseCircle />}{action === 'locked' ? 'Lock' : 'Suspend'} {what}
        </button>
      </div>
    </div>
  );
}

/* ─── Delete confirmation ─────────────────────────────────────────────────── */
async function removeFolder(bucket, uid) {
  // Best effort: list the user's folder and remove the files
  const { data } = await supabase.storage.from(bucket).list(uid, { limit: 1000 });
  const paths = (data || []).filter(f => f.name && f.id !== null).map(f => `${uid}/${f.name}`);
  if (paths.length) await supabase.storage.from(bucket).remove(paths);
  return paths.length;
}
function DeleteUser({ user, wallets, onCancel, onDeleted }) {
  const [typed, setTyped] = useState('');
  const [busy, run] = useAction();
  const total = wallets.reduce((s, w) => s + ((w.currency || 'USD') === 'USD' ? Number(w.balance || 0) : 0), 0);
  const ok = typed.trim().toLowerCase() === String(user.email).toLowerCase();
  const del = () => run('del', async () => {
    await Promise.all([removeFolder(IDENTITY_BUCKET, user.id), removeFolder(PAYMENT_PROOF_BUCKET, user.id)]).catch(() => {});
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: user.id });
    if (error) throw error;
    onDeleted();
  }, 'User deleted');
  return (
    <Modal title="Delete this user?" sub={`${userName(user)} · ${user.email}`} onClose={onCancel}
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={onCancel} disabled={!!busy}>Cancel</button>
        <button className="ad-btn ad-btn-no" disabled={!ok || !!busy} onClick={del}><Trash2 />Delete permanently</button>
      </>}>
      <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, background:'var(--red-dim)', color:'var(--red)', fontSize:14, lineHeight:1.55 }}>
        <AlertTriangle style={{ flexShrink:0, marginTop:2 }} size={18} />
        <div>This can't be undone. Their sign-in, wallets{total > 0 ? ` (including ${usd(total)} USD)` : ''}, transactions, investments, cards, identity documents and all other data are removed for good.
          If you only want to stop them using the account, <strong>lock</strong> it instead.</div>
      </div>
      <label className="ad-field"><span>Type their email address to confirm</span>
        <input className="ad-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder={user.email} autoComplete="off" /></label>
    </Modal>
  );
}

/* ─── User drawer ─────────────────────────────────────────────────────────── */
function UserDrawer({ user, wallets, isAdmin, go, onClose, onChanged, onDeleted }) {
  const [busy, run] = useAction();
  const [mode, setMode] = useState(null); // adjust | notify | edit
  const [restrict, setRestrict] = useState(null); // { kind, action }
  const [deleting, setDeleting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [txs, setTxs] = useState([]);
  const [idCheck, setIdCheck] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    supabase.from('subscription_plans').select('id,name').then(({ data }) => setPlans(data || []));
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(8).then(({ data }) => setTxs(data || []));
    supabase.from('identity_verifications').select('id,status,submitted_at,rejection_reason').eq('user_id', user.id).order('created_at', { ascending:false }).limit(1)
      .then(({ data }) => setIdCheck((data || [])[0] || null));
  }, [user.id]);

  const account = accountOf(user);
  const withdrawals = withdrawalsOf(user);

  const update = (patch, msg) => run('upd', async () => {
    const { data, error } = await supabase.from('users').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', user.id).select().maybeSingle();
    if (error) throw error;
    audit('update', 'users', user.id, Object.fromEntries(Object.keys(patch).map(k => [k, user[k]])), patch);
    onChanged(data || { ...user, ...patch });
  }, msg);

  const setStatus = (kind, status, { reason = null, until = null } = {}) => run(kind, async () => {
    const fn = kind === 'account' ? 'admin_set_account_status' : 'admin_set_withdrawal_status';
    const { data, error } = await supabase.rpc(fn, { p_user_id: user.id, p_status: status, p_reason: reason || null, p_until: until });
    if (error) throw error;
    setRestrict(null);
    const patch = kind === 'account'
      ? { status: data?.status ?? status, status_reason: data?.status_reason ?? reason, status_until: data?.status_until ?? until }
      : { withdrawal_status: data?.withdrawal_status ?? status, withdrawal_reason: data?.withdrawal_reason ?? reason, withdrawal_until: data?.withdrawal_until ?? until };
    onChanged({ ...user, ...patch });
  }, {
    'account:active': 'Account reactivated', 'account:suspended': 'Account suspended', 'account:locked': 'Account locked',
    'withdrawals:active': 'Withdrawals allowed', 'withdrawals:suspended': 'Withdrawals suspended', 'withdrawals:locked': 'Withdrawals locked',
  }[`${kind}:${status}`]);

  const toggleAdmin = () => {
    if (!window.confirm(isAdmin ? `Remove admin access from ${userName(user)}?` : `Give ${userName(user)} full admin access?`)) return;
    run('admin', async () => {
      // admins is keyed by email; the person signs in at /admin/login with their normal account
      const { error } = isAdmin
        ? await supabase.from('admins').update({ is_active: false, updated_at: new Date().toISOString() }).ilike('email', user.email)
        : await supabase.from('admins').upsert({ email: user.email, full_name: userName(user), is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'email' });
      if (error) throw error;
      audit(isAdmin ? 'revoke_admin' : 'grant_admin', 'admins', user.email);
      onChanged(user);
    }, isAdmin ? 'Admin access removed' : 'Admin access granted');
  };

  const doAdjust = (sign) => {
    const n = Math.abs(Number(amount));
    if (!n) return;
    run('adj', async () => {
      await walletAdjust(user.id, sign * n, { type: sign > 0 ? 'bonus' : 'adjustment', description: note.trim() || (sign > 0 ? 'Credit from admin' : 'Debit by admin') });
      await notify(user.id, { title: sign > 0 ? `${usd(n)} added to your wallet` : `${usd(n)} deducted from your wallet`, description: note.trim(), category: 'payment', icon_class: 'ti-wallet' });
      setAmount(''); setNote(''); setMode(null);
      onChanged(user);
    }, sign > 0 ? `Credited ${usd(n)}` : `Debited ${usd(n)}`);
  };

  const doNotify = () => run('ntf', async () => {
    const { error } = await notify(user.id, { title: title.trim(), description: body.trim() });
    if (error) throw error;
    setTitle(''); setBody(''); setMode(null);
  }, 'Notification sent');

  // Only profile fields; never password_hash, the OTP columns or the account controls
  const editableFields = [
    { key:'first_name', required:true }, { key:'last_name', required:true }, { key:'email', required:true },
    { key:'handle' }, { key:'phone' }, { key:'dial_code' }, { key:'country_name', label:'Country' },
    { key:'country_code', help:'Two letters, e.g. NG' }, { key:'currency', help:'Three letters, e.g. USD' },
    { key:'location' }, { key:'timezone' }, { key:'website' }, { key:'trading_goal' },
    { key:'is_public', type:'bool', label:'Public profile' }, { key:'bio', type:'textarea' },
  ];

  const stateLine = (st, reason, until) => st === 'active' ? null : (
    <div style={{ fontSize:13, color:'var(--muted)', marginTop:6, lineHeight:1.5 }}>
      {reason ? <>Reason: <strong style={{ color:'var(--text)' }}>{reason}</strong><br /></> : null}
      {st === 'suspended' ? (until ? `Lifts automatically on ${fmtDateTime(until)}` : 'No end date — lift it manually') : 'Until you unlock it'}
    </div>
  );

  return (
    <Modal title={userName(user)} sub={user.email} onClose={onClose} wide
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={() => setMode('edit')}><Pencil />Edit details</button>
        <button className="ad-btn ad-btn-ghost" onClick={toggleAdmin} disabled={busy === 'admin'}><ShieldCheck />{isAdmin ? 'Remove admin' : 'Make admin'}</button>
        <button className="ad-btn ad-btn-accent" onClick={onClose}>Done</button>
      </>}>
      <div className="ad-kv">
        <div><span>Plan</span>
          <select className="ad-select" style={{ height:34, marginTop:4 }} value={(user.plan || '').toLowerCase()} disabled={!!busy}
            onChange={e => update({ plan: e.target.value || null }, 'Plan updated')}>
            <option value="">Free</option>
            {plans.map(p => <option key={p.id} value={String(p.name).toLowerCase()}>{p.name}</option>)}
          </select>
        </div>
        <div><span>Identity</span>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, flexWrap:'wrap' }}>
            <Pill status={user.is_verified ? 'verified' : 'pending'}>{user.is_verified ? 'Verified' : 'Unverified'}</Pill>
            <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={!!busy} onClick={() => update({ is_verified: !user.is_verified }, user.is_verified ? 'Marked unverified' : 'User verified')}>
              <BadgeCheck />{user.is_verified ? 'Unverify' : 'Verify'}
            </button>
            {idCheck && <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => go?.('identity')}><ExternalLink />ID check: {idCheck.status}</button>}
          </div>
        </div>
        {wallets.length ? wallets.map(w => <div key={w.currency}><span>{w.currency || 'USD'} wallet</span><strong>{usd(w.balance)}</strong></div>)
          : <div><span>Wallet</span><strong>No wallet yet</strong></div>}
        <div><span>Joined</span><strong>{fmtDateTime(user.created_at)}</strong></div>
        {user.handle && <div><span>Handle</span><strong>@{user.handle}</strong></div>}
        {user.phone && <div><span>Phone</span><strong>{user.dial_code && !String(user.phone).startsWith('+') ? `${user.dial_code} ` : ''}{user.phone}</strong></div>}
        {(user.country_name || user.location) && <div><span>Location</span><strong>{[user.location, user.country_name].filter(Boolean).join(', ')}</strong></div>}
        {user.trading_goal && <div><span>Trading goal</span><strong>{user.trading_goal}</strong></div>}
        <div><span>User ID</span><strong className="ad-mono">{user.id}</strong></div>
      </div>

      {/* ── Account & withdrawal controls ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12 }}>
        <div className="ad-card" style={{ padding:16 }} data-testid="account-controls">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <strong>Account access</strong><Pill status={account} />
          </div>
          {stateLine(account, user.status_reason, user.status_until)}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
            {account !== 'active' && <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={!!busy} onClick={() => setStatus('account', 'active')}>{account === 'locked' ? <Unlock /> : <CircleCheck />}{account === 'locked' ? 'Unlock account' : 'Lift suspension'}</button>}
            {account !== 'suspended' && <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={!!busy} onClick={() => setRestrict({ kind:'account', action:'suspended' })}><PauseCircle />Suspend</button>}
            {account !== 'locked' && <button className="ad-btn ad-btn-no ad-btn-sm" disabled={!!busy} onClick={() => setRestrict({ kind:'account', action:'locked' })}><Lock />Lock</button>}
          </div>
        </div>
        <div className="ad-card" style={{ padding:16 }} data-testid="withdrawal-controls">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <strong>Withdrawals</strong>
            {withdrawals === 'active' ? <Pill status="active">Allowed</Pill> : <Pill status={withdrawals}>{withdrawals === 'locked' ? 'Locked' : 'On hold'}</Pill>}
          </div>
          {stateLine(withdrawals, user.withdrawal_reason, user.withdrawal_until)}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
            {withdrawals !== 'active' && <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={!!busy} onClick={() => setStatus('withdrawals', 'active')}>{withdrawals === 'locked' ? <Unlock /> : <CircleCheck />}Allow withdrawals</button>}
            {withdrawals !== 'suspended' && <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={!!busy} onClick={() => setRestrict({ kind:'withdrawals', action:'suspended' })}><PauseCircle />Suspend</button>}
            {withdrawals !== 'locked' && <button className="ad-btn ad-btn-no ad-btn-sm" disabled={!!busy} onClick={() => setRestrict({ kind:'withdrawals', action:'locked' })}><Ban />Lock</button>}
          </div>
        </div>
      </div>

      {restrict && (
        <RestrictForm key={`${restrict.kind}-${restrict.action}`} kind={restrict.kind} action={restrict.action} busy={!!busy}
          onCancel={() => setRestrict(null)}
          onConfirm={({ reason, until }) => setStatus(restrict.kind, restrict.action, { reason, until })} />
      )}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button className={`ad-btn ${mode === 'adjust' ? 'ad-btn-accent' : 'ad-btn-ghost'}`} onClick={() => setMode(m => m === 'adjust' ? null : 'adjust')}>Adjust balance</button>
        <button className={`ad-btn ${mode === 'notify' ? 'ad-btn-accent' : 'ad-btn-ghost'}`} onClick={() => setMode(m => m === 'notify' ? null : 'notify')}><Bell />Send notification</button>
      </div>

      {mode === 'adjust' && (
        <div className="ad-card" style={{ padding:16, display:'grid', gap:12 }}>
          <div className="ad-form">
            <label className="ad-field"><span>Amount (USD)</span><input className="ad-input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label>
            <label className="ad-field"><span>Reason (shown to the user)</span><input className="ad-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Deposit bonus" /></label>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="ad-btn ad-btn-ok" disabled={!Number(amount) || busy === 'adj'} onClick={() => doAdjust(1)}><Plus />Credit</button>
            <button className="ad-btn ad-btn-no" disabled={!Number(amount) || busy === 'adj'} onClick={() => doAdjust(-1)}><Minus />Debit</button>
          </div>
        </div>
      )}
      {mode === 'notify' && (
        <div className="ad-card" style={{ padding:16, display:'grid', gap:12 }}>
          <label className="ad-field"><span>Title</span><input className="ad-input" value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label className="ad-field"><span>Message</span><textarea className="ad-textarea" value={body} onChange={e => setBody(e.target.value)} /></label>
          <div><button className="ad-btn ad-btn-accent" disabled={!title.trim() || busy === 'ntf'} onClick={doNotify}>Send</button></div>
        </div>
      )}

      <div>
        <div style={{ fontWeight:600, marginBottom:8 }}>Recent transactions</div>
        {txs.length === 0 ? <div style={{ color:'var(--muted)', fontSize:14 }}>None yet.</div> : (
          <div className="ad-card ad-table-wrap">
            <table className="ad-table">
              <tbody>
                {txs.map(t => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.created_at)}</td>
                    <td style={{ textTransform:'capitalize' }}>{String(t.type || '').replace(/_/g, ' ')}</td>
                    <td className={`r ${Number(t.amount) < 0 ? 'down' : 'up'}`}>{usd(t.amount)}</td>
                    <td><Pill status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className="ad-card" style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', borderColor:'rgba(255,100,112,.35)' }}>
        <div>
          <strong>Delete user</strong>
          <div style={{ fontSize:13, color:'var(--muted)' }}>{isAdmin ? 'Remove their admin access first.' : 'Permanently removes the account and all of its data.'}</div>
        </div>
        <button className="ad-btn ad-btn-no" disabled={isAdmin || !!busy} onClick={() => setDeleting(true)}><Trash2 />Delete user…</button>
      </div>

      {deleting && <DeleteUser user={user} wallets={wallets} onCancel={() => setDeleting(false)} onDeleted={() => { setDeleting(false); onDeleted(); }} />}

      {mode === 'edit' && (
        <RecordForm title="Edit user details" fields={editableFields} record={user} onClose={() => setMode(null)}
          onSave={async (payload) => {
            const { data, error } = await supabase.from('users').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', user.id).select().maybeSingle();
            if (error) throw error;
            audit('update', 'users', user.id, null, payload);
            onChanged(data || { ...user, ...payload });
          }} />
      )}
    </Modal>
  );
}
