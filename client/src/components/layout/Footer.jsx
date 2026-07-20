import { footerNav, site, socialLinks } from '../../data/site'
import { whatsappLink } from '../../lib/whatsapp'
import { Icon, MailIcon, WhatsAppIcon } from '../icons'
import { Logo } from './Logo'

export function Footer({ onLoginClick }) {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className="relative overflow-hidden bg-navy pt-20 pb-10 text-blue-100">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/3 h-[36rem] w-[min(36rem,100vw)] rounded-full bg-[radial-gradient(circle,rgb(59_130_246/0.22),transparent_70%)] blur-2xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <Logo tone="light" />
            <p className="mt-5 max-w-xs text-[14.5px] leading-relaxed text-blue-200/80">
              AI automation for every customer conversation, WhatsApp,
              Instagram, and phone calls, managed from one dashboard.
            </p>

            <div className="mt-6 flex gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="grid size-10 place-items-center rounded-full border border-white/15 text-blue-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  <Icon name={social.icon} className="size-[17px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerNav.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h5 className="font-mono text-[11px] tracking-[0.16em] text-blue-300/70 uppercase">
                {column.title}
              </h5>
              <ul className="mt-5 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[14px] text-blue-100/85 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div>
            <h5 className="font-mono text-[11px] tracking-[0.16em] text-blue-300/70 uppercase">
              Contact
            </h5>
            <ul className="mt-5 flex flex-col gap-3.5 text-[14px]">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex items-center gap-2.5 text-blue-100/85 transition-colors duration-200 hover:text-white"
                >
                  <MailIcon className="size-4 shrink-0 text-blue-300" />
                  {site.email}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-blue-100/85 transition-colors duration-200 hover:text-white"
                >
                  <WhatsAppIcon className="size-4 shrink-0 text-whatsapp" />
                  Message us on WhatsApp
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="text-blue-100/85 transition-colors duration-200 hover:text-white"
                >
                  Client login
                </button>
              </li>
            </ul>

            <p className="mt-5 text-[12.5px] leading-relaxed text-blue-300/60">
              Support enquiries go to the same address, we usually reply within
              one business day.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-[13px] text-blue-300/70">
            © {year} {site.name}. All rights reserved.
          </p>
          <p className="text-[13px] text-blue-300/70">
            Built for businesses that never want to miss a message.
          </p>
        </div>
      </div>
    </footer>
  )
}
