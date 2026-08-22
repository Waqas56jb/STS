import { useAdminT } from '../../i18n/admin'

const LOGO = import.meta.env.BASE_URL + 'logo.png'

/**
 * One-page printable invoice — STS branding, paid stamp, line items.
 * Designed for A4 print / Save as PDF via the browser.
 */
export function InvoiceDocument({ data, printRef }) {
  const { t } = useAdminT()
  if (!data) return null

  const paid = data.status === 'paid'
  const cur = data.platform?.currency || 'KWD'
  const fmt = (n) => `${Number(n).toFixed(2)} ${cur}`

  return (
    <article className="inv-doc" ref={printRef}>
      {paid && <div className="inv-paid-stamp">{t('inv_paid_stamp')}</div>}

      <header className="inv-head">
        <div className="inv-brand">
          <img src={LOGO} alt="STS" className="inv-logo" />
          <div>
            <h1>{data.platform?.name || 'STS'}</h1>
            <p>{data.platform?.tagline}</p>
          </div>
        </div>
        <div className="inv-meta">
          <h2>{t('inv_title')}</h2>
          <div className="inv-meta-row"><span>{t('inv_no')}</span><b>{data.number}</b></div>
          <div className="inv-meta-row"><span>{t('inv_issued')}</span><b>{data.issued_at}</b></div>
          <div className="inv-meta-row"><span>{t('inv_due')}</span><b>{data.due_at}</b></div>
          <span className={`inv-status inv-status-${data.status}`}>{data.status?.toUpperCase()}</span>
        </div>
      </header>

      <div className="inv-parties">
        <div className="inv-party">
          <h3>{t('inv_from')}</h3>
          <b>{data.platform?.name} — {data.platform?.tagline}</b>
          {data.platform?.email && <p>{data.platform.email}</p>}
          {data.platform?.whatsapp && <p>{data.platform.whatsapp}</p>}
        </div>
        <div className="inv-party">
          <h3>{t('inv_bill_to')}</h3>
          <b>{data.business?.name}</b>
          {data.business?.contact && data.business.contact !== data.business.name && (
            <p>{data.business.contact}</p>
          )}
          {data.business?.email && <p>{data.business.email}</p>}
          {data.business?.whatsapp && <p>{data.business.whatsapp}</p>}
          {data.business?.plan && <p className="inv-plan">{data.business.plan}</p>}
        </div>
      </div>

      <table className="inv-table">
        <thead>
          <tr>
            <th>{t('inv_item')}</th>
            <th>{t('inv_qty')}</th>
            <th>{t('inv_rate')}</th>
            <th>{t('inv_amount')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <b>{data.description || t('inv_subscription')}</b>
              {data.business?.plan && <small>{data.business.plan}</small>}
            </td>
            <td>1</td>
            <td>{fmt(data.amount)}</td>
            <td><b>{fmt(data.amount)}</b></td>
          </tr>
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="inv-total-row"><span>{t('inv_subtotal')}</span><span>{fmt(data.amount)}</span></div>
        <div className="inv-total-row inv-grand"><span>{t('inv_total')}</span><span>{fmt(data.amount)}</span></div>
      </div>

      {paid && data.payment && (
        <div className="inv-payment-box">
          <IconRow label={t('inv_payment_ref')} value={data.payment.reference} />
          <IconRow label={t('inv_payment_meth')} value={data.payment.method} />
          <IconRow label={t('inv_payment_date')} value={data.payment.date} />
        </div>
      )}

      <footer className="inv-foot">
        <p>{t('inv_thanks')}</p>
        <p className="inv-foot-muted">{t('inv_terms')}</p>
      </footer>
    </article>
  )
}

function IconRow({ label, value }) {
  return (
    <div className="inv-pay-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
