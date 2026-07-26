import { useEffect, useState } from 'react'
import { AdminLogin } from './pages/AdminLogin'
import { AdminPage } from './pages/Admin'
import { apiGet, clearSession, getUser, isLoggedIn } from './lib/api'

/** Optimistic: a stored admin session. Verified against the API on mount. */
function isAdminAuthed() {
  return isLoggedIn() && getUser()?.role === 'admin'
}

/**
 * Admin app root: gates the panel behind the login page.
 *  - No session → login page.
 *  - Stored session → shown optimistically, then verified with GET /auth/me;
 *    if the token is invalid/expired or not an admin, it's cleared (real API
 *    only — no demo/mock access).
 *  - Logout returns to the login page.
 */
export default function App() {
  const [authed, setAuthed] = useState(isAdminAuthed())

  // Verify the stored session is a real, current admin.
  useEffect(() => {
    if (!authed) return
    apiGet('/auth/me')
      .then((me) => {
        if (!me || me.role !== 'admin') {
          clearSession()
          setAuthed(false)
        }
      })
      .catch(() => {
        clearSession()
        setAuthed(false)
      })
  }, [authed])

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  return (
    <AdminPage
      onLogout={() => {
        clearSession()
        setAuthed(false)
      }}
    />
  )
}
