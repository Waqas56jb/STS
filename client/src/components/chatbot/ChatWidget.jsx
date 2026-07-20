import { useCallback, useEffect, useRef, useState } from 'react'
import { botIntro, chatNodes } from '../../data/chatbot'
import { whatsappLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import { ChatIcon, CloseIcon, SendIcon, WhatsAppIcon } from '../icons'
import { Logo } from '../layout/Logo'

/**
 * On-page assistant.
 *
 * Walks the visitor through a scripted decision tree (see data/chatbot.js),
 * revealing bot messages one at a time with a typing indicator. It is a
 * guided FAQ rather than a live AI — every answer is authored, so it can
 * never invent a price or a promise.
 */

const TYPING_MS = 650
const MESSAGE_GAP_MS = 420

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState([])
  const [options, setOptions] = useState([])
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(false)

  const timersRef = useRef([])
  const scrollRef = useRef(null)
  const panelRef = useRef(null)
  const started = useRef(false)

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  /** Reveal a node's messages in sequence, then show its options. */
  const playNode = useCallback((nodeId) => {
    const node = chatNodes[nodeId]
    if (!node) return

    clearTimers()
    setOptions([])

    const prefersReduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReduced) {
      setEntries((current) => [
        ...current,
        ...node.messages.map((text) => ({ from: 'bot', text })),
      ])
      setOptions(node.options ?? [])
      return
    }

    let elapsed = 0

    node.messages.forEach((text, index) => {
      timersRef.current.push(
        setTimeout(() => setTyping(true), elapsed),
      )
      elapsed += TYPING_MS

      timersRef.current.push(
        setTimeout(() => {
          setTyping(false)
          setEntries((current) => [...current, { from: 'bot', text }])
        }, elapsed),
      )

      if (index < node.messages.length - 1) elapsed += MESSAGE_GAP_MS
    })

    timersRef.current.push(
      setTimeout(() => setOptions(node.options ?? []), elapsed + 220),
    )
  }, [])

  // Start the conversation the first time the panel opens.
  useEffect(() => {
    if (!open || started.current) return
    started.current = true
    playNode('welcome')
  }, [open, playNode])

  // Nudge the visitor once, after they've had time to read the page.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!started.current) setUnread(true)
    }, 12000)
    return () => clearTimeout(timer)
  }, [])

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [entries, typing, options])

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => clearTimers, [])

  function handleOption(option) {
    setEntries((current) => [...current, { from: 'user', text: option.label }])
    setOptions([])

    if (option.whatsapp) {
      window.open(whatsappLink(), '_blank', 'noopener,noreferrer')
      setTimeout(() => playNode('welcome'), 700)
      return
    }

    if (option.href) {
      document.querySelector(option.href)?.scrollIntoView({ behavior: 'smooth' })
      setOpen(false)
      // Re-arm the menu so reopening the panel isn't a dead end.
      setTimeout(() => playNode('welcome'), 700)
      return
    }

    setTimeout(() => playNode(option.next), 380)
  }

  function restart() {
    clearTimers()
    setEntries([])
    setOptions([])
    setTyping(false)
    playNode('welcome')
  }

  return (
    <>
      {/* ---------------- Launcher ---------------- */}
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          setUnread(false)
        }}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
        className={cn(
          'fixed right-5 bottom-5 z-90 grid size-14 place-items-center rounded-full',
          'bg-brand text-white shadow-[0_16px_40px_-10px] shadow-brand/60',
          'transition-all duration-400 ease-signal hover:bg-brand-dark hover:scale-105',
          open && 'rotate-90',
        )}
      >
        {!open && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full" aria-hidden="true" />
        )}
        <span className="relative">
          {open ? <CloseIcon className="size-6" /> : <ChatIcon className="size-6" />}
        </span>

        {unread && !open && (
          <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-navy ring-2 ring-white">
            1
          </span>
        )}
      </button>

      {/* ---------------- Panel ---------------- */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="STS assistant"
        aria-hidden={!open}
        inert={!open || undefined}
        className={cn(
          'fixed z-95 flex flex-col overflow-hidden rounded-2xl border border-line bg-white',
          'shadow-[0_30px_80px_-20px_rgb(6_22_52/0.35)]',
          'transition-all duration-400 ease-signal',
          // Mobile: near full-screen. Desktop: docked above the launcher.
          'inset-x-4 bottom-24 max-h-[70vh]',
          'sm:inset-x-auto sm:right-5 sm:bottom-24 sm:w-[380px] sm:max-h-[560px]',
          open
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible translate-y-4 scale-95 opacity-0',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-navy px-4 py-3.5">
          <Logo tone="light" showText={false} className="pointer-events-none" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-tight font-semibold text-white">
              {botIntro.name}
            </p>
            <p className="flex items-center gap-1.5 text-[11.5px] text-blue-200">
              <span className="size-1.5 rounded-full bg-green-400" />
              {botIntro.status}
            </p>
          </div>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg px-2 py-1 font-mono text-[10.5px] tracking-wide text-blue-200 uppercase transition-colors hover:bg-white/10 hover:text-white"
          >
            Restart
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-2.5 overflow-y-auto bg-ice px-4 py-4"
        >
          {entries.map((entry, index) => (
            <div
              key={index}
              className={cn(
                'flex animate-pop',
                entry.from === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line',
                  entry.from === 'user'
                    ? 'rounded-br-sm bg-brand text-white'
                    : 'rounded-bl-sm border border-line bg-white text-ink',
                )}
              >
                {entry.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex animate-pop justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-white px-3.5 py-3">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    style={{ animationDelay: `${dot * 170}ms` }}
                    className="size-1.5 animate-bounce rounded-full bg-muted-2"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick replies */}
        <div className="border-t border-line bg-white px-3 py-3">
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleOption(option)}
                  className={cn(
                    'animate-pop rounded-full border px-3.5 py-2 text-[12.5px] font-medium',
                    'transition-all duration-200 hover:-translate-y-0.5',
                    option.whatsapp
                      ? 'border-whatsapp/30 bg-whatsapp/10 text-whatsapp-dark hover:bg-whatsapp/20'
                      : 'border-line-2 bg-white text-ink hover:border-brand hover:bg-brand-soft hover:text-brand',
                  )}
                >
                  {option.whatsapp && <WhatsAppIcon className="mr-1 inline size-3.5" />}
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 py-1.5 text-[12px] text-muted-2">
              <SendIcon className="size-3.5" />
              Choose an option above to continue
            </p>
          )}
        </div>
      </div>
    </>
  )
}
