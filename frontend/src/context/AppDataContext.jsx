import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { get, onValue, push, ref, remove, set, update } from 'firebase/database'
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
    const currentSnap = await get(entriesRef)
    // Sort chronologically so we insert at the correct position
    const currentEntries = toArray(currentSnap.val()).sort((a, b) => a.timestamp - b.timestamp)

    const entryTimestamp = payload.timestamp || Date.now()

    // Find the last entry that comes BEFORE this new entry's timestamp
    const precedingEntries = currentEntries.filter((e) => e.timestamp <= entryTimestamp)
    const lastBalance = precedingEntries.length
      ? Number(precedingEntries[precedingEntries.length - 1].balanceAfter || 0)
      : 0

    const signedAmount = payload.type === 'income' ? Number(payload.amount) : -Number(payload.amount)
    const balanceAfter = lastBalance + signedAmount

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
    }).catch((err) => { throw new Error(friendlyDbError(err)) })

    // If the new entry was inserted in the middle (past date), recalculate all subsequent balances
    const hasSubsequent = currentEntries.some((e) => e.timestamp > entryTimestamp)
    if (hasSubsequent) {
      await _recalcBalances(user.uid, projectId, bookId)
    }

    await update(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}`), {
      updatedAt: Date.now(),
    })

    return balanceAfter
  }, [user?.uid])

  const deleteEntry = useCallback(async (projectId, bookId, entryId) => {
    await remove(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries/${entryId}`))
      .catch((err) => { throw new Error(friendlyDbError(err)) })
    await _recalcBalances(user.uid, projectId, bookId)
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
    for (const e of next) {
      const signed = e.type === 'income' ? Number(e.amount) : -Number(e.amount)
      running += signed
      const entryRef = ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/entries/${e.id}`)
      await update(entryRef, { ...sanitiseEntry(e), balanceAfter: running })
    }

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
    await set(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/categories`), categories)
      .catch((err) => { throw new Error(friendlyDbError(err)) })
  }, [user?.uid])

  const getCategories = useCallback(async (projectId, bookId) => {
    try {
      const snapshot = await get(ref(db, `users/${user.uid}/projects/${projectId}/books/${bookId}/categories`))
      return snapshot.val() || []
    } catch {
      return []
    }
  }, [user?.uid])

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
    addEntry,
    deleteEntry,
    updateEntry,
    getBookCurrentBalance,
    updateCategories,
    getCategories,
  }), [
    loading, projects, booksByProject, entriesByBook,
    createProject, updateProject, deleteProject,
    createBook, updateBook, deleteBook,
    addEntry, deleteEntry, updateEntry,
    getBookCurrentBalance, updateCategories, getCategories,
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
  let running = 0
  for (const e of arr) {
    const signed = e.type === 'income' ? Number(e.amount) : -Number(e.amount)
    running += signed
    await update(
      ref(db, `users/${uid}/projects/${projectId}/books/${bookId}/entries/${e.id}`),
      { balanceAfter: running },
    )
  }
}
