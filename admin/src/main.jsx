import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LangProvider } from './i18n/LangContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LangProvider>
        <App />
      </LangProvider>
    </ErrorBoundary>
  </StrictMode>,
)
