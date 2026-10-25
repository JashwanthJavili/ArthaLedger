import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FieldPath, deleteField, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { translate, useI18n } from '../i18n/core'
import { compareNewestFirst, compareOldestFirst } from '../lib/entryOrder'
import {
  bookDoc, booksCol, commitAll, docsOf, entriesCol, entryDoc, forCreate, forUpdate, migrateFromRealtimeDb,
  projectDoc, projectsCol, setUserField, templateDoc, templatesCol, tripDoc, tripsCol, userDoc,
} from '../lib/userData'

const AppDataContext = createContext(null)

/** Strip keys that must not be written to the database */
function sanitiseEntry(entry) {
  // eslint-disable-next-line no-unused-vars
  const { id, _localCategories, ...clean } = entry
  return clean
}

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const { lang, setLang } = useI18n()
  const [projects, setProjects] = useState([])
  const [booksByProject, setBooksByProject] = useState({})
  const [entriesByBook, setEntriesByBook] = useState({})
  const [templatesByBook, setTemplatesByBook] = useState({})
  const [trips, setTrips] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Live copies, so saves and deletes can work from memory (and offline)
  // instead of downloading a book from the server first.
  const entriesNowRef = useRef({})
  const booksNowRef = useRef({})
  const templatesNowRef = useRef({})
  useEffect(() => { entriesNowRef.current = entriesByBook }, [entriesByBook])
  useEffect(() => { booksNowRef.current = booksByProject }, [booksByProject])
  useEffect(() => { templatesNowRef.current = templatesByBook }, [templatesByBook])

  // The language saved in the account (profile.language, set from Settings).
  // When it differs from this device's choice, follow the account. Only a
  // change in the saved value is applied, so a pending local write is never
  // undone by an older snapshot.
  const [savedLang, setSavedLang] = useState(null)
  const appliedLangRef = useRef(null)
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => {
    if (!savedLang || savedLang === appliedLangRef.current) return
    appliedLangRef.current = savedLang
    if (savedLang !== langRef.current) setLang(savedLang)
  }, [savedLang, setLang])

  useEffect(() => {
    if (!user?.uid) {
      setProjects([])
      setBooksByProject({})
      setEntriesByBook({})
      setTemplatesByBook({})
      setTrips([])
      setCategories([])
      setSavedLang(null)
      appliedLangRef.current = null
      setLoading(false)
      setError(null)
      return undefined
    }

    setLoading(true)
    setError(null)
    const uid = user.uid
    let cancelled = false
    const subs = new Map() // key → unsubscribe

    // Firestore has no "whole tree" listener, so there is one listener for
    // the project list, one per project for its books, and one per book for
    // its entries and templates. They are added and removed as projects and
    // books come and go. State is updated once per tick, not per listener.
    const books = {}
    const entries = {}
    const templates = {}
    const bookOwner = {}     // bookId → projectId
    const pending = new Set() // first loads still on their way
    let initialDone = false
    let queued = false

    const flush = () => {
      if (queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        if (cancelled) return
        setBooksByProject({ ...books })
        setEntriesByBook({ ...entries })
        setTemplatesByBook({ ...templates })
        if (!initialDone && pending.size === 0) {
          initialDone = true
          setLoading(false)
        }
      })
    }
    const fail = (where) => (err) => {
      console.error(`[Firestore ${where}]`, err)
      if (cancelled) return
      setError(friendlyDbError(err))
      setLoading(false)
    }
    const listen = (key, ref, onData) => {
      if (subs.has(key)) return
      if (!initialDone) pending.add(key)
      subs.set(key, onSnapshot(ref, (snap) => {
        onData(snap)
        pending.delete(key)
        flush()
      }, fail(key)))
    }
    const stop = (key) => { subs.get(key)?.(); subs.delete(key); pending.delete(key) }

    const watchBook = (pid, bid) => {
      bookOwner[bid] = pid
      listen(`e:${bid}`, entriesCol(uid, pid, bid), (snap) => { entries[bid] = docsOf(snap).sort(compareNewestFirst) })
      listen(`t:${bid}`, templatesCol(uid, pid, bid), (snap) => {
        templates[bid] = docsOf(snap).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))
      })
    }
    const unwatchBook = (bid) => {
      stop(`e:${bid}`); stop(`t:${bid}`)
      delete entries[bid]; delete templates[bid]; delete bookOwner[bid]
    }
    const watchProject = (pid) => {
      listen(`b:${pid}`, booksCol(uid, pid), (snap) => {
        const list = docsOf(snap)
        const ids = new Set(list.map((b) => b.id))
        ;(books[pid] || []).forEach((b) => { if (!ids.has(b.id)) unwatchBook(b.id) })
        books[pid] = list
        list.forEach((b) => watchBook(pid, b.id))
      })
    }
    const unwatchProject = (pid) => {
      stop(`b:${pid}`)
      ;(books[pid] || []).forEach((b) => unwatchBook(b.id))
      delete books[pid]
    }

    const attach = () => {
      if (cancelled) return
      listen('projects', projectsCol(uid), (snap) => {
        const list = docsOf(snap)
        const ids = new Set(list.map((p) => p.id))
        Object.keys(books).forEach((pid) => { if (!ids.has(pid)) unwatchProject(pid) })
        list.forEach((p) => watchProject(p.id))
        setProjects(list)
        setError(null)
      })
      subs.set('trips', onSnapshot(tripsCol(uid), (snap) => { setTrips(docsOf(snap)); setError(null) }, fail('trips')))
      subs.set('user', onSnapshot(userDoc(uid), (snap) => {
        setCategories(normaliseCategories(snap.exists() ? snap.data().categories : null))
        const language = snap.exists() ? snap.data().profile?.language : null
        if (typeof language === 'string') setSavedLang(language)
      }, () => {}))
    }

    // Move this account's data from the old database the first time, then listen
    migrateFromRealtimeDb(uid)
      .catch((err) => console.warn('[Move to Firestore] will retry next time:', err))
      .finally(attach)

    return () => {
      cancelled = true
      subs.forEach((fn) => fn())
      subs.clear()
    }
  }, [user?.uid])

  // ── Projects ──────────────────────────────────────────────────────────────

  const createProject = useCallback(async ({ name, description, icon }) => {
    const ref = doc(projectsCol(user.uid))
    await setDoc(ref, forCreate({
      name,
      description: description || '',
      icon: icon || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const updateProject = useCallback(async (projectId, payload) => {
    await updateDoc(projectDoc(user.uid, projectId), forUpdate({ ...payload, updatedAt: Date.now() }))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // Deleting a document does not delete what is inside it, so remove every
  // book, entry and template first (known from the live copy, so it also works offline).
  const bookTreeOps = (uid, projectId, bookId) => [
    ...(entriesNowRef.current[bookId] || []).map((e) => ({ type: 'delete', ref: entryDoc(uid, projectId, bookId, e.id) })),
    ...(templatesNowRef.current[bookId] || []).map((t) => ({ type: 'delete', ref: templateDoc(uid, projectId, bookId, t.id) })),
    { type: 'delete', ref: bookDoc(uid, projectId, bookId) },
  ]

  const deleteProject = useCallback(async (projectId) => {
    const uid = user.uid
    const ops = (booksNowRef.current[projectId] || []).flatMap((b) => bookTreeOps(uid, projectId, b.id))
    ops.push({ type: 'delete', ref: projectDoc(uid, projectId) })
    await commitAll(ops).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Books ─────────────────────────────────────────────────────────────────

  const createBook = useCallback(async (projectId, { name, description }) => {
    const ref = doc(booksCol(user.uid, projectId))
    await setDoc(ref, {
      name,
      description: description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      openingBalance: 0,
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const updateBook = useCallback(async (projectId, bookId, payload) => {
    await updateDoc(bookDoc(user.uid, projectId, bookId), forUpdate({ ...payload, updatedAt: Date.now() }))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const deleteBook = useCallback(async (projectId, bookId) => {
    await commitAll(bookTreeOps(user.uid, projectId, bookId))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Entries ───────────────────────────────────────────────────────────────

  const localEntriesAsc = (bookId) => [...(entriesNowRef.current[bookId] || [])]
    .sort(compareOldestFirst)

  /** balanceAfter writes for every entry whose running balance changes. */
  const balanceOps = (projectId, bookId, list, fromTimestamp, skipId = null) =>
    balanceChanges(list, fromTimestamp, skipId).map(([id, balanceAfter]) => ({
      type: 'update', ref: entryDoc(user.uid, projectId, bookId, id), data: { balanceAfter },
    }))
  const touchBook = (projectId, bookId) => ({ type: 'update', ref: bookDoc(user.uid, projectId, bookId), data: { updatedAt: Date.now() } })

  /**
   * Adds an entry in one batch (entry + any balances it shifts + book
   * updatedAt). The listener shows it instantly; `saved` resolves when the
   * server confirms. Returns { id, saved }.
   */
  const addEntry = useCallback((projectId, bookId, payload) => {
    const id = doc(entriesCol(user.uid, projectId, bookId)).id
    const entry = {
      id,
      amount: Number(payload.amount),
      type: payload.type,
      description: payload.description,
      category: payload.category || 'General',
      subcategory: payload.subcategory || '',
      mode: payload.mode || 'Cash',
      enteredBy: payload.enteredBy || '',
      timestamp: payload.timestamp || Date.now(),
      notes: payload.notes || '',
      isSavings: Boolean(payload.isSavings),
      createdAt: Date.now(),
    }
    const list = [...localEntriesAsc(bookId), entry].sort(compareOldestFirst)
    entry.balanceAfter = runningBalanceAt(list, id)
    const ops = [
      { type: 'set', ref: entryDoc(user.uid, projectId, bookId, id), data: sanitiseEntry(entry) },
      ...balanceOps(projectId, bookId, list, entry.timestamp, id),
      touchBook(projectId, bookId),
    ]
    const saved = commitAll(ops).catch((err) => { throw new Error(friendlyDbError(err)) })
    return { id, saved }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const deleteEntry = useCallback(async (projectId, bookId, entryId) => {
    const entry = localEntriesAsc(bookId).find((e) => e.id === entryId)
    if (!entry) throw new Error(translate('app.errors.entryNotFound'))

    const ops = [{ type: 'delete', ref: entryDoc(user.uid, projectId, bookId, entryId) }, touchBook(projectId, bookId)]

    // Linked transfer: the sending book owns it. Deleting there removes both
    // sides; the receiving book can only remove it if the sender's side is gone.
    if (entry.transferId) {
      const counterpart = findTransferCounterpartLocal(entriesNowRef.current, entry)
      if (entry.type === 'transfer_in' && counterpart) {
        throw new Error(translate('app.errors.transferDeleteFromSource'))
      }
      if (counterpart) {
        ops.push({ type: 'delete', ref: entryDoc(user.uid, counterpart.projectId, counterpart.bookId, counterpart.entryId) })
        ops.push(touchBook(counterpart.projectId, counterpart.bookId))
        const cList = localEntriesAsc(counterpart.bookId).filter((e) => e.id !== counterpart.entryId)
        ops.push(...balanceOps(counterpart.projectId, counterpart.bookId, cList, Number(counterpart.entry.timestamp || 0)))
      }
    }

    const list = localEntriesAsc(bookId).filter((e) => e.id !== entryId)
    ops.push(...balanceOps(projectId, bookId, list, Number(entry.timestamp || 0)))
    return commitAll(ops).catch((err) => { throw new Error(friendlyDbError(err)) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const updateEntry = useCallback(async (projectId, bookId, entryId, payload) => {
    const arr = localEntriesAsc(bookId)
    const existing = arr.find((e) => e.id === entryId)
    if (!existing) throw new Error(translate('app.errors.entryNotFound'))
    if (existing.transferId) throw new Error(translate('app.errors.transferEditFromSource'))

    // Strip internal-only keys before writing
    // eslint-disable-next-line no-unused-vars
    const { _localCategories, id: _id, balanceAfter: _b, ...clean } = payload
    const changed = { ...clean, amount: Number(clean.amount) }
    const next = arr
      .map((e) => (e.id === entryId ? { ...e, ...changed } : e))
      .sort(compareOldestFirst)

    // The entry's own new balance goes in the same write as its other changes
    const own = balanceChanges(next, -Infinity).find(([id]) => id === entryId)
    const fields = forUpdate(changed)
    if (own) fields.balanceAfter = own[1]
    const from = Math.min(Number(existing.timestamp || 0), Number(changed.timestamp ?? existing.timestamp ?? 0))
    const ops = [
      { type: 'update', ref: entryDoc(user.uid, projectId, bookId, entryId), data: fields },
      ...balanceOps(projectId, bookId, next, from, entryId),
      touchBook(projectId, bookId),
    ]
    return commitAll(ops).catch((err) => { throw new Error(friendlyDbError(err)) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const getBookCurrentBalance = useCallback((bookId) => {
    const entries = entriesByBook[bookId] || []
    if (!entries.length) return 0
    const latest = [...entries].sort(compareOldestFirst).at(-1)
    return Number(latest?.balanceAfter || 0)
  }, [entriesByBook])

  // ── Recurring entry templates (Quick Add) ────────────────────────────────

  const saveTemplate = useCallback(async (projectId, bookId, template) => {
    const ref = doc(templatesCol(user.uid, projectId, bookId))
    await setDoc(ref, {
      label: template.label || template.description,
      amount: Number(template.amount),
      description: template.description,
      category: template.category || 'General',
      subcategory: template.subcategory || '',
      mode: template.mode || 'Cash',
      type: template.type,
      isSavings: Boolean(template.isSavings),
      createdAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
    return ref.id
  }, [user?.uid])

  const deleteTemplate = useCallback(async (projectId, bookId, templateId) => {
    await commitAll([{ type: 'delete', ref: templateDoc(user.uid, projectId, bookId, templateId) }])
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Categories ────────────────────────────────────────────────────────────

  const updateCategories = useCallback(async (projectId, bookId, categories) => {
    await setUserField(user.uid, 'categories', normaliseCategories(categories))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const getCategories = useCallback(async (projectId, bookId) => {
    try {
      const snap = await getDoc(userDoc(user.uid))
      const shared = normaliseCategories(snap.exists() ? snap.data().categories : null)
      if (shared.length > 0) return shared

      // Very old accounts kept categories on each book
      if (projectId && bookId) {
        const book = await getDoc(bookDoc(user.uid, projectId, bookId))
        const legacy = normaliseCategories(book.exists() ? book.data().categories : null)
        if (legacy.length > 0) {
          await setUserField(user.uid, 'categories', legacy)
          return legacy
        }
      }
      return []
    } catch {
      return []
    }
  }, [user?.uid])

  // ── Transfer ──────────────────────────────────────────────────────────────

  /**
   * Transfer money between two books, even when they belong to different projects.
   * Both ledger entries are written in one batch, so either both land or neither does.
   */
  const transferBetweenBooks = useCallback(async ({
    sourceProjectId,
    sourceBookId,
    destinationProjectId,
    destinationBookId,
    amount,
    note = '',
  }) => {
    const uid = user.uid
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error(translate('app.errors.transferAmount'))
    }
    if (!sourceProjectId || !sourceBookId || !destinationProjectId || !destinationBookId) {
      throw new Error(translate('app.errors.transferBooks'))
    }
    if (sourceProjectId === destinationProjectId && sourceBookId === destinationBookId) {
      throw new Error(translate('app.errors.transferSameBook'))
    }

    const [sourceProjectSnap, destinationProjectSnap, sourceBookSnap, destinationBookSnap] = await Promise.all([
      getDoc(projectDoc(uid, sourceProjectId)),
      getDoc(projectDoc(uid, destinationProjectId)),
      getDoc(bookDoc(uid, sourceProjectId, sourceBookId)),
      getDoc(bookDoc(uid, destinationProjectId, destinationBookId)),
    ])
    if (!sourceProjectSnap.exists()) throw new Error(translate('app.errors.sourceProjectMissing'))
    if (!destinationProjectSnap.exists()) throw new Error(translate('app.errors.destinationProjectMissing'))
    if (!sourceBookSnap.exists()) throw new Error(translate('app.errors.sourceBookMissing'))
    if (!destinationBookSnap.exists()) throw new Error(translate('app.errors.destinationBookMissing'))

    const sourceProject = sourceProjectSnap.data()
    const destinationProject = destinationProjectSnap.data()
    const sourceBook = sourceBookSnap.data()
    const destinationBook = destinationBookSnap.data()

    const [sourceEntriesSnap, destinationEntriesSnap] = await Promise.all([
      getDocs(entriesCol(uid, sourceProjectId, sourceBookId)),
      getDocs(entriesCol(uid, destinationProjectId, destinationBookId)),
    ])
    const sourceEntries = docsOf(sourceEntriesSnap)
    const destinationEntries = docsOf(destinationEntriesSnap)

    const calculateBookBalance = (entriesList) => roundMoney(entriesList.reduce((acc, e) => acc + signedAmountOf(e), 0))
    const sourceBalance = calculateBookBalance(sourceEntries)
    if (numericAmount > sourceBalance) {
      throw new Error(translate('app.errors.insufficientBalance', { available: sourceBalance.toFixed(2) }))
    }

    const timestamp = Date.now()
    const transferId = `txfr_${timestamp}_${Math.random().toString(36).slice(2, 7)}`
    const sourceEntryRef = doc(entriesCol(uid, sourceProjectId, sourceBookId))
    const destinationEntryRef = doc(entriesCol(uid, destinationProjectId, destinationBookId))

    const sourceBalanceAfter = Number((sourceBalance - numericAmount).toFixed(2))
    const destinationBalanceAfter = Number((calculateBookBalance(destinationEntries) + numericAmount).toFixed(2))
    const transferScope = sourceProjectId === destinationProjectId ? 'internal' : 'cross_project'
    const noteSuffix = note ? ` · ${note}` : ''

    const shared = {
      amount: numericAmount,
      category: 'Transfer',
      mode: 'Internal',
      enteredBy: '',
      timestamp,
      notes: note,
      transferId,
      transferScope,
      fromProjectId: sourceProjectId,
      fromBookId: sourceBookId,
      toProjectId: destinationProjectId,
      toBookId: destinationBookId,
      isTransfer: true,
      isSavings: false,
    }
    const batch = writeBatch(db)
    batch.set(sourceEntryRef, {
      ...shared,
      type: 'transfer_out',
      description: `Transfer to ${destinationBook.name} (${destinationProject.name})${noteSuffix}`,
      balanceAfter: sourceBalanceAfter,
    })
    batch.set(destinationEntryRef, {
      ...shared,
      type: 'transfer_in',
      description: `Transfer from ${sourceBook.name} (${sourceProject.name})${noteSuffix}`,
      balanceAfter: destinationBalanceAfter,
    })
    batch.update(bookDoc(uid, sourceProjectId, sourceBookId), { updatedAt: timestamp })
    batch.update(bookDoc(uid, destinationProjectId, destinationBookId), { updatedAt: timestamp })
    await batch.commit().catch((err) => { throw new Error(friendlyDbError(err)) })

    // Either book may hold entries dated after "now"; keep running balances exact.
    await recalcBalances(uid, sourceProjectId, sourceBookId, timestamp)
    await recalcBalances(uid, destinationProjectId, destinationBookId, timestamp)
  }, [user?.uid])

  /**
   * Edit a transfer from the sending book. Amount and note are kept in sync on
   * both sides; the destination stays fixed (delete and re-send to change it).
   */
  const updateTransfer = useCallback(async (projectId, bookId, entryId, { amount, note = '' }) => {
    const uid = user.uid
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error(translate('app.errors.transferAmount'))
    }

    const entrySnap = await getDoc(entryDoc(uid, projectId, bookId, entryId))
    const entry = entrySnap.exists() ? entrySnap.data() : null
    if (!entry?.transferId) throw new Error(translate('app.errors.transferNotFound'))
    if (entry.type !== 'transfer_out') throw new Error(translate('app.errors.transferEditFromSource'))

    const sourceEntries = docsOf(await getDocs(entriesCol(uid, projectId, bookId)))
    const balanceWithoutThis = roundMoney(
      sourceEntries.filter((e) => e.id !== entryId).reduce((acc, e) => acc + signedAmountOf(e), 0)
    )
    if (numericAmount > balanceWithoutThis) {
      throw new Error(translate('app.errors.insufficientBalance', { available: balanceWithoutThis.toFixed(2) }))
    }

    const counterpart = await findTransferCounterpart(uid, entry)
    const cleanNote = String(note || '').trim()
    const withNote = (description) => {
      const base = String(description || '').split(' · ')[0]
      return cleanNote ? `${base} · ${cleanNote}` : base
    }

    const now = Date.now()
    const batch = writeBatch(db)
    batch.update(entryDoc(uid, projectId, bookId, entryId), { amount: numericAmount, notes: cleanNote, description: withNote(entry.description) })
    batch.update(bookDoc(uid, projectId, bookId), { updatedAt: now })
    if (counterpart) {
      batch.update(entryDoc(uid, counterpart.projectId, counterpart.bookId, counterpart.entryId), {
        amount: numericAmount, notes: cleanNote, description: withNote(counterpart.entry.description),
      })
      batch.update(bookDoc(uid, counterpart.projectId, counterpart.bookId), { updatedAt: now })
    }
    await batch.commit().catch((err) => { throw new Error(friendlyDbError(err)) })

    await recalcBalances(uid, projectId, bookId)
    if (counterpart) await recalcBalances(uid, counterpart.projectId, counterpart.bookId)
  }, [user?.uid])

  // Save (or clear, when pinHash is falsy) a PIN. pinLength lets the unlock
  // screen show the right number of digits straight away.
  const setPinForBook = useCallback(async (projectId, bookId, pinHash, pinLength) => {
    await updateDoc(bookDoc(user.uid, projectId, bookId), {
      pinHash: pinHash || deleteField(),
      pinLength: pinHash && (pinLength === 4 || pinLength === 6) ? pinLength : deleteField(),
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const setPinForProject = useCallback(async (projectId, pinHash, pinLength) => {
    await updateDoc(projectDoc(user.uid, projectId), {
      pinHash: pinHash || deleteField(),
      pinLength: pinHash && (pinLength === 4 || pinLength === 6) ? pinLength : deleteField(),
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Trips / Expense Groups ──────────────────────────────────────────────────

  const createTrip = useCallback(async ({ name, description }) => {
    const ref = doc(tripsCol(user.uid))
    await setDoc(ref, {
      name,
      description: description || '',
      createdAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
    return ref.id
  }, [user?.uid])

  const deleteTrip = useCallback(async (tripId) => {
    await commitAll([{ type: 'delete', ref: tripDoc(user.uid, tripId) }])
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // A group's links live in its `entries` map, keyed projectId_bookId_entryId
  const linkEntriesToTrip = useCallback(async (tripId, entryRefs) => {
    if (!entryRefs.length) return
    const addedAt = Date.now()
    const pairs = entryRefs.flatMap(({ projectId, bookId, entryId }) => [
      new FieldPath('entries', `${projectId}_${bookId}_${entryId}`),
      { projectId, bookId, entryId, addedAt },
    ])
    const batch = writeBatch(db)
    batch.update(tripDoc(user.uid, tripId), ...pairs)
    await batch.commit().catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const unlinkEntryFromTrip = useCallback(async (tripId, projectId, bookId, entryId) => {
    await updateDoc(tripDoc(user.uid, tripId), new FieldPath('entries', `${projectId}_${bookId}_${entryId}`), deleteField())
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const value = useMemo(() => ({
    loading,
    error,
    projects,
    booksByProject,
    entriesByBook,
    templatesByBook,
    trips,
    categories,
    createProject,
    updateProject,
    deleteProject,
    createBook,
    updateBook,
    deleteBook,
    addEntry,
    deleteEntry,
    updateEntry,
    getBookCurrentBalance,
    updateCategories,
    getCategories,
    saveTemplate,
    deleteTemplate,
    setPinForBook,
    setPinForProject,
    transferBetweenBooks,
    updateTransfer,
    createTrip,
    deleteTrip,
    linkEntriesToTrip,
    unlinkEntryFromTrip,
  }), [
    loading, error, projects, booksByProject, entriesByBook, templatesByBook, trips, categories,
    createProject, updateProject, deleteProject,
    createBook, updateBook, deleteBook,
    addEntry, deleteEntry, updateEntry,
    getBookCurrentBalance, updateCategories, getCategories,
    saveTemplate, deleteTemplate,
    setPinForBook, setPinForProject, transferBetweenBooks, updateTransfer,
    createTrip, deleteTrip, linkEntriesToTrip, unlinkEntryFromTrip,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Money coming into a book (income or a transfer in) adds to the balance;
// everything else (expense, transfer out) subtracts from it.
function signedAmountOf(entry) {
  const amt = Number(entry?.amount || 0)
  return entry?.type === 'income' || entry?.type === 'transfer_in' ? amt : -amt
}

/**
 * [entryId, balanceAfter] for entries at/after `fromTimestamp` whose stored
 * balance is wrong. `list` is ascending; `skipId` is written whole elsewhere.
 */
function balanceChanges(list, fromTimestamp, skipId = null) {
  const out = []
  let running = 0
  for (const e of list) {
    running = roundMoney(running + signedAmountOf(e))
    if (e.id === skipId || Number(e.timestamp) < fromTimestamp) continue
    if (Number(e.balanceAfter) !== running) out.push([e.id, running])
  }
  return out
}

function runningBalanceAt(list, id) {
  let running = 0
  for (const e of list) {
    running = roundMoney(running + signedAmountOf(e))
    if (e.id === id) return running
  }
  return running
}

/** Other side of a linked transfer, from the entries already in memory. */
function findTransferCounterpartLocal(entriesByBook, entry) {
  const isOut = entry.type === 'transfer_out'
  const projectId = isOut ? entry.toProjectId : entry.fromProjectId
  const bookId = isOut ? entry.toBookId : entry.fromBookId
  if (!entry.transferId || !projectId || !bookId) return null
  const match = (entriesByBook[bookId] || []).find((e) => e.transferId === entry.transferId && e.type === (isOut ? 'transfer_in' : 'transfer_out'))
  return match ? { projectId, bookId, entryId: match.id, entry: match } : null
}

/** Locate the other side of a linked transfer, or null if it no longer exists. */
async function findTransferCounterpart(uid, entry) {
  const isOut = entry.type === 'transfer_out'
  const projectId = isOut ? entry.toProjectId : entry.fromProjectId
  const bookId = isOut ? entry.toBookId : entry.fromBookId
  if (!entry.transferId || !projectId || !bookId) return null
  const list = docsOf(await getDocs(entriesCol(uid, projectId, bookId)))
  const match = list.find((e) => e.transferId === entry.transferId && e.type === (isOut ? 'transfer_in' : 'transfer_out'))
  return match ? { projectId, bookId, entryId: match.id, entry: match } : null
}

/** Rewrite running balances in a book from `fromTimestamp` on (all of them by default). */
async function recalcBalances(uid, projectId, bookId, fromTimestamp = -Infinity) {
  const list = docsOf(await getDocs(entriesCol(uid, projectId, bookId))).sort(compareOldestFirst)
  const ops = balanceChanges(list, fromTimestamp).map(([id, balanceAfter]) => ({
    type: 'update', ref: entryDoc(uid, projectId, bookId, id), data: { balanceAfter },
  }))
  if (ops.length) await commitAll(ops)
}

// Avoid floating-point drift (e.g. 0.1 + 0.2) in stored balances.
function roundMoney(n) {
  return Math.round(n * 100) / 100
}

function friendlyDbError(err) {
  const msg = err?.message || String(err)
  const code = err?.code || ''
  if (code === 'permission-denied' || msg.includes('permission')) return translate('app.errors.permissionDenied')
  if (code === 'unavailable' || msg.includes('network') || msg.includes('offline')) return translate('app.errors.network')
  return msg
}

function normaliseCategories(value) {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value)
      : []

  const seen = new Set()
  const cleaned = []

  for (const item of list) {
    if (!item) continue
    let name = ''
    let subcategories = []

    if (typeof item === 'string') {
      name = item.trim()
    } else if (typeof item === 'object') {
      name = String(item.name || item.title || '').trim()
      if (Array.isArray(item.subcategories)) {
        subcategories = item.subcategories.map(s => String(s || '').trim()).filter(Boolean)
      }
    }

    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push({ name, subcategories })
  }

  return cleaned
}
