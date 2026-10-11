import React, { useMemo, useState } from 'react';
import { PageHead, DataTable, Chips, Modal, useRows, fmtDateTime, prettyKey } from '../adminShared';

/* Read-only view of admin_audit_log: every change made from this console */
export default function AuditLog() {
  const log = useRows('admin_audit_log', { select: '*, admins(email,full_name)', limit: 2000 });
  const [table, setTable] = useState('all');
  const [open, setOpen] = useState(null);

  const tables = useMemo(() => ['all', ...Array.from(new Set(log.rows.map(r => r.target_table))).sort()], [log.rows]);
  const rows = table === 'all' ? log.rows : log.rows.filter(r => r.target_table === table);

  return (
    <>
      <PageHead title="Audit log" sub="Every change made from the admin console: who did it, when, and what it changed. Entries can't be edited here." />
      <DataTable rows={rows} loading={log.loading} error={log.error} missing={log.missing} table="admin_audit_log" onRowClick={setOpen} empty="Nothing logged yet"
        searchText={r => `${r.action} ${r.target_table} ${r.target_id} ${r.admins?.email || ''}`}
        toolbar={tables.length > 2 && <Chips value={table} onChange={setTable} items={tables.slice(0, 9).map(t => ({ key: t, label: t === 'all' ? 'All' : t.replace(/_/g, ' ') }))} />}
        columns={[
          { key:'created_at', label:'When', render:r => fmtDateTime(r.created_at) },
          { key:'admin', label:'Admin', render:r => <div className="ad-user"><span>{r.admins?.full_name || r.admins?.email || '—'}</span><small>{r.admins?.full_name ? r.admins.email : ''}</small></div> },
          { key:'action', label:'Action', render:r => <strong style={{ fontWeight:600 }}>{prettyKey(r.action)}</strong> },
          { key:'target_table', label:'Table', render:r => <span className="ad-mono">{r.target_table}</span> },
          { key:'target_id', label:'Record', render:r => <span className="ad-mono" title={r.target_id}>{String(r.target_id || '').slice(0, 12)}{String(r.target_id || '').length > 12 ? '…' : ''}</span> },
        ]} />
      {open && (
        <Modal title={prettyKey(open.action)} sub={`${open.target_table} · ${open.target_id} · ${fmtDateTime(open.created_at)}`} onClose={() => setOpen(null)} wide>
          <div className="ad-form">
            <div className="ad-field"><span>Before</span><pre className="ad-textarea code" style={{ whiteSpace:'pre-wrap', minHeight:120 }}>{open.old_value ? JSON.stringify(open.old_value, null, 2) : '—'}</pre></div>
            <div className="ad-field"><span>After</span><pre className="ad-textarea code" style={{ whiteSpace:'pre-wrap', minHeight:120 }}>{open.new_value ? JSON.stringify(open.new_value, null, 2) : '—'}</pre></div>
          </div>
          {open.ip_address && <small style={{ color:'var(--faint)' }}>IP {open.ip_address}</small>}
        </Modal>
      )}
    </>
  );
}
