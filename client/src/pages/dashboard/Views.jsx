import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { WHATSAPP, apiGet, apiPut, apiPostAuth, apiDelete, getUser } from '../../lib/api'
import { Switch, useToast } from './ui'
import { ConnectionForm, BotSettings } from './ConnectionForm'
import { DialCard, VoiceWebhookCard, CallHistory } from './VoiceAgent'
import { WeekChart, ChannelChart, MonthChart, ResolutionChart, LeadsChart } from './Charts'

const pct = (u) => (u && u.quota ? Math.min(100, Math.round((u.used / u.quota) * 100)) : 0)
const num = (n) => Number(n || 0).toLocaleString('en')

/* ===================== OVERVIEW ===================== */
export function Overview({ summary, usage = {} }) {
  const { t } = useLang()
  const wa = usage.wa_messages
  const ig = usage.ig_contacts
  const vc = usage.voice_minutes
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="lbl"><T k="st_conv" /><Icon name="messages-square" /></div>
          <div className="val">{summary.conv}</div>
          <div className="trend"><b>{num(summary.conversations_total)}</b> {t('ov_alltime')}</div>
        </div>
        <div className="card stat">
          <div className="lbl"><T k="st_ai" /><Icon name="bot" /></div>
          <div className="val">{summary.ai}%</div>
          <div className="trend"><b>{num(summary.messages_total)}</b> {t('ov_msgs')}</div>
        </div>
        <div className="card stat">
          <div className="lbl"><T k="st_leads" /><Icon name="target" /></div>
          <div className="val">{summary.leads}</div>
          <div className="trend">{t('ov_alltime')}</div>
        </div>
        <div className="card stat">
          <div className="lbl"><T k="st_msgs" /><Icon name="messages-square" /></div>
          <div className="val">{num(summary.messages_total)}</div>
          <div className="trend">{t('ov_allch')}</div>
        </div>
      </div>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="activity" /><T k="ov_ch1" /></h3><div className="chart-box"><WeekChart data={summary.week} /></div></div>
        <div className="card"><h3><Icon name="pie-chart" /><T k="ov_ch2" /></h3><div className="chart-box"><ChannelChart data={summary.by_channel} /></div></div>
      </div>
      <div className="grid g3">
        <div className="card">
          <h3><Icon name="message-circle" />WhatsApp</h3>
          <div className="kv"><T k="u_used" /><span><b>{num(wa?.used)}</b> / {num(wa?.quota)}</span></div>
          <div className="progress"><i style={{ width: pct(wa) + '%' }} /></div>
        </div>
        <div className="card">
          <h3><Icon name="instagram" />Instagram</h3>
          <div className="kv"><T k="u_cont" /><span><b>{num(ig?.used)}</b> / {num(ig?.quota)}</span></div>
          <div className="progress"><i style={{ width: pct(ig) + '%', background: 'linear-gradient(90deg,var(--igA),var(--igB))' }} /></div>
        </div>
        <div className="card">
          <h3><Icon name="phone-call" /><T k="n_vc" /></h3>
          <div className="kv"><T k="u_min" /><span><b>{num(vc?.used)}</b> / {num(vc?.quota)}</span></div>
          <div className="progress"><i style={{ width: pct(vc) + '%', background: 'var(--vc)' }} /></div>
        </div>
      </div>
    </>
  )
}

/* ===================== WHATSAPP ===================== */
export function WhatsAppView() {
  return (
    <div className="grid g2">
      <ConnectionForm channel="whatsapp" />
      <BotSettings channel="whatsapp" />
    </div>
  )
}

/* ===================== INSTAGRAM ===================== */
export function InstagramView() {
  return (
    <div className="grid g2">
      <ConnectionForm channel="instagram" />
      <BotSettings channel="instagram" />
    </div>
  )
}

/* ===================== VOICE ===================== */
export function VoiceView() {
  const [reload, setReload] = useState(0)
  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <ConnectionForm channel="voice" />
        <BotSettings channel="voice" showToggles={false} showLanguage greetingKey="vc_purpose" title="vc_train" />
      </div>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <DialCard onCalled={() => setReload((n) => n + 1)} />
        <VoiceWebhookCard />
      </div>
      <CallHistory reloadKey={reload} />
    </>
  )
}

/* ===================== WIDGET ===================== */
export function WidgetView() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  useEffect(() => { apiGet('/me/profile').then(setProfile).catch(() => {}) }, [])

  const bizName = profile?.business_name || getUser().business_name || ''
  const widgetKey = profile?.widget_key || ''
  const embed = `<script src="https://widget.sts.app/w.js"\n data-business="${widgetKey}" defer></script>`
  function copy() {
    navigator.clipboard?.writeText(embed).catch(() => {})
    toast()
  }
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="code-2" /><T k="wd_emb" /></h3>
        <p style={{ color: 'var(--mut)', marginBottom: 14 }}><T k="wd_p" /></p>
        <div className="code">
          {'<script src="https://widget.sts.app/w.js"'}
          <br />
          {` data-business="${widgetKey}" defer></script>`}
          <button className="copy" onClick={copy}><T k="copy" /></button>
        </div>
        <div className="row" style={{ marginTop: 16 }}><div><b><T k="wd_on" /></b></div><Switch defaultChecked /></div>
        <div className="field" style={{ marginTop: 8 }}><label><T k="wd_col" /></label><input type="color" defaultValue="#0FBE8F" style={{ height: 44, padding: 5 }} /></div>
        <div className="field"><label><T k="wd_pos" /></label><SelectI18n options={['wd_br', 'wd_bl']} /></div>
        <button className="btn btn-g" onClick={() => toast()}><Icon name="save" size={16} /><T k="save" /></button>
      </div>
      <div className="card" style={{ background: 'linear-gradient(160deg,#0C2A44,#071A2B)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: '#fff' }}><Icon name="eye" style={{ color: 'var(--lagoon)' }} /><T k="wd_prev" /></h3>
        <div style={{ flex: 1, position: 'relative', border: '1px dashed rgba(255,255,255,.2)', borderRadius: 14, minHeight: 320 }}>
          <div style={{ position: 'absolute', bottom: 16, insetInlineEnd: 16, width: 270, background: '#fff', borderRadius: 16, color: 'var(--ink)', boxShadow: '0 20px 50px rgba(0,0,0,.5)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--lagoon)', padding: '13px 15px', color: '#03271B', fontWeight: 800, fontSize: 13.5 }}>{bizName || <T k="wd_prev" />}</div>
            <div style={{ padding: 13, fontSize: 12.5 }}>
              <div style={{ background: '#F0F3F6', borderRadius: 10, padding: '9px 11px', marginBottom: 8 }}><T k="wd_m1" /></div>
              <div style={{ background: '#E8FBF4', borderRadius: 10, padding: '9px 11px', textAlign: 'end' }}><T k="wd_m2" /></div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', padding: '10px 13px', fontSize: 12, color: 'var(--mut)' }}><T k="wd_type" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===================== KNOWLEDGE ===================== */
const KB_ICON = { file: 'file-text', url: 'globe', qa: 'message-square' }
export const KB_CHANNELS = [
  { v: 'all', key: 'kb_ch_all', label: 'All agents' },
  { v: 'whatsapp', label: 'WhatsApp' },
  { v: 'instagram', label: 'Instagram' },
  { v: 'website', label: 'Website' },
  { v: 'voice', label: 'Voice' },
]
const KB_CH_BADGE = { all: 'b-info', whatsapp: 'b-ok', instagram: 'b-warn', website: 'b-info', voice: 'b-ok' }
const chLabel = (v, t) => { const c = KB_CHANNELS.find((x) => x.v === v); return c ? (c.key ? t(c.key) : c.label) : v }

export function KnowledgeView() {
  const toast = useToast()
  const { t } = useLang()
  const [sources, setSources] = useState([])
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [scope, setScope] = useState('all')   // "Train for" target
  const [filter, setFilter] = useState('')     // "" = show all entries
  const [editing, setEditing] = useState(null) // entry being edited

  const load = () => apiGet('/knowledge').then(setSources).catch(() => {})
  useEffect(() => { load() }, [])

  async function importUrl() {
    if (!url.trim()) return
    await apiPostAuth('/knowledge', { type: 'url', title: url.trim(), source_url: url.trim(), meta: 'Imported from URL', channel: scope }).catch(() => {})
    setUrl(''); toast(); load()
  }
  async function addQa() {
    if (!q.trim()) return
    await apiPostAuth('/knowledge', { type: 'qa', title: q.trim(), content: a.trim(), meta: 'Manual Q&A', channel: scope }).catch(() => {})
    setQ(''); setA(''); toast(); load()
  }
  async function remove(id) { await apiDelete('/knowledge/' + id).catch(() => {}); load() }

  const shown = filter ? sources.filter((s) => (s.channel || 'all') === filter) : sources

  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="upload-cloud" /><T k="kb_tr" /></h3>
        {/* who this training is for */}
        <div className="field"><label><T k="kb_for" /></label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {KB_CHANNELS.map((c) => <option key={c.v} value={c.v}>{c.key ? t(c.key) : c.label}</option>)}
          </select>
          <div className="hint" style={{ marginTop: 6 }}><T k="kb_for_hint" /></div>
        </div>
        <div className="field"><label><T k="kb_url" /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="https://yoursite.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-p" onClick={importUrl}><T k="import" /></button>
          </div>
        </div>
        <div className="field"><label><T k="kb_qa" /></label>
          <input placeholder={t('kb_q')} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
          <textarea rows="2" placeholder={t('kb_a')} value={a} onChange={(e) => setA(e.target.value)} />
        </div>
        <button className="btn btn-g" onClick={addQa}><Icon name="brain" size={16} /><T k="kb_train" /></button>
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}><Icon name="library" /><T k="kb_src" /></h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginInlineStart: 'auto', maxWidth: 170 }}>
            <option value="">{t('kb_view_all')}</option>
            {KB_CHANNELS.map((c) => <option key={c.v} value={c.v}>{c.key ? t(c.key) : c.label}</option>)}
          </select>
          <span className="badge b-info">{shown.length}</span>
        </div>
        {shown.map((s) => (
          <div className="kb-item" key={s.id}>
            <div className="ic"><Icon name={KB_ICON[s.type] || 'file-text'} /></div>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditing(s)}><b>{s.title}</b><span>{s.meta || ''}</span></div>
            <span className={`badge ${KB_CH_BADGE[s.channel || 'all']}`}>{chLabel(s.channel || 'all', t)}</span>
            <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 8 }} onClick={() => setEditing(s)} title={t('edit')}>
              <Icon name="pencil" size={13} />
            </button>
            <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 6 }} onClick={() => remove(s.id)}>
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
        {shown.length === 0 && <div style={{ color: 'var(--mut)', fontSize: 13, padding: 12 }}><T k="kb_empty" /></div>}
      </div>
      {editing && <KbEditModal entry={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}

/* Edit a stored knowledge entry — pre-filled with its saved data. */
function KbEditModal({ entry, onClose, onSaved }) {
  const { t, isAr } = useLang()
  const toast = useToast()
  const [f, setF] = useState({
    title: entry.title || '', content: entry.content || '',
    source_url: entry.source_url || '', channel: entry.channel || 'all',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  async function save() {
    try { await apiPut('/knowledge/' + entry.id, f); toast(); onSaved?.(); onClose() }
    catch { toast(t('save_failed')) }
  }
  const isUrl = entry.type === 'url'
  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 12 }}><Icon name="pencil" size={16} /> <T k="kb_edit" /></h3>
        <div className="field"><label>{isUrl ? t('kb_url') : t('kb_q')}</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        {isUrl ? (
          <div className="field"><label>URL</label><input value={f.source_url} onChange={(e) => set('source_url', e.target.value)} /></div>
        ) : (
          <div className="field"><label>{t('kb_a')}</label><textarea rows="5" value={f.content} onChange={(e) => set('content', e.target.value)} /></div>
        )}
        <div className="field"><label><T k="kb_for" /></label>
          <select value={f.channel} onChange={(e) => set('channel', e.target.value)}>
            {KB_CHANNELS.map((c) => <option key={c.v} value={c.v}>{c.key ? t(c.key) : c.label}</option>)}
          </select>
        </div>
        <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={save}>
          <Icon name="save" size={16} />{isAr ? 'حفظ التعديلات' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

/* ===================== ANALYTICS ===================== */
export function AnalyticsView() {
  const [a, setA] = useState(null)
  useEffect(() => { apiGet('/me/analytics').then(setA).catch(() => {}) }, [])
  return (
    <>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card"><h3><Icon name="trending-up" /><T k="an_c1" /></h3><div className="chart-box"><MonthChart data={a?.messages_daily} /></div></div>
        <div className="card"><h3><Icon name="bot" /><T k="an_c2" /></h3><div className="chart-box"><ResolutionChart data={a?.resolution} /></div></div>
      </div>
      <div className="grid g2">
        <div className="card">
          <h3><Icon name="target" /><T k="an_c4" /></h3>
          <div className="chart-box"><LeadsChart data={a?.leads_weekly} /></div>
        </div>
      </div>
    </>
  )
}

/* ===================== BILLING ===================== */
const INV_BADGE = (st) => (st === 'paid' ? 'b-ok' : st === 'overdue' ? 'b-bad' : 'b-warn')

export function BillingView() {
  const { user, plan } = useSessionUser()
  const [invoices, setInvoices] = useState([])
  useEffect(() => { apiGet('/me/invoices').then(setInvoices).catch(() => {}) }, [])
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl"><T k="bl_plan" /><Icon name="package" /></div><div className="val" style={{ fontSize: 20 }}>{plan || '—'}</div><div className="trend">{user.business_name || ''}</div></div>
        <div className="card stat"><div className="lbl"><T k="bl_next" /><Icon name="calendar" /></div><div className="val" style={{ fontSize: 20 }}>{invoices[0]?.date || '—'}</div><div className="trend"><T k="auto_renew" /></div></div>
        <div className="card stat"><div className="lbl"><T k="bl_status" /><Icon name="shield-check" /></div><div className="val" style={{ fontSize: 20, color: 'var(--lagoon-d)' }}><T k="paid" /></div><div className="trend"><T k="thanks" /></div></div>
      </div>
      <div className="card">
        <h3><Icon name="receipt" /><T k="bl_inv" /></h3>
        <div className="tbl">
          <table>
            <thead><tr><th><T k="th_no" /></th><th><T k="th_date" /></th><th><T k="th_desc" /></th><th><T k="th_amt" /></th><th><T k="th_st" /></th><th /></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.no}>
                  <td>{inv.no}</td><td>{inv.date}</td><td>{inv.desc}</td><td>{inv.amt}</td>
                  <td><span className={`badge ${INV_BADGE(inv.status)}`}>{inv.status?.toUpperCase()}</span></td>
                  <td><button className="btn btn-o" style={{ padding: '6px 12px' }}><Icon name="download" size={14} />PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-p"><Icon name="arrow-up-circle" size={16} /><T k="bl_up" /></button>
          <a className="btn btn-o" href={WHATSAPP}><Icon name="message-circle" size={16} /><T k="bl_help" /></a>
        </div>
      </div>
    </>
  )
}

/** Read the logged-in user (+plan label) from localStorage. */
function useSessionUser() {
  try {
    const user = JSON.parse(localStorage.getItem('sts_user') || '{}')
    return { user, plan: user.plan }
  } catch {
    return { user: {}, plan: '' }
  }
}

/* ===================== SETTINGS ===================== */
export function SettingsView() {
  const toast = useToast()
  const { t, isAr } = useLang()
  const [p, setP] = useState({ business_name: '', email: '', hours: '', language: 'auto' })
  const [pw, setPw] = useState({ current: '', next: '' })
  useEffect(() => { apiGet('/me/profile').then((d) => d && setP((s) => ({ ...s, ...d }))).catch(() => {}) }, [])
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }))

  async function saveProfile() {
    try {
      await apiPut('/me/profile', { business_name: p.business_name, hours: p.hours, language: p.language })
      toast()
    } catch { toast(t('save_failed')) }
  }
  async function changePw() {
    if (!pw.current || pw.next.trim().length < 4) { toast(isAr ? 'كلمة مرور قصيرة جداً' : 'Password too short'); return }
    try {
      await apiPut('/me/password', { current: pw.current, next: pw.next.trim() })
      setPw({ current: '', next: '' })
      toast(isAr ? 'تم تحديث كلمة المرور ✓' : 'Password updated ✓')
    } catch { toast(isAr ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect') }
  }

  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="building-2" /><T k="se_biz" /></h3>
        <div className="field"><label><T k="f_biz" /></label>
          <input value={p.business_name} onChange={(e) => set('business_name', e.target.value)} />
        </div>
        <div className="field"><label><T k="f_email" /></label>
          <input value={p.email} readOnly style={{ background: '#f6f8fa', color: 'var(--mut)' }} />
        </div>
        <div className="field"><label><T k="se_hrs" /></label>
          <input value={p.hours} onChange={(e) => set('hours', e.target.value)} placeholder="Sat–Thu, 10:00 – 22:00" />
        </div>
        <div className="field"><label><T k="se_lang" /></label>
          <select value={p.language} onChange={(e) => set('language', e.target.value)}>
            <option value="auto">{t('se_auto')}</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
        <button className="btn btn-g" onClick={saveProfile}><Icon name="save" size={16} /><T k="save" /></button>
      </div>
      <div className="card">
        <h3><Icon name="lock" /><T k="se_sec" /></h3>
        <div className="field"><label><T k="se_cur" /></label>
          <input type="password" placeholder="••••••••" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} autoComplete="current-password" />
        </div>
        <div className="field"><label><T k="se_new" /></label>
          <input type="password" placeholder="••••••••" value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} autoComplete="new-password" />
        </div>
        <button className="btn btn-p" onClick={changePw}><Icon name="key-round" size={16} /><T k="se_upd" /></button>
        <div className="row" style={{ marginTop: 20 }}><div><b><T k="se_notif" /></b><p><T k="se_notifp" /></p></div><Switch defaultChecked /></div>
      </div>
    </div>
  )
}

/* A <select> whose <option> labels are translated by key. */
function SelectI18n({ options }) {
  const { t } = useLang()
  return (
    <select>
      {options.map((o) => (
        <option key={o}>{t(o)}</option>
      ))}
    </select>
  )
}
