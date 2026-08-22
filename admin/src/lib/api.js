import { resolveApiUrl, resolveClientAppUrl } from './urls.js'

export const API = resolveApiUrl()
export const CLIENT_APP_URL = resolveClientAppUrl()

export const WHATSAPP = 'https://wa.me/96551022389'

const token = () => localStorage.getItem('sts_token')

function authHeaders(extra = {}) {
  const t = token()
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}), ...extra }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * POST helper. `retries` transparently retries transient failures (network
 * error or 5xx) — this masks the serverless backend's cold start, where the
 * first request after idle can 500 while the DB connection warms up. Auth
 * failures (401/403) are never retried.
 */
export async function apiPost(path, body, { auth = false, retries = 0 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(API + path, {
        method: 'POST',
        headers: auth ? authHeaders() : { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error(data.error || 'Request failed')
        err.status = res.status // lets callers tell 401 (bad creds) from 5xx (server down)
        if (res.status >= 500 && attempt < retries) { await sleep(1200); continue }
        throw err
      }
      return data
    } catch (e) {
      // network error (fetch threw, no status) → retry through the cold start
      if (e.status === undefined && attempt < retries) { await sleep(1200); continue }
      throw e
    }
  }
}

export async function apiGet(path, { auth = true } = {}) {
  const res = await fetch(API + path, { headers: auth ? authHeaders() : {} })
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

export async function apiPut(path, body) {
  const res = await fetch(API + path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function apiPatch(path, body) {
  const res = await fetch(API + path, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function apiDelete(path) {
  const res = await fetch(API + path, { method: 'DELETE', headers: authHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export function apiPostAuth(path, body) {
  return apiPost(path, body, { auth: true })
}

export async function apiUpload(path, file, fields = {}) {
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(fields)) {
    if (v != null) fd.append(k, String(v))
  }
  const t = token()
  const res = await fetch(API + path, {
    method: 'POST',
    headers: t ? { Authorization: 'Bearer ' + t } : {},
    body: fd,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data
}

/* ---- auth helpers (localStorage, matching the original keys) ---- */
export function saveSession({ token, user }) {
  if (token) localStorage.setItem('sts_token', token)
  if (user) localStorage.setItem('sts_user', JSON.stringify(user))
}

export function redirectWithSession(baseUrl, { token }) {
  const dest = new URL(baseUrl, window.location.origin)
  dest.searchParams.set('sts_token', token)
  window.location.href = dest.toString()
}

export function consumeTokenFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('sts_token')
  if (!token) return false
  localStorage.setItem('sts_token', token)
  params.delete('sts_token')
  const q = params.toString()
  const path = window.location.pathname + (q ? `?${q}` : '') + window.location.hash
  window.history.replaceState({}, '', path)
  return true
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('sts_user') || '{}')
  } catch {
    return {}
  }
}
export function clearSession() {
  localStorage.removeItem('sts_token')
  localStorage.removeItem('sts_user')
}
export function isLoggedIn() {
  return Boolean(localStorage.getItem('sts_token'))
}
