/** Public base URL for webhooks / WS — works locally and on Railway. */
export function publicBaseUrl(req) {
  if (process.env.VOICE_PUBLIC_BASE_URL) {
    return process.env.VOICE_PUBLIC_BASE_URL.replace(/\/$/, '')
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`.replace(/\/$/, '')
  }
  if (req?.get) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
    return `${proto}://${req.get('host')}`.replace(/\/$/, '')
  }
  const port = process.env.PORT || 4000
  return `http://localhost:${port}`
}

export function publicWsUrl(req, path) {
  if (path === '/vonage-stream' && process.env.VONAGE_PUBLIC_WS_URL) {
    return process.env.VONAGE_PUBLIC_WS_URL
  }
  if (path === '/voice-stream' && process.env.VOICE_PUBLIC_WS_URL) {
    return process.env.VOICE_PUBLIC_WS_URL
  }
  const base = publicBaseUrl(req)
  const wsProto = base.startsWith('https') ? 'wss' : 'ws'
  const host = base.replace(/^https?:\/\//, '')
  return `${wsProto}://${host}${path}`
}

export function corsOrigins() {
  const list = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    list.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
  }
  return [...new Set(list)]
}
