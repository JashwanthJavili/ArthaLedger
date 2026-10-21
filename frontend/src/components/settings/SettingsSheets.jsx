import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, CheckCircle2, ChevronDown, Clock, Copy, Database, Globe, Key, Mail, Phone,
  Plus, Send, Shield, Stethoscope, Trash2,
} from 'lucide-react'
import {
  Sheet, SheetHeader, SheetBody, SheetFooter, Field, TextInput, TextArea,
  PasswordInput, ErrorNote, Button, Row, IconTile,
} from './ui'

// Local YYYY-MM-DD (not UTC), computed once per sheet mount — never during render.
function todayLocalISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Edit profile ────────────────────────────────────────────────────────────
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']

export function EditProfileSheet({ open, onClose, initial, email, onSave }) {
  return (
    <Sheet open={open} onClose={onClose} label="Edit profile">
      <SheetHeader title="Edit profile" subtitle="How you appear across ArthaLedger" onClose={onClose} />
      <EditProfileForm initial={initial} email={email} onSave={onSave} onClose={onClose} />
    </Sheet>
  )
}

function EditProfileForm({ initial, email, onSave, onClose }) {
  const [draft, setDraft] = useState(() => ({ displayName: '', phone: '', gender: '', dob: '', bio: '', ...initial }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [maxDob] = useState(todayLocalISO)
  const set = (k, v) => { setDraft(p => ({ ...p, [k]: v })); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.displayName.trim()) return setError('Name is required.')
    if (draft.phone && !/^\d{10}$/.test(draft.phone.trim())) return setError('Enter a valid 10-digit mobile number.')
    setSaving(true)
    try {
      await onSave(draft)
    } catch (err) {
      setError(err?.message || 'Failed to update profile.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="space-y-4">
        <Field label="Full name">
          <TextInput type="text" value={draft.displayName} onChange={e => set('displayName', e.target.value)}
            placeholder="Your full name" autoComplete="name" />
        </Field>

        <Field label="Email" hint="Cannot be changed">
          <TextInput type="email" value={email || ''} disabled readOnly />
        </Field>

        <Field label="Mobile number">
          <div className="flex gap-2">
            <span className="flex flex-shrink-0 select-none items-center rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 text-[14px] text-[var(--text-muted)]">+91</span>
            <TextInput type="tel" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="98765 43210"
              value={draft.phone}
              onChange={e => set('phone', e.target.value.replace(/^\+91\s?/, '').replace(/\D/g, '').slice(0, 10))} />
          </div>
        </Field>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-[var(--text-muted)]">Gender</p>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map(g => {
              const value = g === 'Prefer not to say' ? '' : g.toLowerCase()
              const active = draft.gender === value
              return (
                <button key={g} type="button" onClick={() => set('gender', value)} aria-pressed={active}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--gold-primary)]'
                      : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}>
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Date of birth">
          <TextInput type="date" value={draft.dob} max={maxDob} onChange={e => set('dob', e.target.value)} />
        </Field>

        <Field label="Short bio" hint={`${draft.bio.length}/150`}>
          <TextArea rows={2} maxLength={150} value={draft.bio} placeholder="A few words about yourself..."
            onChange={e => set('bio', e.target.value)} />
        </Field>

        <ErrorNote>{error}</ErrorNote>
      </SheetBody>
      <SheetFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </SheetFooter>
    </form>
  )
}

// ── Change password ─────────────────────────────────────────────────────────
export function ChangePasswordSheet({ open, onClose, onSubmit }) {
  return (
    <Sheet open={open} onClose={onClose} label="Change password">
      <SheetHeader title="Change password" subtitle="Use at least 6 characters" onClose={onClose} />
      <ChangePasswordForm onSubmit={onSubmit} onClose={onClose} />
    </Sheet>
  )
}

function ChangePasswordForm({ onSubmit, onClose }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setPwError('')
    if (!oldPw) return setPwError('Enter your current password.')
    if (newPw.length < 6) return setPwError('New password must be at least 6 characters.')
    if (newPw !== confirmPw) return setPwError('New passwords do not match.')
    if (oldPw === newPw) return setPwError('New password must be different from the current one.')
    setPwLoading(true)
    try {
      await onSubmit(oldPw, newPw)
      setPwSuccess(true)
      setOldPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(onClose, 1400)
    } catch (err) {
      setPwError(err?.message || 'Failed to change password.')
    } finally {
      setPwLoading(false)
    }
  }

  const clearErr = (fn) => (e) => { fn(e.target.value); setPwError('') }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="space-y-4">
        <Field label="Current password">
          <PasswordInput value={oldPw} onChange={clearErr(setOldPw)} show={showOld} onToggleShow={() => setShowOld(v => !v)} autoComplete="current-password" />
        </Field>
        <Field label="New password">
          <PasswordInput value={newPw} onChange={clearErr(setNewPw)} show={showNew} onToggleShow={() => setShowNew(v => !v)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput value={confirmPw} onChange={clearErr(setConfirmPw)} show={showNew} onToggleShow={() => setShowNew(v => !v)} autoComplete="new-password" />
        </Field>
        <ErrorNote>{pwError}</ErrorNote>
        {pwSuccess && (
          <p className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> Password changed
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pwLoading || pwSuccess}>{pwLoading ? 'Updating…' : 'Update password'}</Button>
      </SheetFooter>
    </form>
  )
}

// ── Currency ────────────────────────────────────────────────────────────────
export function CurrencySheet({ open, onClose, currencies, value, onSelect }) {
  return (
    <Sheet open={open} onClose={onClose} label="Currency">
      <SheetHeader title="Currency" subtitle="Used for amounts and reports" onClose={onClose} />
      <SheetBody>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {currencies.map(c => {
            const active = c.code === value
            return (
              <button key={c.code} type="button" onClick={() => onSelect(c.code)} aria-pressed={active}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gold-light)] text-[13px] font-semibold text-[var(--gold-primary)]">
                  {c.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--text-main)]">{c.name}</span>
                  <span className="block text-[12px] text-[var(--text-muted)]">{c.code}</span>
                </span>
                {active && <Check size={17} className="flex-shrink-0 text-[var(--gold-primary)]" />}
              </button>
            )
          })}
        </div>
      </SheetBody>
    </Sheet>
  )
}

// ── Reminder times ──────────────────────────────────────────────────────────
const SUGGESTED_TIMES = ['12:00', '09:00', '21:00', '15:00', '08:00', '22:00']

export function RemindersSheet({ open, onClose, times, onChange }) {
  const add = () => {
    const next = SUGGESTED_TIMES.find(t => !times.includes(t)) || '12:00'
    onChange([...times, next], 'Added new reminder time ✓')
  }
  const update = (idx, value) => {
    const nextTimes = [...times]
    nextTimes[idx] = value || '19:00'
    onChange(nextTimes)
  }
  const remove = (idx) => onChange(times.filter((_, i) => i !== idx), 'Removed reminder time ✓')

  return (
    <Sheet open={open} onClose={onClose} label="Reminder times">
      <SheetHeader title="Reminder times" subtitle="A nudge to log the day's expenses" onClose={onClose} />
      <SheetBody className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {times.map((t, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
              <IconTile icon={Clock} tint="emerald" />
              <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-main)]">Reminder {idx + 1}</span>
              <input type="time" value={t} onChange={e => update(idx, e.target.value)} aria-label={`Reminder ${idx + 1} time`}
                className="w-[118px] cursor-pointer rounded-lg border border-[var(--border-card)] bg-[var(--bg-page)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--gold-primary)]" />
              {times.length > 1 && (
                <button type="button" onClick={() => remove(idx)} aria-label={`Remove reminder ${idx + 1}`}
                  className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={add}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-card)] py-2.5 text-[13px] font-semibold text-[var(--gold-primary)] transition-colors hover:bg-[var(--gold-light)]">
          <Plus size={15} /> Add time
        </button>
        <p className="px-1 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
          Changes are saved automatically and synced to your other devices.
        </p>
      </SheetBody>
    </Sheet>
  )
}

// ── Notification diagnostics ────────────────────────────────────────────────
export function DiagnosticsSheet({ open, onClose, canTest, canDebug, onTest, onCopyToken, onRunDiagnostic }) {
  return (
    <Sheet open={open} onClose={onClose} label="Test & diagnostics">
      <SheetHeader title="Test & diagnostics" subtitle="Check that alerts reach this device" onClose={onClose} />
      <DiagnosticsBody canTest={canTest} canDebug={canDebug} onTest={onTest} onCopyToken={onCopyToken} onRunDiagnostic={onRunDiagnostic} />
    </Sheet>
  )
}

function DiagnosticsBody({ canTest, canDebug, onTest, onCopyToken, onRunDiagnostic }) {
  const [logs, setLogs] = useState(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try { setLogs(await onRunDiagnostic()) } finally { setRunning(false) }
  }

  return (
    <SheetBody className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
        {canTest && <Row icon={Send} tint="emerald" label="Send test notification" hint="Pushes a sample alert to this device" onClick={onTest} />}
        {canDebug && <Row icon={Copy} tint="neutral" label="Copy FCM token" hint="For testing from Firebase Console" onClick={onCopyToken} />}
        {canDebug && (
          <Row icon={Stethoscope} tint="neutral" label="Run diagnostic" hint="Checks permission, service worker & token"
            onClick={running ? undefined : run} value={running ? 'Running…' : null} />
        )}
      </div>
      {logs && (
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 font-mono text-[11.5px] leading-relaxed text-[var(--text-muted)]">
          {logs.join('\n')}
        </pre>
      )}
    </SheetBody>
  )
}

// ── Install instructions ────────────────────────────────────────────────────
export function InstallSheet({ open, onClose }) {
  const steps = [
    { title: 'iPhone & iPad (Safari)', body: <>Tap <b>Share</b>, scroll down and choose <b>Add to Home Screen</b>.</> },
    { title: 'Android (Chrome)', body: <>Open the <b>⋮ menu</b> and choose <b>Install app</b> or <b>Add to Home Screen</b>.</> },
    { title: 'Desktop (Chrome / Edge)', body: <>Click the <b>install icon</b> at the right of the address bar.</> },
  ]
  return (
    <Sheet open={open} onClose={onClose} label="Install ArthaLedger">
      <SheetHeader title="Install ArthaLedger" subtitle="Add it to your home screen — it works like a native app" onClose={onClose} />
      <SheetBody>
        <ol className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 px-4 py-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[12px] font-semibold text-[var(--gold-primary)]">{i + 1}</span>
              <div className="min-w-0 text-[13px] leading-relaxed text-[var(--text-muted)] [&_b]:font-semibold [&_b]:text-[var(--text-main)]">
                <p className="text-[14px] font-medium text-[var(--text-main)]">{s.title}</p>
                <p className="mt-0.5">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </SheetBody>
    </Sheet>
  )
}

// ── Help & FAQ ──────────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
        className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]">
        <span className="text-[14px] font-medium leading-snug text-[var(--text-main)]">{q}</span>
        <ChevronDown size={16} className={`mt-0.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-[var(--gold-primary)]' : 'text-[var(--text-subtle)]'}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <p className="px-4 pb-3.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FaqSheet({ open, onClose, items }) {
  return (
    <Sheet open={open} onClose={onClose} label="Help & FAQ" wide>
      <SheetHeader title="Help & FAQ" subtitle="Answers to common questions" onClose={onClose} />
      <SheetBody>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </SheetBody>
    </Sheet>
  )
}

// ── About ───────────────────────────────────────────────────────────────────
const FACTS = [
  { icon: Globe, label: 'Platform', value: 'Web + PWA' },
  { icon: Database, label: 'Database', value: 'Firebase Realtime DB' },
  { icon: Key, label: 'Authentication', value: 'Firebase Auth' },
  { icon: Shield, label: 'Encryption', value: 'In transit & at rest' },
]

export function AboutSheet({ open, onClose, version }) {
  return (
    <Sheet open={open} onClose={onClose} label="About ArthaLedger">
      <SheetHeader title="About" onClose={onClose} />
      <SheetBody className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <img src="/L.png" alt="" className="h-16 w-16 rounded-2xl bg-[var(--gold-light)] object-contain p-1.5" />
          <p className="font-serif-luxury mt-3 text-[20px] font-semibold text-[var(--text-main)]">ArthaLedger</p>
          <p className="font-serif-luxury text-[14px] italic text-[var(--text-muted)]">Where every rupee has meaning</p>
          <p className="mt-1 text-[11px] text-[var(--text-subtle)]">Version {version}</p>
        </div>

        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-main)]">“Artha”</span> is a Sanskrit word for wealth, purpose and meaning — one of the four goals of life in ancient Indian philosophy. ArthaLedger is built on the belief that mindful tracking of money leads to clarity, peace and abundance.
        </p>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {FACTS.map(f => <Row key={f.label} icon={f.icon} tint="neutral" label={f.label} value={f.value} />)}
          <Row icon={Database} tint="neutral" label="Built with" hint="React · Tailwind CSS · Framer Motion · Firebase · FastAPI · jsPDF · Recharts" />
        </div>

        <div className="space-y-2">
          <h4 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">Developer</h4>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[12px] font-semibold text-[var(--gold-primary)]">JJ</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[var(--text-main)]">Javili Jashwanth</span>
                <span className="block text-[12px] text-[var(--text-muted)]">Designer & Developer</span>
              </span>
            </div>
            <Row icon={Mail} tint="neutral" label="Email" value="jashwanthjavili7@gmail.com" href="mailto:jashwanthjavili7@gmail.com" trailing={null} />
            <Row icon={Phone} tint="neutral" label="Phone" value="+91 91601 25245" href="tel:+919160125245" trailing={null} />
          </div>
        </div>

        <p className="font-serif-luxury text-center text-[13px] italic text-[var(--text-subtle)]">“Mindful spending creates peaceful living.”</p>
      </SheetBody>
    </Sheet>
  )
}

// ── Delete account ──────────────────────────────────────────────────────────
export function DeleteAccountSheet({ open, onClose, counts, needsPassword, onConfirm }) {
  return (
    <Sheet open={open} onClose={onClose} label="Delete account">
      <DeleteAccountBody onClose={onClose} counts={counts} needsPassword={needsPassword} onConfirm={onConfirm} />
    </Sheet>
  )
}

function DeleteAccountBody({ onClose, counts, needsPassword, onConfirm }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

  const confirm = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onConfirm(needsPassword ? password : undefined)
    } catch (err) {
      setError(err?.message || 'Failed to delete account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={confirm} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader title="Delete account" subtitle="This permanently removes your account" onClose={loading ? () => {} : onClose} />
      <SheetBody className="space-y-4">
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Trash2 size={22} />
          </span>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
            Your account and <span className="font-semibold text-rose-600 dark:text-rose-400">all of its data</span> will be deleted. This cannot be undone — consider exporting your data first.
          </p>
        </div>
        <ul className="space-y-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3">
          {[plural(counts.projects, 'project', 'projects'), plural(counts.books, 'book', 'books'), plural(counts.entries, 'entry', 'entries')].map(item => (
            <li key={item} className="flex items-center gap-2 text-[12.5px] text-rose-600 dark:text-rose-400">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-70" />
              {item} will be deleted
            </li>
          ))}
        </ul>
        {needsPassword && (
          <Field label="Enter your password to confirm">
            <PasswordInput value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Current password" autoComplete="current-password" />
          </Field>
        )}
        <ErrorNote>{error}</ErrorNote>
      </SheetBody>
      <SheetFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="danger" disabled={loading || (needsPassword && !password)}>
          {loading ? 'Deleting…' : 'Delete account'}
        </Button>
      </SheetFooter>
    </form>
  )
}
