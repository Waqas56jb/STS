import { one, many } from '../db.js'
import { decryptJSON } from './crypto.js'
import { formatKnowledgeForPrompt } from './kbPrompt.js'
import { selectRelevantKnowledge } from './knowledge.js'
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

function dialectPrompt(bot) {
  if (!bot) return ''
  const lines = []
  const pl = bot.primary_language || 'auto'

  // English is always American — never British/AU/etc.
  lines.push('ENGLISH: Always use American English (US spelling and phrasing: color, organize, “Hi how can I help you”). Never use British English.')

  if (pl === 'ar') lines.push('Primary language: Arabic. Prefer Arabic replies.')
  else if (pl === 'en') lines.push('Primary language: English (American). Prefer English replies.')
  else if (pl === 'ar_en') lines.push('Primary languages: Arabic & American English — match the customer language.')
  else if (pl === 'multi') lines.push('Multilingual — match the customer language. English parts must be American English.')
  else lines.push('Reply in the customer\'s language (Arabic or American English).')

  const dialect = bot.arabic_dialect || 'kuwaiti'
  const countryMap = {
    bahraini: 'Bahrain (بحرينية)',
    kuwaiti: 'Kuwait (كويتية)',
    saudi: 'Saudi Arabia (سعودية)',
    iraqi: 'Iraq (عراقية)',
    jordanian: 'Jordan (أردنية)',
    yemeni: 'Yemen (يمنية)',
    qatari: 'Qatar (قطرية)',
    omani: 'Oman (عُمانية)',
    emirati: 'UAE / Emirates (إماراتية)',
    auto: 'detect and match the customer\'s country dialect (Bahrain, Kuwait, Saudi, Iraq, Jordan, Yemen, Qatar, Oman, or UAE)',
  }
  const behavior = bot.dialect_behavior || 'professional'
  const formality = bot.formality || bot.tone || 'friendly'
  if (pl !== 'en') {
    const dialectLabel = countryMap[dialect] || countryMap.kuwaiti
    lines.push(`Arabic dialect / country: ${dialectLabel}.`)
    lines.push(`When speaking Arabic, use natural local vocabulary and expressions for that country — not Egyptian, Moroccan, or Levantine unless that is the selected country.`)
    lines.push(`Dialect behavior: ${behavior} (strict = strong local dialect, light = light flavor, professional = business local dialect, formal = clearer MSA with a light local touch).`)
    lines.push(`Formality: ${formality}.`)
    if (bot.auto_match_dialect !== false && !bot.force_business_dialect) {
      lines.push('Automatically match the customer\'s Arabic country dialect when reasonably confident (among Bahrain, Kuwait, Saudi, Iraq, Jordan, Yemen, Qatar, Oman, UAE).')
    }
    if (bot.force_business_dialect) {
      lines.push('ALWAYS use the business selected country dialect — do not switch based on the customer.')
    }
    lines.push('Dialect rules: sound natural for that country, never fake/comedic; keep product names, prices, legal and technical terms accurate; prefer clear conversational Arabic if unsure.')
  }
  if (bot.preferred_words) lines.push(`Preferred words/expressions: ${bot.preferred_words}`)
  if (bot.avoid_words) lines.push(`Words to avoid: ${bot.avoid_words}`)
  return lines.join('\n')
}

function buildSystemPrompt({ businessName, bot, kb, channel, memory, customerName, aiInstruction }) {
  const tone = TONE[bot?.tone] || TONE.friendly
  const kbText = formatKnowledgeForPrompt(kb)
  const ch = CHANNEL_LABEL[channel] || 'chat'
  const memoryBlock = memory ? formatMemoryForPrompt(memory, { customerName, channel }) : ''
  const dialectBlock = dialectPrompt(bot)

  return [
    `You are the AI customer-service agent for "${businessName || 'this business'}" on ${ch}.`,
    `You have FULL memory of this customer's past conversations (see CUSTOMER MEMORY below). Use it naturally — welcome returning customers, recall what they asked before, and continue unfinished topics.`,
    `Answer using ONLY the business knowledge below. If the answer isn't there, offer to connect them to a human — never invent prices, stock, or policies.`,
    `Be ${tone}. Keep replies concise: 1–4 short sentences, no markdown.`,
    dialectBlock,
    `Send exactly ONE reply per customer message. Never greet twice or repeat the same question.`,
    `Use the customer's correct name from the current message — do not invent or reuse old names.`,
    bot?.greeting ? `Brand greeting reference: ${bot.greeting}` : '',
    bot?.rules ? `AGENT RULES (always follow):\n${bot.rules}` : '',
    aiInstruction ? `SPECIAL INSTRUCTION FOR THIS TURN (from chat menu):\n${aiInstruction}` : '',
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
  memory = null, customerName = null, aiInstruction = null,
}) {
  const [bot, kbRows, key] = await Promise.all([
    one(`select * from sts_bot_settings where business_id=$1 and channel=$2`, [businessId, botChannel(channel)]),
    many(`select type, title, content, source_url, meta from sts_knowledge_sources where business_id=$1 and status='trained' and (${KB_SCOPE}) order by created_at desc limit 120`, [businessId, channel]),
    resolveOpenAIKey(),
  ])

  const kb = selectRelevantKnowledge(kbRows, userText)

  const fallback = bot?.greeting || 'Thanks for your message! How can I help you today?'
  if (!key) {
    console.error('OpenAI key missing — using greeting fallback')
    return fallback
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt({ businessName, bot, kb, channel, memory, customerName, aiInstruction }) },
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
