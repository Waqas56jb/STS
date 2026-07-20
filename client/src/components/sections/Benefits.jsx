import { benefits } from '../../data/benefits'
import { photos } from '../../data/images'
import { cn } from '../../lib/cn'
import { Icon } from '../icons'
import { Reveal } from '../ui/Reveal'
import { Section, SectionHeading } from '../ui/Section'

/**
 * Bento grid. The first card spans two columns and carries a photo, so
 * the strongest trust signal (official Meta API) reads first.
 */
export function Benefits() {
  return (
    <Section id="why">
      <SectionHeading
        eyebrow="Why businesses choose STS"
        title="Built to be trusted with your customers."
        description="The details that decide whether automation helps your business — or embarrasses it in front of the people you're trying to serve."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit, index) => (
          <Reveal
            key={benefit.title}
            delay={index * 70}
            className={cn('h-full', benefit.span === 2 && 'sm:col-span-2')}
          >
            <article
              className={cn(
                'group relative h-full overflow-hidden rounded-2xl border p-6',
                'transition-all duration-500 ease-signal hover:-translate-y-1',
                benefit.highlight
                  ? 'border-brand/20 bg-navy text-white'
                  : 'border-line bg-white hover:border-brand/30 hover:card-shadow',
              )}
            >
              {benefit.highlight && (
                <>
                  <img
                    src={photos.circuit}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover opacity-25 transition-transform duration-700 ease-signal group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-br from-navy via-navy/90 to-brand/40"
                  />
                </>
              )}

              <div className="relative">
                <span
                  className={cn(
                    'grid size-11 place-items-center rounded-xl transition-colors duration-500',
                    benefit.highlight
                      ? 'bg-white/15 text-blue-200'
                      : 'bg-brand-soft text-brand group-hover:bg-brand group-hover:text-white',
                  )}
                >
                  <Icon name={benefit.icon} className="size-[21px]" />
                </span>

                <h3
                  className={cn(
                    'mt-5',
                    benefit.highlight ? 'text-[22px] text-white' : 'text-[17px]',
                  )}
                >
                  {benefit.title}
                </h3>

                <p
                  className={cn(
                    'mt-2.5 leading-relaxed',
                    benefit.highlight
                      ? 'max-w-md text-[15px] text-blue-100/85'
                      : 'text-[14px] text-muted',
                  )}
                >
                  {benefit.description}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
