import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { CloseIcon } from '../icons'
import { cn } from '../../lib/cn'

/**
 * Accessible dialog rendered into a portal.
 *
 * Handles Escape to close, click-outside to close, background scroll
 * lock, focus moved into the panel on open and restored on close, and
 * Tab cycling kept inside the panel.
 */
export function Modal({ open, onClose, title, description, children, className }) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)

  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement
    panelRef.current
      ?.querySelector('input, select, textarea, button, [href]')
      ?.focus()

    return () => previouslyFocused.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // Only close on a press that starts on the backdrop itself.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full max-w-md animate-rise rounded-2xl border border-line',
          'bg-white p-7 shadow-[0_40px_100px_-24px_rgb(6_22_52/0.35)]',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-ice hover:text-ink"
        >
          <CloseIcon className="size-5" />
        </button>

        {title && <h3 className="pr-8 text-xl">{title}</h3>}
        {description && <p className="mt-1.5 text-[14px] text-muted">{description}</p>}

        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
