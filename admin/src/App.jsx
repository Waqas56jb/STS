import { useState } from 'react'
import { AdminLogin } from './pages/AdminLogin'
import { AdminPage } from './pages/Admin'
import { clearSession, getUser, isLoggedIn } from './lib/api'

/** Authed only when a session exists and the user is an admin. */
function isAdminAuthed() {
  return isLoggedIn() && getUser()?.role === 'admin'
}

/**
 * Admin app root: gates the panel behind the login page.
 *  - Direct visit to /admin/ with no session → login page.
 *  - Arriving already authenticated (e.g. from the client landing's
 *    admin-role login, which stores the session) → straight to the panel.
 *  - Logout returns here to the login page.
 */
export default function App() {
  const [authed, setAuthed] = useState(isAdminAuthed())

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
