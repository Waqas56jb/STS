import { useReveal } from '../../hooks/useReveal'
import { cn } from '../../lib/cn'

/**
 * Fade-and-rise wrapper that triggers when scrolled into view.
 *
 * `delay` staggers siblings — map over a list and pass `index * 80` to
 * get a cascade. The animation itself lives in index.css (.reveal) so
 * reduced-motion users get the content with no transition at all.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Component = 'div',
  ...props
}) {
  const { ref, isVisible } = useReveal()

  return (
    <Component
      ref={ref}
      data-visible={isVisible}
      style={{ '--reveal-delay': `${delay}ms` }}
      className={cn('reveal', className)}
      {...props}
    >
      {children}
    </Component>
  )
}
