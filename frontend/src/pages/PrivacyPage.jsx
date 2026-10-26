import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck, EyeOff, Trash2, Ban, Mail } from 'lucide-react'
import { useI18n } from '../i18n/core'

const CONTACT = 'jashwanthjavili7@gmail.com'
// Effective date of this version (shown in the reader's language)
const EFFECTIVE = new Date(2026, 9, 23)

const GLANCE = [
  { Icon: ShieldCheck, id: 'private' },
  { Icon: Ban, id: 'noSelling' },
  { Icon: EyeOff, id: 'noBank' },
  { Icon: Trash2, id: 'deleteAnytime' },
]

// Section ids (for links) and their text keys. Each section's blocks in the
// JSON: strings are paragraphs, arrays are bullet lists.
const SECTIONS = [
  { id: 'about', key: 'about' },
  { id: 'collect', key: 'collect' },
  { id: 'use', key: 'use' },
  { id: 'share', key: 'share' },
  { id: 'access', key: 'access' },
  { id: 'security', key: 'security' },
  { id: 'retention', key: 'retention' },
  { id: 'rights', key: 'rights' },
  { id: 'delete-account', key: 'deleteAccount' },
  { id: 'children', key: 'children' },
  { id: 'changes', key: 'changes' },
  { id: 'contact', key: 'contact' },
]

const withEmail = (text) => text.replace('{email}', CONTACT)

/** Public privacy policy (also used as the Play Store privacy-policy and data-deletion URL). */
export default function PrivacyPage() {
  const { t, lang, intl } = useI18n()
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={goBack} aria-label={t('privacy.back')}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-main)] hover:bg-[var(--border-subtle)] cursor-pointer">
            <ArrowLeft size={19} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/maskable-192.png" alt="" className="h-7 w-7 rounded-full" />
            <span className="font-serif-luxury text-[16px] font-semibold">ArthaLedger</span>
          </Link>
          <a href={`mailto:${CONTACT}`} className="ml-auto hidden items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] sm:inline-flex">
            <Mail size={14} /> {t('privacy.contact')}
          </a>
        </div>
      </header>

      <main className="selectable mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-[var(--border-subtle)] py-10 sm:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-primary)]">{t('privacy.eyebrow')}</p>
          <h1 className="font-serif-luxury mt-3 text-[2.2rem] font-semibold leading-tight tracking-tight sm:text-[3rem]">{t('privacy.title')}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">
            {t('privacy.intro')}
          </p>
          <p className="mt-4 text-[13px] text-[var(--text-subtle)]">
            {t('privacy.effective', { date: EFFECTIVE.toLocaleDateString(intl, { day: 'numeric', month: 'long', year: 'numeric' }) })}
          </p>
          {lang !== 'en' && <p className="mt-2 text-[13px] text-[var(--text-subtle)]">{t('privacy.translationNote')}</p>}
        </motion.div>

        <section aria-label={t('privacy.glanceTitle')} className="py-8">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">{t('privacy.glanceTitle')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {GLANCE.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-3.5 sm:p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold-light)] text-[var(--gold-primary)]"><g.Icon size={17} /></span>
                <p className="mt-3 text-[14px] font-semibold">{t(`privacy.glance.${g.id}.title`)}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{t(`privacy.glance.${g.id}.text`)}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid gap-10 border-t border-[var(--border-subtle)] pt-10 lg:grid-cols-[220px_1fr] lg:gap-14">
          <nav aria-label={t('privacy.contents')} className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">{t('privacy.contents')}</p>
            <ol className="mt-3 grid gap-0.5 text-[13.5px] sm:grid-cols-2 lg:grid-cols-1">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)]">
                    <span className="w-5 tabular-nums text-[var(--text-subtle)]">{i + 1}.</span>{t(`privacy.sections.${s.key}.title`)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 space-y-10">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-20">
                <h2 className="flex items-baseline gap-3 text-[19px] font-semibold tracking-tight sm:text-[21px]">
                  <span className="font-serif-luxury text-[var(--gold-primary)]">{String(i + 1).padStart(2, '0')}</span>
                  {t(`privacy.sections.${s.key}.title`)}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-[var(--text-muted)]">
                  {t(`privacy.sections.${s.key}.blocks`).map((b, j) => Array.isArray(b) ? (
                    <ul key={j} className="space-y-2">
                      {b.map((li, k) => (
                        <li key={k} className="flex gap-3">
                          <span className="mt-[11px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--gold-primary)]" />
                          <span>{withEmail(li)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p key={j}>{withEmail(b)}</p>)}
                </div>
              </section>
            ))}

            <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6">
              <p className="text-[15px] font-semibold">{t('privacy.help.title')}</p>
              <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t('privacy.help.text')}</p>
              <a href={`mailto:${CONTACT}?subject=Privacy%20question`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--gold-primary)] px-5 text-[14px] font-semibold text-white hover:bg-[var(--gold-hover)]">
                <Mail size={15} /> {CONTACT}
              </a>
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-[13px] text-[var(--text-subtle)] sm:flex-row sm:justify-between sm:px-6">
          <span>{t('privacy.footer.rights', { year: EFFECTIVE.getFullYear() })}</span>
          <Link to="/" className="hover:text-[var(--text-main)]">{t('privacy.footer.backHome')}</Link>
        </div>
      </footer>
    </div>
  )
}
