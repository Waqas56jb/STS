import { useState } from 'react'
import { navLinks } from '../../data/site'
import { useScrolled } from '../../hooks/useScrolled'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { Button, ExternalButton } from '../ui/Button'
import { MenuIcon, WhatsAppIcon } from '../icons'
import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'

/**
 * Floating capsule header.
 *
 * Sits detached from the top edge as a rounded glass bar. Over the navy
 * hero it's a translucent dark capsule; once the page scrolls it turns
 * white and gains a shadow so it stays legible over pale sections.
 */
export function Header({ onLoginClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled(40)

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-100 px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className={cn(
            'mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border',
            'px-3 py-2 transition-all duration-500 ease-signal sm:px-4 sm:py-2.5',
            scrolled
              ? 'border-line bg-white/85 shadow-[0_8px_32px_-12px_rgb(6_22_52/0.22)] backdrop-blur-xl backdrop-saturate-150'
              : 'border-white/15 bg-white/8 backdrop-blur-xl',
          )}
        >
          <Logo tone={scrolled ? 'dark' : 'light'} className="shrink-0 pl-1" />

          {/* Centre nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3.5 py-2 text-[14px] font-medium transition-all duration-300',
                  scrolled
                    ? 'text-muted hover:bg-brand-soft hover:text-brand'
                    : 'text-blue-100/90 hover:bg-white/12 hover:text-white',
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Hidden via the wrapper, not the buttons themselves — a
                button's own `inline-flex` would out-order a `hidden`. */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant={scrolled ? 'ghost' : 'outlineLight'}
                size="sm"
                onClick={onLoginClick}
              >
                Login
              </Button>

              <ExternalButton
                href={whatsappLink()}
                variant={scrolled ? 'primary' : 'light'}
                size="sm"
              >
                <WhatsAppIcon className="size-4" />
                <span className="hidden md:inline">WhatsApp Us</span>
                <span className="md:hidden">WhatsApp</span>
              </ExternalButton>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={cn(
                'grid size-10 place-items-center rounded-full transition-colors lg:hidden',
                scrolled
                  ? 'text-ink hover:bg-ice'
                  : 'text-white hover:bg-white/15',
              )}
            >
              <MenuIcon className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLoginClick={onLoginClick}
      />
    </>
  )
}
