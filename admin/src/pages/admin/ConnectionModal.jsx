import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut } from '../../lib/api'
import { useToast } from '../ui'

/**
 * Per-business channel connection credentials.
 *
 * The field layout is driven by GET /api/admin/connection-spec (so adding a
 * field in the backend appears here automatically). Secret fields render as
 * password inputs with the masked current value as placeholder — leaving one
 * blank keeps the stored secret (the server merges), so a connection never
 * accidentally breaks. Saving encrypts everything server-side.
 */
export function ConnectionModal({ business, onClose }) {
  const { t, isAr } = useAdminT()
  const toast = useToast()
  const [spec, setSpec] = useState(null)
  const [conns, setConns] = useState([])
  const [channel, setChannel] = useState('whatsapp')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const open = Boolean(business)

  // load spec + current connections when a business is opened
  useEffect(() => {
    if (!business) return
    setChannel('whatsapp')
    Promise.all([
      apiGet('/admin/connection-spec'),
      apiGet(`/admin/businesses/${business.id}/connections`),
    ])
      .then(([sp, cs]) => { setSpec(sp); setConns(cs) })
      .catch(() => {})
  }, [business])

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
      // refresh masked view
      const cs = await apiGet(`/admin/businesses/${business.id}/connections`)
      setConns(cs)
      toast(res.connected ? (isAr ? 'تم الحفظ — متصل ✓' : 'Saved — connected ✓') : (isAr ? 'تم الحفظ ✓' : 'Saved ✓'))
    } catch {
      toast(isAr ? 'فشل الحفظ' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 560 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 4 }}>{isAr ? 'اتصالات القنوات' : 'Channel connections'}</h3>
        <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 16 }}>
          {business.biz} — {isAr ? 'أدخل مفاتيح الاتصال (تُحفظ مشفّرة)' : 'enter the connection keys (stored encrypted)'}
        </p>

        {/* channel tabs */}
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
      </div>
    </div>
  )
}
