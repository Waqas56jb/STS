import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPostAuth } from '../../lib/api'

const LIVE = new Set(['starting', 'qr', 'connecting', 'reconnecting'])

export function WhatsAppQrPanel({ base, onChange }) {
  const { t } = useAdminT()
  const [st, setSt] = useState({ status: 'disconnected', qr: null, display_number: '', error: null })
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const s = await apiGet(base + '/status')
      setSt(s)
      onChange?.(s)
      return s
    } catch { return null }
  }

  useEffect(() => { refresh() }, [base])
  useEffect(() => {
    if (!LIVE.has(st.status)) return
    const id = setInterval(refresh, 1200)
    return () => clearInterval(id)
  }, [st.status, base])

  async function run(path) {
    setBusy(true)
    try {
      const s = await apiPostAuth(base + path, {})
      setSt(s)
      onChange?.(s)
    } catch (e) {
      setSt((prev) => ({ ...prev, status: 'error', error: e.message || 'Request failed' }))
    } finally { setBusy(false) }
  }

  const connected = st.status === 'connected'
  const pairing = LIVE.has(st.status)
  const label = {
    disconnected: t('qr_disconnected'),
    starting: t('qr_starting'),
    qr: t('qr_waiting'),
    connecting: t('qr_connecting'),
    connected: t('qr_connected'),
    reconnecting: t('qr_reconnecting'),
    logged_out: t('qr_logged_out'),
    error: t('qr_error'),
  }[st.status] || st.status

  return (
    <div>
      <div className="conn-status" style={{ marginBottom: 12 }}>
        <span className={`badge ${connected || st.status === 'reconnecting' ? 'b-ok' : 'b-warn'}`}>{label}</span>
        {(connected || st.status === 'reconnecting') && <span style={{ fontSize: 13 }}>{st.display_number}</span>}
      </div>
      {st.qr && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src={st.qr} alt="WhatsApp QR" width={200} height={200} style={{ borderRadius: 12, background: '#fff' }} />
          <p style={{ color: 'var(--mut)', fontSize: 12, marginTop: 8 }}>{t('qr_how_short')}</p>
        </div>
      )}
      {st.error && <p style={{ color: '#b45309', fontSize: 13, marginBottom: 8 }}>{st.error}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!connected && !pairing && (
          <button className="btn btn-g" disabled={busy} onClick={() => run('/start')}>
            <Icon name="qr-code" size={15} />{t('qr_start')}
          </button>
        )}
        {(st.status === 'qr' || st.status === 'error') && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/start')}>
            <Icon name="refresh-cw" size={14} />{t('qr_refresh')}
          </button>
        )}
        {(connected || st.status === 'reconnecting') && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/reconnect')}>
            <Icon name="refresh-cw" size={14} />{t('qr_reconnect')}
          </button>
        )}
        {st.status !== 'disconnected' && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/logout')}>
            <Icon name="log-out" size={14} />{t('qr_disconnect')}
          </button>
        )}
      </div>
    </div>
  )
}
