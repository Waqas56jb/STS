import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import { DashboardPage } from './pages/Dashboard'

/**
 * Client app routes:
 *   /           → marketing landing page (was index.html)
 *   /dashboard  → client dashboard (was client.html)
 * The admin panel is a separate React app in ../admin (served at /admin/).
 * The landing login sends admin-role users there via window.location.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
