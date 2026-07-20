import { useState } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { LoginModal } from './components/auth/LoginModal'
import { ChatWidget } from './components/chatbot/ChatWidget'
import { ToastProvider } from './components/ui/Toast'

import { Hero } from './components/sections/Hero'
import { TrustStrip } from './components/sections/TrustStrip'
import { Services } from './components/sections/Services'
import { HowItWorks } from './components/sections/HowItWorks'
import { Benefits } from './components/sections/Benefits'
import { Showcase } from './components/sections/Showcase'
import { Pricing } from './components/sections/Pricing'
import { FAQ } from './components/sections/FAQ'
import { RequestAccess } from './components/sections/RequestAccess'
import { FinalCTA } from './components/sections/FinalCTA'

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false)
  const openLogin = () => setLoginOpen(true)

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-300 focus:rounded-full focus:bg-brand focus:px-5 focus:py-2.5 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header onLoginClick={openLogin} />

      <main id="main">
        <div id="top" />
        <Hero />
        <TrustStrip />
        <Services />
        <HowItWorks />
        <Benefits />
        <Showcase />
        <Pricing />
        <FAQ />
        <RequestAccess />
        <FinalCTA />
      </main>

      <Footer onLoginClick={openLogin} />

      <ChatWidget />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </ToastProvider>
  )
}
