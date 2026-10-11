import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ShieldCheck, Plus, Minus, Bell, Pencil, Ban, CircleCheck } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Modal, Pill, Chips, RecordForm, useRows, useAction,
  walletAdjust, notify, loadUsers, audit, usd, fmtDate, fmtDateTime, userName,
} from '../adminShared';

export default function UsersSection() {
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
    filter === 'suspended' ? (u.status && u.status !== 'active') :
    filter === 'funded' ? usdBal(u.id) > 0 : true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rows, filter, admins, wallets]);

  const refresh = () => { reload(); loadExtras(); loadUsers(true); };

  return (
    <>
      <PageHead title="Users" sub="Everyone with an account. Open a user to verify them, change their plan, adjust their balance or message them." />
      <DataTable
        rows={list} loading={loading} error={error} missing={missing} table="users" onRowClick={setOpen}
        searchText={u => `${u.first_name} ${u.last_name} ${u.email} ${u.handle || ''} ${u.phone || ''} ${u.country_name || ''}`}
        toolbar={<Chips value={filter} onChange={setFilter} items={['all', 'verified', 'unverified', 'funded', 'suspended', 'admins']} />}
        columns={[
          { key:'name', label:'Name', render:u => <div className="ad-user"><span>{userName(u)} {isAdm(u) && <Pill status="info">Admin</Pill>}</span><small>{u.email}</small></div> },
          { key:'country_name', label:'Country', render:u => u.country_name || '—' },
          { key:'plan', label:'Plan', render:u => <span style={{ textTransform:'capitalize' }}>{u.plan || 'Free'}</span> },
          { key:'is_verified', label:'Verified', render:u => <Pill status={u.is_verified ? 'verified' : 'pending'}>{u.is_verified ? 'Verified' : 'Unverified'}</Pill> },
          { key:'balance', label:'USD balance', align:'right', render:u => usd(usdBal(u.id)) },
          { key:'status', label:'Account', render:u => <Pill status={u.status || 'active'} /> },
          { key:'created_at', label:'Joined', render:u => fmtDate(u.created_at) },
        ]}
      />
      {open && <UserDrawer user={open} wallets={wallets[open.id] || []} isAdmin={isAdm(open)} onClose={() => setOpen(null)} onChanged={(u) => { refresh(); if (u) setOpen(u); }} />}
    </>
  );
}

function UserDrawer({ user, wallets, isAdmin, onClose, onChanged }) {
  const [busy, run] = useAction();
  const [mode, setMode] = useState(null); // adjust | notify | edit
  const [plans, setPlans] = useState([]);
  const [txs, setTxs] = useState([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    supabase.from('subscription_plans').select('id,name').then(({ data }) => setPlans(data || []));
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(8).then(({ data }) => setTxs(data || []));
  }, [user.id]);

  const update = (patch, msg) => run('upd', async () => {
    const { data, error } = await supabase.from('users').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', user.id).select().maybeSingle();
    if (error) throw error;
    audit('update', 'users', user.id, Object.fromEntries(Object.keys(patch).map(k => [k, user[k]])), patch);
    onChanged(data || { ...user, ...patch });
  }, msg);

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

  // Only profile fields; never password_hash or the OTP columns
  const editableFields = [
    { key:'first_name', required:true }, { key:'last_name', required:true }, { key:'email', required:true },
    { key:'handle' }, { key:'phone' }, { key:'dial_code' }, { key:'country_name', label:'Country' },
    { key:'country_code', help:'Two letters, e.g. NG' }, { key:'currency', help:'Three letters, e.g. USD' },
    { key:'location' }, { key:'timezone' }, { key:'website' }, { key:'trading_goal' },
    { key:'is_public', type:'bool', label:'Public profile' }, { key:'bio', type:'textarea' },
  ];

  return (
    <Modal title={userName(user)} sub={user.email} onClose={onClose} wide
      footer={<>
        <button className="ad-btn ad-btn-ghost" onClick={() => setMode('edit')}><Pencil />Edit details</button>
        {(user.status || 'active') === 'active'
          ? <button className="ad-btn ad-btn-no" disabled={!!busy} onClick={() => window.confirm(`Suspend ${userName(user)}? They won't be able to use their account.`) && update({ status: 'suspended' }, 'Account suspended')}><Ban />Suspend</button>
          : <button className="ad-btn ad-btn-ok" disabled={!!busy} onClick={() => update({ status: 'active' }, 'Account reactivated')}><CircleCheck />Reactivate</button>}
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
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
            <Pill status={user.is_verified ? 'verified' : 'pending'}>{user.is_verified ? 'Verified' : 'Unverified'}</Pill>
            <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={!!busy} onClick={() => update({ is_verified: !user.is_verified }, user.is_verified ? 'Marked unverified' : 'User verified')}>
              <BadgeCheck />{user.is_verified ? 'Unverify' : 'Verify'}
            </button>
          </div>
        </div>
        {wallets.length ? wallets.map(w => <div key={w.currency}><span>{w.currency || 'USD'} wallet</span><strong>{usd(w.balance)}</strong></div>)
          : <div><span>Wallet</span><strong>No wallet yet</strong></div>}
        <div><span>Account</span><strong style={{ textTransform:'capitalize' }}>{user.status || 'active'}</strong></div>
        <div><span>Joined</span><strong>{fmtDateTime(user.created_at)}</strong></div>
        {user.handle && <div><span>Handle</span><strong>@{user.handle}</strong></div>}
        {user.phone && <div><span>Phone</span><strong>{user.dial_code && !String(user.phone).startsWith('+') ? `${user.dial_code} ` : ''}{user.phone}</strong></div>}
        {(user.country_name || user.location) && <div><span>Location</span><strong>{[user.location, user.country_name].filter(Boolean).join(', ')}</strong></div>}
        {user.trading_goal && <div><span>Trading goal</span><strong>{user.trading_goal}</strong></div>}
        <div><span>User ID</span><strong className="ad-mono">{user.id}</strong></div>
      </div>

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
