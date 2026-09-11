import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { T, useLang } from '../../i18n/LangContext'
import { apiGet, apiPatch } from '../../lib/api'
import { useToast } from './ui'

const STATUS_KEYS = {
  new: 'ord_st_new',
  confirmed: 'ord_st_confirmed',
  preparing: 'ord_st_preparing',
  ready: 'ord_st_ready',
  delivered: 'ord_st_delivered',
  cancelled: 'ord_st_cancelled',
}

function formatWhen(iso, isAr) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(isAr ? 'ar-KW' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}

function money(total, currency) {
  if (total == null || Number.isNaN(Number(total))) return null
  return `${Number(total).toLocaleString(undefined, { maximumFractionDigits: 3 })} ${currency || 'KWD'}`
}

/**
 * Orders tab — WhatsApp (and channel) orders captured for this business only.
 */
export function Orders({ apiBase = '/orders', showBusiness = false } = {}) {
  const { t, isAr } = useLang()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (q.trim()) params.set('q', q.trim())
    const qs = params.toString()
    apiGet(`${apiBase}${qs ? `?${qs}` : ''}`)
      .then((d) => {
        const rows = Array.isArray(d) ? d : (d.orders || [])
        setOrders(rows)
        setActiveId((id) => (id && rows.some((r) => r.id === id) ? id : rows[0]?.id || null))
      })
      .catch(() => toast(t('toast_save_failed') || 'Load failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    load()
    const timer = setInterval(load, 8000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, apiBase])

  const active = useMemo(() => orders.find((o) => o.id === activeId) || null, [orders, activeId])

  const counts = useMemo(() => {
    const c = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [orders])

  async function setOrderStatus(id, next) {
    setSaving(true)
    try {
      const updated = await apiPatch(`${apiBase}/${id}`, { status: next })
      setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...updated } : o)))
      toast(t('toast_saved') || 'Saved ✓')
    } catch (e) {
      toast(e.message || t('toast_save_failed'))
    } finally {
      setSaving(false)
    }
  }

  function searchSubmit(e) {
    e?.preventDefault?.()
    setLoading(true)
    load()
  }

  return (
    <div className="orders-page">
      <header className="orders-hero">
        <div>
          <div className="orders-kicker"><Icon name="package" size={15} /><T k="ord_kicker" /></div>
          <h2><T k="ord_h" /></h2>
          <p><T k="ord_p" /></p>
        </div>
        <div className="orders-stat">
          <b>{counts.all || 0}</b>
          <span><T k="ord_total" /></span>
        </div>
      </header>

      <div className="orders-toolbar">
        <form className="orders-search" onSubmit={searchSubmit}>
          <Icon name="hash" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('ord_search')}
          />
          <button type="submit" className="btn btn-o"><T k="ord_find" /></button>
        </form>
        <div className="orders-filters">
          {['all', 'new', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              type="button"
              className={`orders-pill${status === s ? ' on' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s === 'all' ? t('all') : t(STATUS_KEYS[s])}
              {s !== 'all' && counts[s] ? <em>{counts[s]}</em> : null}
            </button>
          ))}
        </div>
      </div>

      <div className={`orders-layout${active ? ' has-detail' : ''}`}>
        <div className="orders-list card">
          {loading && !orders.length && <div className="orders-empty"><T k="ord_loading" /></div>}
          {!loading && !orders.length && (
            <div className="orders-empty">
              <Icon name="package" size={28} />
              <b><T k="ord_empty" /></b>
              <p><T k="ord_empty_p" /></p>
            </div>
          )}
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`orders-row${o.id === activeId ? ' on' : ''}`}
              onClick={() => setActiveId(o.id)}
            >
              <div className="orders-row-top">
                <b>{o.customer_name || o.customer_handle || t('ord_customer')}</b>
                <span className={`orders-badge st-${o.status}`}>{t(STATUS_KEYS[o.status] || o.status)}</span>
              </div>
              <div className="orders-row-mid">{o.summary || t('ord_no_items')}</div>
              <div className="orders-row-bot">
                <span><Icon name="message-circle" size={12} /> {o.channel || 'whatsapp'}</span>
                {showBusiness && o.business_name ? <span>{o.business_name}</span> : null}
                <span>{formatWhen(o.created_at, isAr)}</span>
                {money(o.total, o.currency) ? <strong>{money(o.total, o.currency)}</strong> : null}
              </div>
            </button>
          ))}
        </div>

        <aside className={`orders-detail card${active ? '' : ' empty'}`}>
          {!active ? (
            <div className="orders-empty"><T k="ord_pick" /></div>
          ) : (
            <>
              <div className="orders-detail-head">
                <div>
                  <h3>{active.customer_name || active.customer_handle}</h3>
                  <p>{formatWhen(active.created_at, isAr)}</p>
                </div>
                <span className={`orders-badge st-${active.status}`}>{t(STATUS_KEYS[active.status] || active.status)}</span>
              </div>

              <div className="orders-grid">
                <div><label><T k="ord_phone" /></label><div>{active.customer_phone || active.customer_handle || '—'}</div></div>
                <div><label><T k="ord_channel" /></label><div>{active.channel || 'whatsapp'}</div></div>
                <div><label><T k="ord_type" /></label><div>{active.order_type === 'appointment' ? t('ord_type_appt') : t('ord_type_order')}</div></div>
                <div><label><T k="ord_source" /></label><div>{active.source || 'ai'}</div></div>
                {showBusiness && active.business_name ? (
                  <div><label><T k="ord_business" /></label><div>{active.business_name}</div></div>
                ) : null}
                {active.delivery_type ? (
                  <div><label><T k="ord_delivery" /></label><div>{active.delivery_type}</div></div>
                ) : null}
              </div>

              {active.address ? (
                <div className="orders-block">
                  <label><T k="ord_address" /></label>
                  <p>{active.address}</p>
                </div>
              ) : null}

              <div className="orders-block">
                <label><T k="ord_items" /></label>
                {(active.items || []).length === 0 ? (
                  <p className="muted">{active.summary || t('ord_no_items')}</p>
                ) : (
                  <ul className="orders-items">
                    {active.items.map((it, i) => (
                      <li key={i}>
                        <span className="qty">{it.qty || it.quantity || 1}×</span>
                        <span className="name">{it.name || it.title || t('ord_item')}</span>
                        {it.price != null ? <span className="price">{money(it.price, active.currency)}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {active.notes ? (
                <div className="orders-block">
                  <label><T k="ord_notes" /></label>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{active.notes}</p>
                </div>
              ) : null}

              <div className="orders-total-row">
                <span><T k="ord_total_amt" /></span>
                <b>{money(active.total, active.currency) || '—'}</b>
              </div>

              <div className="orders-actions">
                <label><T k="ord_update_status" /></label>
                <div className="orders-status-btns">
                  {['new', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn ${active.status === s ? 'btn-g' : 'btn-o'}`}
                      disabled={saving || active.status === s}
                      onClick={() => setOrderStatus(active.id, s)}
                    >
                      {t(STATUS_KEYS[s])}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
