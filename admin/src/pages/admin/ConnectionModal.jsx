import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPut } from '../../lib/api'
import { useToast } from '../ui'
import { WhatsAppQrPanel } from './WhatsAppQrPanel'
import { TrainingStudio, adminTrainingApi } from './TrainingStudio'
import { AgentHistoryPanel } from './AgentActivity'

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
export function ConnectionModal({ business, onClose }) {
  const { t } = useAdminT()
  const toast = useToast()
  const [mode, setMode] = useState('conn') // 'conn' | 'train' | 'history'
  const [spec, setSpec] = useState(null)
  const [conns, setConns] = useState([])
  const [channel, setChannel] = useState('whatsapp')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [waProvider, setWaProvider] = useState('qr')

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
      .then(([sp, cs]) => {
        setSpec(sp)
        setConns(cs)
        const wa = (cs || []).find((c) => c.channel === 'whatsapp')
        setWaProvider(wa?.provider === 'cloud_api' ? 'cloud_api' : 'qr')
      })
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
      const cs = await apiGet(`/admin/businesses/${business.id}/connections`)
      setConns(cs)
      toast(res.connected ? t('toast_saved_connected') : t('toast_saved'))
    } catch {
      toast(t('toast_save_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card${mode === 'train' ? ' train-wide' : ''}`} style={mode === 'train' ? { maxWidth: 1080 } : mode === 'history' ? { maxWidth: 1100 } : { maxWidth: 560 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 4 }}>{business.biz}</h3>
        <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 14 }}>
          {mode === 'conn' ? t('modal_conn_keys') : mode === 'train' ? t('modal_train') : t('act_history_sub')}
        </p>

        {/* mode toggle */}
        <div className="conn-tabs" style={{ marginBottom: 14 }}>
          <button className={`conn-tab ${mode === 'conn' ? 'on' : ''}`} onClick={() => setMode('conn')}>
            <Icon name="plug-zap" size={15} />{t('conn_tab')}
          </button>
          <button className={`conn-tab ${mode === 'train' ? 'on' : ''}`} onClick={() => setMode('train')}>
            <Icon name="brain" size={15} />{t('train_tab')}
          </button>
          <button className={`conn-tab ${mode === 'history' ? 'on' : ''}`} onClick={() => setMode('history')}>
            <Icon name="history" size={15} />{t('act_history')}
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
                    {current?.connected ? t('connected') : t('not_connected')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--mut)' }}>{spec[channel].label}</span>
                </div>

                {channel === 'whatsapp' && (
                  <div className="conn-tabs" style={{ margin: '8px 0 12px' }}>
                    <button className={`conn-tab ${waProvider === 'qr' ? 'on' : ''}`} onClick={() => setWaProvider('qr')}>
                      {t('conn_qr_tab')}
                    </button>
                    <button className={`conn-tab ${waProvider === 'cloud_api' ? 'on' : ''}`} onClick={() => setWaProvider('cloud_api')}>
                      Meta Cloud API
                    </button>
                  </div>
                )}

                {channel === 'whatsapp' && waProvider === 'qr' && (
                  <WhatsAppQrPanel base={`/admin/businesses/${business.id}/whatsapp/qr`} />
                )}

                {(channel !== 'whatsapp' || waProvider === 'cloud_api') && spec[channel].fields.map((field) => (
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
                        placeholder={field.secret ? (current?.fields?.[field.key] || t('enter_value')) : ''}
                        autoComplete="off"
                      />
                    )}
                  </div>
                ))}

                {(channel !== 'whatsapp' || waProvider === 'cloud_api') && (
                  <>
                    <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={save} disabled={saving}>
                      <Icon name="save" size={16} />
                      {saving ? t('conn_saving') : t('conn_save')}
                    </button>
                    <p style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 10, textAlign: 'center' }}>
                      {t('conn_secret_blank_hint')}
                    </p>
                  </>
                )}
              </>
            )}
          </>
        )}

        {mode === 'train' && business?.id && (
          <TrainingStudio compact api={adminTrainingApi(business.id)} />
        )}

        {mode === 'history' && business?.id && (
          <AgentHistoryPanel businessId={business.id} showBusiness={false} compact />
        )}
      </div>
    </div>
  )
}
