import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  Check, Minus, Gift, Sparkles, CalendarClock, BellRing, Download, Mail, FolderOpen, BookOpen, Tags,
  Target, PieChart, Users, Lock, Bell, FileSpreadsheet, WifiOff, ArrowLeftRight, CloudUpload, UserPlus, Compass,
} from 'lucide-react'
import SiteHeader from '../components/marketing/SiteHeader'
import SiteFooter from '../components/marketing/SiteFooter'
import { Reveal, SectionTitle, PrimaryLink, FaqItem } from '../components/marketing/ui'
import { EASE, APK_URL, CONTACT, GOLD_TINT, GOLD_SOFT, BAND_BG, goldBtn, card } from '../components/marketing/constants'
import { forceLightTheme, restoreTheme } from '../lib/theme'
import { useI18n } from '../i18n/core'
import { Trans } from '../i18n/Trans'


// [icon, pricing.included.items.<id>]
const INCLUDED = [
  [FolderOpen, 'projects'], [BookOpen, 'books'], [Tags, 'categories'], [Target, 'budgets'],
  [PieChart, 'charts'], [Users, 'groups'], [Lock, 'pin'], [Bell, 'reminders'],
  [FileSpreadsheet, 'reports'], [WifiOff, 'offline'], [ArrowLeftRight, 'transfers'], [CloudUpload, 'sync'],
]

/* ─────────────────────────── hero + plans ─────────────────────────── */

function Spots() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <div className="mt-6" aria-label={t('pricing.spots')}>
      <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[5px]" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => (
          <motion.span key={i} className="aspect-square rounded-full" style={{ background: '#D4B26E' }}
            initial={{ opacity: 0.15, scale: 0.6 }} whileInView={{ opacity: [0.15, 1, 0.55], scale: 1 }} viewport={{ once: true }}
            transition={{ duration: reduce ? 0.2 : 0.9, delay: reduce ? 0 : 0.4 + i * 0.025, ease: EASE }} />
        ))}
      </div>
      <p className="mt-2.5 text-[12px] font-medium text-[#F6EFE2]/60">{t('pricing.spots')}</p>
    </div>
  )
}

function FeatureList({ dark }) {
  const { t } = useI18n()
  return (
    <ul className="space-y-2.5">
      {t('pricing.features').map(f => (
        <li key={f} className="flex items-start gap-2.5 text-[14px]">
          <Check size={16} className="mt-0.5 shrink-0" style={{ color: dark ? '#D4B26E' : 'var(--gold-primary)' }} />
          <span style={{ opacity: dark ? 0.9 : 1 }}>{f}</span>
        </li>
      ))}
    </ul>
  )
}

function Plans() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const fade = (d) => ({ initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: EASE } })

  return (
    <section className="relative -mt-16 pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-200px] h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, transparent 65%)` }} />
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(var(--border-card) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, black, transparent 60%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 60%)' }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-16 sm:pb-24">
        <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ ...card, color: 'var(--text-main)' }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t('pricing.hero.badge')}
        </motion.div>
        <motion.h1 {...fade(0.08)} className="font-serif-luxury mx-auto mt-5 max-w-3xl text-[2.3rem] leading-[1.06] font-semibold tracking-tight [text-wrap:balance] sm:text-[3.6rem]" style={{ color: 'var(--text-main)' }}>
          <Trans k="pricing.hero.title" components={{ em: <em className="italic" style={{ color: 'var(--gold-primary)' }} /> }} />
        </motion.h1>
        <motion.p {...fade(0.16)} className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed sm:text-lg" style={{ color: 'var(--text-muted)' }}>
          {t('pricing.early')}
        </motion.p>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left md:grid-cols-2">
          {/* Early access */}
          <motion.div {...fade(0.24)} className="relative isolate flex flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-8"
            style={{ background: 'linear-gradient(160deg, #2B2620, #15120E)', color: '#F6EFE2', boxShadow: '0 40px 80px -40px rgba(43,38,32,0.85)' }}>
            <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full blur-3xl" style={{ background: 'rgba(212,178,110,0.35)' }} />
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#D4B26E]">{t('pricing.earlyPlan.label')}</p>
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: '#D4B26E', color: '#1F1A14' }}><Gift size={12} /> {t('pricing.earlyPlan.available')}</span>
            </div>
            <p className="font-serif-luxury mt-5 text-[3.2rem] font-semibold leading-none tracking-tight">{t('pricing.earlyPlan.price')}</p>
            <p className="mt-2 text-[14px] leading-relaxed opacity-75">{t('pricing.earlyPlan.note')}</p>
            <Spots />
            <div className="mt-6 flex-1"><FeatureList dark /></div>
            <PrimaryLink to="/register" className="mt-8 w-full">{t('site.cta.claimSpot')}</PrimaryLink>
          </motion.div>

          {/* Paid plans, not priced yet */}
          <motion.div {...fade(0.32)} className="relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-8" style={{ ...card, color: 'var(--text-main)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--gold-primary)' }}>{t('pricing.paidPlan.label')}</p>
              <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: GOLD_TINT, color: 'var(--text-main)' }}>{t('pricing.paidPlan.soon')}</span>
            </div>
            <p className="font-serif-luxury mt-5 text-[2.6rem] font-semibold leading-none tracking-tight">{t('pricing.paidPlan.soon')}</p>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t('pricing.paidPlan.note')}</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {[[CalendarClock, t('pricing.paidPlan.monthly'), t('pricing.paidPlan.monthlyLine')], [Sparkles, t('pricing.paidPlan.yearly'), t('pricing.paidPlan.yearlyLine')]].map(([I, name, l], i) => (
                <motion.div key={i} className="rounded-2xl px-3.5 py-3" style={{ background: BAND_BG, border: '1px solid var(--border-subtle)' }}
                  animate={reduce ? undefined : { y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}>
                  <I size={16} style={{ color: 'var(--gold-primary)' }} />
                  <p className="mt-2 text-[13.5px] font-semibold">{name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-subtle)' }}>{l}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex-1"><FeatureList /></div>
            <span className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold"
              style={{ border: '1px dashed var(--border-card)', color: 'var(--text-subtle)' }}><BellRing size={16} /> {t('pricing.paidPlan.notify')}</span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── what's included + compare ─────────────────────────── */

function Included() {
  const { t } = useI18n()
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={t('pricing.included.eyebrow')} title={t('pricing.included.title')} sub={t('pricing.included.sub')} />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INCLUDED.map(([Icon, id], i) => (
            <Reveal key={id} delay={(i % 4) * 0.05} y={14} className="group flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-[var(--bg-card-hover)]" style={card}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Icon size={18} /></span>
              <span className="text-[13.5px] font-semibold leading-snug sm:text-[14px]" style={{ color: 'var(--text-main)' }}>{t(`pricing.included.items.${id}`)}</span>
            </Reveal>
          ))}
        </div>

        <Compare />
      </div>
    </section>
  )
}

// [pricing.compare.rows.<id>, early, monthly, yearly]; strings are pricing.compare.<key>
const ROWS = [
  ['price', 'free', 'comingSoon', 'comingSoon'],
  ['every', true, true, true],
  ['unlimited', true, true, true],
  ['sync', true, true, true],
  ['reminders', true, true, true],
  ['available', 'now', 'soon', 'soon'],
]

function Cell({ v, strong }) {
  const { t } = useI18n()
  if (v === true) return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600"><Check size={15} /><span className="sr-only">{t('common.yes')}</span></span>
  if (v === false) return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--border-subtle)', color: 'var(--text-subtle)' }}><Minus size={15} /><span className="sr-only">{t('common.no')}</span></span>
  return <span className={`text-[12.5px] leading-tight sm:text-[13.5px] ${strong ? 'font-semibold' : ''}`} style={{ color: 'var(--text-main)' }}>{t(`pricing.compare.${v}`)}</span>
}

function Compare() {
  const { t } = useI18n()
  return (
    <Reveal className="mt-14 overflow-hidden rounded-[1.75rem]" style={{ ...card, boxShadow: '0 30px 70px -50px rgba(0,0,0,0.35)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{t('pricing.compare.caption')}</caption>
          <thead>
            <tr style={{ background: BAND_BG }}>
              <th scope="col" className="px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] sm:px-7 sm:text-[12px]" style={{ color: 'var(--text-subtle)' }}>{t('pricing.compare.head')}</th>
              {[t('pricing.compare.early'), t('pricing.compare.monthly'), t('pricing.compare.yearly')].map((p, i) => (
                <th key={p} scope="col" className="px-1.5 py-4 text-center text-[12.5px] font-semibold leading-tight sm:px-3 sm:text-[14px]" style={{ color: i === 0 ? 'var(--gold-primary)' : 'var(--text-main)' }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([id, ...vals], r) => (
              <tr key={id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <th scope="row" className="px-3 py-3.5 text-[13px] font-medium leading-snug sm:px-7 sm:text-[14px]" style={{ color: 'var(--text-muted)' }}>{t(`pricing.compare.rows.${id}`)}</th>
                {vals.map((v, i) => (
                  <td key={i} className="px-1.5 py-3.5 text-center sm:px-3" style={i === 0 ? { background: 'color-mix(in srgb, var(--gold-primary) 6%, transparent)' } : undefined}>
                    <Cell v={v} strong={r === 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  )
}

/* ─────────────────────────── how early access works ─────────────────────────── */

// icons for pricing.timeline.items, in order
const TIMELINE = [UserPlus, Compass, BellRing, Download]

function Timeline() {
  const { t } = useI18n()
  const items = t('pricing.timeline.items')
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={t('pricing.timeline.eyebrow')} title={t('pricing.timeline.title')} sub={t('pricing.timeline.sub')} />
        <div ref={ref} className="relative mt-14">
          {/* connecting line, drawn as you scroll in */}
          <div className="absolute left-[22px] top-0 bottom-0 w-[2px] lg:left-0 lg:right-0 lg:top-[22px] lg:bottom-auto lg:h-[2px] lg:w-auto" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
            <motion.div className="h-full w-full origin-top lg:origin-left" style={{ background: 'linear-gradient(90deg, var(--gold-hover), var(--gold-primary))' }}
              initial={{ scaleY: 0, scaleX: 0 }} animate={inView ? { scaleY: 1, scaleX: 1 } : undefined} transition={{ duration: 1.6, ease: EASE }} />
          </div>
          <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
            {TIMELINE.map((Icon, i) => (
              <motion.li key={i} className="flex gap-4 lg:block"
                initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.6, delay: 0.2 + i * 0.25, ease: EASE }}>
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ ...goldBtn, boxShadow: '0 0 0 6px var(--bg-page)' }}><Icon size={19} /></span>
                <div className="lg:mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>{t('pricing.timeline.step', { n: i + 1 })}</p>
                  <h3 className="mt-1 text-[17px] font-semibold" style={{ color: 'var(--text-main)' }}>{items[i].title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{items[i].text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── pricing FAQ ─────────────────────────── */

function PricingFaq() {
  const { t } = useI18n()
  const [open, setOpen] = useState(-1)
  // [{ q, a }]
  const faq = t('pricing.faq.items')
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow={t('pricing.faq.eyebrow')} title={t('pricing.faq.title')} />
        <Reveal className="mt-10 overflow-hidden rounded-3xl" style={{ ...card, boxShadow: '0 24px 60px -40px rgba(0,0,0,0.25)' }}>
          {faq.map(({ q, a }, i) => <FaqItem key={i} id={`pfaq-${i}`} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </Reveal>
        <Reveal delay={0.05} className="mt-6 flex flex-col items-center gap-3 rounded-3xl px-6 py-6 text-center sm:flex-row sm:text-left" style={{ border: '1px dashed var(--border-card)' }}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Mail size={19} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>{t('site.contact.title')}</p>
            <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{t('site.contact.text')}</p>
          </div>
          <a href={`mailto:${CONTACT}?subject=ArthaLedger%20pricing`} className="inline-flex min-h-11 items-center rounded-full px-5 text-[14px] font-semibold" style={goldBtn}>{t('site.contact.button')}</a>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCta() {
  const { t } = useI18n()
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16" style={{ background: 'linear-gradient(140deg, #2B2620, #15120E)' }}>
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(212,178,110,0.35)' }} aria-hidden="true" />
        <Sparkles size={28} className="mx-auto text-[#D4B26E]" />
        <h2 className="font-serif-luxury mx-auto mt-5 max-w-xl text-[1.9rem] leading-tight font-semibold tracking-tight text-[#F6EFE2] [text-wrap:balance] sm:text-[2.6rem]">{t('pricing.cta.title')}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-[#F6EFE2]/70">{t('pricing.cta.text')}</p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <PrimaryLink to="/register">{t('site.cta.createFree')}</PrimaryLink>
          <a href={APK_URL} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-[#F6EFE2] transition-colors hover:bg-white/10" style={{ border: '1px solid rgba(246,239,226,0.25)' }}>
            <Download size={17} /> {t('common.downloadAndroid')}
          </a>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function PricingPage() {
  const { t } = useI18n()
  useEffect(() => {
    forceLightTheme()
    window.scrollTo(0, 0)
    return () => { restoreTheme() }
  }, [])

  // The tab title follows the language
  const docTitle = t('pricing.docTitle')
  useEffect(() => {
    const prevTitle = document.title
    document.title = docTitle
    return () => { document.title = prevTitle }
  }, [docTitle])

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
      <SiteHeader />
      <main>
        <Plans />
        <Included />
        <Timeline />
        <PricingFaq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
