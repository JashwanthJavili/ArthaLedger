/*
 * The Android app (a Trusted Web Activity) adds ?app=<features> to the URLs it
 * opens, e.g. "sms1" when it can read bank SMS. We remember that on this
 * device, so features that need the app only show where they will work.
 */

import { MAX_BODY } from './smsParse.js'

const KEY = 'artha.app'
// The app sends at most 400; anything past this is ignored
const MAX_ITEMS = 500

/** Call once at start-up, before the router changes the URL. */
export function rememberAppFeatures() {
  try {
    const app = new URLSearchParams(window.location.search).get('app')
    if (app && /^[a-z0-9,]{1,40}$/.test(app)) localStorage.setItem(KEY, app)
  } catch { /* private mode: the feature just stays hidden */ }
}

function features() {
  try { return (localStorage.getItem(KEY) || '').split(',') } catch { return [] }
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent)
}

/** True once an Android app version that can read bank SMS has opened this site here. */
export function hasSmsApp() {
  return isAndroid() && features().includes('sms1')
}

/**
 * Offered on every Android phone. If the app (or this version of it) isn't
 * installed, Chrome opens /sms-import?status=noapp, which offers the download.
 */
export function canImportSms() {
  return isAndroid()
}

// ── Bank SMS handed over by the Android app ─────────────────────────────────
// The app opens /sms-import and then posts the messages over Chrome's private
// app-to-page channel. They can arrive before the page has signed in and
// mounted, so they are caught here at start-up and kept in memory (never
// stored) until the review page takes them.

let smsPayload = null
const smsWaiters = new Set()

function receive(raw, port) {
  if (typeof raw !== 'string') return
  let data
  try { data = JSON.parse(raw) } catch { return }
  if (data?.type !== 'artha-sms' || data.version !== 1 || !Array.isArray(data.items)) return
  // Keep only well-formed messages, and only the three fields we use
  const items = data.items
    .filter((m) => m && typeof m.sender === 'string' && m.sender.length <= 40
      && typeof m.body === 'string' && m.body.length <= MAX_BODY
      && Number.isFinite(m.date) && m.date > 0)
    .slice(0, MAX_ITEMS)
    .map((m) => ({ sender: m.sender, body: m.body, date: m.date }))
  const days = [7, 30, 90].includes(data.days) ? data.days : 30
  smsPayload = { items, truncated: Boolean(data.truncated), days }
  try { port.postMessage(JSON.stringify({ type: 'artha-sms-ack' })) } catch { /* the app keeps its copy until it closes */ }
  smsWaiters.forEach((fn) => fn(smsPayload))
}

/** Call once at start-up. */
export function listenForSms() {
  // Chrome first sends an empty message from "android-app://<site>" carrying a
  // private port; the app's messages then arrive on that port. Chrome only
  // opens it after checking the app may speak for this site (assetlinks.json),
  // and no web page can send from an android-app:// origin. The origin must
  // name this very site: another app vouched for by some other site can't
  // pass messages off as ours.
  const appOrigin = `android-app://${window.location.host}`
  window.addEventListener('message', (event) => {
    if (event.origin !== appOrigin || !event.ports?.[0]) return
    const port = event.ports[0]
    port.onmessage = (e) => receive(e.data, port)
  })
}

/** The messages, once (null if none have arrived). */
export function takeSms() {
  const p = smsPayload
  smsPayload = null
  return p
}

/** Calls fn when messages arrive; returns an unsubscribe function. */
export function onSms(fn) {
  smsWaiters.add(fn)
  return () => smsWaiters.delete(fn)
}

/**
 * Hands over to the Android app, which asks for the SMS permission, reads
 * recent bank messages and opens /sms-import with them.
 * book: "projectId/bookId" to preselect, or null.
 */
export function startSmsImport({ lang = 'en', book = null, days = 30 } = {}) {
  const q = new URLSearchParams({ days: String(days), lang })
  if (book) q.set('book', book)
  // If the app isn't there any more, Chrome opens this page instead
  const fallback = `${window.location.origin}/sms-import?status=noapp`
  window.location.href = `intent://sms-import?${q}#Intent;scheme=arthaledger;package=com.arthaledger.app;S.browser_fallback_url=${encodeURIComponent(fallback)};end`
}
