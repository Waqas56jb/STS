export const RAILWAY_API = 'https://sts-production-85ff.up.railway.app/api'

export function isLocalDev() {
  return typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
}

export function normalizeApiUrl(raw) {
  if (!raw) return ''
  const s = String(raw).trim().replace(/\/$/, '')
  return s.endsWith('/api') ? s : `${s}/api`
}

export function resolveApiUrl() {
  if (typeof window !== 'undefined' && window.STS_API) return normalizeApiUrl(window.STS_API)
  if (import.meta.env.VITE_API_URL) return normalizeApiUrl(import.meta.env.VITE_API_URL)
  if (isLocalDev()) return 'http://localhost:4000/api'
  return RAILWAY_API
}

export function resolveClientAppUrl() {
  if (import.meta.env.VITE_CLIENT_URL) return import.meta.env.VITE_CLIENT_URL
  if (isLocalDev()) return 'http://localhost:5173/'
  return 'https://www.stsq8.com/'
}

export function resolveWsBase() {
  try {
    const u = new URL(resolveApiUrl())
    return `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`
  } catch {
    return isLocalDev() ? 'ws://localhost:4000' : 'wss://sts-production-85ff.up.railway.app'
  }
}
