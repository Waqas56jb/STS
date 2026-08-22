import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { WHATSAPP, API, apiGet, apiPut, getUser } from '../../lib/api'
import { Switch, useToast } from './ui'
import { ConnectionForm, BotSettings } from './ConnectionForm'
import { WhatsAppQrPanel } from './WhatsAppQrPanel'
import { DialCard, VoiceWebhookCard, CallHistory } from './VoiceAgent'
import { WeekChart, ChannelChart, MonthChart, ResolutionChart, LeadsChart } from './Charts'
import '../../lib/charts'

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
  const [provider, setProvider] = useState('qr')
  const [qrLive, setQrLive] = useState(null)
  useEffect(() => {
    apiGet('/me/connections')
      .then((cs) => {
        const wa = cs.find((c) => c.channel === 'whatsapp')
        if (wa?.provider === 'cloud_api') setProvider('cloud_api')
        else setProvider('qr')
      })
      .catch(() => {})
  }, [])
  return (
    <div className="grid g2">
      <div className="card">
        <h3><Icon name="plug-zap" /><T k="conn_title" /></h3>
        <div className="conn-tabs" style={{ marginBottom: 14 }}>
          <button className={`conn-tab ${provider === 'qr' ? 'on' : ''}`} onClick={() => setProvider('qr')}>
            <Icon name="qr-code" size={15} /><T k="qr_tab" />
          </button>
          <button className={`conn-tab ${provider === 'cloud_api' ? 'on' : ''}`} onClick={() => setProvider('cloud_api')}>
            <Icon name="message-circle" size={15} /><T k="meta_tab" />
          </button>
        </div>
        {provider === 'qr' ? (
          <WhatsAppQrPanel onChange={setQrLive} />
        ) : (
          <ConnectionForm channel="whatsapp" embedded />
        )}
        {qrLive?.status === 'connected' && provider === 'qr' && (
          <p className="hint" style={{ marginTop: 10 }}>{qrLive.display_number}</p>
        )}
      </div>
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
  const widgetHost = API.replace(/\/api\/?$/, '')
  const embed = `<script src="${widgetHost}/widget/w.js"\n data-business="${widgetKey}" defer></script>`
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
          {'<script src="' + widgetHost + '/widget/w.js"'}
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

/* ===================== TRAINING ===================== */
export { TrainingStudio as KnowledgeView } from './TrainingStudio'

/* ===================== ANALYTICS ===================== */
export function AnalyticsView() {
  const [a, setA] = useState(null)
  const load = () => apiGet('/me/analytics').then(setA).catch(() => {})
  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])
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
  const { t } = useLang()
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
    if (!pw.current || pw.next.trim().length < 4) { toast(t('toast_pw_short')); return }
    try {
      await apiPut('/me/password', { current: pw.current, next: pw.next.trim() })
      setPw({ current: '', next: '' })
      toast(t('toast_pw_updated'))
    } catch { toast(t('toast_pw_wrong')) }
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
