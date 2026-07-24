import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Minimal language + direction context for the admin app.
 *
 * The admin panel translates through its own dictionary (see admin.js +
 * useAdminT), so this context only tracks the language, persists it under
 * the shared `sts_lang` key, and sets `<html>` lang/dir so the RTL CSS
 * (`html[dir="rtl"] …`) applies exactly as in the original admin.html.
 */
const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('sts_lang') || 'en')

  useEffect(() => {
    localStorage.setItem('sts_lang', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isAr: lang === 'ar',
      toggle: () => setLang((l) => (l === 'en' ? 'ar' : 'en')),
      setLang,
    }),
    [lang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within <LangProvider>')
  return ctx
}
