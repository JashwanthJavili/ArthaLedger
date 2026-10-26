import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Check, WifiOff, ShieldCheck,
  Download, Landmark, Star, Mail,
  Handshake, Quote, Sparkles, Gift,
} from 'lucide-react'
import { forceLightTheme, restoreTheme } from '../lib/theme'
import { api } from '../lib/api'
import SiteHeader from '../components/marketing/SiteHeader'
import SiteFooter from '../components/marketing/SiteFooter'
import BeforeAfter from '../components/marketing/BeforeAfter'
import FeatureBento from '../components/marketing/FeatureBento'
import HowItWorksTour from '../components/marketing/HowItWorksTour'
import HeroPhoto from '../components/marketing/HeroPhoto'
import ScrollCue from '../components/marketing/ScrollCue'
import WhatIsArtha from '../components/marketing/WhatIsArtha'
import AudienceBand from '../components/marketing/AudienceBand'
import { Counter, Donut, InOutBars, Sparkline } from '../components/marketing/Charts'
import { Reveal, Eyebrow, SectionTitle, PrimaryLink, GhostLink, FaqItem } from '../components/marketing/ui'
import { EASE, APK_URL, CONTACT, GOLD_TINT, GOLD_SOFT, BAND_BG, goldBtn, card } from '../components/marketing/constants'
import { useI18n } from '../i18n/core'
import { Trans } from '../i18n/Trans'

/* ─────────────────────────── shared bits ─────────────────────────── */


/* ─────────────────────────── phone mockup ─────────────────────────── */

/* ─────────────────────────── hero ─────────────────────────── */

function Hero() {
  const { t, lang } = useI18n()
  const reduce = useReducedMotion()
  const fade = (d) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: d, ease: EASE },
  })
  return (
    <section className="relative -mt-16 pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl lg:left-[72%]" style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, transparent 65%)` }} />
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(var(--border-card) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, black, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)' }} />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl content-center items-center gap-8 px-4 pt-6 pb-10 sm:gap-12 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8 lg:py-10">
        <div className="text-center lg:text-left">
          <motion.div {...fade(0)}><Eyebrow>{t('landing.hero.eyebrow')}</Eyebrow></motion.div>

          {/* Tamil words run wide, so the heading is a size smaller on bigger screens */}
          <motion.h1 {...fade(0.08)}
            className={`font-serif-luxury mt-4 text-[2.15rem] sm:mt-5 min-[380px]:text-[2.5rem] leading-[1.06] font-semibold tracking-tight ${lang === 'ta' ? 'sm:text-5xl lg:text-[3.3rem]' : 'sm:text-6xl lg:text-[4.2rem]'}`}
            style={{ color: 'var(--text-main)' }}>
            <Trans k="landing.hero.title" components={{ br: <br className="hidden min-[380px]:block" />, em: <em className="italic" style={{ color: 'var(--gold-primary)' }} /> }} />
          </motion.h1>

          <motion.p {...fade(0.16)} className="mx-auto mt-4 max-w-lg text-[15.5px] sm:mt-5 leading-relaxed sm:text-lg lg:mx-0" style={{ color: 'var(--text-muted)' }}>
            {t('landing.hero.sub')}
          </motion.p>

          <motion.div {...fade(0.24)} className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:justify-center sm:gap-3 lg:justify-start">
            <PrimaryLink to="/register" className="px-3 sm:px-6" iconClassName="hidden sm:block">
              <span className="whitespace-nowrap sm:hidden">{t('landing.hero.startShort')}</span><span className="hidden whitespace-nowrap sm:inline">{t('landing.hero.start')}</span>
            </PrimaryLink>
            <GhostLink href={APK_URL} download icon={Download} className="px-3 sm:px-6">
              <span className="sm:hidden">{t('common.androidApp')}</span><span className="hidden whitespace-nowrap sm:inline">{t('common.downloadAndroid')}</span>
            </GhostLink>
          </motion.div>

          <motion.ul {...fade(0.32)} className="mt-5 flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-[12px] sm:mt-7 sm:gap-x-5 sm:gap-y-2 sm:text-[13px] lg:justify-start" style={{ color: 'var(--text-subtle)' }}>
            <li className="flex items-center gap-1.5"><Landmark size={14} style={{ color: 'var(--gold-primary)' }} /> {t('landing.hero.noBank')}</li>
            <li className="flex items-center gap-1.5"><ShieldCheck size={14} style={{ color: 'var(--gold-primary)' }} /> {t('landing.hero.private')}</li>
            <li className="flex items-center gap-1.5"><WifiOff size={14} style={{ color: 'var(--gold-primary)' }} /> {t('landing.hero.offline')}</li>
          </motion.ul>
        </div>

        <HeroPhoto />
      </div>
      <ScrollCue target="learn" />
    </section>
  )
}

/* ─────────────────────────── what is it ─────────────────────────── */

function WhatIsIt() {
  return (
    <section id="learn" className="scroll-mt-16 px-4 pt-16 pb-8 sm:px-6 sm:pt-24 sm:pb-10">
      <div className="mx-auto max-w-6xl">
        <WhatIsArtha />
      </div>
    </section>
  )
}

/* ─────────────────────────── who it's for ─────────────────────────── */

/* a section that fills one screen below the header, content centred */
const SCREEN = 'flex min-h-[calc(100svh-4rem)] flex-col justify-center'

function WhoItsFor() {
  return (
    <section id="who" className={`${SCREEN} scroll-mt-16 px-4 py-3 sm:px-6 sm:py-8`}>
      <div className="mx-auto w-full max-w-6xl"><AudienceBand /></div>
    </section>
  )
}

/* ─────────────────────────── how it works ─────────────────────────── */

function HowItWorks() {
  const { t } = useI18n()
  return (
    <section id="how" className={`${SCREEN} scroll-mt-16 overflow-hidden px-4 py-4 sm:px-6 sm:py-6`} style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={t('landing.how.eyebrow')} title={t('landing.how.title')} sub={t('landing.how.sub')} subClassName="hidden sm:block" />
        <HowItWorksTour />
      </div>
    </section>
  )
}

/* ─────────────────────────── features ─────────────────────────── */

function Features() {
  const { t } = useI18n()
  return (
    <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={t('landing.features.eyebrow')} title={t('landing.features.title')} />
        <FeatureBento />
      </div>
    </section>
  )
}

/* ─────────────────────────── before / after ─────────────────────────── */

function Transformation() {
  const { t, lang } = useI18n()
  // [{ from, to }], see landing.sorted.shifts
  const shifts = t('landing.sorted.shifts')
  return (
    <section id="sorted" className={`${SCREEN} scroll-mt-16 px-4 py-3 sm:px-6 sm:py-10`}>
      <div className="mx-auto w-full max-w-6xl">
        <SectionTitle eyebrow={t('landing.sorted.eyebrow')} title={t('landing.sorted.title')}
          sub={t('landing.sorted.sub')}
          // Telugu and Tamil take two lines for the heading on phones; drop the sub there so it fits one screen
          subClassName={lang !== 'en' ? 'hidden sm:block' : ''} />
        <Reveal className="mt-6 sm:mt-8"><BeforeAfter /></Reveal>
        <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 md:grid-cols-3">
          {shifts.map(({ from, to }, i) => (
            <Reveal key={i} delay={i * 0.08} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 sm:py-3.5" style={card}>
              <div className="min-w-0 flex-1">
                <p className="hidden text-[12.5px] line-through decoration-rose-400/70 sm:block" style={{ color: 'var(--text-subtle)' }}>{from}</p>
                <p className="text-[14.5px] font-semibold sm:mt-0.5" style={{ color: 'var(--text-main)' }}>{to}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600"><Check size={16} /></span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── insights (charts) ─────────────────────────── */

// May to October; month names come from landing.months, labels from landing.cats
const MONTHS = [
  { in: 62000, out: 48300 },
  { in: 64500, out: 51200 },
  { in: 62000, out: 44800 },
  { in: 68000, out: 46900 },
  { in: 66500, out: 43100 },
  { in: 70500, out: 41260 },
]
const SPEND = [
  { id: 'rent', value: 15000, color: '#C5A059' },
  { id: 'groceries', value: 8400, color: '#059669' },
  { id: 'bills', value: 5260, color: '#2563EB' },
  { id: 'travel', value: 4600, color: '#7C3AED' },
  { id: 'eatingOut', value: 3800, color: '#E11D48' },
  { id: 'other', value: 4200, color: '#94A3B8' },
]

function Panel({ title, sub, children, className = '' }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${className}`} style={card}>
      {title && (
        <div className="mb-4">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</p>
          {sub && <p className="text-[12px]" style={{ color: 'var(--text-subtle)' }}>{sub}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function Kpi({ label, value, tone, color, points, delay }) {
  return (
    <Reveal delay={delay} y={12} className="flex items-end justify-between gap-3 rounded-2xl p-4 sm:p-5" style={card}>
      <div className="min-w-0">
        <p className="text-[12px] font-medium" style={{ color: 'var(--text-subtle)' }}>{label}</p>
        <Counter value={value} className={`font-serif-luxury mt-1 block text-[1.6rem] font-semibold leading-none ${tone}`} />
      </div>
      <Sparkline points={points} width={84} height={30} color={color} />
    </Reveal>
  )
}

function Insights() {
  const { t } = useI18n()
  const long = t('landing.months.long')
  const short = t('landing.months.short')
  const months = MONTHS.map((d, i) => ({ ...d, m: long[i], s: short[i] }))
  const spend = SPEND.map(d => ({ ...d, label: t(`landing.cats.${d.id}`) }))
  return (
    <section id="insights" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={t('landing.insights.eyebrow')} title={t('landing.insights.title')}
          sub={t('landing.insights.sub')} />

        <Reveal className="mt-12 rounded-[2rem] p-2.5 sm:p-4" style={{ background: 'linear-gradient(165deg, color-mix(in srgb, var(--gold-primary) 16%, var(--bg-page)), var(--bg-page) 60%)', border: '1px solid var(--border-card)', boxShadow: '0 50px 100px -60px rgba(43,38,32,0.55)' }}>
          <div className="flex items-center gap-2 px-2 pb-3 pt-1 sm:px-1">
            <span className="flex gap-1.5" aria-hidden="true">{['#F87171', '#FBBF24', '#34D399'].map(c => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span>
            <span className="ml-2 text-[12.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{t('landing.insights.window')}</span>
            <span className="ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ background: GOLD_TINT, color: 'var(--text-muted)' }}>{t('landing.insights.sample')}</span>
          </div>

          <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-3">
            <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3 lg:col-span-3">
              <Kpi delay={0} label={t('common.moneyIn')} value={70500} tone="text-emerald-600" color="#059669" points={MONTHS.map(d => d.in)} />
              <Kpi delay={0.06} label={t('common.moneyOut')} value={41260} tone="text-rose-600" color="#E11D48" points={MONTHS.map(d => d.out)} />
              <Kpi delay={0.12} label={t('landing.insights.left')} value={29240} tone="text-[var(--text-main)]" color="var(--gold-primary)" points={MONTHS.map(d => d.in - d.out)} />
            </div>

            <Panel title={t('landing.insights.bars')} sub={t('landing.insights.barsSub')} className="lg:col-span-2">
              <InOutBars data={months} height={150} />
            </Panel>

            <Panel title={t('landing.insights.donut')} sub={t('landing.insights.donutSub')}>
              <Donut data={spend} size={150} thickness={22} />
            </Panel>

          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── pricing teaser (full page at /pricing) ─────────────────────────── */

function PricingTeaser() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="relative isolate mx-auto grid max-w-5xl items-center gap-8 overflow-hidden rounded-[2rem] p-7 sm:p-10 md:grid-cols-[1.35fr_1fr]" style={card}>
        <div className="pointer-events-none absolute -left-20 -top-24 -z-10 h-64 w-64 rounded-full blur-3xl" style={{ background: GOLD_SOFT }} aria-hidden="true" />
        <div>
          <Eyebrow>{t('landing.pricingTeaser.eyebrow')}</Eyebrow>
          <h2 className="font-serif-luxury mt-3 text-[1.8rem] font-semibold leading-tight [text-wrap:balance] sm:text-[2.3rem]" style={{ color: 'var(--text-main)' }}>{t('landing.pricingTeaser.title')}</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('landing.pricingTeaser.text')}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink to="/register">{t('site.cta.claimSpot')}</PrimaryLink>
            <GhostLink to="/pricing">{t('landing.pricingTeaser.see')}</GhostLink>
          </div>
        </div>
        <div className="relative mx-auto flex h-48 w-full max-w-[240px] items-center justify-center">
          <motion.div className="absolute inset-0 rounded-full" style={{ border: '1.5px dashed var(--border-card)' }}
            animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} aria-hidden="true" />
          <div className="text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-subtle)' }}>{t('landing.pricingTeaser.early')}</p>
            <p className="font-serif-luxury text-[3.6rem] font-semibold leading-none tracking-tight" style={{ color: 'var(--text-main)' }}>{t('landing.pricingTeaser.free')}</p>
            <p className="mt-1 text-[12.5px] font-semibold" style={{ color: 'var(--gold-primary)' }}>{t('landing.pricingTeaser.included')}</p>
          </div>
          <motion.span className="absolute right-0 top-4 flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg" style={goldBtn} aria-hidden="true"
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <Gift size={19} />
          </motion.span>
          <motion.span className="absolute bottom-5 left-0 flex h-9 w-9 items-center justify-center rounded-xl shadow-md" style={{ ...card, color: 'var(--gold-primary)' }} aria-hidden="true"
            animate={reduce ? undefined : { y: [0, 5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
            <Sparkles size={16} />
          </motion.span>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── testimonials (real, approved feedback) ─────────────────────────── */

function Testimonials() {
  const { t } = useI18n()
  const [items, setItems] = useState([])
  useEffect(() => {
    let alive = true
    api('/v1/testimonials', { signedIn: false, timeoutMs: 20000 })
      .then(d => { if (alive) setItems(d.items || []) })
      .catch(() => { /* section stays hidden */ })
    return () => { alive = false }
  }, [])

  if (!items.length) return null
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={t('landing.testimonials.eyebrow')} title={t('landing.testimonials.title')} sub={t('landing.testimonials.sub')} />
        <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 0.07} className="mb-4 break-inside-avoid rounded-3xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              {item.rating ? (
                <div className="flex gap-0.5" aria-label={t('landing.testimonials.rating', { rating: item.rating })}>
                  {[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} className={n <= item.rating ? 'fill-[var(--gold-primary)] text-[var(--gold-primary)]' : 'text-[var(--border-card)]'} />)}
                </div>
              ) : null}
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--text-main)' }}>“{item.message}”</p>
              <p className="mt-4 text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>{item.name}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── founder ─────────────────────────── */

function Founder() {
  const { t } = useI18n()
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-6 py-10 sm:px-12 sm:py-14" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <Quote size={64} className="pointer-events-none absolute -top-2 right-6 opacity-[0.08]" style={{ color: 'var(--gold-primary)' }} aria-hidden="true" />
        <Eyebrow>{t('landing.founder.eyebrow')}</Eyebrow>
        <div className="font-serif-luxury mt-5 space-y-4 text-[1.1rem] leading-[1.7] sm:text-[1.3rem]" style={{ color: 'var(--text-main)' }}>
          {t('landing.founder.paragraphs').map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-8 flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full font-serif-luxury text-[17px] font-semibold" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>JJ</span>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>Javili Jashwanth</p>
            <p className="text-[13px]" style={{ color: 'var(--text-subtle)' }}>{t('landing.founder.role')}</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── FAQ ─────────────────────────── */

function Faq() {
  const { t } = useI18n()
  const [open, setOpen] = useState(-1)
  // [{ q, a }]
  const faq = t('landing.faq.items')
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow={t('landing.faq.eyebrow')} title={t('landing.faq.title')} />
        <Reveal className="mt-10 overflow-hidden rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: '0 24px 60px -40px rgba(0,0,0,0.25)' }}>
          {faq.map(({ q, a }, i) => <FaqItem key={i} id={`faq-${i}`} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </Reveal>
        <Reveal delay={0.05} className="mt-6 flex flex-col items-center gap-3 rounded-3xl px-6 py-6 text-center sm:flex-row sm:text-left" style={{ border: '1px dashed var(--border-card)' }}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Mail size={19} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>{t('site.contact.title')}</p>
            <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{t('site.contact.text')}</p>
          </div>
          <a href={`mailto:${CONTACT}`} className="inline-flex min-h-11 items-center rounded-full px-5 text-[14px] font-semibold" style={goldBtn}>{t('site.contact.button')}</a>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── collaborate + final CTA ─────────────────────────── */

function Collaborate() {
  const { t } = useI18n()
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto flex max-w-5xl flex-col items-start gap-6 rounded-[2rem] p-7 sm:flex-row sm:items-center sm:p-10" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Handshake size={26} /></span>
        <div className="flex-1">
          <h2 className="font-serif-luxury text-[1.6rem] font-semibold leading-tight sm:text-[1.9rem]" style={{ color: 'var(--text-main)' }}>{t('landing.collaborate.title')}</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('landing.collaborate.text')}
          </p>
        </div>
        <a href={`mailto:${CONTACT}?subject=Collaboration%20with%20ArthaLedger`}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold sm:w-auto" style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-page)' }}>
          <Mail size={17} /> {t('landing.collaborate.write')}
        </a>
      </Reveal>
    </section>
  )
}

function FinalCta() {
  const { t } = useI18n()
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="relative isolate mx-auto max-w-3xl overflow-hidden rounded-[2rem] px-6 pt-12 pb-10 text-center sm:px-12 sm:pt-14 sm:pb-12"
        style={{ background: 'linear-gradient(160deg, #B42334 0%, #8E1A2B 52%, #5C1020 100%)', boxShadow: '0 40px 90px -50px rgba(92,16,32,0.9)' }}>
        {/* warm glows and a faint pattern */}
        <div className="pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(233,196,106,0.30)' }} aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(255,170,120,0.22)' }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(rgba(255,230,200,0.22) 1px, transparent 1px)', backgroundSize: '18px 18px', maskImage: 'linear-gradient(to bottom, black, transparent 60%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 60%)' }} />

        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5D79A]">{t('landing.cta.eyebrow')}</p>
        <h2 className="font-serif-luxury mx-auto mt-3 max-w-xl text-[1.9rem] leading-tight font-semibold tracking-tight text-[#FFF4E6] [text-wrap:balance] sm:text-[2.6rem]">
          {t('landing.cta.title')}
        </h2>

        {/* her photo on a soft glow, fading into the card */}
        <div className="relative mx-auto mt-6 w-[72%] max-w-[300px] sm:mt-8">
          <div className="pointer-events-none absolute left-1/2 top-[10%] aspect-square w-[105%] -translate-x-1/2 rounded-full" aria-hidden="true"
            style={{ background: 'radial-gradient(circle, rgba(245,215,154,0.55) 0%, rgba(245,215,154,0.16) 45%, transparent 70%)' }} />
          <img src="/hero/shopper-600.webp" srcSet="/hero/shopper-600.webp 600w, /hero/shopper-1145.webp 1145w" sizes="300px"
            width="1145" height="1374" alt={t('landing.cta.imgAlt')} loading="lazy" draggable="false"
            className="relative block h-auto w-full select-none"
            style={{ maskImage: 'linear-gradient(to bottom, black 72%, transparent 98%)', WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 98%)' }} />
        </div>

        <div className="relative mx-auto mt-1 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <PrimaryLink to="/register">{t('site.cta.createFree')}</PrimaryLink>
          <a href={APK_URL} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-[#FFF4E6] transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,244,230,0.35)', background: 'rgba(255,255,255,0.06)' }}>
            <Download size={17} /> {t('common.downloadAndroid')}
          </a>
        </div>
        <p className="mt-4 text-[13px] text-[#FFF4E6]/70">{t('landing.cta.note')}</p>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  const { hash } = useLocation()

  // The landing page is always shown in light mode
  useEffect(() => {
    forceLightTheme()
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'smooth'
    return () => { restoreTheme(); html.style.scrollBehavior = prev }
  }, [])

  // Always open at the top: no restored scroll position on reload
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    if (!window.location.hash) window.scrollTo(0, 0)
    return () => { window.history.scrollRestoration = prev }
  }, [])

  // Arriving from another page with a section link, such as /#faq: scroll
  // there, then drop the #faq so a reload starts at the top again
  useEffect(() => {
    if (!hash) return undefined
    const t = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    }, 80)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
      <SiteHeader />
      <main>
        <Hero />
        <WhatIsIt />
        <WhoItsFor />
        <Transformation />
        <HowItWorks />
        <Insights />
        <Features />
        <PricingTeaser />
        <Testimonials />
        <Founder />
        <Faq />
        <Collaborate />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
