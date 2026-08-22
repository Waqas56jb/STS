import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { apiGet, apiPut, apiPostAuth, apiDelete, apiUpload } from '../../lib/api'
import { Switch, useToast } from './ui'

const PROFILE_META = '__business_profile__'
const KB_ACCEPT = '.pdf,.txt,.md,.csv,.docx,.xlsx,.xls,application/pdf,text/plain'
const KB_MAX = 10 * 1024 * 1024
const KB_ICON = { file: 'file-text', url: 'globe', qa: 'message-square' }

const PAGE_TITLE = {
  all: 'tr_page_all',
  whatsapp: 'tr_page_wa',
  instagram: 'tr_page_ig',
  website: 'tr_page_web',
  voice: 'tr_page_vc',
}

export const AGENTS = [
  { v: 'all', icon: 'sparkles', key: 'tr_all', cls: 'lagoon' },
  { v: 'whatsapp', icon: 'message-circle', label: 'WhatsApp', cls: 'wa' },
  { v: 'instagram', icon: 'instagram', label: 'Instagram', cls: 'ig' },
  { v: 'website', icon: 'globe', key: 'tr_web', cls: 'web' },
  { v: 'voice', icon: 'phone-call', key: 'tr_voice', cls: 'vc' },
]

const emptyProfile = { name: '', about: '', hours: '', phone: '', email: '', address: '', services: '', website: '' }
const emptyBot = {
  auto_reply: true, human_handoff: true, after_hours_only: false,
  greeting: '', tone: 'friendly', language: 'auto',
  widget_color: '#0FBE8F', widget_position: 'bottom_right', rules: '',
}

function formatProfile(p) {
  return [
    p.name && `Business name: ${p.name}`,
    p.about && `About: ${p.about}`,
    p.hours && `Hours: ${p.hours}`,
    p.phone && `WhatsApp / phone: ${p.phone}`,
    p.email && `Email: ${p.email}`,
    p.address && `Address: ${p.address}`,
    p.services && `Services / products: ${p.services}`,
    p.website && `Website: ${p.website}`,
  ].filter(Boolean).join('\n')
}

function parseProfile(content = '') {
  const get = (label) => {
    const m = String(content).match(new RegExp(`^${label}:\\s*(.*)$`, 'mi'))
    return m ? m[1].trim() : ''
  }
  return {
    name: get('Business name'),
    about: get('About'),
    hours: get('Hours'),
    phone: get('WhatsApp / phone'),
    email: get('Email'),
    address: get('Address'),
    services: get('Services / products'),
    website: get('Website'),
  }
}

/**
 * One-page training flow. `api` lets admin reuse the same UI.
 * Client default talks to /knowledge, /bots/:channel, /me/profile.
 */
export function TrainingStudio({
  api,
  defaultChannel = 'whatsapp',
  compact = false,
}) {
  const { t, isAr } = useLang()
  const toast = useToast()
  const fileRef = useRef(null)
  const [agent, setAgent] = useState(defaultChannel)
  const [sources, setSources] = useState([])
  const [profile, setProfile] = useState(emptyProfile)
  const [profileId, setProfileId] = useState(null)
  const [bot, setBot] = useState(emptyBot)
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState('')
  const [learn, setLearn] = useState({ open: false, done: false })

  const endpoints = api || clientApi()
  const scope = agent

  async function withLearn(fn) {
    setLearn({ open: true, done: false })
    try {
      await fn()
      setLearn({ open: true, done: true })
      await new Promise((r) => setTimeout(r, 1100))
    } finally {
      setLearn({ open: false, done: false })
    }
  }

  const load = async () => {
    try {
      const [kb, me, settings] = await Promise.all([
        endpoints.listKnowledge(),
        endpoints.loadProfile().catch(() => ({})),
        endpoints.loadBot(agent === 'all' ? 'whatsapp' : agent).catch(() => null),
      ])
      const rows = Array.isArray(kb) ? kb : []
      setSources(rows)
      const saved = rows.find((s) => s.meta === PROFILE_META)
      const parsed = saved ? parseProfile(saved.content) : {}
      setProfileId(saved?.id || null)
      setProfile({
        ...emptyProfile,
        name: parsed.name || me.business_name || '',
        hours: parsed.hours || me.hours || '',
        phone: parsed.phone || me.whatsapp || '',
        email: parsed.email || me.email || '',
        about: parsed.about || '',
        address: parsed.address || '',
        services: parsed.services || '',
        website: parsed.website || '',
      })
      if (settings) setBot({ ...emptyBot, ...settings })
      else setBot(emptyBot)
    } catch { /* keep current */ }
  }

  useEffect(() => { load() }, [agent])
  useEffect(() => { setAgent(defaultChannel) }, [defaultChannel])

  const shown = sources.filter((s) => {
    if (s.meta === PROFILE_META || s.meta === '__agent_rules__') return false
    return (s.channel || 'all') === agent
  })

  async function saveProfile() {
    setSaving('profile')
    try {
      const content = formatProfile(profile)
      if (!content) { toast(t('tr_need_biz')); return }
      await endpoints.saveProfile({
        business_name: profile.name, whatsapp: profile.phone, hours: profile.hours, language: bot.language,
      }).catch(() => {})
      const body = {
        type: 'qa', title: profile.name || t('tr_biz_title'), content,
        meta: PROFILE_META, channel: 'all',
      }
      if (profileId) {
        try { await endpoints.updateKnowledge(profileId, body) }
        catch {
          const row = await endpoints.createKnowledge(body)
          setProfileId(row.id)
        }
      } else {
        const row = await endpoints.createKnowledge(body)
        setProfileId(row.id)
      }
      await withLearn(async () => { toast(); await load() })
    } catch (e) { toast(e.message || t('save_failed')) }
    finally { setSaving('') }
  }

  async function saveRules() {
    setSaving('rules')
    try {
      const channels = agent === 'all' ? ['whatsapp', 'instagram', 'website', 'voice'] : [agent]
      for (const ch of channels) await endpoints.saveBot(ch, bot)
      await withLearn(async () => { toast() })
    } catch (e) { toast(e.message || t('save_failed')) }
    finally { setSaving('') }
  }

  async function importUrl() {
    if (!url.trim()) return
    await endpoints.createKnowledge({ type: 'url', title: url.trim(), source_url: url.trim(), meta: 'Imported from URL', channel: scope })
    setUrl('')
    await withLearn(async () => { toast(); await load() })
  }
  async function addQa() {
    if (!q.trim()) return
    await endpoints.createKnowledge({ type: 'qa', title: q.trim(), content: a.trim(), meta: 'Manual Q&A', channel: scope })
    setQ(''); setA('')
    await withLearn(async () => { toast(); await load() })
  }
  async function addNote() {
    const text = note.trim()
    if (!text) return
    await endpoints.createKnowledge({ type: 'qa', title: text.split('\n')[0].slice(0, 80), content: text, meta: 'Training note', channel: scope })
    setNote('')
    await withLearn(async () => { toast(); await load() })
  }
  async function uploadFiles(list) {
    const files = [...(list || [])]
    if (!files.length || uploading) return
    setUploading(true)
    let ok = 0
    try {
      for (const file of files) {
        if (file.size > KB_MAX) { toast(t('kb_too_big')); continue }
        await endpoints.uploadFile(file, { channel: scope, title: file.name })
        ok += 1
      }
      if (ok) await withLearn(async () => { toast() })
    } catch (e) { toast(e.message || t('kb_upload_fail')) }
    finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      if (ok) load()
    }
  }
  async function remove(id) {
    if (!window.confirm(t('kb_delete_ask'))) return
    await endpoints.deleteKnowledge(id).catch(() => {})
    load()
  }

  const setP = (k, v) => setProfile((s) => ({ ...s, [k]: v }))
  const setB = (k, v) => setBot((s) => ({ ...s, [k]: v }))
  const agentMeta = AGENTS.find((x) => x.v === agent) || AGENTS[0]
  const agentName = t(PAGE_TITLE[agent] || agentMeta.key || '') || agentMeta.label
  const snippet = (s) => String(s.content || s.source_url || '').replace(/\s+/g, ' ').trim().slice(0, 96)

  return (
    <div className={`train${compact ? ' compact' : ''} train-${agentMeta.cls}`}>
      <header className={`train-hero ${agentMeta.cls}`}>
        <div>
          <div className="train-kicker"><Icon name={agentMeta.icon} size={15} />{t('tr_now')}</div>
          <h2>{agentName}</h2>
          <p>{t('tr_page_sub').replace('{agent}', agentName)}</p>
        </div>
        <div className="train-stat">
          <b>{shown.length}</b>
          <span><T k="tr_sources" /></span>
        </div>
      </header>

      <div className="train-filters" role="tablist">
        {AGENTS.map((c) => (
          <button
            key={c.v}
            type="button"
            className={`train-pill ${c.cls}${agent === c.v ? ' on' : ''}`}
            onClick={() => setAgent(c.v)}
          >
            <Icon name={c.icon} size={15} />
            {c.key ? t(c.key) : c.label}
          </button>
        ))}
      </div>

      <div className="train-layout" key={agent}>
        <div className="train-flow">
          <section className="train-card">
            <div className="train-step"><span className="train-num">1</span><div className="train-step-copy"><b><T k="tr_s1" /></b><small><T k="tr_s1p" /></small></div></div>
            <div className="train-grid">
              <div className="field"><label><T k="tr_biz" /></label>
                <input value={profile.name} onChange={(e) => setP('name', e.target.value)} placeholder={t('f_biz')} /></div>
              <div className="field"><label><T k="tr_phone" /></label>
                <input value={profile.phone} onChange={(e) => setP('phone', e.target.value)} placeholder="+965 …" /></div>
              <div className="field"><label><T k="tr_email" /></label>
                <input value={profile.email} onChange={(e) => setP('email', e.target.value)} placeholder="hello@business.com" /></div>
              <div className="field"><label><T k="se_hrs" /></label>
                <input value={profile.hours} onChange={(e) => setP('hours', e.target.value)} placeholder="Sat–Thu 10:00–22:00" /></div>
              <div className="field"><label><T k="tr_weburl" /></label>
                <input value={profile.website} onChange={(e) => setP('website', e.target.value)} placeholder="https://" /></div>
              <div className="field"><label><T k="tr_addr" /></label>
                <input value={profile.address} onChange={(e) => setP('address', e.target.value)} /></div>
            </div>
            <div className="field"><label><T k="tr_about" /></label>
              <textarea rows="2" value={profile.about} onChange={(e) => setP('about', e.target.value)} placeholder={t('tr_about_ph')} /></div>
            <div className="field"><label><T k="tr_svc" /></label>
              <textarea rows="2" value={profile.services} onChange={(e) => setP('services', e.target.value)} placeholder={t('tr_svc_ph')} /></div>
            <button className="btn btn-g" onClick={saveProfile} disabled={saving === 'profile'}>
              <Icon name="save" size={16} />{saving === 'profile' ? '…' : t('tr_save_biz')}
            </button>
          </section>

          <section className="train-card">
            <div className="train-step"><span className="train-num">2</span><div className="train-step-copy"><b><T k="tr_s2" /></b><small>{t('tr_s2p').replace('{agent}', agentName)}</small></div></div>
            {agent !== 'voice' && (
              <>
                <div className="row"><div><b><T k="auto_re" /></b><p><T k="auto_rep" /></p></div>
                  <Switch checked={!!bot.auto_reply} onChange={(v) => setB('auto_reply', v)} /></div>
                <div className="row"><div><b><T k="handoff" /></b><p><T k="handoffp" /></p></div>
                  <Switch checked={!!bot.human_handoff} onChange={(v) => setB('human_handoff', v)} /></div>
              </>
            )}
            <div className="field" style={{ marginTop: 8 }}><label>{agent === 'voice' ? t('vc_purpose') : t('greet')}</label>
              <textarea rows="2" value={bot.greeting || ''} onChange={(e) => setB('greeting', e.target.value)} /></div>
            <div className="train-grid">
              <div className="field"><label><T k="tone" /></label>
                <select value={bot.tone || 'friendly'} onChange={(e) => setB('tone', e.target.value)}>
                  <option value="friendly">{t('tn1')}</option>
                  <option value="professional">{t('tn2')}</option>
                  <option value="playful">{t('tn3')}</option>
                </select>
              </div>
              <div className="field"><label><T k="tr_lang" /></label>
                <select value={bot.language || 'auto'} onChange={(e) => setB('language', e.target.value)}>
                  <option value="auto">{t('vc_lang_auto')}</option>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                  <option value="hi">हिन्दी</option>
                  <option value="ur">اردو</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
            {agent === 'website' && (
              <div className="train-grid">
                <div className="field"><label><T k="wd_col" /></label>
                  <input type="color" value={bot.widget_color || '#0FBE8F'} onChange={(e) => setB('widget_color', e.target.value)} /></div>
                <div className="field"><label><T k="wd_pos" /></label>
                  <select value={bot.widget_position || 'bottom_right'} onChange={(e) => setB('widget_position', e.target.value)}>
                    <option value="bottom_right">{t('wd_br')}</option>
                    <option value="bottom_left">{t('wd_bl')}</option>
                  </select>
                </div>
              </div>
            )}
            <div className="field"><label><T k="tr_rules" /></label>
              <textarea rows="4" value={bot.rules || ''} onChange={(e) => setB('rules', e.target.value)} placeholder={t('tr_rules_ph')} /></div>
            <button className="btn btn-g" onClick={saveRules} disabled={saving === 'rules'}>
              <Icon name="bot" size={16} />{saving === 'rules' ? '…' : t('tr_save_rules')}
            </button>
          </section>

          <section className="train-card">
            <div className="train-step"><span className="train-num">3</span><div className="train-step-copy"><b><T k="tr_s3" /></b><small><T k="tr_s3p" /></small></div></div>
            <div
              className={`drop${dragOver ? ' over' : ''}${uploading ? ' busy' : ''}`}
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files) }}
            >
              <Icon name="upload-cloud" />
              <div style={{ marginTop: 8, fontWeight: 600 }}><T k={uploading ? 'kb_s5' : 'kb_drop'} /></div>
              <small><T k="kb_types" /></small>
            </div>
            <input ref={fileRef} type="file" hidden multiple accept={KB_ACCEPT} onChange={(e) => uploadFiles(e.target.files)} />
            <div className="field"><label><T k="kb_url" /></label>
              <div className="train-inline">
                <input placeholder="https://yoursite.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />
                <button className="btn btn-p" onClick={importUrl}><T k="import" /></button>
              </div>
            </div>
            <div className="field"><label><T k="kb_qa" /></label>
              <input placeholder={t('kb_q')} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
              <textarea rows="2" placeholder={t('kb_a')} value={a} onChange={(e) => setA(e.target.value)} />
            </div>
            <button className="btn btn-g" onClick={addQa}><Icon name="brain" size={16} /><T k="kb_train" /></button>
            <div className="field" style={{ marginTop: 14 }}><label><T k="kb_note" /></label>
              <textarea rows="3" placeholder={t('kb_note_ph')} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <button className="btn btn-o" onClick={addNote}><Icon name="message-square" size={16} /><T k="kb_note_save" /></button>
          </section>
        </div>

        <aside className="train-card train-lib">
          <div className="train-step">
            <span className="train-num">4</span>
            <div className="train-step-copy"><b><T k="kb_src" /></b><small>{agentName}</small></div>
            <span className="badge b-info">{shown.length}</span>
          </div>
          {shown.map((s) => (
            <div className="kb-item" key={s.id}>
              <div className="ic"><Icon name={KB_ICON[s.type] || 'file-text'} /></div>
              <div className="kb-copy" onClick={() => setEditing(s)}>
                <b>{s.title}</b>
                <span>{snippet(s) || (s.meta && s.meta !== PROFILE_META ? s.meta : s.type)}</span>
              </div>
              <span className={`badge ${(s.channel || 'all') === 'all' ? 'b-info' : 'b-ok'}`}>
                {(s.channel || 'all') === 'all' ? t('tr_all_short') : (s.channel || '').toUpperCase()}
              </span>
              <div className="kb-actions">
                <button className="btn btn-o" onClick={() => setEditing(s)} title={t('edit')}>
                  <Icon name="pencil" size={13} />
                </button>
                <button className="btn btn-o" onClick={() => remove(s.id)}>
                  <Icon name="trash-2" size={13} />
                </button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <div className="train-empty"><T k="kb_empty" /></div>}
          <p className="hint" style={{ marginTop: 12 }}><T k="kb_adopt" /></p>
        </aside>
      </div>

      <LearnOverlay open={learn.open} done={learn.done} agentName={agentName} cls={agentMeta.cls} t={t} />

      {editing && (
        <EditModal
          entry={editing}
          t={t}
          isAr={isAr}
          onClose={() => setEditing(null)}
          onSaved={async () => { await withLearn(async () => { await load() }) }}
          update={endpoints.updateKnowledge}
        />
      )}
    </div>
  )
}

function LearnOverlay({ open, done, agentName, cls, t }) {
  if (!open) return null
  return (
    <div className={`learn-ov${done ? ' done' : ''}`}>
      <div className={`learn-card ${cls}`}>
        <div className="learn-orbit">
          <span className="learn-spark s1">✦</span>
          <span className="learn-spark s2">✦</span>
          <span className="learn-spark s3">✦</span>
          <div className="learn-bot"><Icon name="bot" size={34} /></div>
        </div>
        <b>{done ? t('tr_learned') : t('tr_learn')}</b>
        <small>{agentName}</small>
        <div className="learn-bar"><i /></div>
      </div>
    </div>
  )
}

function EditModal({ entry, t, isAr, onClose, onSaved, update }) {
  const toast = useToast()
  const [f, setF] = useState({
    title: entry.title || '', content: entry.content || '',
    source_url: entry.source_url || '', channel: entry.channel || 'all',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const isUrl = entry.type === 'url'
  const isFile = entry.type === 'file'
  async function save() {
    try { await update(entry.id, f); toast(); onSaved?.(); onClose() }
    catch { toast(t('save_failed')) }
  }
  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 12 }}><Icon name="pencil" size={16} /> <T k="kb_edit" /></h3>
        <div className="field"><label>{isFile ? t('kb_file_title') : isUrl ? t('kb_url') : t('kb_q')}</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        {isUrl ? (
          <div className="field"><label>URL</label><input value={f.source_url} onChange={(e) => set('source_url', e.target.value)} /></div>
        ) : (
          <div className="field"><label>{isFile ? t('kb_file_content') : t('kb_a')}</label>
            <textarea rows={isFile ? 10 : 5} value={f.content} onChange={(e) => set('content', e.target.value)} />
          </div>
        )}
        <div className="field"><label><T k="kb_for" /></label>
          <select value={f.channel} onChange={(e) => set('channel', e.target.value)}>
            {AGENTS.map((c) => <option key={c.v} value={c.v}>{c.key ? t(c.key) : c.label}</option>)}
          </select>
        </div>
        <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={save}>
          <Icon name="save" size={16} />{isAr ? 'حفظ التعديلات' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function clientApi() {
  return {
    listKnowledge: () => apiGet('/knowledge'),
    createKnowledge: (body) => apiPostAuth('/knowledge', body),
    updateKnowledge: (id, body) => apiPut('/knowledge/' + id, body),
    deleteKnowledge: (id) => apiDelete('/knowledge/' + id),
    uploadFile: (file, fields) => apiUpload('/knowledge/upload', file, fields),
    loadBot: (channel) => apiGet(`/bots/${channel}`),
    saveBot: (channel, body) => apiPut(`/bots/${channel}`, body),
    loadProfile: () => apiGet('/me/profile'),
    saveProfile: (body) => apiPut('/me/profile', body),
  }
}
