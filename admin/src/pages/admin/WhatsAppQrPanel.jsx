import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPostAuth } from '../../lib/api'

const LIVE = new Set(['starting', 'qr', 'connecting', 'reconnecting'])

export function WhatsAppQrPanel({ base, onChange }) {
  const { isAr } = useAdminT()
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
    const t = setInterval(refresh, 1200)
    return () => clearInterval(t)
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
  const label = {
    disconnected: isAr ? 'غير متصل' : 'Disconnected',
    starting: isAr ? 'جارٍ البدء…' : 'Starting…',
    qr: isAr ? 'بانتظار المسح' : 'Waiting for QR scan',
    connecting: isAr ? 'جارٍ الاتصال…' : 'Connecting…',
    connected: isAr ? 'متصل' : 'Connected',
    reconnecting: isAr ? 'إعادة الاتصال…' : 'Reconnecting…',
    logged_out: isAr ? 'تم تسجيل الخروج' : 'Logged out',
    error: isAr ? 'خطأ' : 'Error',
  }[st.status] || st.status

  return (
    <div>
      <div className="conn-status" style={{ marginBottom: 12 }}>
        <span className={`badge ${connected ? 'b-ok' : 'b-warn'}`}>{label}</span>
        {connected && <span style={{ fontSize: 13 }}>{st.display_number}</span>}
      </div>
      {st.qr && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src={st.qr} alt="WhatsApp QR" width={200} height={200} style={{ borderRadius: 12, background: '#fff' }} />
          <p style={{ color: 'var(--mut)', fontSize: 12, marginTop: 8 }}>
            {isAr
              ? 'واتساب → الأجهزة المرتبطة → ربط جهاز → امسح الرمز'
              : 'WhatsApp → Linked devices → Link a device → scan this QR'}
          </p>
        </div>
      )}
      {st.error && <p style={{ color: '#b45309', fontSize: 13, marginBottom: 8 }}>{st.error}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!connected && (
          <button className="btn btn-g" disabled={busy} onClick={() => run('/start')}>
            <Icon name="qr-code" size={15} />{isAr ? 'بدء رمز QR' : 'Start QR'}
          </button>
        )}
        {(st.status === 'qr' || st.status === 'error') && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/start')}>
            <Icon name="refresh-cw" size={14} />{isAr ? 'تحديث' : 'Refresh QR'}
          </button>
        )}
        {(connected || st.status === 'reconnecting') && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/reconnect')}>
            <Icon name="refresh-cw" size={14} />{isAr ? 'إعادة الاتصال' : 'Reconnect'}
          </button>
        )}
        {st.status !== 'disconnected' && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/logout')}>
            <Icon name="log-out" size={14} />{isAr ? 'قطع الاتصال' : 'Disconnect'}
          </button>
        )}
      </div>
    </div>
  )
}
