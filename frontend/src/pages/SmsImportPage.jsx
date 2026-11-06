import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Check, Download, MessageSquareText, ShieldCheck, X } from 'lucide-react'
import LayoutShell from '../components/LayoutShell'
import Toast from '../components/common/Toast'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { useI18n } from '../i18n/core'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import { isUnlocked } from '../lib/pin'
import { parseAll, guessCategory } from '../lib/smsParse'
import { canImportSms, onSms, startSmsImport, takeSms } from '../lib/nativeApp'
import { APK_URL } from '../components/marketing/constants'

/*
 * Review page for "Add from bank SMS". The Android app reads recent bank and
 * UPI messages on the phone and hands them to this page; each becomes a
 * suggested entry the user can tick, rename and categorise before adding.
 * Messages already added (or hidden) are remembered on this device and are
 * not offered again.
 */

const STATUSES = ['cancelled', 'denied', 'error', 'unverified', 'noapp', 'nochrome']
const WAIT_MS = 20000
const DONE_LIMIT = 3000

const card = 'rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]'
const roundBtn = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer'
const goldBtn = 'inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold-primary)] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[var(--gold-hover)] active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
const fieldCls = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-2 text-[13px] text-[var(--text-main)] outline-none transition-colors focus:border-[var(--gold-primary)]'

// Remembered per account on this device: which messages were added or hidden
const doneKey = (uid) => `artha.smsDone.${uid}`
function readDone(uid) {
  try { return new Set(JSON.parse(localStorage.getItem(doneKey(uid)) || '[]')) } catch { return new Set() }
}
function writeDone(uid, set) {
  try { localStorage.setItem(doneKey(uid), JSON.stringify([...set].slice(-DONE_LIMIT))) } catch { /* storage full or blocked */ }
}

export default function SmsImportPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { projects, booksByProject, entriesByBook, categories, addEntries } = useAppData()
  const { t, lang, intl } = useI18n()
  const symbol = getCurrencySymbol()

  const status = STATUSES.includes(params.get('status')) ? params.get('status') : null
  const [payload, setPayload] = useState(() => takeSms())
  const [timedOut, setTimedOut] = useState(false)
  const [done, setDone] = useState(() => (user ? readDone(user.uid) : new Set()))
  const [picked, setPicked] = useState({})   // key -> true/false (ticked)
  const [edits, setEdits] = useState({})     // key -> { payee, category }
  const [bookChoice, setBook] = useState(params.get('book') || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  // Messages may arrive a moment after this page opens
  useEffect(() => {
    if (payload || status) return undefined
    const off = onSms(() => setPayload(takeSms()))
    const timer = setTimeout(() => setTimedOut(true), WAIT_MS)
    return () => { off(); clearTimeout(timer) }
  }, [payload, status])

  // Books the user can add to (a PIN-locked book or project stays out until unlocked)
  const books = useMemo(() => projects
    .filter((p) => !p.pinHash || isUnlocked(p.id, p.pinHash))
    .map((p) => ({
      project: p,
      books: (booksByProject[p.id] || []).filter((b) => !b.pinHash || isUnlocked(b.id, b.pinHash)),
    }))
    .filter((g) => g.books.length), [projects, booksByProject])
  const validBook = (v) => books.some((g) => g.books.some((b) => `${g.project.id}/${b.id}` === v))
  // The chosen book, the one passed in the link, or the only book there is
  const onlyBook = books.length === 1 && books[0].books.length === 1 ? `${books[0].project.id}/${books[0].books[0].id}` : ''
  const book = validBook(bookChoice) ? bookChoice : onlyBook
  const bookOk = Boolean(book)

  const [projectId, bookId] = bookOk ? book.split('/') : [null, null]

  // Parsed, minus anything added before (remembered, or already in the chosen book)
  const inBook = new Set((bookId ? entriesByBook[bookId] || [] : []).map((e) => `${Number(e.timestamp)}|${Number(e.amount)}`))
  // Parsed once per hand-over, not on every keystroke
  const parsed = useMemo(() => (payload ? parseAll(payload.items) : []), [payload])
  const items = payload
    ? parsed.filter((p) => !done.has(p.key) && !inBook.has(`${p.timestamp}|${p.amount}`))
    : []

  // ATM cash and transfers between your own accounts start unticked
  const isTicked = (p) => picked[p.key] ?? (p.kind !== 'atm' && p.kind !== 'transfer')
  const chosen = items.filter(isTicked)

  const descriptionOf = (p) => (edits[p.key]?.payee ?? (p.kind === 'atm' ? '' : p.payee)) || (
    p.type === 'income'
      ? t(p.kind === 'refund' ? 'sms.desc.refund' : p.kind === 'salary' ? 'sms.desc.salary' : 'sms.desc.received')
      : t(`sms.desc.${p.kind === 'atm' ? 'atm' : p.channel}`))
  const categoryOf = (p) => edits[p.key]?.category ?? guessCategory(p, categories)
  const edit = (key, field, value) => setEdits((e) => ({ ...e, [key]: { ...e[key], [field]: value } }))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2200)
  }

  const remember = (keys) => {
    if (!user) return
    const next = new Set(done)
    keys.forEach((k) => next.add(k))
    writeDone(user.uid, next)
    setDone(next)
  }

  const add = () => {
    if (!bookOk || !chosen.length || saving) return
    setSaving(true)
    try {
      const details = (p) => [p.bank, p.account && `••${p.account}`, p.ref && `Ref ${p.ref}`].filter(Boolean).join(' · ')
      const { saved } = addEntries(projectId, bookId, chosen.map((p) => ({
        amount: p.amount,
        type: p.type,
        description: descriptionOf(p).trim().slice(0, 80),
        category: categoryOf(p) || 'General',
        mode: 'UPI',
        timestamp: p.timestamp,
        notes: t('sms.note', { details: details(p) }),
      })))
      saved.catch(() => showToast(t('sms.addError'), 'error'))
      remember(chosen.map((p) => p.key))
      navigate(`/projects/${projectId}/books/${bookId}`, { state: { toast: t('sms.added', { count: chosen.length }) } })
    } catch {
      setSaving(false)
      showToast(t('sms.addError'), 'error')
    }
  }

  const back = () => (bookOk ? navigate(`/projects/${projectId}/books/${bookId}`) : navigate('/settings'))
  const readAgain = () => startSmsImport({ lang, book: bookOk ? book : null })

  // ── What to show ──
  let notice = null
  if (!payload) {
    if (status) notice = status
    else if (timedOut) notice = canImportSms() ? 'timeout' : 'noapp'
  }
  const days = payload?.days || 30

  return (
    <LayoutShell>
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-3 sm:px-6">
        <header className="flex items-center gap-3 pt-1">
          <button type="button" onClick={back} className={roundBtn} aria-label={t('common.back')}>
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury truncate text-[22px] font-semibold text-[var(--text-main)]">{t('sms.title')}</h1>
            <p className="truncate text-[12.5px] text-[var(--text-muted)]">{t('sms.subtitle', { days })}</p>
          </div>
        </header>

        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[var(--text-subtle)]">
          <ShieldCheck size={13} className="flex-shrink-0 text-emerald-600" /> {t('sms.private')}
        </p>

        {/* Waiting for the app, or why nothing came */}
        {!payload && !notice && (
          <div className={`${card} mt-5 flex flex-col items-center gap-3 px-6 py-10 text-center`}>
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-card)] border-t-[var(--gold-primary)]" />
            <p className="text-[13.5px] text-[var(--text-muted)]">{t('sms.waiting')}</p>
          </div>
        )}
        {notice && (
          <div className={`${card} mt-5 flex flex-col items-center gap-3 px-6 py-9 text-center`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
              <MessageSquareText size={19} />
            </span>
            <p className="text-[15px] font-semibold text-[var(--text-main)]">{t(`sms.status.${notice}.title`)}</p>
            <p className="max-w-sm text-[13px] leading-relaxed text-[var(--text-muted)]">{t(`sms.status.${notice}.text`)}</p>
            {notice === 'noapp' ? (
              <a href={APK_URL} download className={`${goldBtn} mt-1`}><Download size={15} /> {t('common.downloadAndroid')}</a>
            ) : canImportSms() && (
              <button type="button" onClick={readAgain} className={`${goldBtn} mt-1`}>{t('sms.readButton')}</button>
            )}
          </div>
        )}

        {/* Review */}
        {payload && (
          <>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{t('sms.book')}</span>
              {books.length ? (
                <select value={bookOk ? book : ''} onChange={(e) => setBook(e.target.value)} className={`${fieldCls} py-2.5 text-[14px]`}>
                  <option value="" disabled>{t('sms.chooseBook')}</option>
                  {books.map((g) => (
                    <optgroup key={g.project.id} label={g.project.name}>
                      {g.books.map((b) => <option key={b.id} value={`${g.project.id}/${b.id}`}>{b.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <p className={`${card} px-4 py-3 text-[13px] text-[var(--text-muted)]`}>{t('sms.noBooks')}</p>
              )}
            </label>

            {items.length === 0 ? (
              <div className={`${card} mt-5 flex flex-col items-center gap-2 px-6 py-9 text-center`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Check size={19} /></span>
                <p className="text-[15px] font-semibold text-[var(--text-main)]">{t('sms.empty.title')}</p>
                <p className="max-w-sm text-[13px] text-[var(--text-muted)]">{t('sms.empty.text', { days })}</p>
                <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-[var(--text-subtle)]">{t('sms.tip')}</p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-[var(--text-main)]">{t('sms.found', { count: items.length })}</p>
                  <button type="button" className="text-[12.5px] font-semibold text-[var(--gold-primary)] cursor-pointer"
                    onClick={() => {
                      const all = chosen.length < items.length
                      setPicked(Object.fromEntries(items.map((p) => [p.key, all])))
                    }}>
                    {chosen.length < items.length ? t('sms.selectAll') : t('sms.selectNone')}
                  </button>
                </div>
                {payload.truncated && <p className="mt-1 text-[11.5px] text-[var(--text-subtle)]">{t('sms.truncated')}</p>}

                <ul className="mt-3 space-y-2.5">
                  {items.map((p) => {
                    const on = isTicked(p)
                    const income = p.type === 'income'
                    const when = new Date(p.timestamp)
                    const meta = [
                      when.toLocaleDateString(intl, { day: 'numeric', month: 'short' }) + ', ' + when.toLocaleTimeString(intl, { hour: 'numeric', minute: '2-digit' }),
                      p.bank,
                      p.account && `••${p.account}`,
                      t(`sms.channel.${p.channel}`),
                    ].filter(Boolean).join(' · ')
                    return (
                      <li key={p.key} className={`${card} px-3.5 py-3 transition-opacity ${on ? '' : 'opacity-60'}`}>
                        <div className="flex items-start gap-3">
                          <button type="button" role="checkbox" aria-checked={on} aria-label={descriptionOf(p)}
                            onClick={() => setPicked((x) => ({ ...x, [p.key]: !on }))}
                            className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer ${on ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)] text-white' : 'border-[var(--border-card)] bg-[var(--bg-page)]'}`}>
                            {on && <Check size={13} strokeWidth={3} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${income ? 'bg-emerald-500/12 text-emerald-600' : 'bg-rose-500/12 text-rose-600'}`}>
                                {income ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                              </span>
                              <input value={descriptionOf(p)} onChange={(e) => edit(p.key, 'payee', e.target.value)} maxLength={80}
                                aria-label={t('sms.description')} className="min-w-0 flex-1 truncate bg-transparent text-[14px] font-semibold text-[var(--text-main)] outline-none" />
                              <span className={`flex-shrink-0 text-[14px] font-semibold tabular-nums ${income ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {income ? '+' : '−'}{symbol}{formatAmount(p.amount)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[11.5px] text-[var(--text-muted)]">{meta}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <select value={categoryOf(p)} onChange={(e) => edit(p.key, 'category', e.target.value)} aria-label={t('sms.category')}
                                className="min-w-0 max-w-[60%] rounded-full border border-[var(--border-card)] bg-[var(--bg-page)] px-2.5 py-1 text-[12px] text-[var(--text-main)] outline-none">
                                <option value="">{t('sms.noCategory')}</option>
                                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                              </select>
                              {p.kind && <span className="min-w-0 truncate rounded-full bg-[var(--gold-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--gold-primary)]">{t(`sms.kind.${p.kind}`)}</span>}
                              <button type="button" onClick={() => remember([p.key])} aria-label={t('sms.hide')} title={t('sms.hide')}
                                className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-subtle)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] cursor-pointer">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-4 px-1 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">{t('sms.tip')}</p>
              </>
            )}
          </>
        )}
      </div>

      {payload && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 sm:bottom-6">
          <div className="mx-auto max-w-2xl">
            <button type="button" onClick={add} disabled={!bookOk || !chosen.length || saving} className={`${goldBtn} w-full py-3.5 text-[15px] shadow-lg`}>
              {!bookOk ? t('sms.chooseBook') : t('sms.add', { count: chosen.length })}
            </button>
          </div>
        </div>
      )}

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
