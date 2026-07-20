import { photos } from '../../data/images'
import { site } from '../../data/site'
import { whatsappLink } from '../../lib/whatsapp'
import { Button, ExternalButton } from '../ui/Button'
import { Reveal } from '../ui/Reveal'
import { ArrowRightIcon, MailIcon, WhatsAppIcon } from '../icons'

export function FinalCTA() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <Reveal className="mx-auto w-full max-w-6xl">
        <div className="relative isolate overflow-hidden rounded-3xl px-7 py-16 sm:px-14">
          {/* Photographic backdrop */}
          <img
            src={photos.ai}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/95 via-navy/90 to-brand/70"
          />

          <div className="relative flex flex-col items-start justify-between gap-9 lg:flex-row lg:items-center">
            <div>
              <h2 className="max-w-xl text-[clamp(1.8rem,3.4vw,2.6rem)] text-white text-balance">
                Ready to stop missing customer messages?
              </h2>
              <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-blue-100/85">
                Message us on WhatsApp and we&apos;ll walk you through exactly
                what setup looks like for your business — what it costs, how
                long it takes, and what we need from you. No commitment.
              </p>

              <a
                href={`mailto:${site.email}`}
                className="mt-5 inline-flex items-center gap-2.5 text-[14px] text-blue-200 transition-colors hover:text-white"
              >
                <MailIcon className="size-4" />
                {site.email}
              </a>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3.5">
              <ExternalButton href={whatsappLink()} variant="whatsapp" size="lg">
                <WhatsAppIcon className="size-5" />
                WhatsApp Us
              </ExternalButton>

              <Button href="#request" variant="light" size="lg">
                Request Access
                <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
