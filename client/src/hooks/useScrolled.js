import { useEffect, useState } from 'react'

/**
 * True once the page has scrolled past `offset` pixels.
 * Used to condense and frost the header on scroll.
 */
export function useScrolled(offset = 24) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)

    onScroll() // account for a restored scroll position on mount
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])

  return scrolled
}
