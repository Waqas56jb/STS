import { useState } from 'react'
import { faqGroups } from '../../data/faq'
import { site } from '../../data/site'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { ChevronDownIcon, MailIcon, WhatsAppIcon } from '../icons'
import { Reveal } from '../ui/Reveal'
import { Section, SectionHeading } from '../ui/Section'

/**
 * Accordion FAQ.
 *
 * Uses <details>/<summary> so every answer stays in the DOM — findable by
 * in-page search and by crawlers — and remains usable without JavaScript.
 * The chevron rotation is driven by the native `open` attribute.
 */
function FaqItem({ item, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      open={defaultOpen}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn(
        'group rounded-xl border bg-white transition-all duration-300',
        open ? 'border-brand/30 card-shadow' : 'border-line hover:border-line-2',
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[15px] font-semibold text-ink">{item.q}</span>
        <ChevronDownIcon
          className={cn(
            'size-5 shrink-0 text-muted-2 transition-transform duration-300',
            open && 'rotate-180 text-brand',
          )}
        />
      </summary>
      <div className="px-5 pb-5 text-[14.5px] leading-relaxed text-muted">
        {item.a}
      </div>
    </details>
  )
}

export function FAQ() {
  return (
    <Section id="faq">
      <SectionHeading
        eyebrow="Questions & answers"
        title="Everything you might be wondering."
        description="The questions businesses ask us most often, answered in full. If yours isn't here, message us and we'll answer it directly."
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-12">
        {faqGroups.map((group, groupIndex) => (
          <Reveal key={group.title} delay={groupIndex * 80}>
            <h3 className="flex items-center gap-3 text-[17px]">
              <span className="grid size-7 place-items-center rounded-lg bg-brand-soft font-mono text-[12px] font-bold text-brand">
                {groupIndex + 1}
              </span>
              {group.title}
            </h3>

            <div className="mt-4 flex flex-col gap-2.5">
              {group.items.map((item, index) => (
                <FaqItem
                  key={item.q}
                  item={item}
                  defaultOpen={groupIndex === 0 && index === 0}
                />
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      {/* Still stuck */}
      <Reveal className="mt-14" delay={120}>
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-ice px-6 py-9 text-center">
          <h3 className="text-[20px]">Still have a question?</h3>
          <p className="max-w-lg text-[14.5px] leading-relaxed text-muted">
            Message us on WhatsApp for the fastest answer, or email us and
            we&apos;ll get back to you within one business day.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-300 hover:bg-whatsapp-dark"
            >
              <WhatsAppIcon className="size-4" />
              WhatsApp us
            </a>
            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-white px-5 py-2.5 text-[14px] font-semibold text-ink transition-all duration-300 hover:border-brand hover:text-brand"
            >
              <MailIcon className="size-4" />
              {site.email}
            </a>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
