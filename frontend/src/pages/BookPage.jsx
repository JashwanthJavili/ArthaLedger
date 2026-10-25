import { useEffect, useMemo, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import {
  Search, Download, ArrowLeft, MoreVertical, SlidersHorizontal,
  Pencil, Trash2, X, ArrowDownLeft, ArrowUpRight, Check, Tags,
  Hash, Lock, Unlock, Link2, ArrowLeftRight,
} from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import LayoutShell from '../components/LayoutShell'
import PageSkeleton from '../components/common/PageSkeleton'
import EntryCard from '../components/cards/EntryCard'
import SummaryStrip from '../components/cards/SummaryCard'
import EntryModal from '../components/forms/EntryModal'
import BookModal from '../components/forms/BookModal'
import CategoryManager from '../components/forms/CategoryManager'
import FilterSheet from '../components/forms/FilterSheet'
import { describeDateRange } from '../lib/dateRanges'
import ConfirmDialog from '../components/common/ConfirmDialog'
import DeleteDialog from '../components/common/DeleteDialog'
import SetPinModal from '../components/common/SetPinModal'
import Toast from '../components/common/Toast'
import { useAppData } from '../context/AppDataContext'
import { useBudgets } from '../hooks/useBudgets'
import { exportBookPdf } from '../lib/pdf'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import { isUnlocked, lockItem, setUnlocked } from '../lib/pin'
import PinModal from '../components/common/PinModal'
import SendToTripModal from '../components/forms/SendToTripModal'
import TransferModal from '../components/forms/TransferModal'
import { compareNewestFirst, compareOldestFirst } from '../lib/entryOrder'
import { useI18n } from '../i18n/core'
import { Trans } from '../i18n/Trans'

const defaultCategories = []

/* ── Shared dropdown (closes on outside click) ── */
function useDismiss(setOpen) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [setOpen])
  return ref
}

const menuPanel = 'absolute right-0 z-50 overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-page)] py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)]'
const menuItem = 'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer'

function DropdownMotion({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.12 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Per-entry 3-dot menu ──
 * variant: 'normal' | 'transfer_out' (owned here) | 'transfer_in' (owned by sender) | 'orphan_in'
 */
function EntryMenu({ variant = 'normal', sourceName, onEdit, onDelete, onOpenSource }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(setOpen)
  const { t } = useI18n()
  const isLinkedIn = variant === 'transfer_in'

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-subtle)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        aria-label={t('book.menu.entryOptions')}
      >
        {isLinkedIn ? <Link2 size={14} /> : <MoreVertical size={15} />}
      </button>
      <AnimatePresence>
        {open && (
          <DropdownMotion className={`${menuPanel} top-9 ${isLinkedIn ? 'w-60' : 'w-44'}`}>
            {isLinkedIn ? (
              <>
                <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                  <Lock size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-subtle)]" />
                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    <Trans k="book.menu.receivedFrom" vars={{ name: sourceName || t('book.menu.anotherBook') }} components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} />
                  </p>
                </div>
                {onOpenSource && (
                  <>
                    <div className="my-1 h-px bg-[var(--border-subtle)]" />
                    <button onClick={() => { onOpenSource(); setOpen(false) }} className={menuItem}>
                      <ArrowUpRight size={13} className="text-[var(--text-muted)]" /> {t('book.menu.openSource', { name: sourceName || t('book.menu.sendingBook') })}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {variant !== 'orphan_in' && (
                  <button onClick={() => { onEdit(); setOpen(false) }} className={menuItem}>
                    <Pencil size={13} className="text-[var(--text-muted)]" /> {variant === 'transfer_out' ? t('book.menu.editTransfer') : t('common.edit')}
                  </button>
                )}
                <button onClick={() => { onDelete(); setOpen(false) }} className={`${menuItem} !text-rose-600 dark:!text-rose-400`}>
                  <Trash2 size={13} /> {variant === 'transfer_out' ? t('book.menu.deleteTransfer') : t('common.delete')}
                </button>
              </>
            )}
          </DropdownMotion>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Book header 3-dot menu ── */
function BookHeaderMenu({ onEdit, onDelete, onSetPin, onManageCategories, onTransfer, hasPin }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(setOpen)
  const { t } = useI18n()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer"
        aria-label={t('book.menu.bookOptions')}
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <DropdownMotion className={`${menuPanel} mt-2 w-52`}>
            {onTransfer && (
              <button onClick={() => { onTransfer(); setOpen(false) }} className={menuItem}>
                <ArrowLeftRight size={14} className="text-[var(--text-muted)]" /> {t('book.menu.transferMoney')}
              </button>
            )}
            <button onClick={() => { onManageCategories(); setOpen(false) }} className={menuItem}>
              <Tags size={14} className="text-[var(--text-muted)]" /> {t('book.menu.manageCategories')}
            </button>
            <button onClick={() => { onSetPin(); setOpen(false) }} className={menuItem}>
              {hasPin
                ? <><Unlock size={14} className="text-[var(--text-muted)]" /> {t('book.menu.changePin')}</>
                : <><Lock size={14} className="text-[var(--text-muted)]" /> {t('book.menu.setPinLock')}</>}
            </button>
            <button onClick={() => { onEdit(); setOpen(false) }} className={menuItem}>
              <Pencil size={14} className="text-[var(--text-muted)]" /> {t('book.menu.editBook')}
            </button>
            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button onClick={() => { onDelete(); setOpen(false) }} className={`${menuItem} !text-rose-600 dark:!text-rose-400`}>
              <Trash2 size={14} /> {t('book.menu.deleteBook')}
            </button>
          </DropdownMotion>
        )}
      </AnimatePresence>
    </div>
  )
}

// Money into the book (income, transfer in) vs. out of it (expense, transfer out).
const isCreditEntry = (e) => e.type === 'income' || e.type === 'transfer_in'
const isDebitEntry = (e) => e.type === 'expense' || e.type === 'transfer_out'
const roundMoney = (n) => Math.round(n * 100) / 100

export default function BookPage() {
  const { projectId, bookId } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const {
    loading,
    error,
    projects, booksByProject, entriesByBook, templatesByBook, trips,
    addEntry, deleteEntry, updateCategories, getCategories,
    updateBook, updateEntry, deleteBook, setPinForBook, setPinForProject,
    linkEntriesToTrip, unlinkEntryFromTrip, saveTemplate, deleteTemplate,
    transferBetweenBooks, updateTransfer,
    categories: liveCategories = [],
  } = useAppData()

  // ── Budget hint data ───────────────────────────────────────────────────────
  const { budgets } = useBudgets()

  // Current-month spent per category across ALL books (same as Analytics page)
  const currentMonthSpentByCategory = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const result = {}
    Object.values(entriesByBook).forEach(bookEntries => {
      bookEntries.forEach(e => {
        if (e.isTransfer || e.type !== 'expense') return
        if (e.timestamp < startOfMonth) return
        const cat = e.category || 'General'
        result[cat] = (result[cat] || 0) + Number(e.amount || 0)
      })
    })
    return result
  }, [entriesByBook])

  // ?add=expense|income (from a reminder's "Add" button) opens a new entry directly
  const [modalType, setModalType] = useState(() => {
    const add = new URLSearchParams(window.location.search).get('add')
    return add === 'income' || add === 'expense' ? add : null
  })
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('add')) return
    url.searchParams.delete('add')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [])
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [categories, setCategories] = useState(defaultCategories)
  const [editingBook, setEditingBook] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState(null)
  const [deleteBookConfirm, setDeleteBookConfirm] = useState(false)
  const [setPinOpen, setSetPinOpen] = useState(false)
  const [, refreshLock] = useState(0)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const [filters, setFilters] = useState({
    type: 'all', mode: 'all', category: 'all', enteredBy: 'all', from: '', to: '',
  })

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedEntryIds, setSelectedEntryIds] = useState([])
  const [openSendToTripModal, setOpenSendToTripModal] = useState(false)
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    let t = null
    if (loading) t = setTimeout(() => setStalled(true), 3500)
    else setStalled(false)
    return () => clearTimeout(t)
  }, [loading])

  const toggleSelectEntry = (entryId) => {
    setSelectedEntryIds(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
  }

  const handleSendToTrip = async (tripId) => {
    try {
      const refs = selectedEntryIds.map(id => ({
        projectId,
        bookId,
        entryId: id
      }))
      await linkEntriesToTrip(tripId, refs)
      showToast(t('book.toast.addedToGroup'))
      setIsMultiSelectMode(false)
      setSelectedEntryIds([])
    } catch (err) {
      showToast(err?.message || t('book.toast.linkFailed'), 'error')
    }
  }

  const longPressTimeoutRef = useRef(null)

  const getLongPressHandlers = (entryId) => {
    if (isMultiSelectMode) return {}

    return {
      onTouchStart: () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = setTimeout(() => {
          setIsMultiSelectMode(true)
          setSelectedEntryIds([entryId])
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50)
          }
        }, 600)
      },
      onTouchEnd: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
      },
      onTouchMove: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
      },
      onMouseDown: () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = setTimeout(() => {
          setIsMultiSelectMode(true)
          setSelectedEntryIds([entryId])
        }, 600)
      },
      onMouseUp: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
      },
      onMouseLeave: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
      }
    }
  }

  const project = projects.find((p) => p.id === projectId)
  const book = (booksByProject[projectId] || []).find((b) => b.id === bookId)
  const entries = entriesByBook[bookId] || []
  const descriptionSuggestions = useMemo(() => {
    const counts = new Map()
    const latestEntry = new Map()

    entries.forEach((entry) => {
      const description = String(entry.description || '').trim()
      if (!description) return
      const key = description.toLowerCase()
      counts.set(key, {
        description,
        count: (counts.get(key)?.count || 0) + 1,
      })
      const prev = latestEntry.get(key)
      if (!prev || Number(entry.timestamp || 0) >= Number(prev.timestamp || 0)) latestEntry.set(key, entry)
    })

    // Each suggestion carries the details of its most recent use so the
    // entry form can pre-fill category, mode and amount.
    return Array.from(counts.entries())
      .map(([key, value]) => {
        const last = latestEntry.get(key) || {}
        return {
          description: value.description,
          count: value.count,
          lastUsedAt: Number(last.timestamp || 0),
          type: last.type,
          category: last.category,
          subcategory: last.subcategory,
          mode: last.mode,
          amount: last.amount,
        }
      })
      .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
  }, [entries])

  useEffect(() => {
    if (liveCategories?.length) {
      setCategories(liveCategories)
    } else {
      getCategories(projectId, bookId).then((saved) => {
        if (saved?.length) setCategories(saved)
      })
    }
  }, [liveCategories, projectId, bookId, getCategories])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const focusedId = params.get('focusedEntryId')
    if (focusedId && entries.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`entry-${focusedId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-2', 'ring-amber-500', 'rounded-2xl', 'scale-[1.02]')
          const removeTimer = setTimeout(() => {
            element.classList.remove('ring-2', 'ring-amber-500', 'scale-[1.02]')
          }, 3000)
          return () => clearTimeout(removeTimer)
        }
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [entries])

  // Lock the book when navigating away (so PIN is required next visit)
  useEffect(() => {
    return () => {
      if (book?.pinHash) lockItem(bookId)
    }
  }, [bookId, book?.pinHash])

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const q = search.toLowerCase()
        const searchMatch =
          entry.description?.toLowerCase().includes(q) ||
          entry.category?.toLowerCase().includes(q) ||
          entry.enteredBy?.toLowerCase().includes(q)
        const typeMatch = filters.type === 'all' || entry.type === filters.type
        const modeMatch = filters.mode === 'all' || entry.mode === filters.mode
        const categoryMatch = filters.category === 'all' || entry.category === filters.category
        const byMatch = filters.enteredBy === 'all' || entry.enteredBy === filters.enteredBy
        const fromMatch = !filters.from || entry.timestamp >= new Date(filters.from).getTime()
        const toMatch = !filters.to || entry.timestamp <= new Date(filters.to + 'T23:59:59').getTime()
        return searchMatch && typeMatch && modeMatch && categoryMatch && byMatch && fromMatch && toMatch
      })
      .sort(compareNewestFirst)
  }, [entries, search, filters])

  // Group filtered entries by calendar date
  const groupedEntries = useMemo(() => {
    const groups = new Map()
    filteredEntries.forEach(entry => {
      const d = new Date(entry.timestamp)
      const key = format(d, 'yyyy-MM-dd')
      if (!groups.has(key)) groups.set(key, { date: d, entries: [] })
      groups.get(key).entries.push(entry)
    })
    return Array.from(groups.values())
  }, [filteredEntries])

  const formatGroupDate = (date) => {
    if (isToday(date))     return t('common.today')
    if (isYesterday(date)) return t('common.yesterday')
    return format(date, 'dd MMM yyyy', { locale })
  }

  const summary = useMemo(() => {
    const totalIn = roundMoney(entries.filter(isCreditEntry).reduce((acc, e) => acc + Number(e.amount || 0), 0))
    const totalOut = roundMoney(entries.filter(isDebitEntry).reduce((acc, e) => acc + Number(e.amount || 0), 0))
    return { totalIn, totalOut, net: roundMoney(totalIn - totalOut) }
  }, [entries])

  const bookBalanceOf = (id) => roundMoney((entriesByBook[id] || []).reduce((acc, e) => {
    const amt = Number(e.amount || 0)
    if (isCreditEntry(e)) return acc + amt
    if (isDebitEntry(e)) return acc - amt
    return acc
  }, 0))

  // Running balance per entry, oldest → newest, so each row's "Bal" always
  // agrees with the Net balance card (stored balanceAfter can be stale).
  const balanceById = useMemo(() => {
    const map = new Map()
    let running = 0
    ;[...entries]
      .sort(compareOldestFirst)
      .forEach((e) => {
        const amt = Number(e.amount || 0)
        if (isCreditEntry(e)) running = roundMoney(running + amt)
        else if (isDebitEntry(e)) running = roundMoney(running - amt)
        map.set(e.id, running)
      })
    return map
  }, [entries])

  const hasActiveFilters = filters.type !== 'all' || filters.mode !== 'all' || filters.category !== 'all' || filters.enteredBy !== 'all' || filters.from || filters.to
  const enteredByList = Array.from(new Set(entries.map((e) => e.enteredBy).filter(Boolean)))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2200)
  }

  const clearFilters = () => setFilters({ type: 'all', mode: 'all', category: 'all', enteredBy: 'all', from: '', to: '' })

  if (error) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 max-w-sm">
            <p className="text-sm font-semibold text-red-800">{t('book.loadError')}</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
          >
            {t('book.retryLoading')}
          </button>
        </div>
      </LayoutShell>
    )
  }

  if (!(project && book)) {
    if (loading) return <PageSkeleton slow={stalled} hideHeader label={t('book.opening')} />

    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-stone-500">{t('book.notFound')}</p>
          <Link to={`/projects/${projectId}`} className="text-xs text-amber-700 hover:underline">{t('book.goBack')}</Link>
        </div>
      </LayoutShell>
    )
  }

  // ── PIN gate: a locked project or book never renders its contents ──
  const projectLocked = Boolean(project.pinHash) && !isUnlocked(projectId, project.pinHash)
  const bookLocked = Boolean(book.pinHash) && !isUnlocked(bookId, book.pinHash)
  if (projectLocked || bookLocked) {
    const target = projectLocked
      ? { id: projectId, name: project.name, hash: project.pinHash, length: project.pinLength, kind: 'project' }
      : { id: bookId, name: book.name, hash: book.pinHash, length: book.pinLength, kind: 'book' }
    return (
      <LayoutShell hideHeader>
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold-light)] text-[var(--gold-primary)]">
            <Lock size={24} />
          </span>
          <p className="text-sm font-semibold text-[var(--text-main)]">{t('book.locked', { name: target.name })}</p>
          <Link to={projectLocked ? '/dashboard' : `/projects/${projectId}`} className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)]">
            {t('book.goBack')}
          </Link>
        </div>
        <PinModal
          open
          onClose={() => {
            if (!isUnlocked(target.id, target.hash)) navigate(projectLocked ? '/dashboard' : `/projects/${projectId}`, { replace: true })
          }}
          storedHash={target.hash}
          pinLength={target.length}
          guardId={target.id}
          itemName={target.name}
          onUnlock={() => { setUnlocked(target.id, target.hash); refreshLock((n) => n + 1) }}
          onRehash={(hash, length) => (target.kind === 'project'
            ? setPinForProject(projectId, hash, length)
            : setPinForBook(projectId, bookId, hash, length))}
          onRemovePin={() => (target.kind === 'project'
            ? setPinForProject(projectId, null)
            : setPinForBook(projectId, bookId, null))}
        />
      </LayoutShell>
    )
  }

  const symbol = getCurrencySymbol()
  const allBooks = Object.values(booksByProject).flat()
  const bookNameById = (id) => allBooks.find((b) => b.id === id)?.name
  const hasTransferTarget = allBooks.length > 1
  const sourceBookName = (entry) => (entry.type === 'transfer_in' ? bookNameById(entry.fromBookId) : undefined)
  // A received transfer stays locked while the sender's side still exists.
  const entryMenuVariant = (entry) => {
    if (!entry.transferId) return 'normal'
    if (entry.type === 'transfer_out') return 'transfer_out'
    const senderBookExists = (booksByProject[entry.fromProjectId] || []).some((b) => b.id === entry.fromBookId)
    const senderEntries = entriesByBook[entry.fromBookId]
    if (!senderBookExists) return 'orphan_in'
    if (senderEntries && !senderEntries.some((e) => e.transferId === entry.transferId)) return 'orphan_in'
    return 'transfer_in'
  }
  const categoryNames = categories.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
  const TYPE_LABELS = { income: t('book.cashIn'), expense: t('book.cashOut'), transfer_in: t('book.transferIn'), transfer_out: t('book.transferOut') }
  const dateLabel = describeDateRange(filters.from, filters.to)
  const activeFilterChips = [
    filters.type !== 'all' && { key: 'type', label: TYPE_LABELS[filters.type] || filters.type, clear: () => setFilters((p) => ({ ...p, type: 'all' })) },
    filters.mode !== 'all' && { key: 'mode', label: filters.mode === 'Cash' ? t('entry.mode.cash') : filters.mode, clear: () => setFilters((p) => ({ ...p, mode: 'all' })) },
    filters.category !== 'all' && { key: 'category', label: filters.category, clear: () => setFilters((p) => ({ ...p, category: 'all' })) },
    filters.enteredBy !== 'all' && { key: 'enteredBy', label: filters.enteredBy, clear: () => setFilters((p) => ({ ...p, enteredBy: 'all' })) },
    dateLabel && { key: 'date', label: dateLabel, clear: () => setFilters((p) => ({ ...p, from: '', to: '' })) },
  ].filter(Boolean)

  return (
    <LayoutShell hideHeader>
      <div className="mx-auto max-w-2xl space-y-4 pb-36">
        {loading && stalled && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-400">
            {t('book.slowConnection')}
          </div>
        )}

        {/* ── Header ── */}
        <header className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            aria-label={t('book.backToProject')}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury truncate text-[23px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--text-main)]">{book.name}</h1>
            <p className="font-serif-luxury mt-0.5 truncate text-[13.5px] italic text-[var(--text-muted)]">
              {book.description || project.name}
            </p>
          </div>
          <button
            onClick={() => exportBookPdf({
              projectName: project.name,
              bookName: book.name,
              summary,
              entries: entries.map((e) => ({ ...e, balanceAfter: balanceById.get(e.id) ?? e.balanceAfter })),
            })}
            title={t('book.exportPdf')}
            aria-label={t('book.exportPdf')}
            className="flex h-10 flex-shrink-0 items-center gap-2 rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] px-3 sm:px-4 text-xs font-semibold text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span className="hidden sm:inline">{t('book.export')}</span>
          </button>
          <BookHeaderMenu
            onEdit={() => setEditingBook(true)}
            onDelete={() => setDeleteBookConfirm(true)}
            onSetPin={() => setSetPinOpen(true)}
            onManageCategories={() => setShowCatManager(true)}
            onTransfer={hasTransferTarget ? () => setTransferOpen(true) : undefined}
            hasPin={Boolean(book.pinHash)}
          />
        </header>

        {/* ── Summary ── */}
        <SummaryStrip
          net={summary.net}
          totalIn={summary.totalIn}
          totalOut={summary.totalOut}
          delay={0}
        />

        {/* ── Transactions ── */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-main)]">{t('book.transactions')}</h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                {filteredEntries.length === entries.length
                  ? t('book.count', { count: entries.length })
                  : t('book.filteredCount', { shown: filteredEntries.length, total: entries.length })}
              </p>
            </div>
            {entries.length > 0 && (
              <button
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode)
                  setSelectedEntryIds([])
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isMultiSelectMode
                    ? 'bg-[var(--text-main)] text-[var(--bg-page)]'
                    : 'text-[var(--gold-primary)] hover:bg-[var(--gold-light)]'
                }`}
              >
                {isMultiSelectMode ? t('common.cancel') : t('book.select')}
              </button>
            )}
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 focus-within:border-[var(--gold-primary)] transition-colors">
              <Search size={15} className="flex-shrink-0 text-[var(--text-subtle)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('book.searchPlaceholder')}
                className="w-full bg-transparent text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label={t('book.clearSearch')} className="text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label={t('book.filters')}
              aria-expanded={showFilters}
              className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                showFilters || hasActiveFilters
                  ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--gold-primary)]'
                  : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <SlidersHorizontal size={16} />
              {hasActiveFilters && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--gold-primary)]" />}
            </button>
          </div>

          {/* Active filters */}
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilterChips.map(({ key, label, clear }) => (
                <span key={key}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--gold-primary)]/40 bg-[var(--gold-light)] py-1 pl-3 pr-1 text-[11px] font-medium text-[var(--text-main)]">
                  {label}
                  <button onClick={clear} aria-label={t('book.removeFilter', { label })}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-subtle)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button onClick={clearFilters}
                className="px-1.5 text-[11px] font-semibold text-[var(--gold-primary)] hover:underline cursor-pointer">
                {t('book.clearAll')}
              </button>
            </div>
          )}

          {/* List */}
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                <Hash size={20} />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">
                  {loading ? t('book.empty.loading') : (search || hasActiveFilters ? t('book.empty.noMatch') : t('book.empty.none'))}
                </p>
                <p className="mt-1 text-xs text-[var(--text-subtle)]">
                  {loading
                    ? t('book.empty.loadingHint')
                    : (search || hasActiveFilters ? t('book.empty.noMatchHint') : t('book.empty.noneHint'))}
                </p>
              </div>
              {(search || hasActiveFilters) && !loading && (
                <button onClick={() => { setSearch(''); clearFilters() }}
                  className="text-xs font-semibold text-[var(--gold-primary)] hover:underline cursor-pointer">
                  {t('book.empty.clearBoth')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEntries.map(({ date, entries: dayEntries }) => {
                const dayIn  = dayEntries.filter(isCreditEntry).reduce((s, e) => s + Number(e.amount || 0), 0)
                const dayOut = dayEntries.filter(isDebitEntry).reduce((s, e) => s + Number(e.amount || 0), 0)
                return (
                  <div key={format(date, 'yyyy-MM-dd')}>
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                        {formatGroupDate(date)}
                      </span>
                      <div className="flex items-center gap-2.5 text-[11px] font-semibold tabular-nums">
                        {dayIn  > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{symbol}{formatAmount(dayIn, 0)}</span>}
                        {dayOut > 0 && <span className="text-[var(--text-muted)]">−{symbol}{formatAmount(dayOut, 0)}</span>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                      {dayEntries.map((entry, idx) => {
                        const isSelected = selectedEntryIds.includes(entry.id)
                        return (
                          <motion.div
                            key={entry.id}
                            id={`entry-${entry.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                            onClick={isMultiSelectMode ? () => toggleSelectEntry(entry.id) : undefined}
                            className={`flex items-center gap-2 pl-4 pr-2 transition-colors select-none first:rounded-t-2xl last:rounded-b-2xl ${
                              isMultiSelectMode ? 'cursor-pointer' : ''
                            } ${isSelected ? 'bg-[var(--gold-light)]' : ''}`}
                            {...getLongPressHandlers(entry.id)}
                          >
                            {isMultiSelectMode && (
                              <span
                                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                                  isSelected
                                    ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)] text-white'
                                    : 'border-[var(--border-card)] bg-[var(--bg-page)]'
                                }`}
                              >
                                {isSelected && <Check size={13} strokeWidth={3} />}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <EntryCard entry={entry} balance={balanceById.get(entry.id)} />
                            </div>
                            {!isMultiSelectMode && (
                              <EntryMenu
                                variant={entryMenuVariant(entry)}
                                sourceName={sourceBookName(entry)}
                                onOpenSource={entry.fromProjectId && entry.fromBookId
                                  ? () => navigate(`/projects/${entry.fromProjectId}/books/${entry.fromBookId}`)
                                  : undefined}
                                onEdit={() => (entry.transferId ? setEditingTransfer(entry) : setEditingEntry(entry))}
                                onDelete={() => setDeleteEntryTarget(entry)}
                              />
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Transfer: new from this book, or edit one sent from here ── */}
      <TransferModal
        open={transferOpen || Boolean(editingTransfer)}
        onClose={() => { setTransferOpen(false); setEditingTransfer(null) }}
        currentProject={project}
        currentBook={book}
        projects={projects}
        booksByProject={booksByProject}
        currentBalance={summary.net}
        getBookBalance={bookBalanceOf}
        editing={editingTransfer ? {
          amount: editingTransfer.amount,
          note: editingTransfer.notes,
          toProjectId: editingTransfer.toProjectId,
          toBookId: editingTransfer.toBookId,
        } : null}
        onTransfer={async ({ destinationProjectId, destinationBookId, amount, note }) => {
          if (editingTransfer) {
            await updateTransfer(projectId, bookId, editingTransfer.id, { amount, note })
            showToast(t('book.toast.transferUpdated'))
          } else {
            await transferBetweenBooks({
              sourceProjectId: projectId,
              sourceBookId: bookId,
              destinationProjectId,
              destinationBookId,
              amount,
              note,
            })
            showToast(t('book.toast.transferSent', { amount: `${symbol}${formatAmount(amount)}`, book: bookNameById(destinationBookId) || t('book.toast.bookFallback') }))
          }
        }}
      />

      {/* ── Filters ── */}
      <FilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        categoryNames={categoryNames}
        enteredByList={enteredByList}
        resultCount={filteredEntries.length}
        onReset={clearFilters}
      />

      {/* ── Category manager ── */}
      <CategoryManager
        open={showCatManager}
        categories={categories}
        onClose={() => setShowCatManager(false)}
        onSave={async (cats) => {
          setCategories(cats)
          await updateCategories(projectId, bookId, cats)
          showToast(t('entry.categoriesSaved'))
          setShowCatManager(false)
        }}
      />

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(calc(100vw-2rem),520px)] -translate-x-1/2">
        {isMultiSelectMode ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-page)]/95 p-2 pl-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold text-[var(--text-main)]">
              {selectedEntryIds.length === 0 ? t('book.selectEntries') : t('book.selected', { count: selectedEntryIds.length })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsMultiSelectMode(false)
                  setSelectedEntryIds([])
                }}
                className="rounded-xl border border-[var(--border-card)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--border-subtle)] cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={selectedEntryIds.length === 0}
                onClick={() => setOpenSendToTripModal(true)}
                className="rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {t('book.addToGroup')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-page)]/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setModalType('income')}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[13px] font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <ArrowDownLeft size={16} strokeWidth={2.4} /> {t('entry.type.income')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setModalType('expense')}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-[13px] font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <ArrowUpRight size={16} strokeWidth={2.4} /> {t('entry.type.expense')}
            </motion.button>
          </div>
        )}
      </div>

      <SendToTripModal
        open={openSendToTripModal}
        onClose={() => setOpenSendToTripModal(false)}
        onSend={handleSendToTrip}
      />

      {/* ── Entry modal ── */}
      <EntryModal
        open={Boolean(modalType) || Boolean(editingEntry)}
        type={editingEntry ? editingEntry.type : (modalType || 'income')}
        categories={categories}
        descriptionSuggestions={descriptionSuggestions}
        initial={editingEntry || null}
        trips={trips}
        projectId={projectId}
        bookId={bookId}
        templates={templatesByBook[bookId] || []}
        budgets={budgets}
        spentByCategory={currentMonthSpentByCategory}
        onSaveTemplate={async (tpl) => {
          await saveTemplate(projectId, bookId, tpl)
          showToast(t('book.toast.templateSaved'))
        }}
        onDeleteTemplate={async (templateId) => {
          await deleteTemplate(projectId, bookId, templateId)
          showToast(t('book.toast.templateRemoved'), 'info')
        }}
        onClose={() => { setModalType(null); setEditingEntry(null) }}
        onSaveCategories={async (cats) => {
          setCategories(cats)
          await updateCategories(projectId, bookId, cats)
        }}
        onSubmit={(payload) => {
          // Optimistic: the entry appears instantly (Firebase applies writes
          // locally first), so the sheet closes right away. The server
          // confirmation happens in the background; failures show a toast.
          const { tripId, ...entryData } = payload
          if (editingEntry) {
            const entryId = editingEntry.id
            const oldTrip = trips?.find(trip => trip.entries && trip.entries[`${projectId}_${bookId}_${entryId}`])
            const oldTripId = oldTrip ? oldTrip.id : ''
            const newTripId = tripId || ''
            updateEntry(projectId, bookId, entryId, entryData)
              .then(async () => {
                if (oldTripId !== newTripId) {
                  if (oldTripId) await unlinkEntryFromTrip(oldTripId, projectId, bookId, entryId)
                  if (newTripId) await linkEntriesToTrip(newTripId, [{ projectId, bookId, entryId }])
                }
              })
              .catch(err => showToast(err?.message || t('book.toast.updateFailed'), 'error'))
            showToast(t('book.toast.entryUpdated'))
          } else {
            try {
              const { id: newEntryId, saved } = addEntry(projectId, bookId, entryData)
              saved
                .then(() => (tripId ? linkEntriesToTrip(tripId, [{ projectId, bookId, entryId: newEntryId }]) : null))
                .catch(err => showToast(err?.message || t('book.toast.saveFailed'), 'error'))
              showToast(entryData.type === 'income' ? t('book.toast.cashInRecorded') : t('book.toast.cashOutRecorded'))
            } catch (err) {
              showToast(err?.message || t('book.toast.saveFailed'), 'error')
            }
          }
        }}
      />

      {/* ── Book edit modal ── */}
      <BookModal
        open={editingBook}
        onClose={() => setEditingBook(false)}
        initial={book}
        onSubmit={async (payload) => {
          await updateBook(projectId, bookId, payload)
          showToast(t('book.toast.bookUpdated'))
        }}
      />

      {/* ── Delete entry confirm ── */}
      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        onClose={() => setDeleteEntryTarget(null)}
        onConfirm={async () => {
          const target = deleteEntryTarget
          // Validation (e.g. receiving side of a transfer) throws right away;
          // the write itself finishes in the background.
          const pending = deleteEntry(projectId, bookId, target.id)
          await Promise.race([pending, new Promise(r => setTimeout(r, 60))]).catch(err => {
            showToast(err?.message || t('book.toast.deleteFailed'), 'error')
            throw err
          })
          pending.catch(err => showToast(err?.message || t('book.toast.deleteFailed'), 'error'))
          showToast(target?.transferId ? t('book.toast.transferDeleted') : t('book.toast.entryDeleted'), 'info')
        }}
        title={deleteEntryTarget?.transferId ? t('book.confirm.deleteTransferTitle') : t('book.confirm.deleteEntryTitle')}
        message={deleteEntryTarget?.transferId && deleteEntryTarget?.type === 'transfer_out'
          ? t('book.confirm.deleteTransferMsg', { amount: `${symbol}${formatAmount(deleteEntryTarget?.amount)}`, book: bookNameById(deleteEntryTarget?.toBookId) || t('book.confirm.otherBook') })
          : t('book.confirm.deleteEntryMsg', { description: deleteEntryTarget?.description, amount: `${symbol}${formatAmount(deleteEntryTarget?.amount || 0)}` })}
        danger
      />

      {/* ── Delete book (PIN asked first when the book is locked) ── */}
      <DeleteDialog
        open={deleteBookConfirm}
        onClose={() => setDeleteBookConfirm(false)}
        kind="book"
        name={book.name}
        stats={[
          { label: t('book.transactions'), value: String(entries.length) },
          { label: t('common.balance'), value: `${summary.net < 0 ? "−" : ""}${symbol}${formatAmount(Math.abs(summary.net))}` },
        ]}
        pin={book?.pinHash ? { storedHash: book.pinHash, length: book.pinLength, guardId: bookId } : null}
        onConfirm={async () => {
          await deleteBook(projectId, bookId)
          navigate(`/projects/${projectId}`)
          showToast(t('book.toast.bookDeleted'), 'info')
        }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Set / change PIN modal (from book page) ── */}
      <SetPinModal
        open={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        hasPin={Boolean(book.pinHash)}
        storedHash={book.pinHash}
        pinLength={book.pinLength}
        guardId={bookId}
        itemName={book.name}
        onSet={async (hash, length) => {
          // Keep this session unlocked under the new PIN so the gate doesn't pop up immediately
          setUnlocked(bookId, hash)
          await setPinForBook(projectId, bookId, hash, length)
          showToast(t('book.toast.pinSet', { length }))
        }}
        onRemove={async () => {
          await setPinForBook(projectId, bookId, null)
          lockItem(bookId)
          showToast(t('book.toast.pinRemoved'))
        }}
      />
    </LayoutShell>
  )
}
