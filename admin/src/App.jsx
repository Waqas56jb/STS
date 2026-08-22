import { useEffect, useState } from 'react'
import { AdminLogin } from './pages/AdminLogin'
import { AdminPage } from './pages/Admin'
import { apiGet, clearSession, consumeTokenFromUrl, getUser, isLoggedIn } from './lib/api'

/** Optimistic: a stored admin session. Verified against the API on mount. */
function isAdminAuthed() {
  return isLoggedIn() && getUser()?.role === 'admin'
}

export default function App() {
  const [authed, setAuthed] = useState(isAdminAuthed())

  useEffect(() => {
    if (consumeTokenFromUrl()) setAuthed(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    apiGet('/auth/me')
      .then((me) => {
        if (!me || me.role !== 'admin') {
          clearSession()
          setAuthed(false)
        } else {
          localStorage.setItem('sts_user', JSON.stringify(me))
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
