import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { LangProvider } from './i18n/LangContext.jsx'
import { SiteConfigProvider } from './context/SiteConfigContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LangProvider>
          <SiteConfigProvider>
            <App />
          </SiteConfigProvider>
        </LangProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
