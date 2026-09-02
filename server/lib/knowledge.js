/**
 * Knowledge base helpers — relevance ranking + URL ingest.
 * Full vector RAG can replace scoreKnowledge later; this already beats
 * dumping 80 random docs into the prompt.
 */

/** Split long documents into overlapping text chunks for scoring / prompts. */
export function chunkText(text, { size = 900, overlap = 120 } = {}) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (!s) return []
  if (s.length <= size) return [s]
  const out = []
  let i = 0
  while (i < s.length) {
    out.push(s.slice(i, i + size))
    i += size - overlap
    if (out.length > 40) break
  }
  return out
}

function tokenize(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
}

/**
 * Rank knowledge rows against the customer message.
 * Returns top snippets shaped like { title, content, source_url }.
 */
export function selectRelevantKnowledge(kb = [], query = '', { maxSnippets = 12, maxChars = 24000 } = {}) {
  const terms = tokenize(query)
  const scored = []

  for (const row of kb) {
    const title = String(row.title || '')
    const body = String(row.content || '')
    const url = row.source_url || ''
    if (!body && !title) continue

    const chunks = body ? chunkText(body) : [title]
    for (const chunk of chunks) {
      const hay = `${title} ${chunk}`.toLowerCase()
      let score = 0
      if (!terms.length) score = 1
      else {
        for (const t of terms) {
          if (hay.includes(t)) score += t.length > 3 ? 3 : 1
          if (title.toLowerCase().includes(t)) score += 4
        }
      }
      // Prefer Q&A and profile slightly
      if (row.type === 'qa') score += 1
      if (row.meta === '__business_profile__') score += 2
      if (score > 0) scored.push({ score, title, content: chunk, source_url: url })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  const picked = []
  let used = 0
  const seen = new Set()
  for (const s of scored) {
    const key = `${s.title}|${s.content.slice(0, 80)}`
    if (seen.has(key)) continue
    seen.add(key)
    if (used + s.content.length > maxChars) continue
    picked.push(s)
    used += s.content.length
    if (picked.length >= maxSnippets) break
  }

  // Fallback: newest docs if nothing matched (e.g. greeting "hi")
  if (!picked.length && kb.length) {
    return kb.slice(0, 8).map((k) => ({
      title: k.title,
      content: String(k.content || '').slice(0, 1200),
      source_url: k.source_url,
    }))
  }
  return picked
}

/** Fetch a public URL and extract readable text (best-effort HTML strip). */
export async function fetchUrlText(url, { timeoutMs = 12000, maxChars = 60000 } = {}) {
  const u = String(url || '').trim()
  if (!/^https?:\/\//i.test(u)) throw new Error('URL must start with http:// or https://')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(u, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'STS-KnowledgeBot/1.0', Accept: 'text/html,text/plain,*/*' },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`)
    const ctype = (res.headers.get('content-type') || '').toLowerCase()
    let raw = await res.text()
    if (ctype.includes('html') || /<html|<body|<p[\s>]/i.test(raw)) {
      raw = raw
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
    }
    const text = raw.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
    if (!text || text.length < 40) throw new Error('Page had little readable text')
    return text.slice(0, maxChars)
  } finally {
    clearTimeout(timer)
  }
}
