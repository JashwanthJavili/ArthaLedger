import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { get, onValue, push, ref, remove, set, update } from 'firebase/database'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { compareNewestFirst, compareOldestFirst } from '../lib/entryOrder'

const AppDataContext = createContext(null)

function toArray(obj) {
  if (!obj) return []
  return Object.entries(obj).map(([id, value]) => ({ id, ...value }))
}

/** Strip keys that must not be written to Firebase */
function sanitiseEntry(entry) {
  // eslint-disable-next-line no-unused-vars
  const { id, _localCategories, ...clean } = entry
  return clean
}

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [booksByProject, setBooksByProject] = useState({})
  const [entriesByBook, setEntriesByBook] = useState({})
  const [templatesByBook, setTemplatesByBook] = useState({})
  const [trips, setTrips] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // All active Firebase listeners — keyed so we can tear them down cleanly
  const unsubsRef = useRef(new Map()) // key → unsub fn

  // Live copy of every book's entries (kept current by the listener above),
  // so saves and deletes can compute balances locally instead of
  // downloading the book from the server first.
  const entriesNowRef = useRef({})
  useEffect(() => { entriesNowRef.current = entriesByBook }, [entriesByBook])

  useEffect(() => {
    // Tear down every listener from the previous uid
    unsubsRef.current.forEach((fn) => fn())
    unsubsRef.current.clear()

    if (!user?.uid) {
      setProjects([])
      setBooksByProject({})
      setEntriesByBook({})
      setTemplatesByBook({})
      setTrips([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const uid = user.uid

    const tripsRef = ref(db, `users/${uid}/trips`)
    const unsubTrips = onValue(tripsRef, (snapshot) => {
      const loadedTrips = toArray(snapshot.val())
      setTrips(loadedTrips)
      setError(null)
    }, (err) => {
      console.error('[Firebase trips] Error:', err)
      setError(friendlyDbError(err))
      setLoading(false)
    })
    unsubsRef.current.set('trips', unsubTrips)

    const categoriesRef = ref(db, `users/${uid}/categories`)
    const unsubCategories = onValue(categoriesRef, (snapshot) => {
      setCategories(normaliseCategories(snapshot.val()))
    })
    unsubsRef.current.set('categories', unsubCategories)

    // One listener for the whole projects tree. The old setup listened to
    // `projects` (which already downloads every book and entry) AND then
    // re-created a listener per book and per entry list on every change —
    // so each save re-attached everything. Parsing one snapshot is cheaper,
    // and after the first load Firebase only sends the changed parts.
    const projectsRef = ref(db, `users/${uid}/projects`)
    const unsubProjects = onValue(projectsRef, (snapshot) => {
      const raw = snapshot.val() || {}
      const nextBooks = {}
      const nextEntries = {}
      const nextTemplates = {}
      const loadedProjects = toArray(raw)
      loadedProjects.forEach((project) => {
        const books = toArray(project.books)
        nextBooks[project.id] = books
        books.forEach((book) => {
          nextEntries[book.id] = toArray(book.entries).sort(compareNewestFirst)
          nextTemplates[book.id] = toArray(book.templates).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))
        })
      })
      setProjects(loadedProjects)
      setBooksByProject(nextBooks)
      setEntriesByBook(nextEntries)
      setTemplatesByBook(nextTemplates)
      setLoading(false)
      setError(null)
    }, (err) => {
      console.error('[Firebase projects] Error:', err)
      setError(friendlyDbError(err))
      setLoading(false)
    })

    unsubsRef.current.set('projects', unsubProjects)

    return () => {
      unsubsRef.current.forEach((fn) => fn())
      unsubsRef.current.clear()
    }
  }, [user?.uid])

  // ── Projects ──────────────────────────────────────────────────────────────

  const createProject = useCallback(async ({ name, description, icon }) => {
    const projectRef = push(ref(db, `users/${user.uid}/projects`))
    await set(projectRef, {
      name,
      description: description || '',
      icon: icon || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const updateProject = useCallback(async (projectId, payload) => {
    await update(ref(db, `users/${user.uid}/projects/${projectId}`), {
      ...payload,
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const deleteProject = useCallback(async (projectId) => {
    await remove(ref(db, `users/${user.uid}/projects/${projectId}`))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Books ─────────────────────────────────────────────────────────────────

  const createBook = useCallback(async (projectId, { name, description }) => {
    const bookRef = push(ref(db, `users/${user.uid}/projects/${projectId}/books`))
    await set(bookRef, {
      name,
      description: description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      openingBalance: 0,
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const updateBook = useCallback(async (projectId, bookId, payload) => {
    await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), {
      ...payload,
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const deleteBook = useCallback(async (projectId, bookId) => {
    await remove(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Entries ───────────────────────────────────────────────────────────────

  const bookPath = (projectId, bookId) => `users/${user.uid}/projects/${projectId}/books/${bookId}`
  const localEntriesAsc = (bookId) => [...(entriesNowRef.current[bookId] || [])]
    .sort(compareOldestFirst)

  /**
   * Adds an entry with ONE atomic write (entry + any balances it shifts +
   * book updatedAt). The listener shows it instantly; `saved` resolves when
   * the server confirms. Returns { id, saved }.
   */
  const addEntry = useCallback((projectId, bookId, payload) => {
    const base = bookPath(projectId, bookId)
    const id = push(ref(db, `${base}/entries`)).key
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
    const list = [...localEntriesAsc(bookId), entry]
      .sort(compareOldestFirst)
    const updates = balanceUpdates(base, list, entry.timestamp, id)
    entry.balanceAfter = runningBalanceAt(list, id)
    updates[`${base}/entries/${id}`] = sanitiseEntry(entry)
    updates[`${base}/updatedAt`] = Date.now()

    const saved = update(ref(db), updates).catch((err) => { throw new Error(friendlyDbError(err)) })
    return { id, saved }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const deleteEntry = useCallback(async (projectId, bookId, entryId) => {
    const base = bookPath(projectId, bookId)
    const entry = localEntriesAsc(bookId).find((e) => e.id === entryId)
    if (!entry) throw new Error('Entry not found')

    const updates = { [`${base}/entries/${entryId}`]: null, [`${base}/updatedAt`]: Date.now() }

    // Linked transfer: the sending book owns it. Deleting there removes both
    // sides; the receiving book can only remove it if the sender's side is gone.
    if (entry.transferId) {
      const counterpart = findTransferCounterpartLocal(entriesNowRef.current, entry)
      if (entry.type === 'transfer_in' && counterpart) {
        throw new Error('This transfer is managed by the sending book. Delete it there.')
      }
      if (counterpart) {
        const cBase = bookPath(counterpart.projectId, counterpart.bookId)
        updates[`${cBase}/entries/${counterpart.entryId}`] = null
        updates[`${cBase}/updatedAt`] = Date.now()
        const cList = localEntriesAsc(counterpart.bookId).filter((e) => e.id !== counterpart.entryId)
        Object.assign(updates, balanceUpdates(cBase, cList, Number(counterpart.entry.timestamp || 0)))
      }
    }

    const list = localEntriesAsc(bookId).filter((e) => e.id !== entryId)
    Object.assign(updates, balanceUpdates(base, list, Number(entry.timestamp || 0)))
    return update(ref(db), updates).catch((err) => { throw new Error(friendlyDbError(err)) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const updateEntry = useCallback(async (projectId, bookId, entryId, payload) => {
    const base = bookPath(projectId, bookId)
    const arr = localEntriesAsc(bookId)
    const existing = arr.find((e) => e.id === entryId)
    if (!existing) throw new Error('Entry not found')
    if (existing.transferId) throw new Error('Transfers can only be changed from the sending book.')

    // Strip internal-only keys before writing to Firebase
    // eslint-disable-next-line no-unused-vars
    const { _localCategories, id: _id, balanceAfter: _b, ...clean } = payload
    const changed = { ...clean, amount: Number(clean.amount) }
    const next = arr
      .map((e) => (e.id === entryId ? { ...e, ...changed } : e))
      .sort(compareOldestFirst)

    const updates = { [`${base}/updatedAt`]: Date.now() }
    Object.entries(changed).forEach(([k, v]) => { if (v !== undefined) updates[`${base}/entries/${entryId}/${k}`] = v })
    const from = Math.min(Number(existing.timestamp || 0), Number(changed.timestamp ?? existing.timestamp ?? 0))
    Object.assign(updates, balanceUpdates(base, next, from))
    return update(ref(db), updates).catch((err) => { throw new Error(friendlyDbError(err)) })
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
    const templatesRef = ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/templates`)
    const newRef = push(templatesRef)
    await set(newRef, {
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
    return newRef.key
  }, [user?.uid])

  const deleteTemplate = useCallback(async (projectId, bookId, templateId) => {
    await remove(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/templates/${templateId}`))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── Categories ────────────────────────────────────────────────────────────

  const updateCategories = useCallback(async (projectId, bookId, categories) => {
    const nextCategories = normaliseCategories(categories)
    await set(ref(db, `users/${user.uid}/categories`), nextCategories)
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const getCategories = useCallback(async (projectId, bookId) => {
    try {
      const snapshot = await get(ref(db, `users/${user.uid}/categories`))
      const shared = normaliseCategories(snapshot.val())
      if (shared.length > 0) return shared

      if (projectId && bookId) {
        const legacySnapshot = await get(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/categories`))
        const legacy = normaliseCategories(legacySnapshot.val())
        if (legacy.length > 0) {
          await set(ref(db, `users/${user.uid}/categories`), legacy)
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
   *
   * The write is done as one multi-location Firebase update so either both ledger
   * entries land together or neither does.
   */
  const transferBetweenBooks = useCallback(async ({
    sourceProjectId,
    sourceBookId,
    destinationProjectId,
    destinationBookId,
    amount,
    note = '',
  }) => {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Enter a valid transfer amount.')
    }

    if (!sourceProjectId || !sourceBookId || !destinationProjectId || !destinationBookId) {
      throw new Error('Select both source and destination books.')
    }

    if (sourceProjectId === destinationProjectId && sourceBookId === destinationBookId) {
      throw new Error('Source and destination books must be different.')
    }

    const [sourceProjectSnap, destinationProjectSnap, sourceBookSnap, destinationBookSnap] = await Promise.all([
      get(ref(db, `users/${user.uid}/projects/${sourceProjectId}`)),
      get(ref(db, `users/${user.uid}/projects/${destinationProjectId}`)),
      get(ref(db, `users/${user.uid}/projects/${sourceProjectId}/books/${sourceBookId}`)),
      get(ref(db, `users/${user.uid}/projects/${destinationProjectId}/books/${destinationBookId}`)),
    ])

    if (!sourceProjectSnap.exists()) throw new Error('Source project not found.')
    if (!destinationProjectSnap.exists()) throw new Error('Destination project not found.')
    if (!sourceBookSnap.exists()) throw new Error('Source book not found.')
    if (!destinationBookSnap.exists()) throw new Error('Destination book not found.')

    const sourceProject = sourceProjectSnap.val() || {}
    const destinationProject = destinationProjectSnap.val() || {}
    const sourceBook = sourceBookSnap.val() || {}
    const destinationBook = destinationBookSnap.val() || {}

    const [sourceEntriesSnap, destinationEntriesSnap] = await Promise.all([
      get(ref(db, `users/${user.uid}/projects/${sourceProjectId}/books/${sourceBookId}/entries`)),
      get(ref(db, `users/${user.uid}/projects/${destinationProjectId}/books/${destinationBookId}/entries`)),
    ])

    const sourceEntries = toArray(sourceEntriesSnap.val())
    const destinationEntries = toArray(destinationEntriesSnap.val())


    const calculateBookBalance = (entriesList) => roundMoney(entriesList.reduce((acc, e) => acc + signedAmountOf(e), 0))

    const sourceBalance = calculateBookBalance(sourceEntries)

    if (numericAmount > sourceBalance) {
      throw new Error(`Insufficient balance. Available: ${sourceBalance.toFixed(2)}`)
    }

    const timestamp = Date.now()
    const transferId = `txfr_${timestamp}_${Math.random().toString(36).slice(2, 7)}`

    const sourceEntryRef = push(ref(db, `users/${user.uid}/projects/${sourceProjectId}/books/${sourceBookId}/entries`))
    const destinationEntryRef = push(ref(db, `users/${user.uid}/projects/${destinationProjectId}/books/${destinationBookId}/entries`))

    const sourceBalanceAfter = Number((sourceBalance - numericAmount).toFixed(2))
    const destinationBalance = calculateBookBalance(destinationEntries)
    const destinationBalanceAfter = Number((destinationBalance + numericAmount).toFixed(2))

    const transferScope = sourceProjectId === destinationProjectId ? 'internal' : 'cross_project'
    const noteSuffix = note ? ` · ${note}` : ''

    const sourceDescription = `Transfer to ${destinationBook.name} (${destinationProject.name})${noteSuffix}`
    const destinationDescription = `Transfer from ${sourceBook.name} (${sourceProject.name})${noteSuffix}`

    const updates = {
      [`users/${user.uid}/projects/${sourceProjectId}/books/${sourceBookId}/entries/${sourceEntryRef.key}`]: {
        amount: numericAmount,
        type: 'transfer_out',
        description: sourceDescription,
        category: 'Transfer',
        mode: 'Internal',
        balanceAfter: sourceBalanceAfter,
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
      },
      [`users/${user.uid}/projects/${destinationProjectId}/books/${destinationBookId}/entries/${destinationEntryRef.key}`]: {
        amount: numericAmount,
        type: 'transfer_in',
        description: destinationDescription,
        category: 'Transfer',
        mode: 'Internal',
        balanceAfter: destinationBalanceAfter,
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
      },
      [`users/${user.uid}/projects/${sourceProjectId}/books/${sourceBookId}/updatedAt`]: timestamp,
      [`users/${user.uid}/projects/${destinationProjectId}/books/${destinationBookId}/updatedAt`]: timestamp,
    }

    await update(ref(db), updates).catch((err) => { throw new Error(friendlyDbError(err)) })

    // Either book may hold entries dated after "now"; keep running balances exact.
    await _recalcBalancesFrom(user.uid, sourceProjectId, sourceBookId, timestamp)
    await _recalcBalancesFrom(user.uid, destinationProjectId, destinationBookId, timestamp)
  }, [user?.uid])

  /**
   * Edit a transfer from the sending book. Amount and note are kept in sync on
   * both sides; the destination stays fixed (delete and re-send to change it).
   */
  const updateTransfer = useCallback(async (projectId, bookId, entryId, { amount, note = '' }) => {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Enter a valid transfer amount.')
    }

    const entryPath = `users/${user.uid}/projects/${projectId}/books/${bookId}/entries/${entryId}`
    const entry = (await get(ref(db, entryPath))).val()
    if (!entry?.transferId) throw new Error('Transfer not found.')
    if (entry.type !== 'transfer_out') throw new Error('Transfers can only be changed from the sending book.')

    const sourceEntries = toArray((await get(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries`))).val())
    const balanceWithoutThis = roundMoney(
      sourceEntries.filter((e) => e.id !== entryId).reduce((acc, e) => acc + signedAmountOf(e), 0)
    )
    if (numericAmount > balanceWithoutThis) {
      throw new Error(`Insufficient balance. Available: ${balanceWithoutThis.toFixed(2)}`)
    }

    const counterpart = await _findTransferCounterpart(user.uid, entry)
    const cleanNote = String(note || '').trim()
    const withNote = (description) => {
      const base = String(description || '').split(' · ')[0]
      return cleanNote ? `${base} · ${cleanNote}` : base
    }

    const updates = {
      [`${entryPath}/amount`]: numericAmount,
      [`${entryPath}/notes`]: cleanNote,
      [`${entryPath}/description`]: withNote(entry.description),
    }
    if (counterpart) {
      const cPath = `users/${user.uid}/projects/${counterpart.projectId}/books/${counterpart.bookId}/entries/${counterpart.entryId}`
      updates[`${cPath}/amount`] = numericAmount
      updates[`${cPath}/notes`] = cleanNote
      updates[`${cPath}/description`] = withNote(counterpart.entry.description)
    }
    await update(ref(db), updates).catch((err) => { throw new Error(friendlyDbError(err)) })

    const now = Date.now()
    await _recalcBalances(user.uid, projectId, bookId)
    await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), { updatedAt: now })
    if (counterpart) {
      await _recalcBalances(user.uid, counterpart.projectId, counterpart.bookId)
      await update(ref(db, `users/${user.uid}/projects/${counterpart.projectId}/books/${counterpart.bookId}`), { updatedAt: now })
    }
  }, [user?.uid])

  // Save (or clear, when pinHash is falsy) a PIN. pinLength lets the unlock
  // screen show the right number of digits straight away.
  const setPinForBook = useCallback(async (projectId, bookId, pinHash, pinLength) => {
    const path = `users/${user.uid}/projects/${projectId}/books/${bookId}`
    await update(ref(db, path), {
      pinHash: pinHash || null,
      pinLength: pinHash && (pinLength === 4 || pinLength === 6) ? pinLength : null,
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const setPinForProject = useCallback(async (projectId, pinHash, pinLength) => {
    const path = `users/${user.uid}/projects/${projectId}`
    await update(ref(db, path), {
      pinHash: pinHash || null,
      pinLength: pinHash && (pinLength === 4 || pinLength === 6) ? pinLength : null,
      updatedAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  // ── PIN-verified deletion ─────────────────────────────────────────────────

  const deleteBookWithPin = useCallback(async (projectId, bookId, pin) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const token = localStorage.getItem('auth_token')
    
    const response = await fetch(
      `${baseUrl}/api/v1/projects/${projectId}/books/${bookId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Failed to delete book')
    }
  }, [])

  const deleteProjectWithPin = useCallback(async (projectId, pin) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const token = localStorage.getItem('auth_token')
    
    const response = await fetch(
      `${baseUrl}/api/v1/projects/${projectId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Failed to delete project')
    }
  }, [])

  // ── Trips / Expense Groups ──────────────────────────────────────────────────

  const createTrip = useCallback(async ({ name, description }) => {
    const tripRef = push(ref(db, `users/${user.uid}/trips`))
    await set(tripRef, {
      name,
      description: description || '',
      createdAt: Date.now(),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })
    return tripRef.key
  }, [user?.uid])

  const deleteTrip = useCallback(async (tripId) => {
    await remove(ref(db, `users/${user.uid}/trips/${tripId}`))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const linkEntriesToTrip = useCallback(async (tripId, entryRefs) => {
    const updates = {}
    const timestamp = Date.now()
    entryRefs.forEach(({ projectId, bookId, entryId }) => {
      const path = `users/${user.uid}/trips/${tripId}/entries/${projectId}_${bookId}_${entryId}`
      updates[path] = {
        projectId,
        bookId,
        entryId,
        addedAt: timestamp,
      }
    })
    await update(ref(db), updates).catch((err) => {
      throw new Error(friendlyDbError(err))
    })
  }, [user?.uid])

  const unlinkEntryFromTrip = useCallback(async (tripId, projectId, bookId, entryId) => {
    await remove(ref(db, `users/${user.uid}/trips/${tripId}/entries/${projectId}_${bookId}_${entryId}`))
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
    deleteBookWithPin,
    deleteProjectWithPin,
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
    deleteBookWithPin, deleteProjectWithPin,
    addEntry, deleteEntry, updateEntry,
    getBookCurrentBalance, updateCategories, getCategories,
    saveTemplate, deleteTemplate,
    setPinForBook, setPinForProject, transferBetweenBooks, updateTransfer,
    createTrip, deleteTrip, linkEntriesToTrip, unlinkEntryFromTrip,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

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
 * balanceAfter paths that change for entries at/after `fromTimestamp`.
 * `list` is ascending; `skipId` is an entry written whole elsewhere in the
 * same update (Firebase rejects overlapping paths).
 */
function balanceUpdates(base, list, fromTimestamp, skipId = null) {
  const out = {}
  let running = 0
  for (const e of list) {
    running = roundMoney(running + signedAmountOf(e))
    if (e.id === skipId || Number(e.timestamp) < fromTimestamp) continue
    if (Number(e.balanceAfter) !== running) out[`${base}/entries/${e.id}/balanceAfter`] = running
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
async function _findTransferCounterpart(uid, entry) {
  const isOut = entry.type === 'transfer_out'
  const projectId = isOut ? entry.toProjectId : entry.fromProjectId
  const bookId = isOut ? entry.toBookId : entry.fromBookId
  if (!entry.transferId || !projectId || !bookId) return null
  const snap = await get(ref(db, `users/${uid}/projects/${projectId}/books/${bookId}/entries`))
  const match = toArray(snap.val()).find((e) => e.transferId === entry.transferId && e.type === (isOut ? 'transfer_in' : 'transfer_out'))
  return match ? { projectId, bookId, entryId: match.id, entry: match } : null
}

// Avoid floating-point drift (e.g. 0.1 + 0.2) in stored balances.
function roundMoney(n) {
  return Math.round(n * 100) / 100
}

function friendlyDbError(err) {
  const msg = err?.message || String(err)
  if (msg.includes('permission_denied')) return 'Permission denied. Check your Firebase rules.'
  if (msg.includes('network')) return 'Network error. Please check your connection.'
  return msg
}

async function _recalcBalances(uid, projectId, bookId) {
  const entriesRef = ref(db, `users/${uid}/projects/${projectId}/books/${bookId}/entries`)
  const snap = await get(entriesRef)
  const arr = toArray(snap.val() || {}).sort(compareOldestFirst)
  const updates = {}
  let running = 0
  for (const e of arr) {
    const signed = signedAmountOf(e)
    running = roundMoney(running + signed)
    updates[`users/${uid}/projects/${projectId}/books/${bookId}/entries/${e.id}/balanceAfter`] = running
  }

  await update(ref(db), updates)
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

async function _recalcBalancesFrom(uid, projectId, bookId, fromTimestamp) {
  const entriesRef = ref(db, `users/${uid}/projects/${projectId}/books/${bookId}/entries`)
  const snap = await get(entriesRef)
  const arr = toArray(snap.val() || {}).sort(compareOldestFirst)
  const updates = {}
  let running = 0

  for (const entry of arr) {
    const signed = signedAmountOf(entry)
    if (entry.timestamp < fromTimestamp) {
      running = roundMoney(running + signed)
      continue
    }

    running = roundMoney(running + signed)
    updates[`users/${uid}/projects/${projectId}/books/${bookId}/entries/${entry.id}/balanceAfter`] = running
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
}
