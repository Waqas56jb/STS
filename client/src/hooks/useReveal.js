import { useEffect, useRef, useState } from 'react'

/**
 * Reveal an element once it scrolls into view.
 *
 * Returns a ref to attach and the current visibility. Unobserves after
 * the first intersection so the animation only ever plays once, and
 * degrades to "always visible" where IntersectionObserver is missing.
 *
 * @param {object} options
 * @param {number} options.threshold  Fraction visible before firing
 * @param {string} options.rootMargin Trigger offset
 */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, isVisible }
}
