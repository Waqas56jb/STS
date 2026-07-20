import { cn } from '../../lib/cn'

/**
 * STS logo — a custom vector mark rather than a bitmap pulled off the web.
 *
 * Built as SVG so it stays sharp at any size, recolours for the navy hero
 * and the white header, and adds no network request. The concentric arcs
 * read as a broadcast signal converging on a single point: scattered
 * channels resolving into one conversation.
 */
export function Logo({ className, tone = 'dark', showText = true }) {
  const isLight = tone === 'light'

  return (
    <a
      href="#top"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="STS, back to top"
    >
      <span className="relative grid size-10 shrink-0 place-items-center">
        <svg viewBox="0 0 44 44" className="size-10" aria-hidden="true">
          <defs>
            <linearGradient id="sts-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={isLight ? '#93c5fd' : '#3b82f6'} />
              <stop offset="55%" stopColor={isLight ? '#60a5fa' : '#1d4ed8'} />
              <stop offset="100%" stopColor={isLight ? '#67e8f9' : '#06b6d4'} />
            </linearGradient>
          </defs>

          <rect width="44" height="44" rx="12" fill="url(#sts-mark)" />

          {/* Signal arcs radiating from the core */}
          <path
            d="M14.5 29.5a10.5 10.5 0 0 1 0-15"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M29.5 14.5a10.5 10.5 0 0 1 0 15"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M18.6 25.4a4.8 4.8 0 0 1 0-6.8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M25.4 18.6a4.8 4.8 0 0 1 0 6.8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="22" cy="22" r="3.4" fill="#fff" />
        </svg>
      </span>

      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[20px] font-extrabold tracking-tight',
              isLight ? 'text-white' : 'text-ink',
            )}
          >
            STS
          </span>
          <span
            className={cn(
              'mt-0.5 font-mono text-[8.5px] tracking-[0.18em] uppercase',
              isLight ? 'text-blue-200' : 'text-muted-2',
            )}
          >
            Smart Talk Systems
          </span>
        </span>
      )}
    </a>
  )
}
