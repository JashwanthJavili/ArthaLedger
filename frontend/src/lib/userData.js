import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore'
import { db, legacyDatabase } from './firebase'

/*
 * Where each user's data lives in Firestore
 *
 *   users/{uid}                          profile, categories, budgets
 *     projects/{projectId}
 *       books/{bookId}
 *         entries/{entryId}
 *         templates/{templateId}
 *     trips/{tripId}                     groups; `entries` is a map of links
 *     pushTokens/{key}
 *     pinGuards/{id}
 *   reminders/{uid}                      reminder settings (read by the server)
 *
 * The security rules only let a signed-in user reach their own uid.
 */

export const userDoc = (uid) => doc(db, 'users', uid)
export const remindersDoc = (uid) => doc(db, 'reminders', uid)
export const projectsCol = (uid) => collection(db, 'users', uid, 'projects')
export const projectDoc = (uid, pid) => doc(db, 'users', uid, 'projects', pid)
export const booksCol = (uid, pid) => collection(db, 'users', uid, 'projects', pid, 'books')
export const bookDoc = (uid, pid, bid) => doc(db, 'users', uid, 'projects', pid, 'books', bid)
export const entriesCol = (uid, pid, bid) => collection(db, 'users', uid, 'projects', pid, 'books', bid, 'entries')
export const entryDoc = (uid, pid, bid, eid) => doc(db, 'users', uid, 'projects', pid, 'books', bid, 'entries', eid)
export const templatesCol = (uid, pid, bid) => collection(db, 'users', uid, 'projects', pid, 'books', bid, 'templates')
export const templateDoc = (uid, pid, bid, tid) => doc(db, 'users', uid, 'projects', pid, 'books', bid, 'templates', tid)
export const tripsCol = (uid) => collection(db, 'users', uid, 'trips')
export const tripDoc = (uid, tid) => doc(db, 'users', uid, 'trips', tid)
export const pushTokenDoc = (uid, key) => doc(db, 'users', uid, 'pushTokens', key)
export const pinGuardDoc = (uid, id) => doc(db, 'users', uid, 'pinGuards', id)

// Bump when the layout changes; a future move can then upgrade each account once
export const SCHEMA_VERSION = 1

export const docsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

/** For a new document: drop empty values (Firestore keeps nulls; the old database dropped them). */
export function forCreate(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined))
}

/** For an update: null means "remove this field", as it did before. */
export function forUpdate(obj) {
  return Object.fromEntries(Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, v === null ? deleteField() : v]))
}

/**
 * Commit many writes. Firestore allows 500 per batch, so larger jobs are split.
 * Each batch is applied on this device straight away (the listeners update at
 * once); the promise resolves when the server has them all.
 * ops: [{ type: 'set' | 'update' | 'delete', ref, data, merge }]
 */
export function commitAll(ops) {
  const CHUNK = 450
  const commits = []
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + CHUNK)) {
      if (op.type === 'delete') batch.delete(op.ref)
      else if (op.type === 'update') batch.update(op.ref, op.data)
      else batch.set(op.ref, op.data, op.merge ? { merge: true } : undefined)
    }
    commits.push(batch.commit())
  }
  return Promise.all(commits)
}

/** Replace one top-level field of users/{uid}, creating the document if needed. */
export async function setUserField(uid, field, value) {
  try {
    await updateDoc(userDoc(uid), { [field]: value })
  } catch (err) {
    if (err?.code !== 'not-found') throw err
    await setDoc(userDoc(uid), { [field]: value }, { merge: true })
  }
}

/* ─────────────── delete everything for an account ─────────────── */

export async function deleteAllUserData(uid) {
  const ops = []
  const del = (ref) => ops.push({ type: 'delete', ref })
  const projects = await getDocs(projectsCol(uid))
  for (const p of projects.docs) {
    const books = await getDocs(booksCol(uid, p.id))
    for (const b of books.docs) {
      const [entries, templates] = await Promise.all([getDocs(entriesCol(uid, p.id, b.id)), getDocs(templatesCol(uid, p.id, b.id))])
      entries.docs.forEach((d) => del(d.ref))
      templates.docs.forEach((d) => del(d.ref))
      del(b.ref)
    }
    del(p.ref)
  }
  for (const name of ['trips', 'pushTokens', 'pinGuards']) {
    const snap = await getDocs(collection(db, 'users', uid, name))
    snap.docs.forEach((d) => del(d.ref))
  }
  await commitAll(ops)
  await deleteDoc(remindersDoc(uid)).catch(() => {})
  await deleteDoc(userDoc(uid))

  // The copy kept in the old database goes too
  try {
    const { ref, remove, instance } = await legacyDatabase()
    await remove(ref(instance, `users/${uid}`))
  } catch { /* nothing there, or already gone */ }
}

/* ─────────────── one-time move from the old database ─────────────── */

const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v && typeof v === 'object' ? Object.values(v) : [])
const entriesOf = (obj) => Object.entries(obj && typeof obj === 'object' ? obj : {}).filter(([, v]) => v && typeof v === 'object')

/**
 * Copies this account's data from the Realtime Database into Firestore, once.
 * The old data is only read, never changed, so it stays as a backup. If a
 * previous attempt stopped half-way, documents already in Firestore are kept
 * as they are (they may have been edited since) and only missing ones are added.
 */
export async function migrateFromRealtimeDb(uid) {
  const meta = await getDoc(userDoc(uid))
  const state = meta.exists() ? meta.data() : {}
  if (state.migratedAt) return { done: false }
  const resuming = Boolean(state.migrationStartedAt)

  let old = null
  try {
    const { ref, get, instance } = await legacyDatabase()
    old = (await get(ref(instance, `users/${uid}`))).val()
  } catch (err) {
    const msg = String(err?.message || err).toLowerCase()
    // Offline: try again next time. Not allowed to read: nothing to move.
    if (!msg.includes('permission')) throw err
  }

  if (!old) {
    await setDoc(userDoc(uid), { migratedAt: Date.now(), schemaVersion: SCHEMA_VERSION }, { merge: true })
    return { done: true, copied: 0 }
  }

  await setDoc(userDoc(uid), { migrationStartedAt: Date.now() }, { merge: true })

  // When resuming, skip anything that already made it across
  const existing = async (col) => (resuming ? new Set((await getDocs(col)).docs.map((d) => d.id)) : new Set())
  const ops = []
  const put = (ref, data) => ops.push({ type: 'set', ref, data })

  // users/{uid}: profile, categories, budgets (only fields not already set)
  const root = {}
  if (old.profile && !state.profile) root.profile = old.profile
  if (old.categories && !state.categories) root.categories = asList(old.categories)
  if (old.budgets && !state.budgets) root.budgets = old.budgets
  if (Object.keys(root).length) ops.push({ type: 'set', ref: userDoc(uid), data: root, merge: true })

  const haveProjects = await existing(projectsCol(uid))
  for (const [pid, project] of entriesOf(old.projects)) {
    const { books, ...projectData } = project
    if (!haveProjects.has(pid)) put(projectDoc(uid, pid), projectData)
    const haveBooks = await existing(booksCol(uid, pid))
    for (const [bid, book] of entriesOf(books)) {
      const { entries, templates, ...bookData } = book
      if (!haveBooks.has(bid)) put(bookDoc(uid, pid, bid), bookData)
      const haveEntries = await existing(entriesCol(uid, pid, bid))
      for (const [eid, entry] of entriesOf(entries)) {
        // eslint-disable-next-line no-unused-vars
        const { id, ...clean } = entry
        if (!haveEntries.has(eid)) put(entryDoc(uid, pid, bid, eid), clean)
      }
      const haveTemplates = await existing(templatesCol(uid, pid, bid))
      for (const [tid, tpl] of entriesOf(templates)) {
        if (!haveTemplates.has(tid)) put(templateDoc(uid, pid, bid, tid), tpl)
      }
    }
  }

  const haveTrips = await existing(tripsCol(uid))
  for (const [tid, trip] of entriesOf(old.trips)) if (!haveTrips.has(tid)) put(tripDoc(uid, tid), trip)
  for (const [key, guard] of entriesOf(old.pinGuards)) put(pinGuardDoc(uid, key), guard)
  for (const [key, token] of entriesOf(old.pushTokens)) put(pushTokenDoc(uid, key), token)

  if (old.reminderSettings && typeof old.reminderSettings === 'object') {
    const rem = await getDoc(remindersDoc(uid))
    if (!rem.exists()) put(remindersDoc(uid), old.reminderSettings)
  }

  await commitAll(ops)
  await setDoc(userDoc(uid), { migratedAt: Date.now(), schemaVersion: SCHEMA_VERSION }, { merge: true })
  return { done: true, copied: ops.length }
}
