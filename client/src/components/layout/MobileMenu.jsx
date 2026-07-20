import { useEffect } from 'react'
import { navLinks, site } from '../../data/site'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { Button, ExternalButton } from '../ui/Button'
import { ArrowRightIcon, CloseIcon, MailIcon, WhatsAppIcon } from '../icons'
import { Logo } from './Logo'

/**
 * Full-screen navigation for small viewports.
 *
 * Stays mounted so it can transition out; links close the menu on click
 * so the anchor scroll lands on a page that isn't covered.
 */
export function MobileMenu({ open, onClose, onLoginClick }) {
  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'fixed inset-0 z-150 bg-white transition-all duration-400 ease-signal lg:hidden',
        open ? 'visible opacity-100' : 'invisible opacity-0',
      )}
      aria-hidden={!open}
      inert={!open || undefined}
    >
      <div className="flex h-20 items-center justify-between border-b border-line px-5 sm:px-8">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-lg p-2 text-ink transition-colors hover:bg-ice"
        >
          <CloseIcon className="size-6" />
        </button>
      </div>

      <nav className="flex flex-col px-5 pt-4 sm:px-8" aria-label="Mobile">
        {[...navLinks, { label: 'Request access', href: '#request' }].map(
          (link, index) => (
            <a
              key={link.href + link.label}
              href={link.href}
              onClick={onClose}
              style={{ transitionDelay: open ? `${index * 50 + 80}ms` : '0ms' }}
              className={cn(
                'group flex items-center justify-between border-b border-line py-4',
                'font-display text-xl font-bold text-ink transition-all duration-500 ease-signal',
                open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              {link.label}
              <ArrowRightIcon className="size-5 text-muted-2 transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand" />
            </a>
          ),
        )}
      </nav>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-5 pb-10 sm:px-8">
        <ExternalButton href={whatsappLink()} variant="whatsapp" size="lg" fullWidth>
          <WhatsAppIcon className="size-5" />
          WhatsApp Us
        </ExternalButton>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => {
            onClose()
            onLoginClick()
          }}
        >
          Client login
        </Button>

        <a
          href={`mailto:${site.email}`}
          className="mt-1 flex items-center justify-center gap-2 text-[13.5px] text-muted transition-colors hover:text-brand"
        >
          <MailIcon className="size-4" />
          {site.email}
        </a>
      </div>
    </div>
  )
}
