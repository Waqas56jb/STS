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
 * Fixed header.
 *
 * Transparent over the navy hero, then turns white and frosted once the
 * page scrolls — so the nav is legible against both.
 */
export function Header({ onLoginClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled(40)

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-100 transition-all duration-500 ease-signal',
          scrolled
            ? 'border-b border-line bg-white/85 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div
            className={cn(
              'flex items-center transition-all duration-500 ease-signal',
              scrolled ? 'h-16' : 'h-20',
            )}
          >
            <Logo tone={scrolled ? 'dark' : 'light'} />
          </div>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'group relative text-[14.5px] font-medium transition-colors duration-200',
                  scrolled ? 'text-muted hover:text-brand' : 'text-blue-100 hover:text-white',
                )}
              >
                {link.label}
                <span
                  className={cn(
                    'absolute -bottom-1.5 left-0 h-0.5 w-0 rounded-full transition-all duration-300 ease-signal group-hover:w-full',
                    scrolled ? 'bg-brand' : 'bg-white',
                  )}
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {/* Hidden via the wrapper, not the buttons themselves — a
                button's own `inline-flex` would out-order a `hidden`. */}
            <div className="hidden items-center gap-2.5 sm:flex">
              <Button
                variant={scrolled ? 'outline' : 'outlineLight'}
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
                WhatsApp Us
              </ExternalButton>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={cn(
                'rounded-lg p-2 transition-colors lg:hidden',
                scrolled ? 'text-ink hover:bg-ice' : 'text-white hover:bg-white/10',
              )}
            >
              <MenuIcon className="size-6" />
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
