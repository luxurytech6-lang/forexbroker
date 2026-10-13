/**
 * Connections.jsx — Admin → Connections
 * Enter a user's connection key to connect their account. Their profile then
 * shows "Connected". Also lists connection requests and connected accounts.
 * Uses admin_lookup_connection_key / admin_connect_by_key / admin_set_connection_status
 * (database/14_connection_referral_schema.sql).
 */
import React, { useMemo, useState } from 'react';
import { Plug, Search, Unplug, Check } from 'lucide-react';
import { supabase, PageHead, DataTable, Tabs, Pill, useRows, useAction, fmtDateTime, userName } from '../adminShared';

const LABEL = { connected: 'Connected', pending: 'Pending', not_connected: 'Not connected' };
const kind = (s) => (s === 'connected' ? 'active' : s === 'pending' ? 'pending' : 'none');
export const ConnectionPill = ({ status }) => <Pill status={kind(status)}>{LABEL[status] || 'Not connected'}</Pill>;

export default function ConnectionsSection({ refreshCounts }) {
  const { rows, loading, error, missing, reload } = useRows('users', { limit: 5000 });
  const [tab, setTab] = useState('pending');
  const [key, setKey] = useState('');
  const [found, setFound] = useState(null);   // null = nothing looked up, false = not found
  const [err, setErr] = useState('');
  const [busy, run] = useAction();

  const lists = useMemo(() => ({
    pending:   rows.filter(u => u.connection_status === 'pending'),
    connected: rows.filter(u => u.connection_status === 'connected'),
    all:       rows,
  }), [rows]);

  const lookup = (e) => {
    e?.preventDefault();
    setErr(''); setFound(null);
    if (!key.trim()) { setErr('Enter a connection key.'); return; }
    run('look', async () => {
      const { data, error: e2 } = await supabase.rpc('admin_lookup_connection_key', { p_key: key });
      if (e2) { setErr(e2.message); throw e2; }
      setFound(data || false);
    });
  };

  const setStatus = (userId, status, label) => run(userId, async () => {
    const { error: e2 } = await supabase.rpc('admin_set_connection_status', { p_user_id: userId, p_status: status });
    if (e2) throw e2;
    if (found && found.id === userId) setFound({ ...found, connection_status: status, connected_at: status === 'connected' ? new Date().toISOString() : null });
    reload(); refreshCounts?.();
  }, label);

  return (
    <>
      <PageHead title="Connections" sub="Enter a user's connection key to connect their account. Their profile shows Connected straight away, and they get a notification." />

      <form className="ad-card" style={{ padding:18, display:'grid', gap:12, marginBottom:18 }} onSubmit={lookup}>
        <label className="ad-field"><span>Connection key</span>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <input className="ad-input ad-mono" style={{ flex:'1 1 260px', textTransform:'uppercase', letterSpacing:'.06em' }} value={key}
              onChange={e => { setKey(e.target.value); setFound(null); setErr(''); }} placeholder="PGS-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} />
            <button className="ad-btn ad-btn-ghost" type="submit" disabled={busy === 'look'}><Search />Find account</button>
          </div>
          <small>Dashes, spaces and capital letters don't matter.</small>
        </label>
        {err && <div className="ad-err" role="alert">{err}</div>}
        {found === false && <div className="ad-err" role="alert">No account has that key. Check it with the user and try again.</div>}
        {found && (
          <div className="ad-card" style={{ padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', background:'var(--surface2)' }} data-testid="found-account">
            <div>
              <div style={{ fontWeight:700 }}>{[found.first_name, found.last_name].filter(Boolean).join(' ') || found.email}</div>
              <div style={{ fontSize:13, color:'var(--muted)' }}>{found.email} · <span className="ad-mono">{found.connection_key}</span></div>
              <div style={{ marginTop:6 }}><ConnectionPill status={found.connection_status} />
                {found.connected_at && <span style={{ fontSize:12.5, color:'var(--muted)', marginLeft:8 }}>since {fmtDateTime(found.connected_at)}</span>}</div>
            </div>
            {found.connection_status === 'connected'
              ? <button className="ad-btn ad-btn-no" type="button" disabled={!!busy} onClick={() => window.confirm(`Disconnect ${found.email}?`) && setStatus(found.id, 'not_connected', 'Disconnected')}><Unplug />Disconnect</button>
              : <button className="ad-btn ad-btn-ok" type="button" disabled={!!busy} onClick={() => setStatus(found.id, 'connected', 'Account connected')}><Plug />Connect account</button>}
          </div>
        )}
      </form>

      <Tabs value={tab} onChange={setTab} items={[
        { key:'pending',   label:'Requests',  count: lists.pending.length },
        { key:'connected', label:'Connected', count: lists.connected.length },
        { key:'all',       label:'All users' },
      ]} />
      <DataTable rows={lists[tab]} loading={loading} error={error} missing={missing} table="users"
        empty={tab === 'pending' ? 'No connection requests' : tab === 'connected' ? 'No connected accounts yet' : 'No users'}
        searchText={u => `${u.first_name} ${u.last_name} ${u.email} ${u.connection_key || ''}`}
        columns={[
          { key:'name', label:'User', render:u => <div className="ad-user"><span>{userName(u)}</span><small>{u.email}</small></div> },
          { key:'connection_key', label:'Key', render:u => <span className="ad-mono">{u.connection_key || '—'}</span> },
          { key:'connection_status', label:'Status', render:u => <ConnectionPill status={u.connection_status} /> },
          { key:'when', label:'Since', render:u => fmtDateTime(u.connection_status === 'connected' ? u.connected_at : u.connection_requested_at) },
          { key:'act', label:'', align:'right', render:u => u.connection_status === 'connected'
              ? <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={busy === u.id} onClick={() => window.confirm(`Disconnect ${u.email}?`) && setStatus(u.id, 'not_connected', 'Disconnected')}><Unplug />Disconnect</button>
              : <button className="ad-btn ad-btn-ok ad-btn-sm" disabled={busy === u.id} onClick={() => setStatus(u.id, 'connected', 'Account connected')}><Check />Connect</button> },
        ]} />
    </>
  );
}
