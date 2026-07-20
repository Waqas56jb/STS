import { useEffect } from 'react'

/**
 * Freeze background scrolling while a modal or mobile menu is open.
 *
 * Compensates for the disappearing scrollbar with padding so the page
 * doesn't visibly shift when the lock engages.
 */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return

    const { overflow, paddingRight } = document.body.style
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [locked])
}
