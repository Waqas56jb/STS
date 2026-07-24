import { useReveal } from '../hooks/useReveal'

/** `<div class="reveal">` that flips to `.in` when scrolled into view. */
export function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const [ref, shown] = useReveal()
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}
