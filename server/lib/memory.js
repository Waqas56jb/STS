/**
 * Long-term customer memory for all AI agents (WhatsApp, Instagram, Web, Voice).
 *
 * Stores a rolling summary + structured facts per customer so agents remember
 * context across sessions — even months or years later — and can welcome
 * returning customers naturally.
 */
import { one, many, pool } from '../db.js'
import { resolveOpenAIKey } from './ai.js'

const SUMMARY_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const HISTORY_LIMIT = 32

/** Stable key for memory lookup (phone, visitor id, etc.). */
export function customerKey(handle, channel = 'whatsapp') {
  const h = String(handle || '').trim()
  if (!h) return null
  if (channel === 'web' || channel === 'website') {
    return h.startsWith('web:') ? h : `web:${h}`
  }
  return h.replace(/\s/g, '')
}

export function daysSince(ts) {
  if (!ts) return Infinity
  return (Date.now() - new Date(ts).getTime()) / 86400000
}

/** Load persisted memory row for a customer. */
export async function loadCustomerMemory(businessId, key) {
  if (!businessId || !key) return null
  return one(
    `select * from sts_customer_memory where business_id=$1 and customer_key=$2`,
    [businessId, key],
  )
}

/** Recent turns from the current thread for the LLM. */
export async function loadConversationHistory(conversationId, limit = HISTORY_LIMIT) {
  if (!conversationId) return []
  const rows = await many(
    `select direction, sender, body from sts_messages
     where conversation_id=$1 order by created_at desc limit $2`,
    [conversationId, limit],
  )
  return rows.reverse().map((h) => ({
    role: h.direction === 'in' || h.sender === 'customer' ? 'user' : 'assistant',
    content: h.body,
  }))
}

/** Format memory block injected into every agent system prompt. */
export function formatMemoryForPrompt(memory, { customerName, channel } = {}) {
  if (!memory?.summary && !memory?.facts) return ''
  const name = customerName || memory.customer_name || 'this customer'
  const first = memory.first_seen ? new Date(memory.first_seen).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''
  const last = memory.last_seen ? new Date(memory.last_seen).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const away = daysSince(memory.last_seen)
  const returning = memory.message_count > 2 && away >= 1
  const longAway = away >= 365
  const mediumAway = away >= 30
  const facts = memory.facts && typeof memory.facts === 'object' ? memory.facts : {}

  const lines = [
    'CUSTOMER MEMORY (long-term — use this to personalize every reply):',
    `Customer: ${name}. Total past interactions: ${memory.message_count || 0}.`,
    first ? `First contact: ${first}.` : '',
    last ? `Last contact: ${last}${memory.last_channel ? ` (${memory.last_channel})` : ''}.` : '',
    memory.summary ? `What we know from all past chats & calls:\n${memory.summary}` : '',
    facts.preferred_language ? `Preferred language: ${facts.preferred_language}.` : '',
    facts.last_topic ? `Last discussed topic: ${facts.last_topic}.` : '',
    facts.open_questions?.length ? `Open questions: ${facts.open_questions.join('; ')}.` : '',
    returning
      ? longAway
        ? `RETURNING CUSTOMER (long absence — ${Math.floor(away)} days, possibly over a year): Warmly welcome them back ("Welcome back!" / "أهلاً بعودتك!" / "Bataay hum yaha thay — ab batao kya help chahiye?"). Reference what you remember from past chats and ask how you can help today.`
        : mediumAway
          ? `RETURNING CUSTOMER: They have not messaged in ${Math.floor(away)} days. Welcome them back briefly and pick up where you left off using your memory.`
          : `RETURNING CUSTOMER: Brief welcome back and continue naturally from prior context.`
      : 'If this is their first message, greet warmly and introduce yourself briefly.',
    'Never say you cannot remember or have no memory. You have the context above.',
  ]
  return lines.filter(Boolean).join('\n')
}

/** Touch memory row (increment counts, update last_seen). */
export async function touchCustomerMemory(businessId, key, { customerName, channel } = {}) {
  if (!businessId || !key) return
  await pool.query(
    `insert into sts_customer_memory (business_id, customer_key, customer_name, message_count, first_seen, last_seen, last_channel)
     values ($1,$2,$3,1, now(), now(), $4)
     on conflict (business_id, customer_key) do update set
       customer_name = coalesce(excluded.customer_name, sts_customer_memory.customer_name),
       message_count = sts_customer_memory.message_count + 1,
       last_seen = now(),
       last_channel = coalesce($4, sts_customer_memory.last_channel)`,
    [businessId, key, customerName || null, channel || null],
  )
}

/**
 * Re-summarize customer memory from recent messages + prior summary (async, best-effort).
 */
export async function refreshCustomerMemory(businessId, key, conversationId) {
  if (!businessId || !key) return
  try {
    const rawHandle = key.replace(/^web:/, '')
    const [memory, msgs, crossChannel] = await Promise.all([
      loadCustomerMemory(businessId, key),
      many(
        `select m.body, m.sender, m.direction, m.created_at, c.channel
         from sts_messages m join sts_conversations c on c.id=m.conversation_id
         where m.business_id=$1 and (c.customer_handle=$2 or c.customer_handle=$3)
         order by m.created_at desc limit 60`,
        [businessId, key, rawHandle],
      ),
      many(
        `select summary, created_at from sts_call_logs
         where business_id=$1 and (from_number=$2 or to_number=$2 or caller=$2 or caller=$3)
         order by created_at desc limit 5`,
        [businessId, rawHandle, key],
      ),
    ])

    const keyApi = await resolveOpenAIKey()
    if (!keyApi || msgs.length < 2) {
      await touchCustomerMemory(businessId, key, {})
      return
    }

    const transcript = msgs.reverse().map((m) => {
      const who = m.direction === 'in' || m.sender === 'customer' ? 'Customer' : 'Agent'
      return `${who}: ${m.body}`
    }).join('\n')

    const callNotes = crossChannel.filter((c) => c.summary).map((c) => c.summary).join('\n')
    const prev = memory?.summary || ''

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${keyApi}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          {
            role: 'system',
            content: `You maintain long-term customer memory for a business CRM. Output JSON only:
{"summary":"2-5 sentence narrative of who this customer is, what they asked/bought/discussed across ALL time","preferred_language":"ar|en|other or null","last_topic":"short phrase","open_questions":["unresolved items"]}
Merge new messages with prior memory. Keep facts accurate. Prior memory:\n${prev || '(none)'}`,
          },
          {
            role: 'user',
            content: `Recent chat:\n${transcript.slice(-12000)}${callNotes ? `\n\nPast call summaries:\n${callNotes}` : ''}`,
          },
        ],
      }),
    })
    const data = await res.json().catch(() => ({}))
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    let parsed = {}
    try {
      const json = raw.match(/\{[\s\S]*\}/)
      if (json) parsed = JSON.parse(json[0])
    } catch { /* keep partial */ }

    const summary = parsed.summary || prev || null
    const facts = {
      preferred_language: parsed.preferred_language || memory?.facts?.preferred_language || null,
      last_topic: parsed.last_topic || memory?.facts?.last_topic || null,
      open_questions: Array.isArray(parsed.open_questions) ? parsed.open_questions.slice(0, 5) : [],
    }

    await pool.query(
      `insert into sts_customer_memory (business_id, customer_key, customer_name, summary, facts, message_count, first_seen, last_seen)
       values ($1,$2,$3,$4,$5,$6, now(), now())
       on conflict (business_id, customer_key) do update set
         summary = coalesce(excluded.summary, sts_customer_memory.summary),
         facts = excluded.facts,
         last_seen = now()`,
      [businessId, key, memory?.customer_name, summary, JSON.stringify(facts), memory?.message_count || msgs.length],
    )
  } catch (e) {
    console.error('[memory] refresh failed:', e.message)
  }
}

/** After a voice call ends — merge call summary into customer memory. */
export async function mergeVoiceIntoMemory(businessId, phone, { summary, customerName } = {}) {
  const key = customerKey(phone, 'voice')
  if (!businessId || !key || !summary) return
  const mem = await loadCustomerMemory(businessId, key)
  const merged = [mem?.summary, `Phone call: ${summary}`].filter(Boolean).join('\n')
  await pool.query(
    `insert into sts_customer_memory (business_id, customer_key, customer_name, summary, message_count, first_seen, last_seen, last_channel)
     values ($1,$2,$3,$4,1, now(), now(), 'voice')
     on conflict (business_id, customer_key) do update set
       customer_name = coalesce(excluded.customer_name, sts_customer_memory.customer_name),
       summary = $4,
       last_seen = now(),
       last_channel = 'voice',
       message_count = sts_customer_memory.message_count + 1`,
    [businessId, key, customerName, merged.slice(0, 8000)],
  )
}
