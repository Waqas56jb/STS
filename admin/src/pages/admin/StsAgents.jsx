import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiDelete } from '../../lib/api'
import { useToast } from '../ui'
import { VoiceAgent } from './VoiceAgent'
import { WhatsAppQrPanel } from './WhatsAppQrPanel'
import { TrainingStudio, adminTrainingApi } from './TrainingStudio'

/**
 * STS's OWN agents. The admin configures + trains STS's official WhatsApp,
 * Instagram and Voice agents here — exactly like a customer does for their
 * business. Everything is scoped server-side to the "STS Official" business
 * via the /admin/agent/* (and /admin/voice/*) endpoints.
 */
const TABS = [
  { v: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
  { v: 'instagram', label: 'Instagram', icon: 'instagram' },
  { v: 'website', label: 'Website', icon: 'globe' },
  { v: 'voice', label: 'Voice', icon: 'phone-call' },
]

export function StsAgents() {
  const [tab, setTab] = useState('whatsapp')
  const [ctx, setCtx] = useState(null)
  useEffect(() => { apiGet('/admin/agent/context').then(setCtx).catch(() => {}) }, [])

  return (
    <>
      <div className="conn-tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.v} className={`conn-tab ${tab === t.v ? 'on' : ''}`} onClick={() => setTab(t.v)}>
            <Icon name={t.icon} size={15} />{t.label}
          </button>
        ))}
      </div>
      {tab === 'voice' ? <VoiceAgent businessId={ctx?.business_id} />
        : tab === 'website' ? (ctx?.business_id ? <TrainingStudio api={adminTrainingApi(ctx.business_id)} defaultChannel="website" /> : null)
        : <ChannelAgent key={tab} channel={tab} ctx={ctx} />}
    </>
  )
}

/* ---------------- one channel (whatsapp / instagram) ---------------- */
function ChannelAgent({ channel, ctx }) {
  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <AgentConnection channel={channel} spec={ctx?.spec?.[channel]} />
        {channel === 'whatsapp' && <WhatsAppWebhook ctx={ctx} />}
      </div>
      {ctx?.business_id && <TrainingStudio api={adminTrainingApi(ctx.business_id)} defaultChannel={channel} />}
    </>
  )
}

/* ---------------- connection (credentials) ---------------- */
function AgentConnection({ channel, spec }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({})
  const [shown, setShown] = useState({})
  const [saving, setSaving] = useState(false)
  const [waProvider, setWaProvider] = useState('qr')

  const load = () => apiGet(`/admin/agent/${channel}/connection`).then((c) => {
    setCurrent(c)
    if (channel === 'whatsapp') setWaProvider(c?.provider === 'cloud_api' ? 'cloud_api' : 'qr')
  }).catch(() => {})
  useEffect(() => { load() }, [channel])
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
      const r = await apiPut(`/admin/agent/${channel}/connection`, { fields: form })
      await load()
      toast(r.connected ? (isAr ? 'تم الحفظ — متصل ✓' : 'Saved — connected ✓') : (isAr ? 'تم الحفظ ✓' : 'Saved ✓'))
    } catch { toast(isAr ? 'فشل الحفظ' : 'Save failed') } finally { setSaving(false) }
  }
  async function disconnect() {
    if (!window.confirm(isAr ? 'حذف بيانات الاتصال؟' : 'Delete these credentials?')) return
    try { await apiDelete(`/admin/agent/${channel}/connection`); setForm({}); await load(); toast(isAr ? 'تم الحذف' : 'Disconnected') }
    catch { toast(isAr ? 'فشل الحذف' : 'Delete failed') }
  }
  if (!spec) return <div className="card"><h3><Icon name="plug-zap" />{isAr ? 'الاتصال' : 'Connection'}</h3></div>

  return (
    <div className="card">
      <h3><Icon name="plug-zap" />{spec.label.split(' — ')[0]} — {isAr ? 'الاتصال' : 'Connection'}</h3>
      <div className="conn-status">
        <span className={`badge ${current?.connected ? 'b-ok' : 'b-warn'}`}>
          {current?.connected ? (isAr ? 'متصل' : 'CONNECTED') : (isAr ? 'غير متصل' : 'NOT CONNECTED')}
        </span>
      </div>
      {channel === 'whatsapp' && (
        <div className="conn-tabs" style={{ marginBottom: 12 }}>
          <button className={`conn-tab ${waProvider === 'qr' ? 'on' : ''}`} onClick={() => setWaProvider('qr')}>{isAr ? 'رمز QR' : 'QR / Linked Device'}</button>
          <button className={`conn-tab ${waProvider === 'cloud_api' ? 'on' : ''}`} onClick={() => setWaProvider('cloud_api')}>Meta Cloud API</button>
        </div>
      )}
      {channel === 'whatsapp' && waProvider === 'qr' && (
        <WhatsAppQrPanel base="/admin/agent/whatsapp/qr" />
      )}
      {(channel !== 'whatsapp' || waProvider === 'cloud_api') && spec.fields.map((f) => (
        <div className="field" key={f.key}>
          <label>{f.label}{spec.required.includes(f.key) && ' *'}</label>
          {f.type === 'select' ? (
            <select value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">—</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.secret ? (
            <div style={{ position: 'relative' }}>
              <input type={shown[f.key] ? 'text' : 'password'} value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}
                placeholder={isAr ? 'أدخل القيمة' : 'enter value'} autoComplete="off" style={{ paddingInlineEnd: 42 }} />
              <button type="button" onClick={() => toggle(f.key)} tabIndex={-1}
                style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, padding: 4, cursor: 'pointer', color: 'var(--mut)', display: 'flex' }}>
                <Icon name={shown[f.key] ? 'eye-off' : 'eye'} size={17} />
              </button>
            </div>
          ) : (
            <input type="text" value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} autoComplete="off" />
          )}
        </div>
      ))}
      {(channel !== 'whatsapp' || waProvider === 'cloud_api') && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={save} disabled={saving}>
            <Icon name="save" size={16} />{saving ? '…' : (isAr ? 'حفظ الاتصال' : 'Save connection')}
          </button>
          {current?.connected && <button className="btn btn-o" onClick={disconnect}><Icon name="trash-2" size={15} /></button>}
        </div>
      )}
    </div>
  )
}

/* ---------------- WhatsApp webhook URL ---------------- */
function WhatsAppWebhook({ ctx }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(isAr ? 'تم النسخ ✓' : 'Copied ✓') }
  return (
    <div className="card">
      <h3><Icon name="webhook" />{isAr ? 'رابط Webhook (واتساب)' : 'WhatsApp webhook'}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}>{isAr ? 'الصقه في Meta → WhatsApp → Configuration.' : 'Paste into Meta → your app → WhatsApp → Configuration.'}</p>
      <div className="field"><label>Callback URL</label>
        <div style={{ display: 'flex', gap: 8 }}><input readOnly value={ctx?.whatsapp?.callback_url || ''} /><button className="btn btn-o" onClick={() => copy(ctx?.whatsapp?.callback_url)}><Icon name="copy" size={14} /></button></div>
      </div>
      <div className="field"><label>Verify token</label>
        <div style={{ display: 'flex', gap: 8 }}><input readOnly value={ctx?.whatsapp?.verify_token || ''} /><button className="btn btn-o" onClick={() => copy(ctx?.whatsapp?.verify_token)}><Icon name="copy" size={14} /></button></div>
      </div>
    </div>
  )
}
