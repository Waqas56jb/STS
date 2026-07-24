/**
 * Initials avatar — self-contained replacement for the old ui-avatars.com
 * images (no network request). Derives up to two initials from a name.
 */
function initials(name) {
  const words = String(name)
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function Avatar({ name = '', size = 32, className = '', style }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#EAF9F3',
        color: 'var(--lagoon-d)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--disp)',
        fontWeight: 800,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
        flex: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      {initials(name)}
    </span>
  )
}
