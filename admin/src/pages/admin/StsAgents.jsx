import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiPostAuth, apiDelete } from '../../lib/api'
import { useToast } from '../ui'
import { VoiceAgent } from './VoiceAgent'
import { KbEditModal } from './KbEditModal'
import { WhatsAppQrPanel } from './WhatsAppQrPanel'

/**
 * STS's OWN agents. The admin configures + trains STS's official WhatsApp,
 * Instagram and Voice agents here — exactly like a customer does for their
 * business. Everything is scoped server-side to the "STS Official" business
 * via the /admin/agent/* (and /admin/voice/*) endpoints.
 */
const TABS = [
  { v: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
  { v: 'instagram', label: 'Instagram', icon: 'instagram' },
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
      {tab === 'voice' ? <VoiceAgent /> : <ChannelAgent key={tab} channel={tab} ctx={ctx} />}
    </>
  )
}

/* ---------------- one channel (whatsapp / instagram) ---------------- */
function ChannelAgent({ channel, ctx }) {
  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <AgentConnection channel={channel} spec={ctx?.spec?.[channel]} />
        <AgentBot channel={channel} />
      </div>
      {channel === 'whatsapp' && <div style={{ marginBottom: 18 }}><WhatsAppWebhook ctx={ctx} /></div>}
      <AgentKnowledge channel={channel} businessId={ctx?.business_id} />
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

/* ---------------- bot training (greeting / tone / language / toggles) ---------------- */
function AgentBot({ channel }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [b, setB] = useState({ auto_reply: true, human_handoff: true, after_hours_only: false, greeting: '', tone: 'friendly', language: 'auto' })
  useEffect(() => { apiGet(`/admin/agent/${channel}/bot`).then((r) => r && setB((s) => ({ ...s, ...r }))).catch(() => {}) }, [channel])
  const set = (k, v) => setB((s) => ({ ...s, [k]: v }))
  async function save() { try { await apiPut(`/admin/agent/${channel}/bot`, b); toast(isAr ? 'تم الحفظ ✓' : 'Saved ✓') } catch { toast(isAr ? 'فشل الحفظ' : 'Save failed') } }
  const Toggle = ({ k, label, sub }) => (
    <div className="row"><div><b>{label}</b>{sub && <p>{sub}</p>}</div>
      <label className="switch"><input type="checkbox" checked={!!b[k]} onChange={(e) => set(k, e.target.checked)} /><span className="slider" /></label>
    </div>
  )
  return (
    <div className="card">
      <h3><Icon name="bot" />{isAr ? 'تدريب الوكيل' : 'Agent training'}</h3>
      <Toggle k="auto_reply" label={isAr ? 'رد تلقائي بالذكاء' : 'Auto-reply with AI'} sub={isAr ? 'يرد على الرسائل فوراً' : 'Answer messages instantly, 24/7'} />
      <Toggle k="human_handoff" label={isAr ? 'تحويل لموظف' : 'Human handoff'} sub={isAr ? 'عند طلب العميل شخصاً' : 'Escalate when the customer asks for a person'} />
      <div className="field" style={{ marginTop: 12 }}><label>{isAr ? 'رسالة الترحيب' : 'Greeting message'}</label>
        <textarea rows="2" value={b.greeting || ''} onChange={(e) => set('greeting', e.target.value)} />
      </div>
      <div className="field"><label>{isAr ? 'الأسلوب' : 'Tone'}</label>
        <select value={b.tone || 'friendly'} onChange={(e) => set('tone', e.target.value)}>
          <option value="friendly">{isAr ? 'ودود' : 'Friendly'}</option>
          <option value="professional">{isAr ? 'احترافي' : 'Professional'}</option>
          <option value="playful">{isAr ? 'مرح' : 'Playful'}</option>
        </select>
      </div>
      <div className="field"><label>{isAr ? 'اللغة' : 'Language'}</label>
        <select value={b.language || 'auto'} onChange={(e) => set('language', e.target.value)}>
          <option value="auto">{isAr ? 'تلقائي' : 'Auto'}</option>
          <option value="en">English</option><option value="ar">العربية</option>
        </select>
      </div>
      <button className="btn btn-g" onClick={save}><Icon name="save" size={16} />{isAr ? 'حفظ' : 'Save'}</button>
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

/* ---------------- knowledge base (per-agent, edit + scope) ---------------- */
const KB_ICON = { file: 'file-text', url: 'globe', qa: 'message-square' }
function AgentKnowledge({ channel, businessId }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [kb, setKb] = useState([])
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [scope, setScope] = useState(channel)  // default to this agent
  const [editing, setEditing] = useState(null)

  const load = () => { if (businessId) apiGet(`/admin/businesses/${businessId}/knowledge`).then(setKb).catch(() => {}) }
  useEffect(() => { load() }, [businessId])
  useEffect(() => { setScope(channel) }, [channel])

  async function importUrl() { if (!url.trim() || !businessId) return; await apiPostAuth(`/admin/businesses/${businessId}/knowledge`, { type: 'url', title: url.trim(), source_url: url.trim(), meta: 'URL', channel: scope }).catch(() => {}); setUrl(''); toast(isAr ? 'تمت الإضافة ✓' : 'Added ✓'); load() }
  async function addQa() { if (!q.trim() || !businessId) return; await apiPostAuth(`/admin/businesses/${businessId}/knowledge`, { type: 'qa', title: q.trim(), content: a.trim(), meta: 'Q&A', channel: scope }).catch(() => {}); setQ(''); setA(''); toast(isAr ? 'تم التدريب ✓' : 'Trained ✓'); load() }
  async function remove(id) { await apiDelete(`/admin/knowledge/${id}`).catch(() => {}); load() }

  // show this agent's own entries + shared 'all'
  const shown = kb.filter((s) => (s.channel || 'all') === 'all' || (s.channel || 'all') === channel)
  const CH = [
    { v: 'all', label: isAr ? 'كل الوكلاء (مشترك)' : 'All agents (shared)' },
    { v: 'whatsapp', label: 'WhatsApp' }, { v: 'instagram', label: 'Instagram' },
    { v: 'website', label: isAr ? 'الموقع' : 'Website' }, { v: 'voice', label: isAr ? 'الصوت' : 'Voice' },
  ]

  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="brain" />{isAr ? 'تدريب المعرفة' : 'Knowledge training'}</h3>
        <div className="field"><label>{isAr ? 'تدريب لِـ' : 'Train for'}</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>{CH.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</select>
        </div>
        <div className="field"><label>{isAr ? 'استيراد من رابط' : 'Import from URL'}</label>
          <div style={{ display: 'flex', gap: 8 }}><input placeholder="https://example.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} /><button className="btn btn-p" onClick={importUrl}>{isAr ? 'استيراد' : 'Import'}</button></div>
        </div>
        <div className="field"><label>{isAr ? 'سؤال وجواب' : 'Add Q&A'}</label>
          <input placeholder={isAr ? 'السؤال…' : 'Question…'} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
          <textarea rows="2" placeholder={isAr ? 'الجواب…' : 'Answer…'} value={a} onChange={(e) => setA(e.target.value)} />
        </div>
        <button className="btn btn-g" onClick={addQa}><Icon name="brain" size={16} />{isAr ? 'تدريب الوكيل' : 'Train the agent'}</button>
      </div>
      <div className="card">
        <h3><Icon name="library" />{isAr ? 'مصادر المعرفة' : 'Knowledge sources'} <span className="badge b-info" style={{ marginInlineStart: 'auto' }}>{shown.length}</span></h3>
        {shown.map((s) => (
          <div className="kb-item" key={s.id}>
            <div className="ic"><Icon name={KB_ICON[s.type] || 'file-text'} /></div>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditing(s)}><b>{s.title}</b><span>{s.meta || ''}</span></div>
            <span className={`badge ${(s.channel || 'all') === 'all' ? 'b-info' : 'b-ok'}`}>{(s.channel || 'all') === 'all' ? (isAr ? 'الكل' : 'ALL') : (s.channel || '').toUpperCase()}</span>
            <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 8 }} onClick={() => setEditing(s)}><Icon name="pencil" size={13} /></button>
            <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 6 }} onClick={() => remove(s.id)}><Icon name="x" size={13} /></button>
          </div>
        ))}
        {shown.length === 0 && <div style={{ color: 'var(--mut)', fontSize: 13, padding: 12 }}>{isAr ? 'لا توجد مصادر بعد.' : 'No knowledge yet.'}</div>}
      </div>
      {editing && (
        <KbEditModal entry={editing} putBase="/admin/knowledge" channels={CH} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}
