import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useLang } from '../i18n/LangContext'

/** Toggle switch matching the original .switch/.slider markup (uncontrolled). */
export function Switch({ defaultChecked = false }) {
  return (
    <label className="switch">
      <input type="checkbox" defaultChecked={defaultChecked} />
      <span className="slider" />
    </label>
  )
}

/* ---- Toast (replaces the original global toast() function) ---- */
const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const { isAr } = useLang()
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  const timer = useRef(null)

  const toast = useCallback(
    (custom) => {
      setMsg(custom || (isAr ? 'تم الحفظ ✓' : 'Saved ✓'))
      setShow(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setShow(false), 1800)
    },
    [isAr],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* global class (not scoped) so it works whether it lands inside
          .dash, .admin, or as a portal sibling */}
      <div className={`sts-toast ${show ? 'show' : ''}`}>{msg}</div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
