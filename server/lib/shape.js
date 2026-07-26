/** Response shaping helpers: map DB rows → the shapes the frontends expect. */

/** Short relative time label, e.g. "2m", "3h", "1d". */
export function relTime(ts) {
  if (!ts) return ''
  const then = new Date(ts).getTime()
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

/** Format a KWD amount like "145.00 KWD". */
export const kwd = (n) => `${Number(n).toFixed(2)} KWD`

/** Format a date like "1 Jul 2026". */
export function dmy(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`
}

/** DB channel value → frontend inbox filter key. */
export const chKey = (c) => c // whatsapp | instagram | voice | web (already aligned)

/** business.channels (['wa','ig','vc']) passthrough. */
export const chArray = (arr) => (Array.isArray(arr) ? arr : [])

/** Map a message row → { d, who, t } bubble shape. */
export function messageShape(row, customerName) {
  const d = row.sender === 'customer' ? 'in' : row.sender === 'ai' ? 'ai' : 'out'
  const who =
    row.sender === 'customer'
      ? customerName || 'Customer'
      : row.sender === 'ai'
        ? 'AI Agent'
        : 'You'
  return { d, who, t: row.body }
}

/** Map a conversation row → inbox list shape. */
export function conversationShape(row) {
  return {
    id: row.id,
    ch: row.channel,
    name: row.customer_name || row.customer_handle,
    prev: row.last_message_preview || '',
    time: relTime(row.last_message_at),
    unread: row.unread || 0,
    mode: row.mode || 'ai',
    phone: row.customer_handle,
    since: row.customer_since || '—',
    orders: row.orders || 0,
  }
}
