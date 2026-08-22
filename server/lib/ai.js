import { one, many } from '../db.js'
import { decryptJSON } from './crypto.js'
import { formatKnowledgeForPrompt } from './kbPrompt.js'
import { formatMemoryForPrompt } from './memory.js'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export function botChannel(channel) {
  return channel === 'website' ? 'web' : channel
}

const KB_SCOPE = `(
  (coalesce(meta,'') <> '__business_profile__' and (channel='all' or channel=$2 or ($2 in ('web','website') and channel in ('web','website'))))
  or (meta='__business_profile__' and (channel=$2 or ($2 in ('web','website') and channel in ('web','website'))))
)`

const TONE = {
  friendly: 'friendly, warm and helpful',
  professional: 'professional, precise and concise',
  playful: 'playful, upbeat and casual',
}

const CHANNEL_LABEL = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  web: 'website chat',
  website: 'website chat',
  voice: 'phone',
}

export async function resolveOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const row = await one(`select value from sts_settings where key='openai_key'`)
  if (!row?.value) return null
  try { return decryptJSON(row.value)?.v || null } catch { return null }
}

function buildSystemPrompt({ businessName, bot, kb, channel, memory, customerName }) {
  const tone = TONE[bot?.tone] || TONE.friendly
  const kbText = formatKnowledgeForPrompt(kb)
  const ch = CHANNEL_LABEL[channel] || 'chat'
  const memoryBlock = memory ? formatMemoryForPrompt(memory, { customerName, channel }) : ''

  return [
    `You are the AI customer-service agent for "${businessName || 'this business'}" on ${ch}.`,
    `You have FULL memory of this customer's past conversations (see CUSTOMER MEMORY below). Use it naturally — welcome returning customers, recall what they asked before, and continue unfinished topics.`,
    `Answer using ONLY the business knowledge below. If the answer isn't there, offer to connect them to a human — never invent prices, stock, or policies.`,
    `Be ${tone}. Reply in the customer's language (Arabic or English — match their message). Keep replies concise: 1–4 short sentences, no markdown.`,
    `Send exactly ONE reply per customer message. Never greet twice or repeat the same question. If they said hi, one short greeting is enough.`,
    `Use the customer's correct name from the current message — do not invent or reuse old names.`,
    `Handle all conversation rules yourself: greetings, follow-ups, clarifications, and polite closings.`,
    bot?.greeting ? `Brand greeting reference: ${bot.greeting}` : '',
    bot?.rules ? `AGENT RULES (always follow):\n${bot.rules}` : '',
    memoryBlock,
    '',
    'BUSINESS KNOWLEDGE:',
    kbText,
  ].filter(Boolean).join('\n')
}

/**
 * Generate a grounded reply with long-term memory + extended history.
 * @param {object} opts
 * @param {object} [opts.memory] — sts_customer_memory row
 * @param {string} [opts.customerName]
 */
export async function generateReply({
  businessId, businessName, channel = 'whatsapp', userText, history = [],
  memory = null, customerName = null,
}) {
  const [bot, kb, key] = await Promise.all([
    one(`select greeting, tone, language, rules from sts_bot_settings where business_id=$1 and channel=$2`, [businessId, botChannel(channel)]),
    many(`select title, content, source_url from sts_knowledge_sources where business_id=$1 and status='trained' and (${KB_SCOPE}) order by created_at desc limit 80`, [businessId, channel]),
    resolveOpenAIKey(),
  ])

  const fallback = bot?.greeting || 'Thanks for your message! How can I help you today?'
  if (!key) {
    console.error('OpenAI key missing — using greeting fallback')
    return fallback
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt({ businessName, bot, kb, channel, memory, customerName }) },
    ...history.slice(-32),
    { role: 'user', content: userText },
  ]

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4, max_tokens: 400 }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('OpenAI error:', data?.error?.message || res.status)
      return fallback
    }
    return data?.choices?.[0]?.message?.content?.trim() || fallback
  } catch (e) {
    console.error('OpenAI request failed:', e.message)
    return fallback
  }
}
