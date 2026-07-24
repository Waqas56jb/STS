import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-reveal, matching the original IntersectionObserver at
 * threshold 0.12. Adds the `in` state once the element enters view and
 * then stops observing, so the fade-up plays exactly once.
 */
export function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || shown) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [shown, threshold])

  return [ref, shown]
}
