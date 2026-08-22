import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { apiGet, apiPostAuth } from '../../lib/api'
import { useToast } from './ui'

/* ---------------- Webhook URL card (paste into Twilio) ---------------- */
export function VoiceWebhookCard({ endpoint = '/me/voice/webhook-info' }) {
  const { t, locale } = useLang()
  const toast = useToast()
  const [info, setInfo] = useState(null)
  useEffect(() => { apiGet(endpoint).then(setInfo).catch(() => {}) }, [endpoint])
  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(t('toast_copied')) }
  return (
    <div className="card">
      <h3><Icon name="webhook" /><T k="vc_webhook" /></h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}><T k="vc_webhook_hint" /></p>
      <div className="field"><label><T k="vc_incoming_url" /></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={info?.incoming_url || ''} />
          <button className="btn btn-o" onClick={() => copy(info?.incoming_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
      <div className="field"><label><T k="vc_event_url" /></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={info?.event_url || ''} />
          <button className="btn btn-o" onClick={() => copy(info?.event_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
      <div className="field"><label><T k="vc_ws_url" /></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={info?.websocket_url || ''} />
          <button className="btn btn-o" onClick={() => copy(info?.websocket_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Dial card (outbound call) ---------------- */
export function DialCard({ dialEndpoint = '/me/calls/dial', onCalled }) {
  const { t } = useLang()
  const toast = useToast()
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)

  async function call() {
    const to = num.trim()
    if (to.replace(/[^\d]/g, '').length < 6) { toast(t('toast_valid_number')); return }
    setBusy(true)
    try {
      await apiPostAuth(dialEndpoint, { to })
      toast(t('toast_calling'))
      setNum('')
      onCalled?.()
    } catch (e) {
      toast(e.message || t('toast_call_failed'))
    } finally { setBusy(false) }
  }

  return (
    <div className="card">
      <h3><Icon name="phone-outgoing" /><T k="vc_dial" /></h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}><T k="vc_dial_hint" /></p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && call()}
          placeholder="+965 9XXX XXXX / +91 98XXX XXXXX"
          style={{ flex: 1, fontSize: 16 }}
        />
        <button className="btn btn-g" onClick={call} disabled={busy} style={{ minWidth: 120, justifyContent: 'center' }}>
          <Icon name="phone-call" size={16} />{busy ? <T k="saving" /> : <T k="vc_call" />}
        </button>
      </div>
    </div>
  )
}

/* ---------------- Call history + transcript viewer ---------------- */
const stBadge = (s) => (s === 'completed' ? 'b-ok' : s === 'in_progress' || s === 'ringing' || s === 'initiated' ? 'b-warn' : 'b-bad')
const fmtDur = (n) => { const s = Number(n || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

export function CallHistory({ listEndpoint = '/me/calls', itemEndpoint = '/me/calls', reloadKey = 0 }) {
  const { t, locale } = useLang()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  const load = () => apiGet(listEndpoint).then(setRows).catch(() => {})
  useEffect(() => { load() }, [listEndpoint, reloadKey])

  const shown = rows.filter((r) => filter === 'all' || r.direction === filter)

  async function view(id) {
    try { setOpen(await apiGet(`${itemEndpoint}/${id}`)) } catch { /* ignore */ }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}><Icon name="phone-call" /><T k="vc_hist" /></h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginInlineStart: 'auto', maxWidth: 160 }}>
          <option value="all">{t('all')}</option>
          <option value="inbound">{t('incoming')}</option>
          <option value="outbound">{t('outgoing')}</option>
        </select>
        <button className="btn btn-o" onClick={load} title={t('refresh')}><Icon name="activity" size={14} /></button>
      </div>
      <div className="tbl">
        <table>
          <thead><tr>
            <th></th><th><T k="vc_th_num" /></th><th><T k="vc_th_when" /></th>
            <th><T k="vc_th_dur" /></th><th><T k="th_st" /></th><th></th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Icon name={r.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} style={{ color: r.direction === 'inbound' ? '#3730A3' : 'var(--lagoon-d)' }} /></td>
                <td><b>{r.direction === 'inbound' ? r.from : r.to}</b></td>
                <td>{new Date(r.date).toLocaleString(locale)}</td>
                <td>{fmtDur(r.duration_sec)}</td>
                <td><span className={`badge ${stBadge(r.status)}`}>{String(r.status || '').toUpperCase()}</span></td>
                <td><button className="btn btn-o" style={{ padding: '5px 10px' }} onClick={() => view(r.id)}><T k="view_lbl" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div style={{ color: 'var(--mut)', fontSize: 13, padding: 16, textAlign: 'center' }}><T k="vc_no_calls" /></div>}
      </div>

      {open && <TranscriptModal call={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function TranscriptModal({ call, onClose }) {
  const { t, locale } = useLang()
  const turns = call.turns || []
  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: '86vh', overflow: 'auto' }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 2 }}>
          <Icon name={call.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} />{' '}
          {call.direction === 'inbound' ? call.from : call.to}
        </h3>
        <p style={{ color: 'var(--mut)', fontSize: 12.5, marginBottom: 12 }}>
          {new Date(call.date).toLocaleString(locale)} · {fmtDur(call.duration_sec)} · {String(call.status || '').toUpperCase()}
        </p>
        {call.summary && (
          <div style={{ background: '#F0F9F6', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
            <b>{t('summary')}:</b> {call.summary}
          </div>
        )}
        {turns.length === 0 ? (
          <div style={{ color: 'var(--mut)', fontSize: 13, padding: 8 }}>{t('vc_no_transcript')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {turns.map((tn, i) => (
              <div key={i} style={{ alignSelf: tn.role === 'agent' ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                <div style={{
                  background: tn.role === 'agent' ? '#EAF9F3' : '#EEF2F7',
                  borderRadius: 12, padding: '8px 12px', fontSize: 13.5,
                }}>{tn.text}</div>
                <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 2, textAlign: tn.role === 'agent' ? 'start' : 'end' }}>
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
