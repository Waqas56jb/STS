import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { apiGet, apiPostAuth } from '../../lib/api'

const LIVE = new Set(['starting', 'qr', 'connecting', 'reconnecting'])

/**
 * QR / Linked-Device pairing. Polls GET status while a scan is in progress.
 * `base` is the API prefix, e.g. /me/whatsapp/qr
 */
export function WhatsAppQrPanel({ base = '/me/whatsapp/qr', onChange }) {
  const { isAr } = useLang()
  const [st, setSt] = useState({ status: 'disconnected', qr: null, display_number: '', error: null })
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const s = await apiGet(base + '/status')
      setSt(s)
      onChange?.(s)
      return s
    } catch {
      return null
    }
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
      console.error('WhatsApp QR', path, e)
    } finally {
      setBusy(false)
    }
  }

  const connected = st.status === 'connected'
  const pairing = LIVE.has(st.status)
  const statusLabel = {
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
      <div className="row" style={{ marginBottom: 12 }}>
        <div>
          <b><T k="qr_title" /></b>
          <p><T k="qr_sub" /></p>
        </div>
        <span className={`badge ${connected || st.status === 'reconnecting' ? 'b-ok' : 'b-warn'}`}>
          {statusLabel}
        </span>
      </div>

      {(connected || st.status === 'reconnecting') && (
        <div style={{ marginBottom: 12, fontSize: 14 }}>
          <b>{st.display_number || '—'}</b>
        </div>
      )}

      {st.qr && (
        <div style={{ textAlign: 'center', margin: '10px 0 14px' }}>
          <img src={st.qr} alt="WhatsApp QR" width={220} height={220} style={{ borderRadius: 12, background: '#fff' }} />
          <p style={{ color: 'var(--mut)', fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
            <T k="qr_how" />
          </p>
        </div>
      )}

      {st.error && (
        <p style={{ color: 'var(--warn, #b45309)', fontSize: 13, marginBottom: 10 }}>{st.error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!connected && !pairing && (
          <button className="btn btn-g" disabled={busy} onClick={() => run('/start')}>
            <Icon name="qr-code" size={16} />{busy ? <T k="saving" /> : <T k="qr_start" />}
          </button>
        )}
        {(st.status === 'qr' || st.status === 'error') && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/start')}>
            <Icon name="refresh-cw" size={15} /><T k="qr_refresh" />
          </button>
        )}
        {(connected || st.status === 'reconnecting') && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/reconnect')}>
            <Icon name="refresh-cw" size={15} /><T k="qr_reconnect" />
          </button>
        )}
        {st.status !== 'disconnected' && (
          <button className="btn btn-o" disabled={busy} onClick={() => run('/logout')}>
            <Icon name="log-out" size={15} /><T k="qr_disconnect" />
          </button>
        )}
      </div>
      <div className="hint" style={{ marginTop: 10 }}><T k="qr_note" /></div>
    </div>
  )
}
