import { useEffect, useState } from 'react'

/**
 * Cycle an index from 0..length-1 on an interval.
 * Drives the hero's rotating headline word and chat script.
 *
 * Pauses when the tab is hidden and when the user prefers reduced
 * motion, so nothing animates off-screen or against that preference.
 */
export function useRotatingIndex(length, intervalMs = 2600) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (length <= 1) return

    const prefersReduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) return

    let timer

    const start = () => {
      timer = setInterval(() => {
        setIndex((current) => (current + 1) % length)
      }, intervalMs)
    }

    const onVisibilityChange = () => {
      clearInterval(timer)
      if (!document.hidden) start()
    }

    start()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [length, intervalMs])

  return index
}
