import React, { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { PageHead, DataTable, UserCell, useRows, useUsers, useAction, notify, fmtDateTime, userName } from '../adminShared';

const CATEGORIES = [
  { value:'system',  label:'System' },
  { value:'payment', label:'Payment' },
  { value:'market',  label:'Market' },
  { value:'trade',   label:'Trade' },
];

export default function Notifications() {
  const users = useUsers();
  const recent = useRows('notifications', { limit: 200 });
  const [audience, setAudience] = useState('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('system');
  const [link, setLink] = useState('');
  const [busy, run] = useAction();

  const all = useMemo(() => Object.values(users), [users]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q)).slice(0, 6);
  }, [all, query]);

  const recipients = audience === 'all' ? all.map(u => u.id)
    : audience === 'verified' ? all.filter(u => u.is_verified).map(u => u.id)
    : audience === 'unverified' ? all.filter(u => !u.is_verified).map(u => u.id)
    : picked ? [picked.id] : [];

  const send = () => {
    if (recipients.length > 1 && !window.confirm(`Send this to ${recipients.length} users?`)) return;
    run('send', async () => {
      const { error } = await notify(recipients, { title: title.trim(), description: body.trim(), category, action_url: link.trim() || null, icon_class: 'ti-speakerphone' });
      if (error) throw error;
      setTitle(''); setBody(''); setLink('');
      recent.reload();
    }, `Sent to ${recipients.length} ${recipients.length === 1 ? 'user' : 'users'}`);
  };

  return (
    <>
      <PageHead title="Notifications" sub="Send an in-app message. It appears on the user's Notifications page and bell icon." />
      <div className="ad-card" style={{ padding:20, marginBottom:22 }}>
        <div className="ad-form">
          <label className="ad-field"><span>Send to</span>
            <select className="ad-select" value={audience} onChange={e => { setAudience(e.target.value); setPicked(null); }}>
              <option value="all">All users ({all.length})</option>
              <option value="verified">Verified users</option>
              <option value="unverified">Unverified users</option>
              <option value="one">One user</option>
            </select>
          </label>
          {audience === 'one' ? (
            <div className="ad-field" style={{ position:'relative' }}>
              <span>User</span>
              {picked ? (
                <div style={{ display:'flex', gap:8, alignItems:'center', height:40 }}>
                  <strong>{userName(picked)}</strong><span style={{ color:'var(--muted)' }}>{picked.email}</span>
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setPicked(null)}>Change</button>
                </div>
              ) : (
                <>
                  <input className="ad-input" placeholder="Search by name or email" value={query} onChange={e => setQuery(e.target.value)} />
                  {matches.length > 0 && (
                    <div className="ad-card" style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, marginTop:4, padding:4 }}>
                      {matches.map(u => (
                        <button key={u.id} className="ad-link" onClick={() => { setPicked(u); setQuery(''); }}>
                          <div className="ad-user"><span>{userName(u)}</span><small>{u.email}</small></div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <label className="ad-field"><span>Category</span>
              <select className="ad-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          )}
          <label className="ad-field full"><span>Title</span><input className="ad-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance on Sunday" /></label>
          <label className="ad-field full"><span>Message</span><textarea className="ad-textarea" value={body} onChange={e => setBody(e.target.value)} /></label>
          <label className="ad-field"><span>Link (optional)</span><input className="ad-input" value={link} onChange={e => setLink(e.target.value)} placeholder="/mining" /></label>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
          <button className="ad-btn ad-btn-accent" disabled={!title.trim() || !recipients.length || busy === 'send'} onClick={send}>
            <Send />{busy === 'send' ? 'Sending…' : `Send to ${recipients.length} ${recipients.length === 1 ? 'user' : 'users'}`}
          </button>
        </div>
      </div>

      <h2 style={{ fontSize:17, fontWeight:600, margin:'0 0 12px' }}>Recently sent</h2>
      <DataTable rows={recent.rows} loading={recent.loading} error={recent.error} missing={recent.missing} table="notifications" empty="No notifications yet"
        columns={[
          { key:'created_at', label:'Date', render:n => fmtDateTime(n.created_at) },
          { key:'user', label:'User', render:n => <UserCell user={users[n.user_id]} id={n.user_id} /> },
          { key:'title', label:'Title', wrap:true },
          { key:'category', label:'Category', render:n => <span style={{ textTransform:'capitalize' }}>{n.category || '—'}</span> },
          { key:'is_read', label:'Read' },
        ]} />
    </>
  );
}
