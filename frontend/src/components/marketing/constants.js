// Shared by the public pages (landing, pricing)

export const EASE = [0.22, 1, 0.36, 1]
export const APK_URL = '/download/ArthaLedger.apk'
export const CONTACT = 'jashwanthjavili7@gmail.com'
export const GOLD_TINT = 'color-mix(in srgb, var(--gold-primary) 14%, transparent)'
export const GOLD_SOFT = 'color-mix(in srgb, var(--gold-primary) 26%, transparent)'
export const BAND_BG = 'color-mix(in srgb, var(--gold-primary) 5%, var(--bg-page))'

// Sections live on the landing page; Pricing has its own page
export const NAV = [
  { id: 'how', label: 'How it works' },
  { id: 'insights', label: 'Insights' },
  { id: 'features', label: 'Features' },
  { page: '/pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
]

export const goldBtn = {
  background: 'linear-gradient(135deg, var(--gold-hover), var(--gold-primary))',
  color: '#1F1A14',
  boxShadow: '0 12px 30px -14px var(--gold-primary)',
}

export const card = { background: 'var(--bg-card)', border: '1px solid var(--border-card)' }
