import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'

const stBadge = (s) => (s === 'completed' ? 'b-ok' : ['in_progress', 'ringing', 'initiated'].includes(s) ? 'b-warn' : 'b-bad')
const fmtDur = (n) => { const s = Number(n || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

/**
 * Call history table + transcript modal for admin.
 * @param {string} listEndpoint — e.g. '/admin/calls' or '/admin/voice/calls'
 * @param {string} itemEndpoint — e.g. '/admin/calls' or '/admin/voice/calls'
 * @param {Function} apiGet
 * @param {boolean} [showBusiness]
 */
export function AdminCallHistory({
  listEndpoint = '/admin/calls',
  itemEndpoint = '/admin/calls',
  apiGet,
  showBusiness = true,
  reloadKey = 0,
  compact = false,
}) {
  const { t, locale } = useAdminT()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  const load = () => apiGet(listEndpoint).then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [listEndpoint, reloadKey])

  const shown = useMemo(() => rows.filter((r) => filter === 'all' || r.direction === filter), [rows, filter])

  async function view(id) {
    try { setOpen(await apiGet(`${itemEndpoint}/${id}`)) } catch { /* ignore */ }
  }

  return (
    <div className={compact ? '' : 'card'}>
      <div className="call-hist-head">
        <h3 style={{ margin: 0 }}><Icon name="phone-call" />{t('call_history_title')}</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{t('all')}</option>
          <option value="inbound">{t('incoming')}</option>
          <option value="outbound">{t('outgoing')}</option>
        </select>
        <button className="btn btn-o" onClick={load} title={t('refresh')}><Icon name="activity" size={14} /></button>
      </div>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th></th>
              {showBusiness && <th>{t('th_biz')}</th>}
              <th>{t('th_number')}</th>
              <th>{t('th_when')}</th>
              <th>{t('th_duration')}</th>
              <th>{t('th_status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Icon name={r.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} /></td>
                {showBusiness && <td style={{ fontSize: 12.5 }}>{r.business_name || '—'}</td>}
                <td><b>{r.direction === 'inbound' ? r.from : r.to}</b></td>
                <td>{new Date(r.date).toLocaleString(locale)}</td>
                <td>{fmtDur(r.duration_sec)}</td>
                <td><span className={`badge ${stBadge(r.status)}`}>{String(r.status || '').toUpperCase()}</span></td>
                <td><button className="btn btn-o" style={{ padding: '5px 10px' }} onClick={() => view(r.id)}>{t('view')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div className="inbox-empty">{t('no_calls')}</div>}
      </div>
      {open && <TranscriptModal call={open} onClose={() => setOpen(null)} t={t} locale={locale} />}
    </div>
  )
}

function TranscriptModal({ call, onClose, t, locale }) {
  const turns = call.turns || []
  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: '86vh', overflow: 'auto' }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 2 }}>
          <Icon name={call.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} />{' '}
          {call.direction === 'inbound' ? call.from : call.to}
        </h3>
        {call.business_name && (
          <p style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>{call.business_name}</p>
        )}
        <p style={{ color: 'var(--mut)', fontSize: 12.5, marginBottom: 12 }}>
          {new Date(call.date).toLocaleString(locale)} · {fmtDur(call.duration_sec)} · {String(call.status || '').toUpperCase()}
        </p>
        {call.summary && (
          <div className="call-summary"><b>{t('summary')}:</b> {call.summary}</div>
        )}
        {turns.length === 0 ? (
          <div style={{ color: 'var(--mut)', fontSize: 13, padding: 8 }}>{t('vc_no_transcript')}</div>
        ) : (
          <div className="transcript-turns">
            {turns.map((tn, i) => (
              <div key={i} className={`turn ${tn.role}`}>
                <div className="turn-bub">{tn.text}</div>
                <div className="turn-meta">
                  {tn.role === 'agent' ? t('agent') : t('caller')}
                  {tn.at ? ' · ' + new Date(tn.at).toLocaleTimeString(locale) : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
