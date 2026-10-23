import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck, EyeOff, Trash2, Ban, Mail } from 'lucide-react'

const CONTACT = 'jashwanthjavili7@gmail.com'
const EFFECTIVE = '23 October 2026'

const GLANCE = [
  { Icon: ShieldCheck, title: 'Private by default', text: 'Your books can only be opened by your account.' },
  { Icon: Ban, title: 'No selling, no ads', text: 'We never sell your data or show advertising.' },
  { Icon: EyeOff, title: 'No bank access', text: 'We never ask for bank, card or UPI details.' },
  { Icon: Trash2, title: 'Delete anytime', text: 'Remove your account and everything in it, for good.' },
]

// Each section: id (for links), title, and blocks: strings are paragraphs, arrays are bullet lists
const SECTIONS = [
  {
    id: 'about', title: 'Who we are',
    blocks: [
      'ArthaLedger (“we”, “us”) is a personal money notebook for Android and the web, built and run by Javili Jashwanth in India. This policy explains what information the app uses, why, and the choices you have. It applies to the ArthaLedger app, website and services.',
    ],
  },
  {
    id: 'collect', title: 'Information we collect',
    blocks: [
      'We collect only what the app needs to work:',
      [
        'Account details: your name, email address, profile photo (if you sign in with Google) and how you sign in.',
        'Profile details you choose to add, such as phone number, date of birth, gender and a short bio. These are optional.',
        'Your records: projects, books, entries, categories, budgets, groups and settings that you create in the app.',
        'Notification details: a device token for each phone or browser where you turn notifications on, your reminder times and time zone.',
        'Feedback you send us: your message, its type and rating, and your name and email so we can reply.',
        'Basic technical information needed to keep the service secure and working, such as sign-in times and error logs.',
      ],
      'We do not collect your bank, card or UPI details, your contacts, your location or your messages.',
    ],
  },
  {
    id: 'use', title: 'How we use it',
    blocks: [
      [
        'To run the app: show your books, keep balances and summaries, and sync your data across your devices.',
        'To send the reminders and budget alerts you switch on.',
        'To answer feedback and support requests, and to improve ArthaLedger.',
        'To keep the service safe, prevent abuse and fix problems.',
      ],
      'We do not use your records for advertising, and we do not build profiles about you.',
    ],
  },
  {
    id: 'share', title: 'When information is shared',
    blocks: [
      'We do not sell, rent or trade your information. We share it only in these cases:',
      [
        'Service providers that host and run ArthaLedger for us, mainly Google Firebase for secure storage, sign-in and notifications. They process data only on our instructions.',
        'Testimonials: if you send praise and tick the box allowing it, we may show your message on our website with your first name only. You can ask us to remove it at any time.',
        'When required by law, or to protect the rights and safety of our users and the service.',
      ],
    ],
  },
  {
    id: 'access', title: 'Who can see your data',
    blocks: [
      'Your books are protected by security rules so that only your signed-in account can read or change them. Groups you create are visible to you; shared amounts are entered by you.',
      'For support and to keep the service running, the ArthaLedger team can see account information (name, email, sign-up and last sign-in dates) and simple usage counts such as how many books or entries an account has. The team does not view the contents of your entries, amounts or notes.',
    ],
  },
  {
    id: 'security', title: 'How we protect it',
    blocks: [
      [
        'Data is encrypted while it travels (HTTPS) and while it is stored.',
        'Passwords are handled by Google’s sign-in service and are never visible to us.',
        'Optional PIN locks protect books and projects. PINs are stored only as salted hashes, never as the PIN itself.',
      ],
      'No method of storage or transfer is perfectly secure, but we work to protect your information and will tell you if a breach affects you.',
    ],
  },
  {
    id: 'retention', title: 'How long we keep it',
    blocks: [
      'We keep your information for as long as your account exists. When you delete your account, your account and records are deleted straight away. Feedback messages are kept until they are no longer needed to support you or improve the app, or until you ask us to delete them.',
    ],
  },
  {
    id: 'rights', title: 'Your choices and rights',
    blocks: [
      [
        'See and change your details at any time in Settings.',
        'Download any book as a PDF or Excel file.',
        'Turn reminders and alerts off in Settings, or block notifications in your phone settings.',
        'Delete your account and all of your data (see below).',
        `Ask us any question about your data, or to remove a testimonial, by writing to ${CONTACT}.`,
      ],
    ],
  },
  {
    id: 'delete-account', title: 'Deleting your account and data',
    blocks: [
      'In the app: open Settings, then Delete account, and confirm. Your account and all of your records are permanently deleted.',
      `If you cannot sign in, email ${CONTACT} from the address on your account with the subject “Delete my ArthaLedger account”. We will delete the account and all of its data within 30 days and confirm by email.`,
    ],
  },
  {
    id: 'children', title: 'Children',
    blocks: ['ArthaLedger is not meant for children under 13, and we do not knowingly collect their information. If you believe a child has given us information, contact us and we will delete it.'],
  },
  {
    id: 'changes', title: 'Changes to this policy',
    blocks: ['If we change this policy, we will post the new version here with a new effective date. For important changes we may also let you know in the app or by email.'],
  },
  {
    id: 'contact', title: 'Contact us',
    blocks: [`Questions, requests or concerns about privacy: ${CONTACT}. We usually reply within a few days.`],
  },
]

/** Public privacy policy (also used as the Play Store privacy-policy and data-deletion URL). */
export default function PrivacyPage() {
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={goBack} aria-label="Back"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-main)] hover:bg-[var(--border-subtle)] cursor-pointer">
            <ArrowLeft size={19} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/maskable-192.png" alt="" className="h-7 w-7 rounded-full" />
            <span className="font-serif-luxury text-[16px] font-semibold">ArthaLedger</span>
          </Link>
          <a href={`mailto:${CONTACT}`} className="ml-auto hidden items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] sm:inline-flex">
            <Mail size={14} /> Contact
          </a>
        </div>
      </header>

      <main className="selectable mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-[var(--border-subtle)] py-10 sm:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-primary)]">Legal</p>
          <h1 className="font-serif-luxury mt-3 text-[2.2rem] font-semibold leading-tight tracking-tight sm:text-[3rem]">Privacy policy</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">
            Your money records are personal. This policy explains, in plain words, what ArthaLedger collects, how it is used and the control you have over it.
          </p>
          <p className="mt-4 text-[13px] text-[var(--text-subtle)]">Effective {EFFECTIVE}</p>
        </motion.div>

        <section aria-label="At a glance" className="py-8">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">At a glance</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {GLANCE.map((g, i) => (
              <motion.div key={g.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-3.5 sm:p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold-light)] text-[var(--gold-primary)]"><g.Icon size={17} /></span>
                <p className="mt-3 text-[14px] font-semibold">{g.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{g.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid gap-10 border-t border-[var(--border-subtle)] pt-10 lg:grid-cols-[220px_1fr] lg:gap-14">
          <nav aria-label="Contents" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">Contents</p>
            <ol className="mt-3 grid gap-0.5 text-[13.5px] sm:grid-cols-2 lg:grid-cols-1">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)]">
                    <span className="w-5 tabular-nums text-[var(--text-subtle)]">{i + 1}.</span>{s.title}
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
                  {s.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-[var(--text-muted)]">
                  {s.blocks.map((b, j) => Array.isArray(b) ? (
                    <ul key={j} className="space-y-2">
                      {b.map((li, k) => (
                        <li key={k} className="flex gap-3">
                          <span className="mt-[11px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--gold-primary)]" />
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p key={j}>{b}</p>)}
                </div>
              </section>
            ))}

            <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6">
              <p className="text-[15px] font-semibold">Questions about your privacy?</p>
              <p className="mt-1 text-[14px] text-[var(--text-muted)]">We are happy to help. Write to us and we will get back to you.</p>
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
          <span>© {EFFECTIVE.slice(-4)} ArthaLedger. All rights reserved.</span>
          <Link to="/" className="hover:text-[var(--text-main)]">Back to ArthaLedger</Link>
        </div>
      </footer>
    </div>
  )
}
