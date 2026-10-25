import { auth } from './firebase'
import { translate } from '../i18n/core'

// ArthaLedger server (feedback, admin, reminders). It sleeps when idle on the
// free plan, so the first call after a while can take several seconds.
export const API_BASE = import.meta.env.VITE_API_URL || 'https://arthaledger-api.onrender.com'

/**
 * Call the server. Signed-in calls send the user's ID token. Errors carry the
 * server's message so the UI can show it.
 */
export async function api(path, { method = 'GET', body, signedIn = true, timeoutMs = 45000 } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (signedIn) {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error(translate('app.api.signInAgain'))
    headers.Authorization = `Bearer ${token}`
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal,
    })
  } catch (err) {
    throw new Error(err?.name === 'AbortError'
      ? translate('app.api.slowServer')
      : translate('app.api.noConnection'), { cause: err })
  } finally {
    clearTimeout(timer)
  }
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) {
    const detail = data?.detail
    const msg = typeof detail === 'string' ? detail
      : Array.isArray(detail) ? translate('app.api.checkInput') : translate('app.api.serverError', { status: res.status })
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}
