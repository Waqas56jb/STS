import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiDelete } from '../../lib/api'
import { useToast } from '../ui'
import { VoiceAgent } from './VoiceAgent'
import { WhatsAppQrPanel } from './WhatsAppQrPanel'
import { TrainingStudio, adminTrainingApi } from './TrainingStudio'
import { AgentHistoryPanel } from './AgentActivity'

const TABS = [
  { v: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
  { v: 'instagram', label: 'Instagram', icon: 'instagram' },
  { v: 'website', label: 'Website', icon: 'globe' },
  { v: 'voice', label: 'Voice', icon: 'phone-call' },
]

export function StsAgents() {
  const { t } = useAdminT()
  const [tab, setTab] = useState('whatsapp')
  const [section, setSection] = useState('setup') // setup | history
  const [ctx, setCtx] = useState(null)
  useEffect(() => { apiGet('/admin/agent/context').then(setCtx).catch(() => {}) }, [])

  return (
    <>
      <div className="conn-tabs" style={{ marginBottom: 14 }}>
        {TABS.map((tabItem) => (
          <button key={tabItem.v} className={`conn-tab ${tab === tabItem.v ? 'on' : ''}`} onClick={() => { setTab(tabItem.v); setSection('setup') }}>
            <Icon name={tabItem.icon} size={15} />{tabItem.label}
          </button>
        ))}
      </div>

      <div className="conn-tabs" style={{ marginBottom: 18 }}>
        <button className={`conn-tab ${section === 'setup' ? 'on' : ''}`} onClick={() => setSection('setup')}>
          <Icon name="settings" size={15} />{t('act_setup')}
        </button>
        <button className={`conn-tab ${section === 'history' ? 'on' : ''}`} onClick={() => setSection('history')}>
          <Icon name="history" size={15} />{t('act_history')}
        </button>
      </div>

      {section === 'history' ? (
        tab === 'voice' ? <AgentHistoryPanel channel="voice" />
          : tab === 'website' ? <AgentHistoryPanel channel="website" />
          : <AgentHistoryPanel channel={tab} />
      ) : tab === 'voice' ? <VoiceAgent businessId={ctx?.business_id} />
        : tab === 'website' ? (ctx?.business_id ? <TrainingStudio api={adminTrainingApi(ctx.business_id)} defaultChannel="website" /> : null)
        : <ChannelAgent key={tab} channel={tab} ctx={ctx} />}
    </>
  )
}

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

function AgentConnection({ channel, spec }) {
  const { t } = useAdminT()
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
      toast(r.connected ? t('toast_saved_connected') : t('toast_saved'))
    } catch { toast(t('toast_save_failed')) } finally { setSaving(false) }
  }
  async function disconnect() {
    if (!window.confirm(t('toast_delete_confirm'))) return
    try { await apiDelete(`/admin/agent/${channel}/connection`); setForm({}); await load(); toast(t('toast_disconnected')) }
    catch { toast(t('toast_delete_failed')) }
  }
  if (!spec) return <div className="card"><h3><Icon name="plug-zap" />{t('conn_title')}</h3></div>

  return (
    <div className="card">
      <h3><Icon name="plug-zap" />{spec.label.split(' — ')[0]} — {t('conn_title')}</h3>
      <div className="conn-status">
        <span className={`badge ${current?.connected ? 'b-ok' : 'b-warn'}`}>
          {current?.connected ? t('connected') : t('not_connected')}
        </span>
      </div>
      {channel === 'whatsapp' && (
        <div className="conn-tabs" style={{ marginBottom: 12 }}>
          <button className={`conn-tab ${waProvider === 'qr' ? 'on' : ''}`} onClick={() => setWaProvider('qr')}>{t('conn_qr_tab')}</button>
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
      {(channel !== 'whatsapp' || waProvider === 'cloud_api') && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={save} disabled={saving}>
            <Icon name="save" size={16} />{saving ? '…' : t('conn_save')}
          </button>
          {current?.connected && <button className="btn btn-o" onClick={disconnect} title={t('disconnect')}><Icon name="trash-2" size={15} /></button>}
        </div>
      )}
    </div>
  )
}

function WhatsAppWebhook({ ctx }) {
  const { t } = useAdminT()
  const toast = useToast()
  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(t('toast_copied')) }
  return (
    <div className="card">
      <h3><Icon name="webhook" />{t('webhook_whatsapp_title')}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 12 }}>{t('webhook_whatsapp_hint')}</p>
      <div className="field"><label>Callback URL</label>
        <div style={{ display: 'flex', gap: 8 }}><input readOnly value={ctx?.whatsapp?.callback_url || ''} /><button className="btn btn-o" onClick={() => copy(ctx?.whatsapp?.callback_url)} title={t('copy')}><Icon name="copy" size={14} /></button></div>
      </div>
      <div className="field"><label>Verify token</label>
        <div style={{ display: 'flex', gap: 8 }}><input readOnly value={ctx?.whatsapp?.verify_token || ''} /><button className="btn btn-o" onClick={() => copy(ctx?.whatsapp?.verify_token)} title={t('copy')}><Icon name="copy" size={14} /></button></div>
      </div>
    </div>
  )
}
