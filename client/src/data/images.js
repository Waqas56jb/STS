/**
 * Image library.
 *
 * Photography is served from Unsplash's CDN. Every URL below was verified
 * to resolve AND visually checked for relevance. `img()` requests an
 * appropriately sized asset instead of the full-resolution original.
 *
 * To self-host later, change the URLs here — nothing else references
 * image paths.
 */

const UNSPLASH = 'https://images.unsplash.com/photo-'

function img(id, { w = 1200, h, q = 78, faces = false } = {}) {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: String(w),
    q: String(q),
  })
  if (h) params.set('h', String(h))
  if (faces) params.set('crop', 'faces')
  return `${UNSPLASH}${id}?${params.toString()}`
}

export const photos = {
  /** Earth at night, connected city lights — hero backdrop. */
  hero: img('1451187580459-43490279c0fa', { w: 2000, h: 1200, q: 80 }),

  /** Engineer working beside automated production line. */
  automation: img('1581091226825-a6a2a5aee158', { w: 1100, h: 760 }),

  /** Blue "AI" typography artwork. */
  ai: img('1677442136019-21780ecad995', { w: 1100, h: 760 }),

  /** Blue-lit data centre corridor. */
  infrastructure: img('1573164713988-8665fc963095', { w: 1100, h: 760 }),

  /** Abstract connected-node network. */
  network: img('1639322537228-f710d846310a', { w: 1100, h: 700 }),

  /** Team working across laptops. */
  team: img('1522071820081-009f0129c71c', { w: 1100, h: 760 }),

  /** Two people planning over notes and laptops. */
  strategy: img('1454165804606-c3d57bc86b40', { w: 1100, h: 760 }),

  /** Open-plan office collaboration. */
  office: img('1556761175-b413da4baf72', { w: 1100, h: 760 }),

  /** Hands typing across two laptops. */
  working: img('1517430816045-df4b7de11d1d', { w: 1100, h: 760 }),

  /** Laptop and desk phone — voice/telephony. */
  telephony: img('1587560699334-cc4ff634909a', { w: 1100, h: 760 }),

  /** Circuit board macro — infrastructure detail. */
  circuit: img('1518770660439-4636190af475', { w: 1100, h: 700 }),
}

/** Square, face-cropped portraits for testimonials. */
export const avatars = {
  layla: img('1573497019940-1c28c88b4f3e', { w: 200, h: 200, faces: true }),
  omar: img('1507003211169-0a1dd7228f2d', { w: 200, h: 200, faces: true }),
  huda: img('1494790108377-be9c29b29330', { w: 200, h: 200, faces: true }),
  faisal: img('1560250097-0b93528c311a', { w: 200, h: 200, faces: true }),
}

export { img }
