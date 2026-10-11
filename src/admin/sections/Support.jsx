import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Chips, Pill, UserCell, Modal, useRows, useUsers, useAction, notify, audit, fmtDateTime, userName,
} from '../adminShared';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_KIND = { urgent: 'bad', high: 'bad', medium: 'warn', low: '' };

export default function SupportAdmin({ refreshCounts }) {
  const users = useUsers();
  const tickets = useRows('support_tickets', { order: 'updated_at' });
  const [status, setStatus] = useState('open');
  const [open, setOpen] = useState(null);

  const counts = useMemo(() => tickets.rows.reduce((m, t) => { m[t.status] = (m[t.status] || 0) + 1; return m; }, {}), [tickets.rows]);
  const list = status === 'all' ? tickets.rows : tickets.rows.filter(t => t.status === status);

  return (
    <>
      <PageHead title="Support tickets" sub="Reply to users and keep each ticket's status up to date. Users see replies on their Support page." />
      <DataTable rows={list} loading={tickets.loading} error={tickets.error} missing={tickets.missing} table="support_tickets" onRowClick={setOpen} empty="No tickets here"
        toolbar={<Chips value={status} onChange={setStatus} items={[
          ...STATUSES.map(s => ({ key: s, label: `${s.replace('_', ' ')} (${counts[s] || 0})` })), { key:'all', label:'All' },
        ]} />}
        columns={[
          { key:'ticket_ref', label:'Ticket', render:t => <span className="ad-mono">{t.ticket_ref || String(t.id).slice(0, 8)}</span> },
          { key:'subject', label:'Subject', wrap:true, render:t => <strong style={{ fontWeight:600 }}>{t.subject}</strong> },
          { key:'user', label:'User', render:t => <UserCell user={users[t.user_id]} id={t.user_id} /> },
          { key:'category', label:'Category' },
          { key:'priority', label:'Priority', render:t => <span className={`ad-pill ${PRIORITY_KIND[t.priority] ?? ''}`}>{t.priority || '—'}</span> },
          { key:'status', label:'Status', render:t => <Pill status={t.status} /> },
          { key:'updated_at', label:'Last update', render:t => fmtDateTime(t.updated_at || t.created_at) },
        ]} />
      {open && <Thread ticket={open} user={users[open.user_id]} onClose={() => setOpen(null)} onChanged={() => { tickets.reload(); refreshCounts?.(); }} />}
    </>
  );
}

function Thread({ ticket, user, onClose, onChanged }) {
  const [msgs, setMsgs] = useState(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [busy, run] = useAction();
  const endRef = useRef(null);

  const load = async () => {
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setMsgs(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ticket.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const setTicketStatus = (s) => run('st', async () => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('support_tickets')
      .update({ status: s, updated_at: now, resolved_at: ['resolved', 'closed'].includes(s) ? now : null }).eq('id', ticket.id);
    if (error) throw error;
    audit('set_status', 'support_tickets', ticket.id, { status }, { status: s });
    setStatus(s); onChanged();
  }, `Ticket marked ${s.replace('_', ' ')}`);

  const send = () => run('send', async () => {
    const body = reply.trim();
    const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: null, is_agent: true, body });  // sender_id references users; agents aren't users
    if (error) throw error;
    const next = status === 'open' ? 'in_progress' : status;
    await supabase.from('support_tickets').update({ status: next, updated_at: new Date().toISOString() }).eq('id', ticket.id);
    setStatus(next);
    await notify(ticket.user_id, { title: `New reply on ${ticket.ticket_ref || 'your ticket'}`, description: body.slice(0, 140), category: 'system', icon_class: 'ti-headset', action_url: '/support' });
    setReply(''); load(); onChanged();
  }, 'Reply sent');

  return (
    <Modal title={ticket.subject} sub={`${ticket.ticket_ref || ''} · ${userName(user)} · ${ticket.category || ''}`} onClose={onClose} wide
      footer={<div style={{ display:'flex', gap:10, width:'100%', alignItems:'flex-end' }}>
        <textarea className="ad-textarea" style={{ minHeight:70, flex:1 }} placeholder="Write a reply…" value={reply} onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && reply.trim()) send(); }} />
        <button className="ad-btn ad-btn-accent" disabled={!reply.trim() || busy === 'send'} onClick={send}><Send />Send</button>
      </div>}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ color:'var(--muted)', fontSize:13.5 }}>Status</span>
        <select className="ad-select" style={{ width:'auto', height:34 }} value={status} disabled={busy === 'st'} onChange={e => setTicketStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <span style={{ color:'var(--faint)', fontSize:13 }}>Opened {fmtDateTime(ticket.created_at)}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {msgs === null ? <div className="ad-empty">Loading…</div> : msgs.length === 0 ? <div className="ad-empty">No messages yet.</div> : msgs.map(m => (
          <div key={m.id} style={{
            alignSelf: m.is_agent ? 'flex-end' : 'flex-start', maxWidth:'82%', padding:'10px 14px', borderRadius:14,
            background: m.is_agent ? 'var(--accent-dim)' : 'var(--surface2)', border:`1px solid ${m.is_agent ? 'rgba(226,174,74,.3)' : 'var(--border)'}`,
          }}>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{m.is_agent ? 'Support team' : userName(user)} · {fmtDateTime(m.created_at)}</div>
            <div style={{ whiteSpace:'pre-wrap', fontSize:14.5 }}>{m.body}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </Modal>
  );
}
