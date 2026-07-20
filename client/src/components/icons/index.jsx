/**
 * Icon set.
 *
 * Every icon is a plain SVG component that inherits `currentColor` and
 * accepts className, so colour and size are controlled by Tailwind at
 * the call site. Brand marks are filled; UI glyphs are stroked.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ children, className = 'size-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

/* ---------------- Brand marks ---------------- */

export function WhatsAppIcon(props) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5.1-1.3c1.5.8 3.1 1.3 4.9 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3C4 15 3.5 13.5 3.5 12c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5z"
      />
      <path
        fill="currentColor"
        d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4z"
      />
    </Svg>
  )
}

export function InstagramIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5.2" {...stroke} />
      <circle cx="12" cy="12" r="4.1" {...stroke} />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" />
    </Svg>
  )
}

export function LinkedInIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3.4" {...stroke} />
      <path d="M7.2 10.4v6.2M7.2 7.3v.02M11.6 16.6v-6.2M11.6 13.3a2.2 2.2 0 0 1 4.4 0v3.3" {...stroke} />
    </Svg>
  )
}

export function FacebookIcon(props) {
  return (
    <Svg {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" {...stroke} />
    </Svg>
  )
}

/* ---------------- UI glyphs ---------------- */

export function PhoneIcon(props) {
  return (
    <Svg {...props}>
      <path
        d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"
        {...stroke}
      />
    </Svg>
  )
}

export function LayoutIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.4" height="9.4" rx="1.8" {...stroke} />
      <rect x="13.6" y="3" width="7.4" height="5.6" rx="1.8" {...stroke} />
      <rect x="13.6" y="11.8" width="7.4" height="9.2" rx="1.8" {...stroke} />
      <rect x="3" y="15.6" width="7.4" height="5.4" rx="1.8" {...stroke} />
    </Svg>
  )
}

export function ShieldIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 2.5 20 6v6c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10V6z" {...stroke} />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.6" {...stroke} />
    </Svg>
  )
}

export function ClockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M12 6.8V12l3.4 3.4" {...stroke} />
    </Svg>
  )
}

export function TargetIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.6" {...stroke} />
      <circle cx="12" cy="12" r="4.6" {...stroke} />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </Svg>
  )
}

export function InboxIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.4" width="18" height="15.2" rx="2.6" {...stroke} />
      <path d="M3 13.4h4.2l1.5 2.4h6.6l1.5-2.4H21" {...stroke} />
    </Svg>
  )
}

export function WrenchIcon(props) {
  return (
    <Svg {...props}>
      <path
        d="M20.4 5.2a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.4 3.4 1.5 3.5 3.5 1.5z"
        {...stroke}
      />
    </Svg>
  )
}

export function CheckIcon(props) {
  return (
    <Svg {...props}>
      <path d="M20 6.5 9.2 17.3 4 12.1" {...stroke} strokeWidth={2.2} />
    </Svg>
  )
}

export function CheckCircleIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.2" {...stroke} />
      <path d="M8.2 12.2l2.6 2.6 5-5.6" {...stroke} strokeWidth={2} />
    </Svg>
  )
}

export function CloseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18M6 6l12 12" {...stroke} strokeWidth={2} />
    </Svg>
  )
}

export function MenuIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" {...stroke} strokeWidth={1.9} />
    </Svg>
  )
}

export function ArrowRightIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" {...stroke} strokeWidth={1.9} />
    </Svg>
  )
}

export function SparkleIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.9 5.4L19.5 10l-5.6 1.6L12 17l-1.9-5.4L4.5 10l5.6-1.6z" {...stroke} />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" {...stroke} />
    </Svg>
  )
}

export function LockIcon(props) {
  return (
    <Svg {...props}>
      <rect x="4.4" y="10.4" width="15.2" height="10.2" rx="2.4" {...stroke} />
      <path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8" {...stroke} />
    </Svg>
  )
}

export function ChartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 3.5v17h17" {...stroke} />
      <path d="M7.5 15.5v2.4M12 10v7.9M16.5 6.4v11.5" {...stroke} strokeWidth={2} />
    </Svg>
  )
}

export function UsersIcon(props) {
  return (
    <Svg {...props}>
      <path d="M16.6 20.4v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1.8" {...stroke} />
      <circle cx="9.3" cy="7.4" r="3.9" {...stroke} />
      <path d="M22 20.4v-1.8a4 4 0 0 0-3-3.9M16.2 3.7a4 4 0 0 1 0 7.5" {...stroke} />
    </Svg>
  )
}

export function GlobeIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.2" {...stroke} />
      <path d="M3 12h18M12 2.8c2.3 2.5 3.5 5.7 3.5 9.2s-1.2 6.7-3.5 9.2c-2.3-2.5-3.5-5.7-3.5-9.2s1.2-6.7 3.5-9.2z" {...stroke} />
    </Svg>
  )
}

export function LayersIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 2.8 21 7.4l-9 4.6-9-4.6z" {...stroke} />
      <path d="M3 12.2l9 4.6 9-4.6M3 16.8l9 4.6 9-4.6" {...stroke} />
    </Svg>
  )
}

export function ChevronDownIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 9 12 15.5 18.5 9" {...stroke} strokeWidth={2} />
    </Svg>
  )
}

export function SendIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" {...stroke} />
    </Svg>
  )
}

export function ChatIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-3.5-.7L3 21l1.8-4.6A8.3 8.3 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4z" {...stroke} />
      <path d="M8.6 11.5h.01M12 11.5h.01M15.4 11.5h.01" {...stroke} strokeWidth={2.4} />
    </Svg>
  )
}

export function StarIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" />
    </Svg>
  )
}

export function MailIcon(props) {
  return (
    <Svg {...props}>
      <rect x="2.8" y="4.6" width="18.4" height="14.8" rx="2.6" {...stroke} />
      <path d="M3.4 6.4 12 12.8l8.6-6.4" {...stroke} />
    </Svg>
  )
}

/**
 * Name → component map, so data files can reference icons by string.
 */
export const iconMap = {
  globe: GlobeIcon,
  layers: LayersIcon,
  chat: ChatIcon,
  mail: MailIcon,
  star: StarIcon,
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
  phone: PhoneIcon,
  layout: LayoutIcon,
  shield: ShieldIcon,
  clock: ClockIcon,
  target: TargetIcon,
  inbox: InboxIcon,
  wrench: WrenchIcon,
  check: CheckIcon,
  chart: ChartIcon,
  users: UsersIcon,
  sparkle: SparkleIcon,
  lock: LockIcon,
}

/** Resolve an icon component by name, falling back to a neutral glyph. */
export function Icon({ name, ...props }) {
  const Component = iconMap[name] ?? SparkleIcon
  return <Component {...props} />
}
