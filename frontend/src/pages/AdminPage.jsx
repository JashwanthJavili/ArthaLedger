import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, RefreshCw, Users, Activity, Bell, Inbox, BookOpen, Star, Search, Lightbulb, Bug, Heart,
  MessageCircle, Sparkles, Trash2, Reply, Loader2, ShieldAlert, Mail, CheckCircle2, Globe,
} from 'lucide-react'
import LayoutShell from '../components/LayoutShell'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Toast from '../components/common/Toast'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { isAdminUser } from '../lib/admin'

const KIND = {
  suggestion: { label: 'Idea', Icon: Lightbulb, cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  bug: { label: 'Problem', Icon: Bug, cls: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
  praise: { label: 'Praise', Icon: Heart, cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  other: { label: 'Other', Icon: MessageCircle, cls: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
}
const STATUSES = [['new', 'New'], ['seen', 'Read'], ['planned', 'Planned'], ['done', 'Done']]
const FILTERS = [['all', 'All'], ['new', 'New'], ['suggestion', 'Ideas'], ['bug', 'Problems'], ['praise', 'Praise'], ['featured', 'On website']]

const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
function ago(ms, now) {
  if (!ms) return 'never'
  const m = Math.round((now - ms) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} d ago`
  return fmtDate(ms)
}
const initials = (name, email) => ((name || email || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase()

function Stat({ icon: Icon, label, value, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-3.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold-light)] text-[var(--gold-primary)]"><Icon size={16} /></span>
      <p className="mt-2.5 text-[22px] font-semibold tabular-nums leading-none text-[var(--text-main)]">{value ?? '—'}</p>
      <p className="mt-1 text-[11.5px] text-[var(--text-muted)]">{label}</p>
    </motion.div>
  )
}

/**
 * Admin dashboard: what people are saying and who is using the app.
 * The server only answers these calls for admin accounts; users are shown
 * with account details and counts, never their entries or amounts.
 */
export default function AdminPage() {
  const { user } = useAuth()
  const allowed = isAdminUser(user)
  const [tab, setTab] = useState('feedback')
  const [feedback, setFeedback] = useState({ loading: true, items: [], error: '' })
  const [people, setPeople] = useState({ loading: true, users: [], summary: null, error: '' })
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400)
  }

  const load = useCallback((fresh = false) => {
    api('/v1/admin/feedback')
      .then(d => { setNow(Date.now()); setFeedback({ loading: false, items: d.items || [], error: '' }) })
      .catch(e => setFeedback(f => ({ ...f, loading: false, error: e.message })))
    api(`/v1/admin/users${fresh ? '?fresh=true' : ''}`, { timeoutMs: 90000 })
      .then(d => setPeople({ loading: false, users: d.users || [], summary: d.summary, error: '' }))
      .catch(e => setPeople(p => ({ ...p, loading: false, error: e.message })))
  }, [])

  useEffect(() => { if (allowed) load() }, [allowed, load])

  const refresh = () => {
    setFeedback(f => ({ ...f, loading: true }))
    setPeople(p => ({ ...p, loading: true }))
    load(true)
  }

  const patch = async (id, changes) => {
    const before = feedback.items
    setFeedback(f => ({ ...f, items: f.items.map(i => (i.id === id ? { ...i, ...changes } : i)) }))
    try {
      const updated = await api(`/v1/admin/feedback/${id}`, { method: 'PATCH', body: changes })
      setFeedback(f => ({ ...f, items: f.items.map(i => (i.id === id ? { ...i, ...updated } : i)) }))
      return true
    } catch (e) {
      setFeedback(f => ({ ...f, items: before }))
      showToast(e.message, 'error')
      return false
    }
  }

  const remove = async (id) => {
    try {
      await api(`/v1/admin/feedback/${id}`, { method: 'DELETE' })
    } catch (e) {
      showToast(e.message, 'error')
      throw e
    }
    setFeedback(f => ({ ...f, items: f.items.filter(i => i.id !== id) }))
    showToast('Message deleted')
  }

  if (!allowed) {
    return (
      <LayoutShell>
        <div className="mx-auto flex max-w-sm flex-col items-center py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"><ShieldAlert size={26} /></span>
          <h1 className="mt-4 text-[18px] font-semibold text-[var(--text-main)]">Admins only</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">This page is for the ArthaLedger team.</p>
          <Link to="/dashboard" className="mt-6 rounded-xl bg-[var(--gold-primary)] px-5 py-2.5 text-[13px] font-semibold text-white">Back to Home</Link>
        </div>
      </LayoutShell>
    )
  }

  const newCount = feedback.items.filter(i => (i.status || 'new') === 'new').length
  const s = people.summary

  return (
    <LayoutShell>
      <div className="mx-auto max-w-3xl space-y-5 pb-28">
        <header className="flex items-center gap-3">
          <Link to="/settings" aria-label="Back"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)]">
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury text-[24px] font-semibold leading-tight text-[var(--text-main)]">Admin</h1>
            <p className="text-[12px] text-[var(--text-subtle)]">Feedback, users and testimonials</p>
          </div>
          <button type="button" onClick={refresh} aria-label="Refresh"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
            <RefreshCw size={16} className={feedback.loading || people.loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <Stat icon={Users} label="Users" value={s?.total} delay={0} />
          <Stat icon={Activity} label="Active this week" value={s?.activeThisWeek} delay={0.03} />
          <Stat icon={Bell} label="Reminders on" value={s?.withReminders} delay={0.06} />
          <Stat icon={BookOpen} label="Entries logged" value={s?.entries?.toLocaleString('en-IN')} delay={0.09} />
          <div className="col-span-2 sm:col-span-1"><Stat icon={Inbox} label="New messages" value={feedback.loading ? null : newCount} delay={0.12} /></div>
        </div>

        <div className="flex gap-1 rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] p-1">
          {[['feedback', `Feedback${feedback.items.length ? ` (${feedback.items.length})` : ''}`], ['users', `Users${people.users.length ? ` (${people.users.length})` : ''}`]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`relative flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors cursor-pointer ${tab === k ? 'text-[var(--bg-page)]' : 'text-[var(--text-muted)]'}`}>
              {tab === k && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-[var(--text-main)]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>

        {tab === 'feedback'
          ? <FeedbackList state={feedback} now={now} onPatch={patch} onDelete={remove} />
          : <UserList state={people} now={now} />}
      </div>
      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}

function Empty({ children }) {
  return <p className="rounded-2xl border border-dashed border-[var(--border-card)] py-12 text-center text-[13px] text-[var(--text-subtle)]">{children}</p>
}

function ErrorBox({ children }) {
  return <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-600 dark:text-rose-400">{children}</p>
}

function FeedbackList({ state, now, onPatch, onDelete }) {
  const [filter, setFilter] = useState('all')
  const [deleting, setDeleting] = useState(null)
  const items = useMemo(() => state.items.filter(i => {
    if (filter === 'all') return true
    if (filter === 'new') return (i.status || 'new') === 'new'
    if (filter === 'featured') return i.featured
    return i.kind === filter
  }), [state.items, filter])

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
              filter === k ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--text-main)]' : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}>{l}</button>
        ))}
      </div>

      {state.error && <ErrorBox>{state.error}</ErrorBox>}
      {state.loading && !state.items.length ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <Empty>{state.items.length ? 'Nothing matches this filter.' : 'No feedback yet. It will show up here as people send it.'}</Empty>
      ) : (
        <AnimatePresence initial={false}>
          {items.map(item => <FeedbackCard key={item.id} item={item} now={now} onPatch={onPatch} onDelete={() => setDeleting(item)} />)}
        </AnimatePresence>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => onDelete(deleting.id)}
        title="Delete this message?"
        message="It will be removed for good, and taken off the website if it was shown there."
      />
    </div>
  )
}

function FeedbackCard({ item, now, onPatch, onDelete }) {
  const k = KIND[item.kind] || KIND.other
  const [replying, setReplying] = useState(false)
  const [reply, setReply] = useState(item.reply || '')
  const [saving, setSaving] = useState(false)

  const saveReply = async () => {
    setSaving(true)
    if (await onPatch(item.id, { reply })) setReplying(false)
    setSaving(false)
  }

  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={`rounded-2xl border bg-[var(--bg-card)] p-4 ${(item.status || 'new') === 'new' ? 'border-[var(--gold-primary)]/50' : 'border-[var(--border-card)]'}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[12px] font-bold text-[var(--gold-primary)]">
          {initials(item.name, item.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-[var(--text-main)]">{item.name || 'No name'}</p>
          <a href={`mailto:${item.email}`} className="selectable block truncate text-[11.5px] text-[var(--text-muted)] hover:underline">{item.email}</a>
        </div>
        <span className="flex-shrink-0 text-[11px] text-[var(--text-subtle)]">{ago(item.createdAt, now)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${k.cls}`}><k.Icon size={11} /> {k.label}</span>
        {item.rating ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--gold-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-main)]">
            <Star size={11} className="fill-[var(--gold-primary)] text-[var(--gold-primary)]" /> {item.rating}/5
          </span>
        ) : null}
        {item.allowPublic && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--border-subtle)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"><Globe size={11} /> Can be shown</span>}
        {item.featured && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><Sparkles size={11} /> On website</span>}
      </div>

      <p className="selectable mt-2.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--text-main)]">{item.message}</p>

      {item.reply && !replying && (
        <div className="mt-3 rounded-xl bg-[var(--gold-light)] px-3 py-2.5">
          <p className="text-[11px] font-semibold text-[var(--text-main)]">Your reply · {fmtDate(item.repliedAt)}</p>
          <p className="selectable mt-0.5 whitespace-pre-wrap text-[12.5px] text-[var(--text-muted)]">{item.reply}</p>
        </div>
      )}

      {replying && (
        <div className="mt-3 space-y-2">
          <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} autoFocus
            placeholder="Write a reply. They will see it in the app under Your messages."
            className="w-full resize-none rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-2.5 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--gold-primary)]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setReplying(false); setReply(item.reply || '') }}
              className="flex-1 rounded-xl border border-[var(--border-card)] py-2 text-[12.5px] font-semibold text-[var(--text-muted)] cursor-pointer">Cancel</button>
            <button type="button" onClick={saveReply} disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--gold-primary)] py-2 text-[12.5px] font-semibold text-white disabled:opacity-60 cursor-pointer">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save reply
            </button>
          </div>
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
        <select value={item.status || 'new'} onChange={(e) => onPatch(item.id, { status: e.target.value })} aria-label="Status"
          className="h-9 rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-2.5 text-[12.5px] font-medium text-[var(--text-main)] outline-none cursor-pointer">
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" onClick={() => setReplying(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-card)] px-3 text-[12.5px] font-medium text-[var(--text-main)] cursor-pointer">
          <Reply size={13} /> {item.reply ? 'Edit reply' : 'Reply'}
        </button>
        <button type="button" disabled={!item.allowPublic} onClick={() => onPatch(item.id, { featured: !item.featured })}
          title={item.allowPublic ? '' : 'They did not allow this to be shown publicly'}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
            item.featured ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-[var(--border-card)] text-[var(--text-main)]'
          }`}>
          <Sparkles size={13} /> {item.featured ? 'Remove from website' : 'Show on website'}
        </button>
        <a href={`mailto:${item.email}?subject=Re: your ArthaLedger feedback`} aria-label="Email"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-card)] text-[var(--text-muted)]"><Mail size={14} /></a>
        <button type="button" onClick={onDelete} aria-label="Delete"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"><Trash2 size={15} /></button>
      </div>
    </motion.article>
  )
}

function UserList({ state, now }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('newest')
  const users = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = state.users.filter(u => !t || (u.name || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t))
    const active = (u) => u.lastActiveAt || u.lastSignInAt || 0
    if (sort === 'active') return [...list].sort((a, b) => active(b) - active(a))
    if (sort === 'entries') return [...list].sort((a, b) => (b.entries || 0) - (a.entries || 0))
    return list
  }, [state.users, q, sort])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 focus-within:border-[var(--gold-primary)]">
          <Search size={15} className="text-[var(--text-subtle)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-subtle)]" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort users"
          className="h-11 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3 text-[12.5px] font-medium text-[var(--text-main)] outline-none cursor-pointer">
          <option value="newest">Newest</option>
          <option value="active">Recently active</option>
          <option value="entries">Most entries</option>
        </select>
      </div>

      {state.error && <ErrorBox>{state.error}</ErrorBox>}
      {state.loading && !state.users.length ? (
        <div className="space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : users.length === 0 ? (
        <Empty>{state.users.length ? 'No one matches that search.' : 'No users yet.'}</Empty>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
          {users.map(u => (
            <li key={u.uid} className="flex items-center gap-3 px-4 py-3">
              {u.photoURL
                ? <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                : <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[12px] font-bold text-[var(--gold-primary)]">{initials(u.name, u.email)}</span>}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-[var(--text-main)]">
                  <span className="truncate">{u.name || 'No name'}</span>
                  {u.emailVerified && <CheckCircle2 size={12} className="flex-shrink-0 text-emerald-500" aria-label="Verified" />}
                  {u.reminders && <Bell size={11} className="flex-shrink-0 text-[var(--gold-primary)]" aria-label="Reminders on" />}
                </p>
                <p className="selectable truncate text-[11.5px] text-[var(--text-muted)]">{u.email}</p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-subtle)]">
                  Joined {fmtDate(u.createdAt)} · active {ago(u.lastActiveAt || u.lastSignInAt, now)}
                  {u.providers?.includes('google.com') ? ' · Google' : ''}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[14px] font-semibold tabular-nums text-[var(--text-main)]">{(u.entries || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10.5px] text-[var(--text-subtle)]">{u.projects || 0}p · {u.books || 0}b</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="px-1 text-[11px] text-[var(--text-subtle)]">Counts only. Entries, amounts and notes stay private to each user.</p>
    </div>
  )
}
