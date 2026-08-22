import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { apiGet, apiPut, apiDelete } from '../../lib/api'
import { Switch, useToast } from './ui'

/**
 * Spec-driven credential form for one channel (whatsapp / instagram / voice).
 *
 * The customer enters their OWN connection keys here (WhatsApp/Instagram/Twilio).
 * Saved credentials are stored ENCRYPTED in the DB and persist across refresh /
 * reopen — GET /api/me/connections returns the real stored values so the form
 * pre-fills them (secrets hidden behind an eye toggle) and they stay visible and
 * editable until the user changes or disconnects them.
 */
export function ConnectionForm({ channel, embedded = false }) {
  const { isAr } = useLang()
  const toast = useToast()
  const [spec, setSpec] = useState(null)
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({})
  const [shown, setShown] = useState({}) // which secret fields are revealed
  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([apiGet('/connection-spec'), apiGet('/me/connections')])
      .then(([sp, cs]) => {
        setSpec(sp)
        setCurrent(cs.find((c) => c.channel === channel) || null)
      })
      .catch(() => {})

  useEffect(() => { load() }, [channel])

  // pre-fill EVERY field (incl. secrets) with the saved values so they persist + are editable
  useEffect(() => {
    if (!spec || !spec[channel]) return
    const f = {}
    for (const field of spec[channel].fields) f[field.key] = current?.fields?.[field.key] || ''
    setForm(f)
  }, [spec, current, channel])

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const toggle = (k) => setShown((s) => ({ ...s, [k]: !s[k] }))
  const connected = current?.connected

  async function save() {
    setSaving(true)
    try {
      const res = await apiPut(`/me/connections/${channel}`, { fields: form })
      const cs = await apiGet('/me/connections')
      setCurrent(cs.find((c) => c.channel === channel) || null)
      toast(res.connected ? (isAr ? 'تم الحفظ — متصل ✓' : 'Saved — connected ✓') : (isAr ? 'تم الحفظ ✓' : 'Saved ✓'))
    } catch {
      toast(isAr ? 'فشل الحفظ' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    if (!window.confirm(isAr ? 'حذف بيانات الاتصال؟' : 'Delete these connection credentials?')) return
    try {
      await apiDelete(`/me/connections/${channel}`)
      const cs = await apiGet('/me/connections')
      setCurrent(cs.find((c) => c.channel === channel) || null)
      setForm({})
      toast(isAr ? 'تم الحذف' : 'Disconnected')
    } catch { toast(isAr ? 'فشل الحذف' : 'Delete failed') }
  }

  if (!spec || !spec[channel]) {
    return (
      <div className={embedded ? '' : 'card'}>
        {!embedded && <h3><Icon name="plug-zap" /><T k="conn_title" /></h3>}
        <div style={{ color: 'var(--mut)', fontSize: 13, padding: 8 }}>…</div>
      </div>
    )
  }

  const s = spec[channel]
  return (
    <div className={embedded ? '' : 'card'}>
      {!embedded && <h3><Icon name="plug-zap" /><T k="conn_title" /></h3>}
      <div className="row">
        <div>
          <b>{s.label.split(' — ')[0]}</b>
          <p><T k="conn_sub" /></p>
        </div>
        <span className={`badge ${connected ? 'b-ok' : 'b-warn'}`}>
          {connected ? <T k="connected" /> : <T k="not_connected" />}
        </span>
      </div>

      {s.fields.map((field) => (
        <div className="field" key={field.key} style={{ marginTop: 12 }}>
          <label>{field.label}{s.required.includes(field.key) && ' *'}</label>
          {field.type === 'select' ? (
            <select value={form[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}>
              <option value="">—</option>
              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : field.secret ? (
            <div style={{ position: 'relative' }}>
              <input
                type={shown[field.key] ? 'text' : 'password'}
                value={form[field.key] || ''}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={isAr ? 'أدخل القيمة' : 'enter value'}
                autoComplete="off"
                style={{ paddingInlineEnd: 42 }}
              />
              <button type="button" onClick={() => toggle(field.key)} tabIndex={-1}
                aria-label={shown[field.key] ? 'Hide' : 'Show'}
                style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, padding: 4, cursor: 'pointer', color: 'var(--mut)', display: 'flex' }}>
                <Icon name={shown[field.key] ? 'eye-off' : 'eye'} size={17} />
              </button>
            </div>
          ) : (
            <input type="text" value={form[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} autoComplete="off" />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={save} disabled={saving}>
          <Icon name="save" size={16} />{saving ? <T k="saving" /> : <T k="conn_save" />}
        </button>
        {connected && (
          <button className="btn btn-o" onClick={disconnect} title={isAr ? 'حذف' : 'Disconnect'}>
            <Icon name="trash-2" size={15} />
          </button>
        )}
      </div>
      <div className="hint" style={{ marginTop: 10 }}><T k="conn_saved_hint" /></div>
    </div>
  )
}

/**
 * Bot behaviour settings for one channel — greeting, tone, and the auto-reply /
 * handoff / after-hours toggles. Reads GET /api/bots/:channel and saves to
 * PUT /api/bots/:channel. This is the customer's per-channel training config.
 */
export function BotSettings({ channel, extra, showToggles = true, showLanguage = false, greetingKey = 'greet', title = 'agent_beh', save: saveFn, load: loadFn }) {
  const { t } = useLang()
  const toast = useToast()
  const [b, setB] = useState({
    auto_reply: true, human_handoff: true, after_hours_only: false,
    greeting: '', tone: 'friendly', language: 'auto',
  })

  useEffect(() => {
    const p = loadFn ? loadFn() : apiGet(`/bots/${channel}`)
    p.then((row) => row && setB((s) => ({ ...s, ...row }))).catch(() => {})
  }, [channel])

  const set = (k, v) => setB((s) => ({ ...s, [k]: v }))

  async function save() {
    try {
      await (saveFn ? saveFn(b) : apiPut(`/bots/${channel}`, b))
      toast()
    } catch {
      toast(t('save_failed'))
    }
  }

  return (
    <div className="card">
      <h3><Icon name="bot" /><T k={title} /></h3>
      {showToggles && (
        <>
          <div className="row"><div><b><T k="auto_re" /></b><p><T k="auto_rep" /></p></div>
            <Switch checked={!!b.auto_reply} onChange={(v) => set('auto_reply', v)} /></div>
          <div className="row"><div><b><T k="handoff" /></b><p><T k="handoffp" /></p></div>
            <Switch checked={!!b.human_handoff} onChange={(v) => set('human_handoff', v)} /></div>
          <div className="row"><div><b><T k="ooh" /></b><p><T k="oohp" /></p></div>
            <Switch checked={!!b.after_hours_only} onChange={(v) => set('after_hours_only', v)} /></div>
        </>
      )}
      <div className="field" style={{ marginTop: 14 }}><label><T k={greetingKey} /></label>
        <textarea rows="2" value={b.greeting || ''} onChange={(e) => set('greeting', e.target.value)} />
      </div>
      <div className="field"><label><T k="tone" /></label>
        <select value={b.tone || 'friendly'} onChange={(e) => set('tone', e.target.value)}>
          <option value="friendly">{t('tn1')}</option>
          <option value="professional">{t('tn2')}</option>
          <option value="playful">{t('tn3')}</option>
        </select>
      </div>
      {showLanguage && (
        <div className="field"><label><T k="vc_lang" /></label>
          <select value={b.language || 'auto'} onChange={(e) => set('language', e.target.value)}>
            <option value="auto">{t('vc_lang_auto')}</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="ur">اردو (Urdu)</option>
            <option value="fr">Français</option>
          </select>
          <div className="hint" style={{ marginTop: 6 }}><T k="vc_lang_hint" /></div>
        </div>
      )}
      {extra}
      <button className="btn btn-g" onClick={save}><Icon name="save" size={16} /><T k="save" /></button>
    </div>
  )
}
