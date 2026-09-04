import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiPostAuth, apiDelete } from '../../lib/api'
import { useToast } from '../ui'
import { TrainingStudio, adminTrainingApi } from './TrainingStudio'

/**
 * Admin's own official STS voice agent (Twilio ⇄ OpenAI Realtime).
 * Everything is scoped server-side to the "STS Official" business via the
 * /admin/voice/* endpoints — connection, training, knowledge, dial, transcripts.
 */
const fmtDur = (n) => { const s = Number(n || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const stBadge = (s) => (s === 'completed' ? 'b-ok' : ['in_progress', 'ringing', 'initiated'].includes(s) ? 'b-warn' : 'b-bad')

export function VoiceAgent({ businessId }) {
  const [reload, setReload] = useState(0)
  const [ctx, setCtx] = useState(null)
  const [pid, setPid] = useState(businessId || '')
  useEffect(() => { apiGet('/admin/voice/context').then(setCtx).catch(() => {}) }, [])
  useEffect(() => {
    if (businessId) setPid(businessId)
    else apiGet('/admin/agent/context').then((c) => setPid(c?.business_id || '')).catch(() => {})
  }, [businessId])

  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <VoiceConnection />
        <DialCard onCalled={() => setReload((n) => n + 1)} />
      </div>
      <div style={{ marginBottom: 18 }}><WebhookCard ctx={ctx} /></div>
      {pid && <div style={{ marginBottom: 18 }}><TrainingStudio businessId={pid} api={adminTrainingApi(pid)} defaultChannel="voice" /></div>}
      <CallHistory reloadKey={reload} />
    </>
  )
}

/* ---------------- connection (Twilio creds) ---------------- */
function VoiceConnection() {
  const { t } = useAdminT()
  const toast = useToast()
  const [spec, setSpec] = useState(null)
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({})
  const [shown, setShown] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([apiGet('/admin/connection-spec'), apiGet('/admin/voice/connection')])
    .then(([sp, cur]) => { setSpec(sp.voice); setCurrent(cur) }).catch(() => {})
  useEffect(() => { load() }, [])

  // pre-fill ALL saved fields (incl. secrets) so they persist + stay editable
  useEffect(() => {
    if (!spec) return
    const f = {}
    for (const field of spec.fields) f[field.key] = current?.fields?.[field.key] || ''
    setForm(f)
  }, [spec, current])

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const toggle = (k) => setShown((s) => ({ ...s, [k]: !s[k] }))
  async function save() {
    setSaving(true)
    try {
      const r = await apiPut('/admin/voice/connection', { fields: form })
      const cur = await apiGet('/admin/voice/connection'); setCurrent(cur)
      toast(r.connected ? t('toast_saved_connected') : t('toast_saved'))
    } catch { toast(t('toast_save_failed')) } finally { setSaving(false) }
  }
  async function disconnect() {
    if (!window.confirm(t('toast_delete_confirm'))) return
    try { await apiDelete('/admin/voice/connection'); const cur = await apiGet('/admin/voice/connection'); setCurrent(cur); setForm({}); toast(t('toast_disconnected')) }
    catch { toast(t('toast_delete_failed')) }
  }
  if (!spec) return <div className="card"><h3><Icon name="plug-zap" />{t('voice_conn')}</h3></div>

  return (
    <div className="card">
      <h3><Icon name="plug-zap" />{t('vonage_conn')}</h3>
      <div className="conn-status">
        <span className={`badge ${current?.connected ? 'b-ok' : 'b-warn'}`}>
          {current?.connected ? t('connected') : t('not_connected')}
        </span>
      </div>
      {spec.fields.map((f) => (
        <div className="field" key={f.key}>
          <label>{f.label}{spec.required.includes(f.key) && ' *'}</label>
          {f.type === 'select' ? (
            <select value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">—</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.secret ? (
            <div style={{ position: 'relative' }}>
              <input type={shown[f.key] ? 'text' : 'password'} value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}
                placeholder={t('enter_value')} autoComplete="off" style={{ paddingInlineEnd: 42 }} />
              <button type="button" onClick={() => toggle(f.key)} tabIndex={-1}
                aria-label={shown[f.key] ? t('hide_password') : t('show_password')}
                style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, padding: 4, cursor: 'pointer', color: 'var(--mut)', display: 'flex' }}>
                <Icon name={shown[f.key] ? 'eye-off' : 'eye'} size={17} />
              </button>
            </div>
          ) : (
            <input type="text" value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} autoComplete="off" />
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={save} disabled={saving}>
          <Icon name="save" size={16} />{saving ? '…' : t('conn_save')}
        </button>
        {current?.connected && (
          <button className="btn btn-o" onClick={disconnect} title={t('disconnect')}><Icon name="trash-2" size={15} /></button>
        )}
      </div>
    </div>
  )
}

/* ---------------- dial ---------------- */
function DialCard({ onCalled }) {
  const { t } = useAdminT()
  const toast = useToast()
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)
  async function call() {
    if (num.replace(/[^\d]/g, '').length < 6) { toast(t('toast_valid_number')); return }
    setBusy(true)
    try { await apiPostAuth('/admin/voice/dial', { to: num.trim() }); toast(t('toast_calling')); setNum(''); onCalled?.() }
    catch (e) { toast(e.message || t('toast_call_failed')) } finally { setBusy(false) }
  }
  return (
    <div className="card">
      <h3><Icon name="phone-outgoing" />{t('make_call')}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}>{t('call_desc')}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={num} onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && call()}
          placeholder="+965 9XXX XXXX" style={{ flex: 1, fontSize: 16 }} />
        <button className="btn btn-g" onClick={call} disabled={busy} style={{ minWidth: 110, justifyContent: 'center' }}>
          <Icon name="phone-call" size={16} />{busy ? '…' : t('call_btn')}
        </button>
      </div>
    </div>
  )
}

/* ---------------- webhook URLs ---------------- */
function WebhookCard({ ctx }) {
  const { t } = useAdminT()
  const toast = useToast()
  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(t('toast_copied')) }
  return (
    <div className="card">
      <h3><Icon name="webhook" />{t('webhook_vonage_title')}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}>{t('webhook_vonage_hint')}</p>
      <div className="field"><label>{t('webhook_answer')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={ctx?.incoming_url || ''} />
          <button className="btn btn-o" onClick={() => copy(ctx?.incoming_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
      <div className="field"><label>{t('webhook_event')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={ctx?.event_url || ''} />
          <button className="btn btn-o" onClick={() => copy(ctx?.event_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
      <div className="field"><label>{t('webhook_ws')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={ctx?.websocket_url || ''} />
          <button className="btn btn-o" onClick={() => copy(ctx?.websocket_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- call history + transcripts ---------------- */
function CallHistory({ reloadKey }) {
  const { t, locale } = useAdminT()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const load = () => apiGet('/admin/voice/calls').then(setRows).catch(() => {})
  useEffect(() => { load() }, [reloadKey])
  const shown = useMemo(() => rows.filter((r) => filter === 'all' || r.direction === filter), [rows, filter])
  async function view(id) { try { setOpen(await apiGet(`/admin/voice/calls/${id}`)) } catch { /* ignore */ } }
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}><Icon name="phone-call" />{t('call_history_title')}</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginInlineStart: 'auto', maxWidth: 160 }}>
          <option value="all">{t('all')}</option>
          <option value="inbound">{t('incoming')}</option>
          <option value="outbound">{t('outgoing')}</option>
        </select>
        <button className="btn btn-o" onClick={load} title={t('refresh')}><Icon name="activity" size={14} /></button>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th></th><th>{t('th_number')}</th><th>{t('th_when')}</th><th>{t('th_duration')}</th><th>{t('th_status')}</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Icon name={r.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} /></td>
                <td><b>{r.direction === 'inbound' ? r.from : r.to}</b></td>
                <td>{new Date(r.date).toLocaleString(locale)}</td>
                <td>{fmtDur(r.duration_sec)}</td>
                <td><span className={`badge ${stBadge(r.status)}`}>{String(r.status || '').toUpperCase()}</span></td>
                <td><button className="btn btn-o" style={{ padding: '5px 10px' }} onClick={() => view(r.id)}>{t('view')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div style={{ color: 'var(--mut)', fontSize: 13, padding: 16, textAlign: 'center' }}>{t('no_calls')}</div>}
      </div>
      {open && <TranscriptModal call={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function TranscriptModal({ call, onClose }) {
  const { t, locale } = useAdminT()
  const turns = call.turns || []
  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: '86vh', overflow: 'auto' }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 2 }}>
          <Icon name={call.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} /> {call.direction === 'inbound' ? call.from : call.to}
        </h3>
        <p style={{ color: 'var(--mut)', fontSize: 12.5, marginBottom: 12 }}>
          {new Date(call.date).toLocaleString(locale)} · {fmtDur(call.duration_sec)} · {String(call.status || '').toUpperCase()}
        </p>
        {call.summary && <div style={{ background: '#F0F9F6', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}><b>{t('summary')}:</b> {call.summary}</div>}
        {turns.length === 0 ? (
          <div style={{ color: 'var(--mut)', fontSize: 13, padding: 8 }}>{t('vc_no_transcript')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {turns.map((tn, i) => (
              <div key={i} style={{ alignSelf: tn.role === 'agent' ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                <div style={{ background: tn.role === 'agent' ? '#EAF9F3' : '#EEF2F7', borderRadius: 12, padding: '8px 12px', fontSize: 13.5 }}>{tn.text}</div>
                <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 2, textAlign: tn.role === 'agent' ? 'start' : 'end' }}>
                  {tn.role === 'agent' ? t('agent') : t('caller')}{tn.at ? ' · ' + new Date(tn.at).toLocaleTimeString(locale) : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
