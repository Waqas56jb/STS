import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LangProvider } from './i18n/LangContext.jsx'
import { AdminPage } from './pages/Admin.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <AdminPage />
    </LangProvider>
  </StrictMode>,
)
