import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet } from '../../lib/api'
import { InvoiceDocument } from './InvoiceDocument'

/** Full-screen invoice preview with print / download (Save as PDF). */
export function InvoiceModal({ invoiceKey, onClose }) {
  const { t } = useAdminT()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef(null)

  useEffect(() => {
    if (!invoiceKey) return
    setLoading(true)
    apiGet(`/admin/invoices/${encodeURIComponent(invoiceKey)}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [invoiceKey])

  function download() {
    document.body.classList.add('inv-printing')
    const cleanup = () => document.body.classList.remove('inv-printing')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    setTimeout(cleanup, 3000)
  }

  if (!invoiceKey) return null

  return (
    <div className="modal open inv-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal-card">
        <div className="inv-modal-bar no-print">
          <button type="button" className="modal-x" onClick={onClose} aria-label={t('inv_close')}>
            <Icon name="x" />
          </button>
          <div className="inv-modal-actions">
            {data && (
              <button type="button" className="btn btn-g" onClick={download}>
                <Icon name="download" size={16} />
                {t('inv_download')}
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="inv-loading">{t('loading')}</div>
        )}
        {!loading && !data && (
          <div className="inv-loading">{t('inv_not_found')}</div>
        )}
        {data && <InvoiceDocument data={data} printRef={printRef} />}
      </div>
    </div>
  )
}
