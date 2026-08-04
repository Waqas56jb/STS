import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiPostAuth, apiDelete } from '../../lib/api'
import { useToast } from '../ui'

/**
 * Admin's own official STS voice agent (Twilio ⇄ OpenAI Realtime).
 * Everything is scoped server-side to the "STS Official" business via the
 * /admin/voice/* endpoints — connection, training, knowledge, dial, transcripts.
 */
const fmtDur = (n) => { const s = Number(n || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const stBadge = (s) => (s === 'completed' ? 'b-ok' : ['in_progress', 'ringing', 'initiated'].includes(s) ? 'b-warn' : 'b-bad')

export function VoiceAgent() {
  const { isAr } = useAdminT()
  const [reload, setReload] = useState(0)
  const [ctx, setCtx] = useState(null)
  useEffect(() => { apiGet('/admin/voice/context').then(setCtx).catch(() => {}) }, [])

  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <VoiceConnection />
        <VoiceTraining />
      </div>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <DialCard onCalled={() => setReload((n) => n + 1)} />
        <WebhookCard ctx={ctx} />
      </div>
      <div style={{ marginBottom: 18 }}><VoiceKnowledge /></div>
      <CallHistory reloadKey={reload} />
    </>
  )
}

/* ---------------- connection (Twilio creds) ---------------- */
function VoiceConnection() {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [spec, setSpec] = useState(null)
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([apiGet('/admin/connection-spec'), apiGet('/admin/voice/connection')])
    .then(([sp, cur]) => { setSpec(sp.voice); setCurrent(cur) }).catch(() => {})
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!spec) return
    const f = {}
    for (const field of spec.fields) f[field.key] = field.secret ? '' : current?.fields?.[field.key] || ''
    setForm(f)
  }, [spec, current])

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  async function save() {
    setSaving(true)
    try {
      const r = await apiPut('/admin/voice/connection', { fields: form })
      const cur = await apiGet('/admin/voice/connection'); setCurrent(cur)
      toast(r.connected ? (isAr ? 'تم الحفظ — متصل ✓' : 'Saved — connected ✓') : (isAr ? 'تم الحفظ ✓' : 'Saved ✓'))
    } catch { toast(isAr ? 'فشل الحفظ' : 'Save failed') } finally { setSaving(false) }
  }
  if (!spec) return <div className="card"><h3><Icon name="plug-zap" />{isAr ? 'اتصال الصوت' : 'Voice connection'}</h3></div>

  return (
    <div className="card">
      <h3><Icon name="plug-zap" />{isAr ? 'اتصال Twilio (الصوت)' : 'Twilio connection (voice)'}</h3>
      <div className="conn-status">
        <span className={`badge ${current?.connected ? 'b-ok' : 'b-warn'}`}>
          {current?.connected ? (isAr ? 'متصل' : 'CONNECTED') : (isAr ? 'غير متصل' : 'NOT CONNECTED')}
        </span>
      </div>
      {spec.fields.map((f) => (
        <div className="field" key={f.key}>
          <label>{f.label}{spec.required.includes(f.key) && ' *'}</label>
          {f.type === 'select' ? (
            <select value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">—</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input type={f.secret ? 'password' : 'text'} value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.secret ? (current?.fields?.[f.key] || (isAr ? 'أدخل القيمة' : 'enter value')) : ''} autoComplete="off" />
          )}
        </div>
      ))}
      <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={save} disabled={saving}>
        <Icon name="save" size={16} />{saving ? '…' : (isAr ? 'حفظ الاتصال' : 'Save connection')}
      </button>
    </div>
  )
}

/* ---------------- training (greeting / tone / language) ---------------- */
function VoiceTraining() {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [b, setB] = useState({ greeting: '', tone: 'friendly', language: 'auto' })
  useEffect(() => { apiGet('/admin/voice/bot').then((r) => r && setB((s) => ({ ...s, ...r }))).catch(() => {}) }, [])
  const set = (k, v) => setB((s) => ({ ...s, [k]: v }))
  async function save() {
    try { await apiPut('/admin/voice/bot', b); toast(isAr ? 'تم الحفظ ✓' : 'Saved ✓') } catch { toast(isAr ? 'فشل الحفظ' : 'Save failed') }
  }
  return (
    <div className="card">
      <h3><Icon name="bot" />{isAr ? 'تدريب الوكيل الصوتي' : 'Voice agent training'}</h3>
      <div className="field"><label>{isAr ? 'الجملة الافتتاحية / هدف المكالمة' : 'Opening line / call purpose'}</label>
        <textarea rows="2" value={b.greeting || ''} onChange={(e) => set('greeting', e.target.value)} />
      </div>
      <div className="field"><label>{isAr ? 'الأسلوب' : 'Tone'}</label>
        <select value={b.tone || 'friendly'} onChange={(e) => set('tone', e.target.value)}>
          <option value="friendly">{isAr ? 'ودود' : 'Friendly'}</option>
          <option value="professional">{isAr ? 'احترافي' : 'Professional'}</option>
          <option value="playful">{isAr ? 'مرح' : 'Playful'}</option>
        </select>
      </div>
      <div className="field"><label>{isAr ? 'لغة الوكيل' : 'Agent language'}</label>
        <select value={b.language || 'auto'} onChange={(e) => set('language', e.target.value)}>
          <option value="auto">{isAr ? 'اسأل المتصل (متعدد اللغات)' : 'Ask the caller (multilingual)'}</option>
          <option value="en">English</option><option value="ar">العربية</option>
          <option value="hi">Hindi</option><option value="ur">Urdu</option><option value="fr">Français</option>
        </select>
        <div className="hint" style={{ marginTop: 6 }}>
          {isAr ? 'الافتراضي: يبدأ بالإنجليزية ويسأل ثم يكمل بلغة المتصل. اختر لغة لتثبيتها.' : 'Default: starts English, asks & adapts. Pick a language to lock the agent to it.'}
        </div>
      </div>
      <button className="btn btn-g" onClick={save}><Icon name="save" size={16} />{isAr ? 'حفظ' : 'Save'}</button>
    </div>
  )
}

/* ---------------- dial ---------------- */
function DialCard({ onCalled }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)
  async function call() {
    if (num.replace(/[^\d]/g, '').length < 6) { toast(isAr ? 'أدخل رقماً صحيحاً' : 'Enter a valid number'); return }
    setBusy(true)
    try { await apiPostAuth('/admin/voice/dial', { to: num.trim() }); toast(isAr ? 'جارٍ الاتصال…' : 'Calling…'); setNum(''); onCalled?.() }
    catch (e) { toast(e.message || (isAr ? 'فشل الاتصال' : 'Call failed')) } finally { setBusy(false) }
  }
  return (
    <div className="card">
      <h3><Icon name="phone-outgoing" />{isAr ? 'إجراء مكالمة' : 'Make a call'}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}>
        {isAr ? 'أدخل أي رقم مع رمز الدولة. الوكيل الصوتي سيتولى المحادثة عند الرد.' : 'Enter any number with country code. The AI voice agent handles the call once they answer.'}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={num} onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && call()}
          placeholder="+965 9XXX XXXX" style={{ flex: 1, fontSize: 16 }} />
        <button className="btn btn-g" onClick={call} disabled={busy} style={{ minWidth: 110, justifyContent: 'center' }}>
          <Icon name="phone-call" size={16} />{busy ? '…' : (isAr ? 'اتصال' : 'Call')}
        </button>
      </div>
    </div>
  )
}

/* ---------------- webhook URLs ---------------- */
function WebhookCard({ ctx }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(isAr ? 'تم النسخ ✓' : 'Copied ✓') }
  return (
    <div className="card">
      <h3><Icon name="webhook" />{isAr ? 'روابط Twilio Webhook' : 'Twilio webhook URLs'}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}>
        {isAr ? 'الصقها في إعدادات الصوت لرقم Twilio.' : 'Paste these into your Twilio number’s Voice settings.'}
      </p>
      <div className="field"><label>{isAr ? 'المكالمات الواردة' : 'Incoming (A call comes in)'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={ctx?.incoming_url || ''} />
          <button className="btn btn-o" onClick={() => copy(ctx?.incoming_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
      <div className="field"><label>{isAr ? 'حالة المكالمة (اختياري)' : 'Status callback (optional)'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={ctx?.status_url || ''} />
          <button className="btn btn-o" onClick={() => copy(ctx?.status_url)}><Icon name="copy" size={14} /></button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- knowledge base ---------------- */
const KB_ICON = { file: 'file-text', url: 'globe', qa: 'message-square' }
function VoiceKnowledge() {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [kb, setKb] = useState([])
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [scope, setScope] = useState('voice') // 'voice' (this agent) or 'all' (shared)
  const load = () => apiGet('/admin/voice/knowledge').then(setKb).catch(() => {})
  useEffect(() => { load() }, [])
  async function importUrl() { if (!url.trim()) return; await apiPostAuth('/admin/voice/knowledge', { type: 'url', title: url.trim(), source_url: url.trim(), meta: 'URL', channel: scope }).catch(() => {}); setUrl(''); toast(isAr ? 'تمت الإضافة ✓' : 'Added ✓'); load() }
  async function addQa() { if (!q.trim()) return; await apiPostAuth('/admin/voice/knowledge', { type: 'qa', title: q.trim(), content: a.trim(), meta: 'Q&A', channel: scope }).catch(() => {}); setQ(''); setA(''); toast(isAr ? 'تم التدريب ✓' : 'Trained ✓'); load() }
  async function remove(id) { await apiDelete(`/admin/voice/knowledge/${id}`).catch(() => {}); load() }
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="brain" />{isAr ? 'تدريب المعرفة' : 'Knowledge training'}</h3>
        <div className="field"><label>{isAr ? 'تدريب لِـ' : 'Train for'}</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="voice">{isAr ? 'الوكيل الصوتي فقط' : 'Voice agent only'}</option>
            <option value="all">{isAr ? 'كل الوكلاء (مشترك)' : 'All agents (shared)'}</option>
          </select>
        </div>
        <div className="field"><label>{isAr ? 'استيراد من رابط' : 'Import from URL'}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="https://example.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-p" onClick={importUrl}>{isAr ? 'استيراد' : 'Import'}</button>
          </div>
        </div>
        <div className="field"><label>{isAr ? 'سؤال وجواب' : 'Add Q&A'}</label>
          <input placeholder={isAr ? 'السؤال…' : 'Question…'} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
          <textarea rows="2" placeholder={isAr ? 'الجواب…' : 'Answer…'} value={a} onChange={(e) => setA(e.target.value)} />
        </div>
        <button className="btn btn-g" onClick={addQa}><Icon name="brain" size={16} />{isAr ? 'تدريب الوكيل' : 'Train the agent'}</button>
      </div>
      <div className="card">
        <h3><Icon name="library" />{isAr ? 'مصادر المعرفة' : 'Knowledge sources'} <span className="badge b-info" style={{ marginInlineStart: 'auto' }}>{kb.length}</span></h3>
        {kb.map((s) => (
          <div className="kb-item" key={s.id}>
            <div className="ic"><Icon name={KB_ICON[s.type] || 'file-text'} /></div>
            <div style={{ flex: 1 }}><b>{s.title}</b><span>{s.meta || ''}</span></div>
            <span className={`badge ${(s.channel || 'voice') === 'all' ? 'b-info' : 'b-ok'}`}>
              {(s.channel || 'voice') === 'all' ? (isAr ? 'الكل' : 'ALL') : (isAr ? 'صوت' : 'VOICE')}
            </span>
            <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 8 }} onClick={() => remove(s.id)}><Icon name="x" size={13} /></button>
          </div>
        ))}
        {kb.length === 0 && <div style={{ color: 'var(--mut)', fontSize: 13, padding: 12 }}>{isAr ? 'لا توجد مصادر بعد.' : 'No knowledge yet.'}</div>}
      </div>
    </div>
  )
}

/* ---------------- call history + transcripts ---------------- */
function CallHistory({ reloadKey }) {
  const { isAr } = useAdminT()
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
        <h3 style={{ margin: 0 }}><Icon name="phone-call" />{isAr ? 'سجل المكالمات والنصوص' : 'Call history & transcripts'}</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginInlineStart: 'auto', maxWidth: 160 }}>
          <option value="all">{isAr ? 'الكل' : 'All'}</option>
          <option value="inbound">{isAr ? 'واردة' : 'Incoming'}</option>
          <option value="outbound">{isAr ? 'صادرة' : 'Outgoing'}</option>
        </select>
        <button className="btn btn-o" onClick={load}><Icon name="activity" size={14} /></button>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th></th><th>{isAr ? 'الرقم' : 'Number'}</th><th>{isAr ? 'الوقت' : 'When'}</th><th>{isAr ? 'المدة' : 'Duration'}</th><th>{isAr ? 'الحالة' : 'Status'}</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Icon name={r.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} /></td>
                <td><b>{r.direction === 'inbound' ? r.from : r.to}</b></td>
                <td>{new Date(r.date).toLocaleString(isAr ? 'ar' : 'en-GB')}</td>
                <td>{fmtDur(r.duration_sec)}</td>
                <td><span className={`badge ${stBadge(r.status)}`}>{String(r.status || '').toUpperCase()}</span></td>
                <td><button className="btn btn-o" style={{ padding: '5px 10px' }} onClick={() => view(r.id)}>{isAr ? 'عرض' : 'View'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div style={{ color: 'var(--mut)', fontSize: 13, padding: 16, textAlign: 'center' }}>{isAr ? 'لا توجد مكالمات بعد.' : 'No calls yet.'}</div>}
      </div>
      {open && <TranscriptModal call={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function TranscriptModal({ call, onClose }) {
  const { isAr } = useAdminT()
  const turns = call.turns || []
  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: '86vh', overflow: 'auto' }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 2 }}>
          <Icon name={call.direction === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} size={16} /> {call.direction === 'inbound' ? call.from : call.to}
        </h3>
        <p style={{ color: 'var(--mut)', fontSize: 12.5, marginBottom: 12 }}>
          {new Date(call.date).toLocaleString(isAr ? 'ar' : 'en-GB')} · {fmtDur(call.duration_sec)} · {String(call.status || '').toUpperCase()}
        </p>
        {call.summary && <div style={{ background: '#F0F9F6', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}><b>{isAr ? 'الملخص' : 'Summary'}:</b> {call.summary}</div>}
        {turns.length === 0 ? (
          <div style={{ color: 'var(--mut)', fontSize: 13, padding: 8 }}>{isAr ? 'لا يوجد نص.' : 'No transcript captured.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {turns.map((tn, i) => (
              <div key={i} style={{ alignSelf: tn.role === 'agent' ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                <div style={{ background: tn.role === 'agent' ? '#EAF9F3' : '#EEF2F7', borderRadius: 12, padding: '8px 12px', fontSize: 13.5 }}>{tn.text}</div>
                <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 2, textAlign: tn.role === 'agent' ? 'start' : 'end' }}>
                  {tn.role === 'agent' ? (isAr ? 'الوكيل' : 'Agent') : (isAr ? 'المتصل' : 'Caller')}{tn.at ? ' · ' + new Date(tn.at).toLocaleTimeString(isAr ? 'ar' : 'en-GB') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
