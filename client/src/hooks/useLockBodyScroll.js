import { useEffect } from 'react'

/**
 * Freeze background scrolling while a modal or mobile menu is open, and
 * compensate for the disappearing scrollbar so the page doesn't shift.
 */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return

    const { overflow, paddingRight } = document.body.style
    const scrollbar = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [locked])
}
