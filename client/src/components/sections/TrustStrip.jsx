import { trustBadges } from '../../data/benefits'
import { CheckIcon } from '../icons'

/**
 * Continuously scrolling trust badges.
 *
 * The list renders twice and translates by -50% for a seamless loop; the
 * duplicate is hidden from screen readers so nothing is announced twice.
 */
export function TrustStrip() {
  return (
    <div className="border-y border-line bg-ice py-5">
      <div className="mask-fade-x flex overflow-hidden">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 animate-marquee items-center gap-10 pr-10"
          >
            {trustBadges.map((badge) => (
              <li
                key={badge}
                className="flex shrink-0 items-center gap-2.5 text-[13.5px] font-medium whitespace-nowrap text-muted"
              >
                <CheckIcon className="size-4 shrink-0 text-brand" />
                {badge}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
