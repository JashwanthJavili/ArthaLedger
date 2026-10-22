import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck } from 'lucide-react'

const CONTACT = 'jashwanthjavili7@gmail.com'
const UPDATED = '22 October 2026'

const SECTIONS = [
  {
    title: 'What we collect',
    body: [
      'Account details: your name, email address and sign-in method (email & password or Google), handled by Firebase Authentication.',
      'Profile details you choose to add, such as phone number, date of birth, gender and bio.',
      'The financial records you enter: projects, books, transactions, categories, budgets, groups and reminder settings.',
      'A push-notification token for each device where you turn notifications on, so reminders and alerts can reach it.',
    ],
  },
  {
    title: 'How we use it',
    body: [
      'Only to run the app for you: show your ledgers, calculate balances and analytics, and send the reminders and budget alerts you switch on.',
      'We do not sell your data, show ads, or share your records with anyone. There is no third-party tracking.',
    ],
  },
  {
    title: 'Where it is stored',
    body: [
      'Your data is stored in Google Firebase (Realtime Database and Authentication). It is encrypted in transit (HTTPS) and at rest by Google.',
      'Security rules allow only your signed-in account to read or write your records. Your password is never visible to us.',
      'Optional PIN locks protect books and projects on your device; PINs are stored only as salted hashes.',
    ],
  },
  {
    title: 'Notifications',
    body: [
      'Notifications are off until you allow them. You can turn reminders and budget alerts off in Settings, or block notifications in your phone settings at any time.',
    ],
  },
  {
    id: 'delete-account',
    title: 'Deleting your account and data',
    body: [
      'In the app: open Settings → Delete account and confirm. Your account and all of your records are permanently deleted.',
      `If you can't sign in, email ${CONTACT} from the address on your account with the subject "Delete my ArthaLedger account". We delete the account and all its data within 30 days and confirm by email.`,
    ],
  },
  {
    title: 'Children',
    body: ['ArthaLedger is not directed at children under 13, and we do not knowingly collect their data.'],
  },
  {
    title: 'Changes and contact',
    body: [
      'If this policy changes, the new version will be posted on this page with a new date.',
      `Questions: ${CONTACT}`,
    ],
  },
]

/** Public privacy policy (also used as the Play Store privacy-policy URL). */
export default function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] selectable">
      <main className="mx-auto max-w-2xl px-4 pb-16" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Back"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] cursor-pointer">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-serif-luxury text-[28px] font-semibold leading-tight tracking-[-0.01em]">Privacy policy</h1>
            <p className="font-serif-luxury mt-0.5 text-[14px] italic text-[var(--text-muted)]">ArthaLedger · updated {UPDATED}</p>
          </div>
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
            <ShieldCheck size={17} />
          </span>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
            Your ledger is yours. We collect only what the app needs to work, never sell it, and you can delete everything at any time.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {SECTIONS.map(s => (
            <section key={s.title} id={s.id}>
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{s.title}</h2>
              <div className="mt-2 space-y-2 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3.5">
                {s.body.map((line, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-[var(--text-main)]">{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] text-[var(--text-subtle)]">
          <Link to="/" className="text-[var(--gold-primary)]">ArthaLedger</Link> · <a href={`mailto:${CONTACT}`} className="text-[var(--gold-primary)]">{CONTACT}</a>
        </p>
      </main>
    </div>
  )
}
