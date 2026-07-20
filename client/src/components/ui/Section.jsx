import { cn } from '../../lib/cn'
import { Reveal } from './Reveal'

/** Page section with consistent rhythm and a max-width container. */
export function Section({ id, className, containerClassName, children, ...props }) {
  return (
    <section
      id={id}
      className={cn('relative py-20 sm:py-24 lg:py-28', className)}
      {...props}
    >
      <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  )
}

/** Small pill label that sits above section headings. */
export function Eyebrow({ children, className, tone = 'light' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5',
        'font-mono text-[11px] tracking-[0.14em] uppercase',
        tone === 'dark'
          ? 'bg-white/10 text-blue-100 ring-1 ring-white/20'
          : 'bg-brand-soft text-brand ring-1 ring-brand/12',
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span
          className={cn(
            'absolute inline-flex size-full animate-ping rounded-full opacity-70',
            tone === 'dark' ? 'bg-blue-200' : 'bg-brand',
          )}
        />
        <span
          className={cn(
            'relative inline-flex size-1.5 rounded-full',
            tone === 'dark' ? 'bg-blue-200' : 'bg-brand',
          )}
        />
      </span>
      {children}
    </span>
  )
}

/** Eyebrow + title + optional description. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}) {
  const centered = align === 'center'

  return (
    <Reveal className={cn('max-w-3xl', centered && 'mx-auto text-center', className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}

      <h2 className="mt-5 text-[clamp(1.9rem,4vw,3rem)] text-balance">{title}</h2>

      {description && (
        <p
          className={cn(
            'mt-4 text-[17px] leading-relaxed text-muted text-pretty',
            centered ? 'mx-auto max-w-2xl' : 'max-w-2xl',
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  )
}

/** Soft drifting colour blooms — decorative only. */
export function Backdrop({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute -top-40 -right-32 size-[34rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(59_130_246/0.16),transparent_68%)] blur-2xl" />
      <div
        className="absolute -bottom-48 -left-40 size-[30rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(6_182_212/0.13),transparent_68%)] blur-2xl"
        style={{ animationDelay: '-7s' }}
      />
    </div>
  )
}

/** Faint grid texture that fades toward the bottom. */
export function GridBackdrop({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 grid-texture mask-fade-b', className)}
    />
  )
}
