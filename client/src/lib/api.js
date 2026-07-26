/**
 * API helper.
 *
 * Base URL matches the original `window.STS_API || 'http://localhost:4000/api'`,
 * but in dev we default to the relative '/api' path so Vite's proxy
 * (vite.config.js) forwards to the Express server. Override with
 * `window.STS_API` at runtime if the API lives elsewhere.
 */
export const API = window.STS_API || '/api'

export const WHATSAPP = 'https://wa.me/96500000000'

const token = () => localStorage.getItem('sts_token')

function authHeaders(extra = {}) {
  const t = token()
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}), ...extra }
}

export async function apiPost(path, body, { auth = false } = {}) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: auth ? authHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed')
    err.status = res.status // lets callers tell 401 (bad creds) from 5xx (server down)
    throw err
  }
  return data
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

export async function apiDelete(path) {
  const res = await fetch(API + path, { method: 'DELETE', headers: authHeaders() })
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

/** POST authed (Bearer) — convenience for dashboard actions. */
export function apiPostAuth(path, body) {
  return apiPost(path, body, { auth: true })
}

/* ---- auth helpers (localStorage, matching the original keys) ---- */
export function saveSession({ token, user }) {
  if (token) localStorage.setItem('sts_token', token)
  if (user) localStorage.setItem('sts_user', JSON.stringify(user))
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
