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


const EARLY = 'Early access is free for our first 50 users. Everyone else can also try every feature free until paid plans launch.'

const INCLUDED = [
  [FolderOpen, 'Unlimited projects'], [BookOpen, 'Unlimited books'], [Tags, 'Categories'], [Target, 'Monthly budgets'],
  [PieChart, 'Charts and summaries'], [Users, 'Groups'], [Lock, 'PIN lock'], [Bell, 'Daily reminders'],
  [FileSpreadsheet, 'PDF and Excel reports'], [WifiOff, 'Works offline'], [ArrowLeftRight, 'Transfers between books'], [CloudUpload, 'Sync across devices'],
]

/* ─────────────────────────── hero + plans ─────────────────────────── */

function Spots() {
  const reduce = useReducedMotion()
  return (
    <div className="mt-6" aria-label="50 early access spots">
      <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[5px]" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => (
          <motion.span key={i} className="aspect-square rounded-full" style={{ background: '#D4B26E' }}
            initial={{ opacity: 0.15, scale: 0.6 }} whileInView={{ opacity: [0.15, 1, 0.55], scale: 1 }} viewport={{ once: true }}
            transition={{ duration: reduce ? 0.2 : 0.9, delay: reduce ? 0 : 0.4 + i * 0.025, ease: EASE }} />
        ))}
      </div>
      <p className="mt-2.5 text-[12px] font-medium text-[#F6EFE2]/60">50 early access spots</p>
    </div>
  )
}

function FeatureList({ dark }) {
  return (
    <ul className="space-y-2.5">
      {['Every feature included', 'Unlimited projects and books', 'Budgets, charts and reports', 'Sync across your devices'].map(f => (
        <li key={f} className="flex items-start gap-2.5 text-[14px]">
          <Check size={16} className="mt-0.5 shrink-0" style={{ color: dark ? '#D4B26E' : 'var(--gold-primary)' }} />
          <span style={{ opacity: dark ? 0.9 : 1 }}>{f}</span>
        </li>
      ))}
    </ul>
  )
}

function Plans() {
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
          Early access is open
        </motion.div>
        <motion.h1 {...fade(0.08)} className="font-serif-luxury mx-auto mt-5 max-w-3xl text-[2.3rem] leading-[1.06] font-semibold tracking-tight [text-wrap:balance] sm:text-[3.6rem]" style={{ color: 'var(--text-main)' }}>
          Simple pricing. <em className="italic" style={{ color: 'var(--gold-primary)' }}>Free</em> while we grow.
        </motion.h1>
        <motion.p {...fade(0.16)} className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed sm:text-lg" style={{ color: 'var(--text-muted)' }}>
          {EARLY}
        </motion.p>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left md:grid-cols-2">
          {/* Early access */}
          <motion.div {...fade(0.24)} className="relative isolate flex flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-8"
            style={{ background: 'linear-gradient(160deg, #2B2620, #15120E)', color: '#F6EFE2', boxShadow: '0 40px 80px -40px rgba(43,38,32,0.85)' }}>
            <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full blur-3xl" style={{ background: 'rgba(212,178,110,0.35)' }} />
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#D4B26E]">Early access</p>
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: '#D4B26E', color: '#1F1A14' }}><Gift size={12} /> Available now</span>
            </div>
            <p className="font-serif-luxury mt-5 text-[3.2rem] font-semibold leading-none tracking-tight">Free</p>
            <p className="mt-2 text-[14px] leading-relaxed opacity-75">For our first 50 users. Every feature, no card needed.</p>
            <Spots />
            <div className="mt-6 flex-1"><FeatureList dark /></div>
            <PrimaryLink to="/register" className="mt-8 w-full">Claim your spot</PrimaryLink>
          </motion.div>

          {/* Paid plans, not priced yet */}
          <motion.div {...fade(0.32)} className="relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-8" style={{ ...card, color: 'var(--text-main)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--gold-primary)' }}>Monthly and yearly</p>
              <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: GOLD_TINT, color: 'var(--text-main)' }}>Coming soon</span>
            </div>
            <p className="font-serif-luxury mt-5 text-[2.6rem] font-semibold leading-none tracking-tight">Coming soon</p>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>Paid plans are on the way. We will share the details well before they launch.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {[[CalendarClock, 'Monthly', 'Pay as you go'], [Sparkles, 'Yearly', 'Best value']].map(([I, t, l], i) => (
                <motion.div key={t} className="rounded-2xl px-3.5 py-3" style={{ background: BAND_BG, border: '1px solid var(--border-subtle)' }}
                  animate={reduce ? undefined : { y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}>
                  <I size={16} style={{ color: 'var(--gold-primary)' }} />
                  <p className="mt-2 text-[13.5px] font-semibold">{t}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-subtle)' }}>{l}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex-1"><FeatureList /></div>
            <span className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold"
              style={{ border: '1px dashed var(--border-card)', color: 'var(--text-subtle)' }}><BellRing size={16} /> We will let you know</span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── what's included + compare ─────────────────────────── */

function Included() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="No locked features" title="Every plan includes everything." sub="No feature is held back for a higher tier. Whichever plan you pick, you get all of ArthaLedger." />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INCLUDED.map(([Icon, label], i) => (
            <Reveal key={label} delay={(i % 4) * 0.05} y={14} className="group flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-[var(--bg-card-hover)]" style={card}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Icon size={18} /></span>
              <span className="text-[13.5px] font-semibold leading-snug sm:text-[14px]" style={{ color: 'var(--text-main)' }}>{label}</span>
            </Reveal>
          ))}
        </div>

        <Compare />
      </div>
    </section>
  )
}

const ROWS = [
  ['Price', 'Free', 'Coming soon', 'Coming soon'],
  ['Every feature', true, true, true],
  ['Unlimited projects and books', true, true, true],
  ['Sync across devices', true, true, true],
  ['Reminders and PIN lock', true, true, true],
  ['Available', 'Now', 'Soon', 'Soon'],
]

function Cell({ v, strong }) {
  if (v === true) return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600"><Check size={15} /><span className="sr-only">Yes</span></span>
  if (v === false) return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--border-subtle)', color: 'var(--text-subtle)' }}><Minus size={15} /><span className="sr-only">No</span></span>
  return <span className={`text-[12.5px] leading-tight sm:text-[13.5px] ${strong ? 'font-semibold' : ''}`} style={{ color: 'var(--text-main)' }}>{v}</span>
}

function Compare() {
  return (
    <Reveal className="mt-14 overflow-hidden rounded-[1.75rem]" style={{ ...card, boxShadow: '0 30px 70px -50px rgba(0,0,0,0.35)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">Plans compared</caption>
          <thead>
            <tr style={{ background: BAND_BG }}>
              <th scope="col" className="px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] sm:px-7 sm:text-[12px]" style={{ color: 'var(--text-subtle)' }}>Compare</th>
              {['Early access', 'Monthly', 'Yearly'].map((p, i) => (
                <th key={p} scope="col" className="px-1.5 py-4 text-center text-[12.5px] font-semibold leading-tight sm:px-3 sm:text-[14px]" style={{ color: i === 0 ? 'var(--gold-primary)' : 'var(--text-main)' }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, ...vals], r) => (
              <tr key={label} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <th scope="row" className="px-3 py-3.5 text-[13px] font-medium leading-snug sm:px-7 sm:text-[14px]" style={{ color: 'var(--text-muted)' }}>{label}</th>
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

const TIMELINE = [
  [UserPlus, 'Sign up today', 'Create your account with email or Google. No card, no payment details.'],
  [Compass, 'Use every feature', 'Projects, books, budgets, groups, reports. Nothing is locked.'],
  [BellRing, 'Hear from us first', 'We will tell you well before paid plans begin, so there are no surprises.'],
  [Download, 'Your data stays yours', 'Download any book as PDF or Excel whenever you like, on any plan.'],
]

function Timeline() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Early access" title="How early access works" sub="Four things to know before you start." />
        <div ref={ref} className="relative mt-14">
          {/* connecting line, drawn as you scroll in */}
          <div className="absolute left-[22px] top-0 bottom-0 w-[2px] lg:left-0 lg:right-0 lg:top-[22px] lg:bottom-auto lg:h-[2px] lg:w-auto" style={{ background: 'var(--border-subtle)' }} aria-hidden="true">
            <motion.div className="h-full w-full origin-top lg:origin-left" style={{ background: 'linear-gradient(90deg, var(--gold-hover), var(--gold-primary))' }}
              initial={{ scaleY: 0, scaleX: 0 }} animate={inView ? { scaleY: 1, scaleX: 1 } : undefined} transition={{ duration: 1.6, ease: EASE }} />
          </div>
          <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
            {TIMELINE.map(([Icon, title, text], i) => (
              <motion.li key={title} className="flex gap-4 lg:block"
                initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.6, delay: 0.2 + i * 0.25, ease: EASE }}>
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ ...goldBtn, boxShadow: '0 0 0 6px var(--bg-page)' }}><Icon size={19} /></span>
                <div className="lg:mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>Step {i + 1}</p>
                  <h3 className="mt-1 text-[17px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{text}</p>
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

const FAQ = [
  ['Is ArthaLedger really free right now?', 'Yes. ' + EARLY],
  ['What if I am not one of the first 50?', 'You can still sign up and use every feature free until paid plans launch. We will let you know well before that happens.'],
  ['Do I need a card to sign up?', 'No. You only need an email address or a Google account. We never ask for card, bank or UPI details to use ArthaLedger.'],
  ['When do paid plans start?', 'There is no date yet. We will let you know well before paid plans begin, so you have plenty of time to decide.'],
  ['What will paid plans include?', 'Every feature, just like today. Monthly and yearly options are planned, and we will share the details well before they launch.'],
  ['Can I cancel a monthly plan?', 'Yes. When paid plans arrive, you will be able to cancel a monthly plan at any time.'],
  ['What happens to my data?', 'Your data stays yours on every plan. You can download any book as a PDF or Excel file, and you can delete your account from Settings whenever you want.'],
]

function PricingFaq() {
  const [open, setOpen] = useState(-1)
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow="FAQ" title="Questions about pricing" />
        <Reveal className="mt-10 overflow-hidden rounded-3xl" style={{ ...card, boxShadow: '0 24px 60px -40px rgba(0,0,0,0.25)' }}>
          {FAQ.map(([q, a], i) => <FaqItem key={q} id={`pfaq-${i}`} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </Reveal>
        <Reveal delay={0.05} className="mt-6 flex flex-col items-center gap-3 rounded-3xl px-6 py-6 text-center sm:flex-row sm:text-left" style={{ border: '1px dashed var(--border-card)' }}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Mail size={19} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>Still have a question?</p>
            <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>Write to us and we will get back to you.</p>
          </div>
          <a href={`mailto:${CONTACT}?subject=ArthaLedger%20pricing`} className="inline-flex min-h-11 items-center rounded-full px-5 text-[14px] font-semibold" style={goldBtn}>Contact us</a>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16" style={{ background: 'linear-gradient(140deg, #2B2620, #15120E)' }}>
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(212,178,110,0.35)' }} aria-hidden="true" />
        <Sparkles size={28} className="mx-auto text-[#D4B26E]" />
        <h2 className="font-serif-luxury mx-auto mt-5 max-w-xl text-[1.9rem] leading-tight font-semibold tracking-tight text-[#F6EFE2] [text-wrap:balance] sm:text-[2.6rem]">Get in while it is free.</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-[#F6EFE2]/70">Free for our first 50 users. Everyone else can try every feature free until paid plans launch.</p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <PrimaryLink to="/register">Create free account</PrimaryLink>
          <a href={APK_URL} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-[#F6EFE2] transition-colors hover:bg-white/10" style={{ border: '1px solid rgba(246,239,226,0.25)' }}>
            <Download size={17} /> Download for Android
          </a>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function PricingPage() {
  useEffect(() => {
    forceLightTheme()
    window.scrollTo(0, 0)
    const prevTitle = document.title
    document.title = 'Pricing · ArthaLedger'
    return () => { restoreTheme(); document.title = prevTitle }
  }, [])

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
