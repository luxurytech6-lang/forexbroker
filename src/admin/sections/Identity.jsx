/**
 * Identity.jsx — Admin → Identity checks
 * Review identity verifications submitted on /verify-identity: see the
 * details, the ID photos and the selfie, then approve or reject with a reason.
 * Approving marks the user as verified (the database does that).
 */
import React, { useEffect, useState } from 'react';
import { Check, X, Eye, FileText, ExternalLink, Loader2 } from 'lucide-react';
import {
  supabase, PageHead, DataTable, Tabs, Pill, UserCell, Modal, useRows, useUsers, useAction, fmtDate, fmtDateTime,
} from '../adminShared';

export const IDENTITY_BUCKET = 'identity-documents';

const DOC = { passport: 'Passport', national_id: 'National ID', drivers_license: "Driver's licence", residence_permit: 'Residence permit' };
const REASONS = [
  'The photo is blurry or hard to read.',
  'The document has expired.',
  'The name doesn’t match your account details.',
  'The selfie doesn’t match the document photo.',
  'Part of the document is cut off or covered.',
  'This type of document isn’t accepted.',
];
const age = (dob) => { if (!dob) return ''; const d = new Date(dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

export default function IdentitySection({ refreshCounts }) {
  const users = useUsers();
  const { rows, loading, error, missing, reload } = useRows('identity_verifications', { order: 'submitted_at' });
  const [tab, setTab] = useState('pending');
  const [open, setOpen] = useState(null);

  const list = tab === 'all' ? rows : rows.filter(r => r.status === tab);
  const count = (s) => rows.filter(r => r.status === s).length;

  return (
    <>
      <PageHead title="Identity checks" sub="Check each person's ID and selfie. Approving marks their account as verified; rejecting asks them to try again with the reason you give." />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'pending',  label:'Waiting for review', count: count('pending') },
        { key:'approved', label:'Approved' },
        { key:'rejected', label:'Rejected' },
        { key:'all',      label:'All' },
      ]} />
      <DataTable rows={list} loading={loading} error={error} missing={missing} table="identity_verifications" onRowClick={setOpen}
        empty={tab === 'pending' ? 'Nothing waiting for review' : 'No identity checks here yet'}
        searchText={r => `${r.first_name} ${r.last_name} ${users[r.user_id]?.email || ''} ${r.document_number} ${r.country}`}
        columns={[
          { key:'submitted_at', label:'Submitted', render:r => fmtDateTime(r.submitted_at) },
          { key:'user', label:'Account', render:r => <UserCell user={users[r.user_id]} id={r.user_id} /> },
          { key:'name', label:'Name on ID', render:r => `${r.first_name} ${r.last_name}` },
          { key:'document_type', label:'Document', render:r => DOC[r.document_type] || r.document_type },
          { key:'country', label:'Country', render:r => r.country || '—' },
          { key:'status', label:'Status', render:r => <Pill status={r.status} /> },
          { key:'act', label:'', align:'right', render:r => <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={(e) => { e.stopPropagation(); setOpen(r); }}><Eye />{r.status === 'pending' ? 'Review' : 'View'}</button> },
        ]}
      />
      {open && <ReviewModal row={open} user={users[open.user_id]} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); refreshCounts?.(); }} />}
    </>
  );
}

function DocImage({ path, label }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    if (!path) return undefined;
    supabase.storage.from(IDENTITY_BUCKET).createSignedUrl(path, 900).then(({ data, error }) => {
      if (!live) return;
      if (error) setErr(error.message); else setUrl(data.signedUrl);
    });
    return () => { live = false; };
  }, [path]);
  if (!path) return null;
  const isPdf = /\.pdf$/i.test(path);
  return (
    <figure style={{ margin:0, display:'grid', gap:6 }}>
      <figcaption style={{ fontSize:12.5, fontWeight:600, color:'var(--muted)' }}>{label}</figcaption>
      <a href={url || undefined} target="_blank" rel="noreferrer" className="ad-card"
        style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:150, overflow:'hidden', background:'var(--bg)', color:'var(--muted)', textDecoration:'none' }}>
        {err ? <span className="ad-err" style={{ padding:12 }}>Couldn't open: {err}</span>
          : !url ? <Loader2 className="ad-spin" />
          : isPdf ? <span style={{ display:'flex', alignItems:'center', gap:8, padding:12 }}><FileText />Open PDF<ExternalLink size={14} /></span>
          : <img src={url} alt={label} style={{ width:'100%', maxHeight:260, objectFit:'contain', display:'block' }} />}
      </a>
    </figure>
  );
}

function ReviewModal({ row: r, user, onClose, onDone }) {
  const [busy, run] = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const review = (approve) => run(approve ? 'ok' : 'no', async () => {
    const { error } = await supabase.rpc('admin_review_identity', { p_id: r.id, p_approve: approve, p_reason: approve ? null : reason.trim() });
    if (error) throw error;
    onDone();
  }, approve ? 'Identity approved' : 'Identity rejected');

  const accountName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
  const nameMismatch = accountName && accountName.toLowerCase() !== `${r.first_name} ${r.last_name}`.toLowerCase();

  return (
    <Modal wide title={`${r.first_name} ${r.last_name}`} sub={`${DOC[r.document_type] || r.document_type} · submitted ${fmtDateTime(r.submitted_at)}`} onClose={onClose}
      footer={r.status === 'pending' ? (
        rejecting ? <>
          <button className="ad-btn ad-btn-ghost" onClick={() => setRejecting(false)} disabled={!!busy}>Back</button>
          <button className="ad-btn ad-btn-no" disabled={!reason.trim() || !!busy} onClick={() => review(false)}><X />Reject and tell the user</button>
        </> : <>
          <button className="ad-btn ad-btn-no" onClick={() => setRejecting(true)} disabled={!!busy}><X />Reject…</button>
          <button className="ad-btn ad-btn-ok" onClick={() => window.confirm(`Approve ${r.first_name} ${r.last_name}'s identity?`) && review(true)} disabled={!!busy}><Check />Approve</button>
        </>
      ) : <>
        {r.status === 'approved' && <button className="ad-btn ad-btn-no" disabled={!!busy} onClick={() => setRejecting(true)}><X />Revoke…</button>}
        {rejecting && <button className="ad-btn ad-btn-no" disabled={!reason.trim() || !!busy} onClick={() => review(false)}>Confirm</button>}
        <button className="ad-btn ad-btn-accent" onClick={onClose}>Close</button>
      </>}>

      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <Pill status={r.status} />
        {r.reviewed_at && <span style={{ fontSize:13, color:'var(--muted)' }}>Reviewed {fmtDateTime(r.reviewed_at)}</span>}
        {r.status === 'rejected' && r.rejection_reason && <span style={{ fontSize:13, color:'var(--red)' }}>Reason: {r.rejection_reason}</span>}
      </div>

      <div className="ad-kv">
        <div><span>Name on ID</span><strong>{r.first_name} {r.last_name}</strong></div>
        <div><span>Account</span><strong>{user?.email || r.user_id}{nameMismatch ? ` (account name: ${accountName})` : ''}</strong></div>
        <div><span>Date of birth</span><strong>{fmtDate(r.date_of_birth)} · {age(r.date_of_birth)} years</strong></div>
        <div><span>Nationality</span><strong>{r.nationality || '—'}</strong></div>
        <div><span>Address</span><strong>{[r.address_line, r.city, r.state_region, r.postal_code, r.country].filter(Boolean).join(', ')}</strong></div>
        <div><span>Document</span><strong>{DOC[r.document_type] || r.document_type} · <span className="ad-mono">{r.document_number}</span></strong></div>
        <div><span>Expires</span><strong>{r.document_expiry ? fmtDate(r.document_expiry) : 'Not given'}</strong></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12 }}>
        <DocImage path={r.doc_front_path} label={r.doc_back_path ? 'Front' : 'Photo page'} />
        <DocImage path={r.doc_back_path} label="Back" />
        <DocImage path={r.selfie_path} label="Selfie with document" />
      </div>

      {rejecting && (
        <div className="ad-card" style={{ padding:16, display:'grid', gap:10 }}>
          <div style={{ fontWeight:600 }}>Why? The user sees this message.</div>
          <div className="ad-chips">
            {REASONS.map(x => <button key={x} type="button" className={`ad-chip${reason === x ? ' active' : ''}`} style={{ textTransform:'none' }} onClick={() => setReason(x)}>{x}</button>)}
          </div>
          <textarea className="ad-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Or write your own reason" />
        </div>
      )}
    </Modal>
  );
}
