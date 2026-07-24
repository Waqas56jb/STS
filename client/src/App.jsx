import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import { DashboardPage } from './pages/Dashboard'

/**
 * Routes:
 *   /           → marketing landing page (was index.html)
 *   /dashboard  → client dashboard (was client.html)
 * The landing login modal navigates to /dashboard; the dashboard logout
 * navigates back to /.
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
