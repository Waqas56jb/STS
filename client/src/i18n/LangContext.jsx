import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries, en } from './dictionary'

/**
 * Language + direction context.
 *
 * Mirrors the original vanilla behaviour: language is persisted in
 * localStorage under `sts_lang`, and `<html>` gets `lang`/`dir` set so
 * the RTL CSS (`html[dir="rtl"] …`) applies exactly as before. English
 * is the source dictionary, so any key missing from Arabic falls back to
 * the English string — matching the original `d[key] ?? EN[key]` logic.
 */
const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('sts_lang') || 'en')

  useEffect(() => {
    localStorage.setItem('sts_lang', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const value = useMemo(() => {
    const dict = dictionaries[lang] || en
    // Translate a key, falling back to English, then to the key itself.
    const t = (key) => (dict[key] !== undefined ? dict[key] : en[key] !== undefined ? en[key] : key)
    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isAr: lang === 'ar',
      t,
      toggle: () => setLang((l) => (l === 'en' ? 'ar' : 'en')),
      setLang,
    }
  }, [lang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within <LangProvider>')
  return ctx
}

/**
 * Render a translated string. Some dictionary values contain inline HTML
 * (the hero headline's <span class="grad">, the "Save X KWD" badges), so
 * `html` opts into dangerouslySetInnerHTML for those trusted, static
 * strings — everything here is authored by us, never user input.
 */
export function T({ k, html = false, as: Tag = 'span', className, ...rest }) {
  const { t } = useLang()
  const value = t(k)
  if (html) {
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: value }} {...rest} />
  }
  return (
    <Tag className={className} {...rest}>
      {value}
    </Tag>
  )
}
