/**
 * Format trained knowledge for the chatbot / voice prompts.
 * Prefer pre-ranked snippets from selectRelevantKnowledge when available.
 */
export function formatKnowledgeForPrompt(kb = [], { maxEach = 8000, maxTotal = 28000 } = {}) {
  if (!kb.length) return '(no knowledge base entries yet)'
  const parts = []
  let used = 0
  for (let i = 0; i < kb.length; i++) {
    const k = kb[i]
    let body = String(k.content || '')
    if (body.length > maxEach) body = body.slice(0, maxEach) + '…'
    const isImage = k.type === 'image' || String(k.meta || '').startsWith('image')
    const chunk = isImage
      ? `(${i + 1}) [IMAGE id=${k.id}] ${k.title}${body ? ` — ${body}` : ''}${k.source_url ? ` (file: ${k.source_url})` : ''}`
      : `(${i + 1}) ${k.title}${body ? ` — ${body}` : ''}${k.source_url ? ` [${k.source_url}]` : ''}`
    if (used + chunk.length > maxTotal) {
      parts.push('(additional trained documents exist but were omitted for length)')
      break
    }
    parts.push(chunk)
    used += chunk.length
  }
  return parts.join('\n')
}

/** Strip [[STS_IMAGE:uuid]] markers from AI reply. */
export function extractImageMarkers(reply) {
  const text = String(reply || '')
  const ids = []
  const re = /\[\[STS_IMAGE:([0-9a-fA-F-]{36})\]\]/g
  let m
  while ((m = re.exec(text))) ids.push(m[1])
  const clean = text.replace(re, '').replace(/\n{3,}/g, '\n\n').trim()
  return { clean, imageIds: [...new Set(ids)] }
}
