import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut, apiPostAuth, apiDelete } from '../../lib/api'
import { useToast } from '../ui'
import { KbEditModal } from './KbEditModal'

/**
 * Per-business channel connections + chatbot training, in one modal.
 *
 * Two modes (top toggle):
 *  - Connections: spec-driven credential form (GET /api/admin/connection-spec),
 *    secrets stored encrypted. Blank secret fields keep the stored value.
 *  - Training: manage the business's knowledge base
 *    (GET/POST /api/admin/businesses/:id/knowledge, DELETE /api/admin/knowledge/:id)
 *    so an admin can train the bot for any business from here.
 */
const KB_ICON = { file: 'file-text', url: 'globe', qa: 'message-square' }

export function ConnectionModal({ business, onClose }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [mode, setMode] = useState('conn') // 'conn' | 'train'
  const [spec, setSpec] = useState(null)
  const [conns, setConns] = useState([])
  const [channel, setChannel] = useState('whatsapp')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  // training state
  const [kb, setKb] = useState([])
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [scope, setScope] = useState('all') // which agent this training is for
  const [editingKb, setEditingKb] = useState(null)

  const open = Boolean(business)

  // load spec + current connections when a business is opened
  useEffect(() => {
    if (!business) return
    setMode('conn')
    setChannel('whatsapp')
    Promise.all([
      apiGet('/admin/connection-spec'),
      apiGet(`/admin/businesses/${business.id}/connections`),
    ])
      .then(([sp, cs]) => { setSpec(sp); setConns(cs) })
      .catch(() => {})
    loadKb()
  }, [business])

  function loadKb() {
    if (!business) return
    apiGet(`/admin/businesses/${business.id}/knowledge`).then(setKb).catch(() => {})
  }

  const current = useMemo(() => conns.find((c) => c.channel === channel), [conns, channel])

  // reset the form to the active channel's non-secret values (secrets stay blank)
  useEffect(() => {
    if (!spec || !spec[channel]) return
    const f = {}
    for (const field of spec[channel].fields) {
      f[field.key] = field.secret ? '' : (current?.fields?.[field.key] || '')
    }
    setForm(f)
  }, [spec, channel, current])

  if (!open) return null

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      const res = await apiPut(`/admin/businesses/${business.id}/connections/${channel}`, { fields: form })
      const cs = await apiGet(`/admin/businesses/${business.id}/connections`)
      setConns(cs)
      toast(res.connected ? (isAr ? 'تم الحفظ — متصل ✓' : 'Saved — connected ✓') : (isAr ? 'تم الحفظ ✓' : 'Saved ✓'))
    } catch {
      toast(isAr ? 'فشل الحفظ' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function importUrl() {
    if (!url.trim()) return
    await apiPostAuth(`/admin/businesses/${business.id}/knowledge`, {
      type: 'url', title: url.trim(), source_url: url.trim(), meta: 'Imported from URL', channel: scope,
    }).catch(() => {})
    setUrl(''); toast(isAr ? 'تمت الإضافة ✓' : 'Added ✓'); loadKb()
  }
  async function addQa() {
    if (!q.trim()) return
    await apiPostAuth(`/admin/businesses/${business.id}/knowledge`, {
      type: 'qa', title: q.trim(), content: a.trim(), meta: 'Manual Q&A', channel: scope,
    }).catch(() => {})
    setQ(''); setA(''); toast(isAr ? 'تم التدريب ✓' : 'Trained ✓'); loadKb()
  }
  async function removeKb(id) {
    await apiDelete(`/admin/knowledge/${id}`).catch(() => {})
    loadKb()
  }

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 560 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 4 }}>{business.biz}</h3>
        <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 14 }}>
          {mode === 'conn'
            ? (isAr ? 'أدخل مفاتيح الاتصال (تُحفظ مشفّرة)' : 'Enter connection keys (stored encrypted)')
            : (isAr ? 'درّب روبوت المحادثة لهذا النشاط' : 'Train the chatbot for this business')}
        </p>

        {/* mode toggle */}
        <div className="conn-tabs" style={{ marginBottom: 14 }}>
          <button className={`conn-tab ${mode === 'conn' ? 'on' : ''}`} onClick={() => setMode('conn')}>
            <Icon name="plug-zap" size={15} />{isAr ? 'الاتصالات' : 'Connections'}
          </button>
          <button className={`conn-tab ${mode === 'train' ? 'on' : ''}`} onClick={() => setMode('train')}>
            <Icon name="brain" size={15} />{isAr ? 'التدريب' : 'Training'}
            <span className="badge b-info" style={{ marginInlineStart: 6, padding: '1px 7px' }}>{kb.length}</span>
          </button>
        </div>

        {/* ---------------- CONNECTIONS ---------------- */}
        {mode === 'conn' && (
          <>
            <div className="conn-tabs">
              {spec && Object.keys(spec).map((ch) => {
                const c = conns.find((x) => x.channel === ch)
                return (
                  <button
                    key={ch}
                    className={`conn-tab ${channel === ch ? 'on' : ''}`}
                    onClick={() => setChannel(ch)}
                  >
                    <Icon name={spec[ch].icon} size={15} />
                    {spec[ch].label.split(' — ')[0]}
                    <span className={`conn-dot ${c?.connected ? 'ok' : ''}`} />
                  </button>
                )
              })}
            </div>

            {spec && spec[channel] && (
              <>
                <div className="conn-status">
                  <span className={`badge ${current?.connected ? 'b-ok' : 'b-warn'}`}>
                    {current?.connected ? (isAr ? 'متصل' : 'CONNECTED') : (isAr ? 'غير متصل' : 'NOT CONNECTED')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--mut)' }}>{spec[channel].label}</span>
                </div>

                {spec[channel].fields.map((field) => (
                  <div className="field" key={field.key}>
                    <label>{field.label}{spec[channel].required.includes(field.key) && ' *'}</label>
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
                        placeholder={field.secret ? (current?.fields?.[field.key] || (isAr ? 'أدخل القيمة' : 'enter value')) : ''}
                        autoComplete="off"
                      />
                    )}
                  </div>
                ))}

                <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={save} disabled={saving}>
                  <Icon name="save" size={16} />
                  {saving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ الاتصال' : 'Save connection')}
                </button>
                <p style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 10, textAlign: 'center' }}>
                  {isAr
                    ? 'اترك حقل السر فارغاً للإبقاء على القيمة المحفوظة.'
                    : 'Leave a secret field blank to keep the stored value.'}
                </p>
              </>
            )}
          </>
        )}

        {/* ---------------- TRAINING ---------------- */}
        {mode === 'train' && (
          <>
            <div className="field">
              <label>{isAr ? 'تدريب لِـ' : 'Train for'}</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">{isAr ? 'كل الوكلاء (مشترك)' : 'All agents (shared)'}</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="website">{isAr ? 'الموقع' : 'Website'}</option>
                <option value="voice">{isAr ? 'الصوت' : 'Voice'}</option>
              </select>
              <div className="hint" style={{ marginTop: 6 }}>
                {isAr ? 'اختر «كل الوكلاء» للمشاركة، أو وكيلاً واحداً لتدريبه فقط.' : '“All agents” shares it; pick one to train only that agent.'}
              </div>
            </div>
            <div className="field">
              <label>{isAr ? 'استيراد من رابط' : 'Import from URL'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="https://example.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />
                <button className="btn btn-p" onClick={importUrl}>{isAr ? 'استيراد' : 'Import'}</button>
              </div>
            </div>
            <div className="field">
              <label>{isAr ? 'سؤال وجواب' : 'Add Q&A'}</label>
              <input placeholder={isAr ? 'السؤال…' : 'Question…'} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
              <textarea rows="2" placeholder={isAr ? 'الجواب…' : 'Answer…'} value={a} onChange={(e) => setA(e.target.value)} />
            </div>
            <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={addQa}>
              <Icon name="brain" size={16} />{isAr ? 'تدريب الروبوت' : 'Train the bot'}
            </button>

            <div style={{ marginTop: 16 }}>
              <div className="conn-status" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{isAr ? 'مصادر المعرفة' : 'Knowledge sources'}</span>
                <span className="badge b-info" style={{ marginInlineStart: 'auto' }}>{kb.length}</span>
              </div>
              {kb.map((s) => (
                <div className="kb-item" key={s.id}>
                  <div className="ic"><Icon name={KB_ICON[s.type] || 'file-text'} /></div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditingKb(s)}><b>{s.title}</b><span>{s.meta || ''}</span></div>
                  <span className={`badge ${(s.channel || 'all') === 'all' ? 'b-info' : 'b-ok'}`}>
                    {(s.channel || 'all') === 'all' ? (isAr ? 'الكل' : 'ALL') : (s.channel || '').toUpperCase()}
                  </span>
                  <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 8 }} onClick={() => setEditingKb(s)}>
                    <Icon name="pencil" size={13} />
                  </button>
                  <button className="btn btn-o" style={{ padding: '5px 9px', marginInlineStart: 6 }} onClick={() => removeKb(s.id)}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              {kb.length === 0 && (
                <div style={{ color: 'var(--mut)', fontSize: 13, padding: 12 }}>
                  {isAr ? 'لا توجد مصادر معرفة بعد.' : 'No knowledge sources yet.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editingKb && (
        <KbEditModal
          entry={editingKb}
          putBase="/admin/knowledge"
          channels={[
            { v: 'all', label: isAr ? 'كل الوكلاء (مشترك)' : 'All agents (shared)' },
            { v: 'whatsapp', label: 'WhatsApp' }, { v: 'instagram', label: 'Instagram' },
            { v: 'website', label: isAr ? 'الموقع' : 'Website' }, { v: 'voice', label: isAr ? 'الصوت' : 'Voice' },
          ]}
          onClose={() => setEditingKb(null)}
          onSaved={loadKb}
        />
      )}
    </div>
  )
}
