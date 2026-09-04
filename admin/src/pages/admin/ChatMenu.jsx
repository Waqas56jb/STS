import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiPostAuth, apiUpload } from '../../lib/api'
import { useToast } from '../ui'

const ACTION_LABELS = {
  static_response: 'Static Response',
  send_link: 'Send Link',
  send_image: 'Send Image',
  send_video: 'Send Video',
  send_document: 'Send Document / PDF',
  send_location: 'Send Location',
  send_contact: 'Send Contact',
  start_ai: 'Start AI Conversation',
  human_handoff: 'Human Handoff',
  start_submenu: 'Start Submenu',
  book_appointment: 'Book Appointment',
  custom_ai: 'Custom AI Instruction',
}

const emptyOption = (n = 1) => ({
  id: null,
  sort_order: n,
  title_en: '',
  title_ar: '',
  action_type: 'static_response',
  active: true,
  config: {},
})

function Switch({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="slider" />
    </label>
  )
}

function OptionFields({ option, onChange, onUpload }) {
  const cfg = option.config || {}
  const setCfg = (k, v) => onChange({ ...option, config: { ...cfg, [k]: v } })
  const t = option.action_type

  return (
    <div className="cm-fields">
      {(t === 'static_response') && (
        <>
          <div className="field"><label>English response</label>
            <textarea rows={3} value={cfg.response_en || ''} onChange={(e) => setCfg('response_en', e.target.value)} /></div>
          <div className="field"><label>Arabic response</label>
            <textarea rows={3} dir="rtl" value={cfg.response_ar || ''} onChange={(e) => setCfg('response_ar', e.target.value)} /></div>
        </>
      )}
      {t === 'send_link' && (
        <>
          <div className="field"><label>English message</label>
            <textarea rows={2} value={cfg.message_en || ''} onChange={(e) => setCfg('message_en', e.target.value)} /></div>
          <div className="field"><label>Arabic message</label>
            <textarea rows={2} dir="rtl" value={cfg.message_ar || ''} onChange={(e) => setCfg('message_ar', e.target.value)} /></div>
          <div className="field"><label>URL</label>
            <input value={cfg.url || ''} onChange={(e) => setCfg('url', e.target.value)} placeholder="https://" /></div>
        </>
      )}
      {(t === 'send_image' || t === 'send_video') && (
        <>
          <div className="field"><label>Upload {t === 'send_image' ? 'image' : 'video'}</label>
            <input type="file" accept={t === 'send_image' ? 'image/jpeg,image/png,image/webp' : 'video/*'}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], setCfg)} />
            {cfg.file && <div className="hint">File: {cfg.file}</div>}
          </div>
          <div className="field"><label>English caption</label>
            <textarea rows={2} value={cfg.caption_en || ''} onChange={(e) => setCfg('caption_en', e.target.value)} /></div>
          <div className="field"><label>Arabic caption</label>
            <textarea rows={2} dir="rtl" value={cfg.caption_ar || ''} onChange={(e) => setCfg('caption_ar', e.target.value)} /></div>
        </>
      )}
      {t === 'send_document' && (
        <>
          <div className="field"><label>Upload file (PDF, DOCX, XLSX…)</label>
            <input type="file" accept=".pdf,.docx,.xlsx,.doc,.xls,application/pdf"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], setCfg)} />
            {cfg.file && <div className="hint">File: {cfg.file}</div>}
          </div>
          <div className="field"><label>English message</label>
            <textarea rows={2} value={cfg.message_en || ''} onChange={(e) => setCfg('message_en', e.target.value)} /></div>
          <div className="field"><label>Arabic message</label>
            <textarea rows={2} dir="rtl" value={cfg.message_ar || ''} onChange={(e) => setCfg('message_ar', e.target.value)} /></div>
        </>
      )}
      {t === 'send_location' && (
        <>
          <div className="field"><label>Location name</label>
            <input value={cfg.name || ''} onChange={(e) => setCfg('name', e.target.value)} /></div>
          <div className="field"><label>Address</label>
            <input value={cfg.address || ''} onChange={(e) => setCfg('address', e.target.value)} /></div>
          <div className="cm-row2">
            <div className="field"><label>Latitude</label>
              <input value={cfg.lat ?? ''} onChange={(e) => setCfg('lat', e.target.value)} /></div>
            <div className="field"><label>Longitude</label>
              <input value={cfg.lng ?? ''} onChange={(e) => setCfg('lng', e.target.value)} /></div>
          </div>
          <div className="field"><label>English message</label>
            <textarea rows={2} value={cfg.message_en || ''} onChange={(e) => setCfg('message_en', e.target.value)} /></div>
          <div className="field"><label>Arabic message</label>
            <textarea rows={2} dir="rtl" value={cfg.message_ar || ''} onChange={(e) => setCfg('message_ar', e.target.value)} /></div>
        </>
      )}
      {t === 'send_contact' && (
        <>
          <div className="field"><label>Contact name</label>
            <input value={cfg.contact_name || ''} onChange={(e) => setCfg('contact_name', e.target.value)} /></div>
          <div className="field"><label>Company</label>
            <input value={cfg.company || ''} onChange={(e) => setCfg('company', e.target.value)} /></div>
          <div className="field"><label>Phone</label>
            <input value={cfg.phone || ''} onChange={(e) => setCfg('phone', e.target.value)} placeholder="+965..." /></div>
          <div className="field"><label>Email</label>
            <input value={cfg.email || ''} onChange={(e) => setCfg('email', e.target.value)} /></div>
        </>
      )}
      {(t === 'start_ai' || t === 'human_handoff' || t === 'book_appointment') && (
        <>
          <div className="field"><label>English message</label>
            <textarea rows={2} value={cfg.message_en || ''} onChange={(e) => setCfg('message_en', e.target.value)} /></div>
          <div className="field"><label>Arabic message</label>
            <textarea rows={2} dir="rtl" value={cfg.message_ar || ''} onChange={(e) => setCfg('message_ar', e.target.value)} /></div>
        </>
      )}
      {t === 'custom_ai' && (
        <>
          <div className="field"><label>English opener</label>
            <textarea rows={2} value={cfg.message_en || ''} onChange={(e) => setCfg('message_en', e.target.value)} /></div>
          <div className="field"><label>Arabic opener</label>
            <textarea rows={2} dir="rtl" value={cfg.message_ar || ''} onChange={(e) => setCfg('message_ar', e.target.value)} /></div>
          <div className="field"><label>AI instruction</label>
            <textarea rows={4} value={cfg.ai_instruction || ''} onChange={(e) => setCfg('ai_instruction', e.target.value)}
              placeholder="Ask about business type, platforms, volume…" /></div>
        </>
      )}
      {t === 'start_submenu' && (
        <>
          <div className="field"><label>Submenu title (EN)</label>
            <input value={cfg.submenu_title_en || ''} onChange={(e) => setCfg('submenu_title_en', e.target.value)} /></div>
          <div className="field"><label>Submenu title (AR)</label>
            <input dir="rtl" value={cfg.submenu_title_ar || ''} onChange={(e) => setCfg('submenu_title_ar', e.target.value)} /></div>
          <div className="hint">Edit submenu items as JSON list (title_en, title_ar, action_type, response_en, response_ar)</div>
          <div className="field"><label>Submenu options (JSON)</label>
            <textarea rows={6} value={JSON.stringify(cfg.submenu_options || [], null, 2)}
              onChange={(e) => {
                try { setCfg('submenu_options', JSON.parse(e.target.value || '[]')) } catch { /* keep typing */ }
              }} /></div>
        </>
      )}
    </div>
  )
}

export function ChatMenu({ businessId: fixedBizId = null, compact = false, apiBase = null }) {
  const { t } = useAdminT()
  const toast = useToast()
  const [menu, setMenu] = useState(null)
  const [options, setOptions] = useState([])
  const [businessId, setBusinessId] = useState(fixedBizId)
  const [businesses, setBusinesses] = useState([])
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [dragIdx, setDragIdx] = useState(null)

  const load = (id = businessId || fixedBizId) => {
    const path = id
      ? (apiBase || `/admin/businesses/${id}/chat-menu`)
      : '/admin/chat-menu'
    apiGet(path)
      .then((d) => {
        setMenu(d.menu)
        setOptions(d.options || [])
        setBusinessId(d.business_id)
      })
      .catch(() => toast(t('toast_save_failed') || 'Load failed'))
  }

  useEffect(() => {
    if (fixedBizId) {
      load(fixedBizId)
      return
    }
    // Standalone admin page: load business list then first/selected menu
    apiGet('/admin/businesses')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setBusinesses(list)
        const first = list[0]?.id || null
        if (first) load(first)
        else load()
      })
      .catch(() => load())
  }, [fixedBizId])

  useEffect(() => {
    if (fixedBizId) setBusinessId(fixedBizId)
  }, [fixedBizId])

  const preview = useMemo(() => {
    if (!menu) return { greeting: '', menuText: '' }
    const greet = [menu.greeting_en, menu.bilingual ? menu.greeting_ar : ''].filter(Boolean).join('\n\n')
    const intro = menu.menu_intro_en || 'How can we help you today?'
    const lines = [intro, '']
    options.filter((o) => o.active !== false).forEach((o, i) => {
      lines.push(`${i + 1}️⃣ ${o.title_en || 'Option'}`)
      if (menu.bilingual && o.title_ar) lines.push(`   ${o.title_ar}`)
    })
    return { greeting: greet, menuText: lines.join('\n') }
  }, [menu, options])

  function updateOpt(i, next) {
    setOptions((list) => list.map((o, idx) => (idx === i ? next : o)))
  }
  function move(i, dir) {
    setOptions((list) => {
      const j = i + dir
      if (j < 0 || j >= list.length) return list
      const copy = [...list]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy.map((o, idx) => ({ ...o, sort_order: idx + 1 }))
    })
  }
  function remove(i) {
    if (!window.confirm('Delete this option?')) return
    setOptions((list) => list.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, sort_order: idx + 1 })))
  }
  function addOption() {
    setOptions((list) => [...list, emptyOption(list.length + 1)])
  }

  async function upload(file, setCfg) {
    try {
      const q = businessId ? `?business_id=${encodeURIComponent(businessId)}` : ''
      const uploadPath = apiBase?.startsWith('/chat-menu')
        ? '/chat-menu/upload'
        : `/admin/chat-menu/upload${q}`
      const r = await apiUpload(uploadPath, file)
      setCfg('file', r.path)
      toast(t('toast_saved') || 'Uploaded')
    } catch (e) {
      toast(e.message || 'Upload failed')
    }
  }

  async function save() {
    setSaving(true)
    try {
      const path = businessId
        ? (apiBase || `/admin/businesses/${businessId}/chat-menu`)
        : '/admin/chat-menu'
      const body = {
        ...menu,
        business_id: businessId,
        options: options.map((o, i) => ({ ...o, sort_order: i + 1 })),
      }
      const d = await apiPut(path, body)
      setMenu(d.menu)
      setOptions(d.options || [])
      toast(t('toast_saved') || 'Saved')
    } catch (e) {
      toast(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    try {
      await apiPostAuth('/admin/chat-menu/test', { to: testTo, business_id: businessId })
      toast('Test menu sent')
    } catch (e) {
      toast(e.message || 'Test failed — is WhatsApp QR connected?')
    }
  }

  function onDrop(toIdx) {
    if (dragIdx == null || dragIdx === toIdx) return
    setOptions((list) => {
      const copy = [...list]
      const [item] = copy.splice(dragIdx, 1)
      copy.splice(toIdx, 0, item)
      return copy.map((o, idx) => ({ ...o, sort_order: idx + 1 }))
    })
    setDragIdx(null)
  }

  if (!menu) {
    return <div className="card" style={{ color: 'var(--mut)', padding: 40 }}>Loading Chat Menu…</div>
  }

  return (
    <div className={`chat-menu${compact ? ' compact' : ''}`}>
      <div className="cm-top">
        <div>
          <h2 style={{ margin: 0, fontSize: compact ? 18 : undefined }}>Chat Menu</h2>
          <p style={{ color: 'var(--mut)', margin: '6px 0 0', fontSize: 13 }}>
            Create the options customers see immediately after the welcome message.
          </p>
        </div>
        <div className="cm-top-actions">
          <button type="button" className="btn btn-o" onClick={addOption}><Icon name="plus" size={15} /> Add option</button>
          <button type="button" className="btn btn-g" onClick={save} disabled={saving}>
            <Icon name="save" size={15} />{saving ? 'Saving…' : 'Save menu'}
          </button>
        </div>
      </div>

      {!fixedBizId && businesses.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Business (each business has its own chat menu)</label>
            <select
              value={businessId || ''}
              onChange={(e) => {
                const id = e.target.value
                setBusinessId(id)
                setMenu(null)
                load(id)
              }}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.biz} ({b.email})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="cm-layout">
        <div className="cm-editor">
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row">
              <div><b>Automatically send Chat Menu after Greeting Message</b>
                <p style={{ margin: 0, color: 'var(--mut)', fontSize: 12.5 }}>Only once per new conversation / session</p>
              </div>
              <Switch checked={menu.enabled !== false} onChange={(v) => setMenu((m) => ({ ...m, enabled: v }))} />
            </div>
            <div className="row">
              <div><b>Display bilingual menu</b><p style={{ margin: 0, color: 'var(--mut)', fontSize: 12.5 }}>Show English + Arabic titles together</p></div>
              <Switch checked={!!menu.bilingual} onChange={(v) => setMenu((m) => ({ ...m, bilingual: v }))} />
            </div>
            <div className="field"><label>Consider conversation “new” again after</label>
              <select value={menu.reset_hours ?? 24} onChange={(e) => setMenu((m) => ({ ...m, reset_hours: Number(e.target.value) }))}>
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
                <option value={0}>Never (manual reset only)</option>
              </select>
            </div>
            <div className="field"><label>Greeting (English)</label>
              <textarea rows={4} value={menu.greeting_en || ''} onChange={(e) => setMenu((m) => ({ ...m, greeting_en: e.target.value }))} /></div>
            <div className="field"><label>Greeting (Arabic)</label>
              <textarea rows={4} dir="rtl" value={menu.greeting_ar || ''} onChange={(e) => setMenu((m) => ({ ...m, greeting_ar: e.target.value }))} /></div>
            <div className="cm-row2">
              <div className="field"><label>Menu intro (EN)</label>
                <input value={menu.menu_intro_en || ''} onChange={(e) => setMenu((m) => ({ ...m, menu_intro_en: e.target.value }))} /></div>
              <div className="field"><label>Menu intro (AR)</label>
                <input dir="rtl" value={menu.menu_intro_ar || ''} onChange={(e) => setMenu((m) => ({ ...m, menu_intro_ar: e.target.value }))} /></div>
            </div>
          </div>

          {options.map((o, i) => (
            <div
              key={o.id || `new-${i}`}
              className={`card cm-option${o.active === false ? ' off' : ''}`}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
            >
              <div className="cm-option-head">
                <span className="cm-num">{i + 1}</span>
                <div className="cm-option-titles">
                  <input placeholder="English menu title" value={o.title_en || ''}
                    onChange={(e) => updateOpt(i, { ...o, title_en: e.target.value })} />
                  <input dir="rtl" placeholder="Arabic menu title" value={o.title_ar || ''}
                    onChange={(e) => updateOpt(i, { ...o, title_ar: e.target.value })} />
                </div>
                <div className="cm-option-side">
                  <button type="button" className="btn btn-o" title="Move up" onClick={() => move(i, -1)}><Icon name="arrow-up-circle" size={14} /></button>
                  <button type="button" className="btn btn-o" title="Move down" onClick={() => move(i, 1)}><Icon name="arrow-up-circle" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
                  <button type="button" className="btn btn-r" title="Delete" onClick={() => remove(i)}><Icon name="x" size={14} /></button>
                </div>
              </div>
              <div className="cm-row2" style={{ marginTop: 10 }}>
                <div className="field"><label>Action type</label>
                  <select value={o.action_type} onChange={(e) => updateOpt(i, { ...o, action_type: e.target.value, config: o.config || {} })}>
                    {Object.entries(ACTION_LABELS).map(([k, lab]) => (
                      <option key={k} value={k}>{lab}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: 10, paddingBottom: 8 }}>
                  <b style={{ fontSize: 13 }}>Active</b>
                  <Switch checked={o.active !== false} onChange={(v) => updateOpt(i, { ...o, active: v })} />
                </div>
              </div>
              <OptionFields option={o} onChange={(next) => updateOpt(i, next)} onUpload={upload} />
            </div>
          ))}
        </div>

        <aside className="cm-preview-col">
          <div className="cm-phone">
            <div className="cm-phone-bar">
              <span className="cm-phone-dot" />
              WhatsApp preview
            </div>
            <div className="cm-phone-body">
              <div
                className="cm-bubble cm-biz"
                style={{ color: '#111b21', background: '#ffffff', WebkitTextFillColor: '#111b21' }}
              >
                {preview.greeting || 'Greeting…'}
              </div>
              <div
                className="cm-bubble cm-biz"
                style={{ color: '#111b21', background: '#ffffff', WebkitTextFillColor: '#111b21' }}
              >
                {(preview.menuText || 'Menu…').split('\n').map((line, idx) => (
                  <div key={idx} style={{ color: '#111b21', minHeight: line ? undefined : 8 }}>
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {!apiBase?.startsWith('/chat-menu') && (
            <div className="card" style={{ marginTop: 12 }}>
              <h3 style={{ marginTop: 0 }}><Icon name="send" size={15} /> Send Test</h3>
              <p style={{ color: 'var(--mut)', fontSize: 12.5 }}>Sends Greeting → Chat Menu to a WhatsApp number (QR must be connected).</p>
              <div className="field"><label>WhatsApp number</label>
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="9655xxxxxxx" /></div>
              <button type="button" className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={sendTest}>
                Send Test
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
