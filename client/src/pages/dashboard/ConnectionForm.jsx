import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { apiGet, apiPut } from '../../lib/api'
import { Switch, useToast } from './ui'

/**
 * Spec-driven credential form for one channel (whatsapp / instagram / voice).
 *
 * The customer enters their OWN connection keys here — WhatsApp (Meta),
 * Instagram (Meta) or Twilio (voice). The field layout comes from
 * GET /api/connection-spec, current values from GET /api/me/connections
 * (masked), and saving hits PUT /api/me/connections/:channel. Secret fields
 * render blank with the masked value as a placeholder; leaving one blank keeps
 * the stored secret (the server merges), so a live connection never breaks.
 */
export function ConnectionForm({ channel }) {
  const { isAr } = useLang()
  const toast = useToast()
  const [spec, setSpec] = useState(null)
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([apiGet('/connection-spec'), apiGet('/me/connections')])
      .then(([sp, cs]) => {
        setSpec(sp)
        setCurrent(cs.find((c) => c.channel === channel) || null)
      })
      .catch(() => {})

  useEffect(() => { load() }, [channel])

  // reset form to non-secret values; secrets stay blank (shown as masked placeholder)
  useEffect(() => {
    if (!spec || !spec[channel]) return
    const f = {}
    for (const field of spec[channel].fields) {
      f[field.key] = field.secret ? '' : current?.fields?.[field.key] || ''
    }
    setForm(f)
  }, [spec, current, channel])

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))
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

  if (!spec || !spec[channel]) {
    return (
      <div className="card">
        <h3><Icon name="plug-zap" /><T k="conn_title" /></h3>
        <div style={{ color: 'var(--mut)', fontSize: 13, padding: 8 }}>…</div>
      </div>
    )
  }

  const s = spec[channel]
  return (
    <div className="card">
      <h3><Icon name="plug-zap" /><T k="conn_title" /></h3>
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
          ) : (
            <input
              type={field.secret ? 'password' : 'text'}
              value={form[field.key] || ''}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={field.secret ? current?.fields?.[field.key] || (isAr ? 'أدخل القيمة' : 'enter value') : ''}
              autoComplete="off"
            />
          )}
        </div>
      ))}

      <button className="btn btn-g" style={{ marginTop: 6 }} onClick={save} disabled={saving}>
        <Icon name="save" size={16} />{saving ? <T k="saving" /> : <T k="conn_save" />}
      </button>
      <div className="hint" style={{ marginTop: 10 }}><T k="conn_hint" /></div>
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
