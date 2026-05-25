import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { get, limitToLast, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'

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
  const [loading, setLoading] = useState(true)

  // All active Firebase listeners — keyed so we can tear them down cleanly
  const unsubsRef = useRef(new Map()) // key → unsub fn

  useEffect(() => {
    // Tear down every listener from the previous uid
    unsubsRef.current.forEach((fn) => fn())
    unsubsRef.current.clear()

    if (!user?.uid) {
      setProjects([])
      setBooksByProject({})
      setEntriesByBook({})
      setLoading(false)
      return
    }

    setLoading(true)
    const uid = user.uid

    const projectsRef = ref(db, `users/${uid}/projects`)
    const unsubProjects = onValue(projectsRef, (snapshot) => {
      const loadedProjects = toArray(snapshot.val())
      setProjects(loadedProjects)
      setLoading(false)

      // Remove stale book/entry listeners (keep only the projects one)
      unsubsRef.current.forEach((fn, key) => {
        if (key !== 'projects') { fn(); unsubsRef.current.delete(key) }
      })

      loadedProjects.forEach((project) => {
        const booksKey = `books:${project.id}`
        const booksRef = ref(db, `users/${uid}/projects/${project.id}/books`)
        const unsubBooks = onValue(booksRef, (booksSnap) => {
          const books = toArray(booksSnap.val())
          setBooksByProject((prev) => ({ ...prev, [project.id]: books }))

          books.forEach((book) => {
            const entriesKey = `entries:${book.id}`
            // Don't re-subscribe if already listening
            if (unsubsRef.current.has(entriesKey)) return
            const entriesRef = ref(db, `users/${uid}/projects/${project.id}/books/${book.id}/entries`)
            const unsubEntries = onValue(entriesRef, (entriesSnap) => {
              const entries = toArray(entriesSnap.val()).sort((a, b) => b.timestamp - a.timestamp)
              setEntriesByBook((prev) => ({ ...prev, [book.id]: entries }))
            })
            unsubsRef.current.set(entriesKey, unsubEntries)
          })
        })
        unsubsRef.current.set(booksKey, unsubBooks)
      })
    })

    unsubsRef.current.set('projects', unsubProjects)

    return () => {
      unsubsRef.current.forEach((fn) => fn())
      unsubsRef.current.clear()
    }
  }, [user?.uid])

  // ── Projects ──────────────────────────────────────────────────────────────

  const createProject = useCallback(async ({ name, description }) => {
    const projectRef = push(ref(db, `users/${user.uid}/projects`))
    await set(projectRef, {
      name,
      description: description || '',
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

  const addEntry = useCallback(async (projectId, bookId, payload) => {
    const entriesRef = ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries`)
    const entryTimestamp = payload.timestamp || Date.now()

    const signedAmount = payload.type === 'income' ? Number(payload.amount) : -Number(payload.amount)
    const currentSnap = await get(query(entriesRef, orderByChild('timestamp'), limitToLast(1)))
    const latestEntries = toArray(currentSnap.val()).sort((a, b) => a.timestamp - b.timestamp)
    const latestEntry = latestEntries.at(-1)
    const lastBalance = latestEntry ? Number(latestEntry.balanceAfter || 0) : 0
    const lastTimestamp = latestEntry ? Number(latestEntry.timestamp || 0) : 0

    const balanceAfter = lastBalance + signedAmount
    const isAppendOnly = !latestEntry || entryTimestamp >= lastTimestamp

    const newRef = push(entriesRef)
    await set(newRef, {
      amount: Number(payload.amount),
      type: payload.type,
      description: payload.description,
      category: payload.category || 'General',
      mode: payload.mode || 'Cash',
      balanceAfter,
      enteredBy: payload.enteredBy || '',
      timestamp: entryTimestamp,
      notes: payload.notes || '',
      isSavings: Boolean(payload.isSavings),
    }).catch((err) => { throw new Error(friendlyDbError(err)) })

    if (!isAppendOnly) {
      await _recalcBalancesFrom(user.uid, projectId, bookId, entryTimestamp)
    }

    await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), {
      updatedAt: Date.now(),
    })

    return balanceAfter
  }, [user?.uid])

  const deleteEntry = useCallback(async (projectId, bookId, entryId) => {
    const entryRef = ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries/${entryId}`)
    const entrySnap = await get(entryRef)
    const entry = entrySnap.val()
    if (!entry) {
      throw new Error('Entry not found')
    }

    await remove(entryRef).catch((err) => { throw new Error(friendlyDbError(err)) })

    const latestSnap = await get(query(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries`), orderByChild('timestamp'), limitToLast(1)))
    const latestEntries = toArray(latestSnap.val()).sort((a, b) => a.timestamp - b.timestamp)
    const latestEntry = latestEntries.at(-1)

    if (!latestEntry || Number(entry.timestamp) >= Number(latestEntry.timestamp || 0)) {
      await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), { updatedAt: Date.now() })
      return
    }

    await _recalcBalancesFrom(user.uid, projectId, bookId, Number(entry.timestamp || 0))
    await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), { updatedAt: Date.now() })
  }, [user?.uid])

  const updateEntry = useCallback(async (projectId, bookId, entryId, payload) => {
    const entriesRef = ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries`)
    const snap = await get(entriesRef)
    const arr = toArray(snap.val() || {}).sort((a, b) => a.timestamp - b.timestamp)

    // Strip internal-only keys before writing to Firebase
    const { _localCategories, id: _id, ...cleanPayload } = payload

    const next = arr.map((e) =>
      e.id === entryId
        ? { ...e, ...cleanPayload, amount: Number(cleanPayload.amount) }
        : e
    )

    let running = 0
    const updates = {}
    for (const e of next) {
      const signed = e.type === 'income' ? Number(e.amount) : -Number(e.amount)
      running += signed
      updates[`users/${user.uid}/projects/${projectId}/books/${bookId}/entries/${e.id}`] = {
        ...sanitiseEntry(e),
        balanceAfter: running,
      }
    }

    await update(ref(db), updates)

    await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), {
      updatedAt: Date.now(),
    })
  }, [user?.uid])

  const getBookCurrentBalance = useCallback((bookId) => {
    const entries = entriesByBook[bookId] || []
    if (!entries.length) return 0
    const latest = [...entries].sort((a, b) => a.timestamp - b.timestamp).at(-1)
    return Number(latest?.balanceAfter || 0)
  }, [entriesByBook])

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

    const sourceEntries = toArray(sourceEntriesSnap.val()).sort((a, b) => a.timestamp - b.timestamp)
    const destinationEntries = toArray(destinationEntriesSnap.val()).sort((a, b) => a.timestamp - b.timestamp)
    const sourceBalance = sourceEntries.length
      ? Number(sourceEntries[sourceEntries.length - 1].balanceAfter || 0)
      : 0

    if (numericAmount > sourceBalance) {
      throw new Error(`Insufficient balance. Available: ${sourceBalance.toFixed(2)}`)
    }

    const timestamp = Date.now()
    const transferId = `txfr_${timestamp}_${Math.random().toString(36).slice(2, 7)}`

    const sourceEntryRef = push(ref(db, `users/${user.uid}/projects/${sourceProjectId}/books/${sourceBookId}/entries`))
    const destinationEntryRef = push(ref(db, `users/${user.uid}/projects/${destinationProjectId}/books/${destinationBookId}/entries`))

    const sourceBalanceAfter = Number((sourceBalance - numericAmount).toFixed(2))
    const destinationBalance = destinationEntries.length
      ? Number(destinationEntries[destinationEntries.length - 1].balanceAfter || 0)
      : 0
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

    await update(ref(db), updates)
  }, [user?.uid])

  const setPinForBook = useCallback(async (projectId, bookId, pinHash) => {
    const path = `users/${user.uid}/projects/${projectId}/books/${bookId}`
    if (pinHash) {
      await update(ref(db, path), { pinHash, updatedAt: Date.now() })
        .catch((err) => { throw new Error(friendlyDbError(err)) })
    } else {
      // Remove pin
      const snap = await get(ref(db, path))
      const data = snap.val() || {}
      delete data.pinHash
      await set(ref(db, path), { ...data, updatedAt: Date.now() })
        .catch((err) => { throw new Error(friendlyDbError(err)) })
    }
  }, [user?.uid])

  const setPinForProject = useCallback(async (projectId, pinHash) => {
    const path = `users/${user.uid}/projects/${projectId}`
    if (pinHash) {
      await update(ref(db, path), { pinHash, updatedAt: Date.now() })
        .catch((err) => { throw new Error(friendlyDbError(err)) })
    } else {
      const snap = await get(ref(db, path))
      const data = snap.val() || {}
      delete data.pinHash
      await set(ref(db, path), { ...data, updatedAt: Date.now() })
        .catch((err) => { throw new Error(friendlyDbError(err)) })
    }
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

  const value = useMemo(() => ({
    loading,
    projects,
    booksByProject,
    entriesByBook,
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
    setPinForBook,
    setPinForProject,
    transferBetweenBooks,
  }), [
    loading, projects, booksByProject, entriesByBook,
    createProject, updateProject, deleteProject,
    createBook, updateBook, deleteBook,
    deleteBookWithPin, deleteProjectWithPin,
    addEntry, deleteEntry, updateEntry,
    getBookCurrentBalance, updateCategories, getCategories,
    setPinForBook, setPinForProject, transferBetweenBooks,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function friendlyDbError(err) {
  const msg = err?.message || String(err)
  if (msg.includes('permission_denied')) return 'Permission denied. Check your Firebase rules.'
  if (msg.includes('network')) return 'Network error. Please check your connection.'
  return msg
}

async function _recalcBalances(uid, projectId, bookId) {
  const entriesRef = ref(db, `users/${uid}/projects/${projectId}/books/${bookId}/entries`)
  const snap = await get(entriesRef)
  const arr = toArray(snap.val() || {}).sort((a, b) => a.timestamp - b.timestamp)
  const updates = {}
  let running = 0
  for (const e of arr) {
    const signed = e.type === 'income' ? Number(e.amount) : -Number(e.amount)
    running += signed
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
    const category = String(item || '').trim()
    if (!category) continue
    const key = category.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(category)
  }

  return cleaned
}

async function _recalcBalancesFrom(uid, projectId, bookId, fromTimestamp) {
  const entriesRef = ref(db, `users/${uid}/projects/${projectId}/books/${bookId}/entries`)
  const snap = await get(entriesRef)
  const arr = toArray(snap.val() || {}).sort((a, b) => a.timestamp - b.timestamp)
  const updates = {}
  let running = 0

  for (const entry of arr) {
    const signed = entry.type === 'income' ? Number(entry.amount) : -Number(entry.amount)
    if (entry.timestamp < fromTimestamp) {
      running += signed
      continue
    }

    running += signed
    updates[`users/${uid}/projects/${projectId}/books/${bookId}/entries/${entry.id}/balanceAfter`] = running
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
}
