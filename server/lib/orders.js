/**
 * WhatsApp / channel orders — captured when the AI agent confirms an order,
 * or when chat-menu booking / guided order flows complete.
 */
import { pool, one, many } from '../db.js'
import { resolveOpenAIKey } from './ai.js'

const ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']

export async function ensureOrdersSchema() {
  await pool.query(`
    create table if not exists sts_orders (
      id               uuid primary key default gen_random_uuid(),
      business_id      uuid not null references sts_businesses(id) on delete cascade,
      conversation_id  uuid references sts_conversations(id) on delete set null,
      channel          text not null default 'whatsapp',
      customer_handle  text,
      customer_name    text,
      customer_phone   text,
      items            jsonb not null default '[]'::jsonb,
      currency         text default 'KWD',
      total            numeric(12,3),
      status           text not null default 'new',
      order_type       text default 'order',
      notes            text,
      address          text,
      delivery_type    text,
      source           text default 'ai',
      summary          text,
      raw_payload      jsonb default '{}'::jsonb,
      created_at       timestamptz default now(),
      updated_at       timestamptz default now()
    )`)
  await pool.query(`create index if not exists idx_sts_orders_biz on sts_orders(business_id, created_at desc)`)
  await pool.query(`create index if not exists idx_sts_orders_status on sts_orders(business_id, status)`)
  await pool.query(`create index if not exists idx_sts_orders_handle on sts_orders(business_id, customer_handle)`)
}

function shapeOrder(r) {
  if (!r) return null
  let items = r.items
  if (typeof items === 'string') {
    try { items = JSON.parse(items) } catch { items = [] }
  }
  return {
    id: r.id,
    business_id: r.business_id,
    business_name: r.business_name || null,
    conversation_id: r.conversation_id,
    channel: r.channel || 'whatsapp',
    customer_handle: r.customer_handle,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone || r.customer_handle,
    items: Array.isArray(items) ? items : [],
    currency: r.currency || 'KWD',
    total: r.total != null ? Number(r.total) : null,
    status: r.status || 'new',
    order_type: r.order_type || 'order',
    notes: r.notes || '',
    address: r.address || '',
    delivery_type: r.delivery_type || '',
    source: r.source || 'ai',
    summary: r.summary || '',
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

export async function createOrder(businessId, data = {}) {
  const items = Array.isArray(data.items) ? data.items : []
  const row = await one(
    `insert into sts_orders (
       business_id, conversation_id, channel, customer_handle, customer_name, customer_phone,
       items, currency, total, status, order_type, notes, address, delivery_type, source, summary, raw_payload
     ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
     returning *`,
    [
      businessId,
      data.conversation_id || null,
      data.channel || 'whatsapp',
      data.customer_handle || null,
      data.customer_name || null,
      data.customer_phone || data.customer_handle || null,
      JSON.stringify(items),
      data.currency || 'KWD',
      data.total != null && data.total !== '' ? Number(data.total) : null,
      ORDER_STATUSES.includes(data.status) ? data.status : 'new',
      data.order_type || 'order',
      data.notes || null,
      data.address || null,
      data.delivery_type || null,
      data.source || 'ai',
      data.summary || null,
      JSON.stringify(data.raw_payload || data),
    ],
  )

  // Keep conversation "orders" counter in sync for Inbox panel
  if (data.conversation_id) {
    await pool.query(
      `update sts_conversations set orders = coalesce(orders,0) + 1 where id=$1 and business_id=$2`,
      [data.conversation_id, businessId],
    ).catch(() => {})
  } else if (data.customer_handle) {
    await pool.query(
      `update sts_conversations set orders = coalesce(orders,0) + 1
       where business_id=$1 and customer_handle=$2 and channel=$3`,
      [businessId, data.customer_handle, data.channel || 'whatsapp'],
    ).catch(() => {})
  }

  return shapeOrder(row)
}

export async function listOrders(businessId, { status, q, limit = 100 } = {}) {
  const params = [businessId]
  let where = 'o.business_id=$1'
  if (status && status !== 'all') {
    params.push(status)
    where += ` and o.status=$${params.length}`
  }
  if (q && String(q).trim()) {
    params.push(`%${String(q).trim()}%`)
    where += ` and (
      coalesce(o.customer_name,'') ilike $${params.length}
      or coalesce(o.customer_handle,'') ilike $${params.length}
      or coalesce(o.customer_phone,'') ilike $${params.length}
      or coalesce(o.summary,'') ilike $${params.length}
      or coalesce(o.notes,'') ilike $${params.length}
      or o.items::text ilike $${params.length}
    )`
  }
  params.push(Math.min(Number(limit) || 100, 300))
  const rows = await many(
    `select o.*, b.name as business_name
       from sts_orders o
       left join sts_businesses b on b.id = o.business_id
      where ${where}
      order by o.created_at desc
      limit $${params.length}`,
    params,
  )
  return rows.map(shapeOrder)
}

export async function listOrdersForBusinesses(businessIds, { status, q, limit = 200 } = {}) {
  if (!businessIds?.length) return []
  const params = [businessIds]
  let where = 'o.business_id = any($1::uuid[])'
  if (status && status !== 'all') {
    params.push(status)
    where += ` and o.status=$${params.length}`
  }
  if (q && String(q).trim()) {
    params.push(`%${String(q).trim()}%`)
    where += ` and (
      coalesce(o.customer_name,'') ilike $${params.length}
      or coalesce(o.customer_handle,'') ilike $${params.length}
      or coalesce(b.name,'') ilike $${params.length}
      or coalesce(o.summary,'') ilike $${params.length}
      or o.items::text ilike $${params.length}
    )`
  }
  params.push(Math.min(Number(limit) || 200, 500))
  const rows = await many(
    `select o.*, b.name as business_name
       from sts_orders o
       left join sts_businesses b on b.id = o.business_id
      where ${where}
      order by o.created_at desc
      limit $${params.length}`,
    params,
  )
  return rows.map(shapeOrder)
}

export async function getOrder(id, businessId = null) {
  const row = businessId
    ? await one(
      `select o.*, b.name as business_name from sts_orders o
       left join sts_businesses b on b.id=o.business_id
       where o.id=$1 and o.business_id=$2`,
      [id, businessId],
    )
    : await one(
      `select o.*, b.name as business_name from sts_orders o
       left join sts_businesses b on b.id=o.business_id where o.id=$1`,
      [id],
    )
  return shapeOrder(row)
}

export async function updateOrderStatus(id, businessId, status, extra = {}) {
  if (!ORDER_STATUSES.includes(status)) throw new Error('Invalid status')
  const row = await one(
    `update sts_orders set
       status=$3,
       notes=coalesce($4, notes),
       updated_at=now()
     where id=$1 and business_id=$2
     returning *`,
    [id, businessId, status, extra.notes ?? null],
  )
  return shapeOrder(row)
}

/** Strip [[STS_ORDER]]…[[/STS_ORDER]] from AI reply; return clean text + parsed payload. */
export function extractOrderMarker(reply) {
  const text = String(reply || '')
  const re = /\[\[STS_ORDER\]\]([\s\S]*?)\[\[\/STS_ORDER\]\]/i
  const m = text.match(re)
  if (!m) return { clean: text.trim(), order: null }
  let order = null
  try {
    order = JSON.parse(m[1].trim())
  } catch {
    order = null
  }
  const clean = text.replace(re, '').replace(/\n{3,}/g, '\n\n').trim()
  return { clean, order }
}

function buildSummary(order) {
  if (order.summary) return order.summary
  const items = Array.isArray(order.items) ? order.items : []
  if (!items.length) return order.notes || 'Order'
  return items.map((it) => {
    const qty = it.qty || it.quantity || 1
    const name = it.name || it.title || 'Item'
    return `${qty}× ${name}`
  }).join(', ')
}

export async function saveCapturedOrder(businessId, meta, orderPayload) {
  if (!orderPayload || typeof orderPayload !== 'object') return null
  const items = Array.isArray(orderPayload.items) ? orderPayload.items : []
  // Avoid empty noise
  if (!items.length && !orderPayload.notes && !orderPayload.address && !orderPayload.summary) return null

  // Deduplicate: same customer + same summary within 2 minutes
  const summary = buildSummary(orderPayload)
  const recent = await one(
    `select id from sts_orders
      where business_id=$1 and customer_handle=$2
        and coalesce(summary,'')=$3
        and created_at > now() - interval '2 minutes'
      limit 1`,
    [businessId, meta.customer_handle || '', summary],
  )
  if (recent) return null

  return createOrder(businessId, {
    conversation_id: meta.conversation_id,
    channel: meta.channel || 'whatsapp',
    customer_handle: meta.customer_handle,
    customer_name: orderPayload.customer_name || meta.customer_name,
    customer_phone: orderPayload.phone || orderPayload.customer_phone || meta.customer_handle,
    items,
    currency: orderPayload.currency || 'KWD',
    total: orderPayload.total,
    status: 'new',
    order_type: orderPayload.order_type || 'order',
    notes: orderPayload.notes || '',
    address: orderPayload.address || '',
    delivery_type: orderPayload.delivery_type || orderPayload.fulfillment || '',
    source: meta.source || 'ai',
    summary,
    raw_payload: orderPayload,
  })
}

/**
 * If the AI did not emit a marker, try a light extraction when the chat
 * looks like an order confirmation (keywords / recent product talk).
 */
export async function maybeExtractOrderFromChat({
  businessId, businessName, userText, reply, history = [],
}) {
  const blob = `${userText || ''}\n${reply || ''}`.toLowerCase()
  const looksLikeOrder = /order|طلب|اوردر|confirm|أكد|تأكيد|quantity|كمية|delivery|توصيل|checkout|اشتري|أبي|ابغى|أبي أطلب|أريد طلب/.test(blob)
  if (!looksLikeOrder) return null

  const key = await resolveOpenAIKey()
  if (!key) return null

  const recent = (history || []).slice(-8).map((m) => `${m.role}: ${m.content}`).join('\n')
  const prompt = `You extract completed customer orders from a WhatsApp chat for "${businessName || 'a business'}".
Return ONLY valid JSON (no markdown) with this shape:
{"has_order":true|false,"customer_name":"","phone":"","address":"","delivery_type":"delivery|pickup|","currency":"KWD","total":null,"notes":"","items":[{"name":"","qty":1,"price":null}]}
Set has_order=true ONLY if the customer clearly placed/confirmed an order (items + intent). Otherwise has_order=false.
Recent chat:
${recent}
Customer: ${userText}
Agent: ${reply}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'Extract orders as JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.has_order) return null
    delete parsed.has_order
    return parsed
  } catch {
    return null
  }
}

export { ORDER_STATUSES, shapeOrder, buildSummary }
