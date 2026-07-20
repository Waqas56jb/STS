import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircleIcon } from '../icons'
import { cn } from '../../lib/cn'

const ToastContext = createContext(null)

/** Minimal toast system — one message at a time, auto-dismissed. */
export function ToastProvider({ children, duration = 4500 }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback(
    (message) => {
      clearTimeout(timerRef.current)
      setToast({ message, id: Date.now() })
      timerRef.current = setTimeout(() => setToast(null), duration)
    },
    [duration],
  )

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {createPortal(<ToastViewport toast={toast} />, document.body)}
    </ToastContext.Provider>
  )
}

function ToastViewport({ toast }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-300 flex justify-center px-4"
    >
      <div
        className={cn(
          'flex max-w-md items-center gap-3 rounded-full border border-line',
          'bg-navy px-5 py-3 text-[13.5px] font-medium text-white',
          'shadow-[0_24px_60px_-16px_rgb(6_22_52/0.5)]',
          'transition-all duration-500 ease-signal',
          toast
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-6 scale-95 opacity-0',
        )}
      >
        <CheckCircleIcon className="size-5 shrink-0 text-blue-300" />
        <span>{toast?.message}</span>
      </div>
    </div>
  )
}

/** Returns `showToast(message)`. */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return context
}
