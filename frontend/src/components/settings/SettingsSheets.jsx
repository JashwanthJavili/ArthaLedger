import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, CheckCircle2, ChevronDown, Clock, Copy, Globe, Key, Mail, Phone,
  Plus, Send, Shield, Stethoscope, Trash2,
} from 'lucide-react'
import {
  Sheet, SheetHeader, SheetBody, SheetFooter, Field, TextInput, TextArea,
  PasswordInput, ErrorNote, Button, Row, IconTile,
} from './ui'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

// Local YYYY-MM-DD (not UTC), computed once per sheet mount — never during render.
function todayLocalISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Edit profile ────────────────────────────────────────────────────────────
// Stored values stay English ('male', 'female', 'other', '' = prefer not to say)
const GENDERS = [
  { key: 'male', value: 'male' },
  { key: 'female', value: 'female' },
  { key: 'other', value: 'other' },
  { key: 'none', value: '' },
]

export function EditProfileSheet({ open, onClose, initial, email, onSave }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.editProfile.title')}>
      <SheetHeader title={t('settings.editProfile.title')} subtitle={t('settings.editProfile.subtitle')} onClose={onClose} />
      <EditProfileForm initial={initial} email={email} onSave={onSave} onClose={onClose} />
    </Sheet>
  )
}

function EditProfileForm({ initial, email, onSave, onClose }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(() => ({ displayName: '', phone: '', gender: '', dob: '', bio: '', ...initial }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [maxDob] = useState(todayLocalISO)
  const set = (k, v) => { setDraft(p => ({ ...p, [k]: v })); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.displayName.trim()) return setError(t('settings.editProfile.errors.nameRequired'))
    if (draft.phone && !/^\d{10}$/.test(draft.phone.trim())) return setError(t('settings.editProfile.errors.phoneInvalid'))
    setSaving(true)
    try {
      await onSave(draft)
    } catch (err) {
      setError(err?.message || t('settings.editProfile.errors.failed'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="space-y-4">
        <Field label={t('settings.editProfile.fullName')}>
          <TextInput type="text" value={draft.displayName} onChange={e => set('displayName', e.target.value)}
            placeholder={t('settings.editProfile.namePlaceholder')} autoComplete="name" />
        </Field>

        <Field label={t('common.email')} hint={t('settings.editProfile.emailHint')}>
          <TextInput type="email" value={email || ''} disabled readOnly />
        </Field>

        <Field label={t('settings.editProfile.mobile')}>
          <div className="flex gap-2">
            <span className="flex flex-shrink-0 select-none items-center rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 text-[14px] text-[var(--text-muted)]">+91</span>
            <TextInput type="tel" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="98765 43210"
              value={draft.phone}
              onChange={e => set('phone', e.target.value.replace(/^\+91\s?/, '').replace(/\D/g, '').slice(0, 10))} />
          </div>
        </Field>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-[var(--text-muted)]">{t('settings.editProfile.gender')}</p>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map(({ key, value }) => {
              const active = draft.gender === value
              return (
                <button key={key} type="button" onClick={() => set('gender', value)} aria-pressed={active}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--gold-primary)]'
                      : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}>
                  {t(`settings.editProfile.genders.${key}`)}
                </button>
              )
            })}
          </div>
        </div>

        <Field label={t('settings.editProfile.dob')}>
          <TextInput type="date" value={draft.dob} max={maxDob} onChange={e => set('dob', e.target.value)} />
        </Field>

        <Field label={t('settings.editProfile.bio')} hint={`${draft.bio.length}/150`}>
          <TextArea rows={2} maxLength={150} value={draft.bio} placeholder={t('settings.editProfile.bioPlaceholder')}
            onChange={e => set('bio', e.target.value)} />
        </Field>

        <ErrorNote>{error}</ErrorNote>
      </SheetBody>
      <SheetFooter>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
      </SheetFooter>
    </form>
  )
}

// ── Change password ─────────────────────────────────────────────────────────
export function ChangePasswordSheet({ open, onClose, onSubmit }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.password.title')}>
      <SheetHeader title={t('settings.password.title')} subtitle={t('settings.password.subtitle')} onClose={onClose} />
      <ChangePasswordForm onSubmit={onSubmit} onClose={onClose} />
    </Sheet>
  )
}

function ChangePasswordForm({ onSubmit, onClose }) {
  const { t } = useI18n()
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
    if (!oldPw) return setPwError(t('settings.password.errors.current'))
    if (newPw.length < 6) return setPwError(t('settings.password.errors.short'))
    if (newPw !== confirmPw) return setPwError(t('settings.password.errors.mismatch'))
    if (oldPw === newPw) return setPwError(t('settings.password.errors.same'))
    setPwLoading(true)
    try {
      await onSubmit(oldPw, newPw)
      setPwSuccess(true)
      setOldPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(onClose, 1400)
    } catch (err) {
      setPwError(err?.message || t('settings.password.errors.failed'))
    } finally {
      setPwLoading(false)
    }
  }

  const clearErr = (fn) => (e) => { fn(e.target.value); setPwError('') }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="space-y-4">
        <Field label={t('settings.password.current')}>
          <PasswordInput value={oldPw} onChange={clearErr(setOldPw)} show={showOld} onToggleShow={() => setShowOld(v => !v)} autoComplete="current-password" />
        </Field>
        <Field label={t('settings.password.new')}>
          <PasswordInput value={newPw} onChange={clearErr(setNewPw)} show={showNew} onToggleShow={() => setShowNew(v => !v)} autoComplete="new-password" />
        </Field>
        <Field label={t('settings.password.confirm')}>
          <PasswordInput value={confirmPw} onChange={clearErr(setConfirmPw)} show={showNew} onToggleShow={() => setShowNew(v => !v)} autoComplete="new-password" />
        </Field>
        <ErrorNote>{pwError}</ErrorNote>
        {pwSuccess && (
          <p className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> {t('settings.password.changed')}
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={pwLoading || pwSuccess}>{pwLoading ? t('settings.password.updating') : t('settings.password.submit')}</Button>
      </SheetFooter>
    </form>
  )
}

// ── Currency ────────────────────────────────────────────────────────────────
export function CurrencySheet({ open, onClose, currencies, value, onSelect }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.currency.title')}>
      <SheetHeader title={t('settings.currency.title')} subtitle={t('settings.currency.subtitle')} onClose={onClose} />
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

// ── Language ────────────────────────────────────────────────────────────────
// Each language is shown in its own script, so it can be found from either.
export function LanguageSheet({ open, onClose, langs, value, onSelect }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('common.language')}>
      <SheetHeader title={t('settings.prefs.language')} subtitle={t('settings.language.subtitle')} onClose={onClose} />
      <SheetBody>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {langs.map(l => {
            const active = l.code === value
            return (
              <button key={l.code} type="button" onClick={() => onSelect(l.code)} aria-pressed={active} lang={l.code}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gold-light)] text-[13px] font-semibold text-[var(--gold-primary)]">
                  {l.badge}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--text-main)]">{l.label}</span>
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
  const { t } = useI18n()
  const add = () => {
    const next = SUGGESTED_TIMES.find(time => !times.includes(time)) || '12:00'
    onChange([...times, next], t('settings.reminders.added'))
  }
  const update = (idx, value) => {
    const nextTimes = [...times]
    nextTimes[idx] = value || '19:00'
    onChange(nextTimes)
  }
  const remove = (idx) => onChange(times.filter((_, i) => i !== idx), t('settings.reminders.removed'))

  return (
    <Sheet open={open} onClose={onClose} label={t('settings.reminders.title')}>
      <SheetHeader title={t('settings.reminders.title')} subtitle={t('settings.reminders.subtitle')} onClose={onClose} />
      <SheetBody className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {times.map((time, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
              <IconTile icon={Clock} tint="emerald" />
              <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-main)]">{t('settings.reminders.item', { n: idx + 1 })}</span>
              <input type="time" value={time} onChange={e => update(idx, e.target.value)} aria-label={t('settings.reminders.itemTime', { n: idx + 1 })}
                className="w-[118px] cursor-pointer rounded-lg border border-[var(--border-card)] bg-[var(--bg-page)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--gold-primary)]" />
              {times.length > 1 && (
                <button type="button" onClick={() => remove(idx)} aria-label={t('settings.reminders.remove', { n: idx + 1 })}
                  className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-subtle)] transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={add}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-card)] py-2.5 text-[13px] font-semibold text-[var(--gold-primary)] transition-colors hover:bg-[var(--gold-light)]">
          <Plus size={15} /> {t('settings.reminders.addTime')}
        </button>
        <p className="px-1 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
          {t('settings.reminders.autosave')}
        </p>
      </SheetBody>
    </Sheet>
  )
}

// ── Notification diagnostics ────────────────────────────────────────────────
export function DiagnosticsSheet({ open, onClose, canTest, canDebug, onTest, onCopyToken, onRunDiagnostic }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.diagnostics.title')}>
      <SheetHeader title={t('settings.diagnostics.title')} subtitle={t('settings.diagnostics.subtitle')} onClose={onClose} />
      <DiagnosticsBody canTest={canTest} canDebug={canDebug} onTest={onTest} onCopyToken={onCopyToken} onRunDiagnostic={onRunDiagnostic} />
    </Sheet>
  )
}

function DiagnosticsBody({ canTest, canDebug, onTest, onCopyToken, onRunDiagnostic }) {
  const { t } = useI18n()
  const [logs, setLogs] = useState(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try { setLogs(await onRunDiagnostic()) } finally { setRunning(false) }
  }

  return (
    <SheetBody className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
        {canTest && <Row icon={Send} tint="emerald" label={t('settings.diagnostics.test')} hint={t('settings.diagnostics.testHint')} onClick={onTest} />}
        {canDebug && <Row icon={Copy} tint="neutral" label={t('settings.diagnostics.copyToken')} hint={t('settings.diagnostics.copyTokenHint')} onClick={onCopyToken} />}
        {canDebug && (
          <Row icon={Stethoscope} tint="neutral" label={t('settings.diagnostics.run')} hint={t('settings.diagnostics.runHint')}
            onClick={running ? undefined : run} value={running ? t('settings.diagnostics.running') : null} />
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
  const { t } = useI18n()
  const b = { b: <b /> }
  const steps = [
    { title: t('settings.installSheet.iosTitle'), body: <Trans k="settings.installSheet.iosBody" components={b} /> },
    { title: t('settings.installSheet.androidTitle'), body: <Trans k="settings.installSheet.androidBody" components={b} /> },
    { title: t('settings.installSheet.desktopTitle'), body: <Trans k="settings.installSheet.desktopBody" components={b} /> },
  ]
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.installSheet.title')}>
      <SheetHeader title={t('settings.installSheet.title')} subtitle={t('settings.installSheet.subtitle')} onClose={onClose} />
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
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.faq.title')} wide>
      <SheetHeader title={t('settings.faq.title')} subtitle={t('settings.faq.subtitle')} onClose={onClose} />
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
  { icon: Globe, key: 'availableOn' },
  { icon: Key, key: 'yourData' },
  { icon: Shield, key: 'protection' },
]

export function AboutSheet({ open, onClose, version }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.about.label')}>
      <SheetHeader title={t('settings.about.title')} onClose={onClose} />
      <SheetBody className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <img src="/icons/maskable-192.png" alt="" className="h-16 w-16 rounded-full shadow-[0_10px_24px_-14px_rgba(0,0,0,0.4)]" />
          <p className="font-serif-luxury mt-3 text-[20px] font-semibold text-[var(--text-main)]">ArthaLedger</p>
          <p className="font-serif-luxury text-[14px] italic text-[var(--text-muted)]">{t('settings.about.tagline')}</p>
          <p className="mt-1 text-[11px] text-[var(--text-subtle)]">{t('settings.about.version', { version })}</p>
        </div>

        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
          <Trans k="settings.about.artha" components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} />
        </p>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {FACTS.map(f => <Row key={f.key} icon={f.icon} tint="neutral" label={t(`settings.about.facts.${f.key}`)} value={t(`settings.about.facts.${f.key}Value`)} />)}
        </div>

        <div className="space-y-2">
          <h4 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{t('settings.about.developer')}</h4>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[12px] font-semibold text-[var(--gold-primary)]">JJ</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[var(--text-main)]">Javili Jashwanth</span>
                <span className="block text-[12px] text-[var(--text-muted)]">{t('settings.about.role')}</span>
              </span>
            </div>
            <Row icon={Mail} tint="neutral" label={t('common.email')} value="jashwanthjavili7@gmail.com" href="mailto:jashwanthjavili7@gmail.com" trailing={null} />
            <Row icon={Phone} tint="neutral" label={t('settings.about.phone')} value="+91 91601 25245" href="tel:+919160125245" trailing={null} />
          </div>
        </div>

        <a href="mailto:jashwanthjavili7@gmail.com?subject=Collaboration%20with%20ArthaLedger"
          className="block rounded-2xl border border-[var(--border-card)] bg-[var(--gold-light)] px-4 py-3.5 text-center transition-colors hover:border-[var(--gold-primary)]">
          <span className="block text-[13.5px] font-semibold text-[var(--text-main)]">{t('settings.about.collab')}</span>
          <span className="mt-0.5 block text-[12px] text-[var(--text-muted)]">{t('settings.about.writeTo', { email: 'jashwanthjavili7@gmail.com' })}</span>
        </a>

        <p className="font-serif-luxury text-center text-[13px] italic text-[var(--text-subtle)]">{t('settings.about.quote')}</p>
      </SheetBody>
    </Sheet>
  )
}

// ── Delete account ──────────────────────────────────────────────────────────
export function DeleteAccountSheet({ open, onClose, counts, needsPassword, onConfirm }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} label={t('settings.deleteAccount.title')}>
      <DeleteAccountBody onClose={onClose} counts={counts} needsPassword={needsPassword} onConfirm={onConfirm} />
    </Sheet>
  )
}

function DeleteAccountBody({ onClose, counts, needsPassword, onConfirm }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()

  const confirm = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onConfirm(needsPassword ? password : undefined)
    } catch (err) {
      setError(err?.message || t('settings.deleteAccount.failed'))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={confirm} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader title={t('settings.deleteAccount.title')} subtitle={t('settings.deleteAccount.subtitle')} onClose={loading ? () => {} : onClose} />
      <SheetBody className="space-y-4">
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Trash2 size={22} />
          </span>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
            <Trans k="settings.deleteAccount.body" components={{ em: <span className="font-semibold text-rose-600 dark:text-rose-400" /> }} />
          </p>
        </div>
        <ul className="space-y-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3">
          {[
            t('settings.deleteAccount.willDelete.projects', { count: counts.projects }),
            t('settings.deleteAccount.willDelete.books', { count: counts.books }),
            t('settings.deleteAccount.willDelete.entries', { count: counts.entries }),
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-[12.5px] text-rose-600 dark:text-rose-400">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-70" />
              {item}
            </li>
          ))}
        </ul>
        {needsPassword && (
          <Field label={t('settings.deleteAccount.passwordLabel')}>
            <PasswordInput value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder={t('settings.deleteAccount.passwordPlaceholder')} autoComplete="current-password" />
          </Field>
        )}
        <ErrorNote>{error}</ErrorNote>
      </SheetBody>
      <SheetFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
        <Button type="submit" variant="danger" disabled={loading || (needsPassword && !password)}>
          {loading ? t('common.deleting') : t('settings.deleteAccount.submit')}
        </Button>
      </SheetFooter>
    </form>
  )
}
