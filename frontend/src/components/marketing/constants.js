// Shared by the public pages (landing, pricing)

export const EASE = [0.22, 1, 0.36, 1]
export const APK_URL = '/download/ArthaLedger.apk'
export const CONTACT = 'jashwanthjavili7@gmail.com'
export const GOLD_TINT = 'color-mix(in srgb, var(--gold-primary) 14%, transparent)'
export const GOLD_SOFT = 'color-mix(in srgb, var(--gold-primary) 26%, transparent)'
export const BAND_BG = 'color-mix(in srgb, var(--gold-primary) 5%, var(--bg-page))'

// Sections live on the landing page; Pricing has its own page.
// `label` is a translation key, looked up when the menu renders.
export const NAV = [
  { id: 'how', label: 'site.nav.how' },
  { id: 'insights', label: 'site.nav.insights' },
  { id: 'features', label: 'site.nav.features' },
  { page: '/pricing', label: 'site.nav.pricing' },
  { id: 'faq', label: 'site.nav.faq' },
]

export const goldBtn = {
  background: 'linear-gradient(135deg, var(--gold-hover), var(--gold-primary))',
  color: '#1F1A14',
  boxShadow: '0 12px 30px -14px var(--gold-primary)',
}

export const card = { background: 'var(--bg-card)', border: '1px solid var(--border-card)' }

/** Smooth-scroll to a landing section without putting #id in the address
 *  (so a reload starts at the top, not at the FAQ). */
export function scrollToSection(e, id) {
  const el = document.getElementById(id)
  if (!el) return
  e?.preventDefault()
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
