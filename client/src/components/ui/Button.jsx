import { cn } from '../../lib/cn'

/**
 * Button / link with shared visual variants.
 *
 * Renders an <a> when `href` is supplied, otherwise a <button>, so
 * navigation stays a real link while form actions stay real buttons.
 */

const variants = {
  primary:
    'bg-brand text-white hover:bg-brand-dark shadow-[0_10px_28px_-10px] shadow-brand/60 hover:shadow-brand/80',
  whatsapp:
    'bg-whatsapp text-white hover:bg-whatsapp-dark shadow-[0_10px_28px_-10px] shadow-whatsapp/60',
  outline:
    'border border-line-2 bg-white text-ink hover:border-brand hover:text-brand hover:bg-brand-soft',
  ghost: 'text-ink hover:bg-ice',
  /** For use on the dark navy hero. */
  light: 'bg-white text-brand hover:bg-brand-soft',
  outlineLight:
    'border border-white/35 text-white hover:border-white hover:bg-white/10 backdrop-blur-sm',
}

const sizes = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-2.5 text-[14.5px]',
  lg: 'px-7 py-3.5 text-[15px]',
}

export function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  fullWidth = false,
  ...props
}) {
  const Component = as ?? (href ? 'a' : 'button')

  // Only default the type on real buttons — <a type> means something else.
  const typeProp =
    Component === 'button' && props.type === undefined ? { type: 'button' } : {}

  return (
    <Component
      href={href}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        'transition-all duration-300 ease-signal active:scale-[0.97]',
        'whitespace-nowrap select-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...typeProp}
      {...props}
    >
      {children}
    </Component>
  )
}

/** External link that opens safely in a new tab. */
export function ExternalButton({ children, ...props }) {
  return (
    <Button target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </Button>
  )
}
