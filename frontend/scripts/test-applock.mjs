// App lock checks: fingerprint unlock accepts only a genuine, fresh,
// user-verified signature from the key set up on this phone; the visit lock
// starts locked, locks on leaving, and pauses only around the person's own
// actions. Run: node scripts/test-applock.mjs
import { webcrypto } from 'node:crypto'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.log(`FAIL ${name}`) } }

// ── A browser-like world ──
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
const focusListeners = new Set()
globalThis.window = {
  location: { hostname: 'artha-ledger.vercel.app', origin: 'https://artha-ledger.vercel.app' },
  isSecureContext: true,
  PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true },
  addEventListener: (t, fn) => { if (t === 'focus') focusListeners.add(fn) },
  removeEventListener: (t, fn) => { if (t === 'focus') focusListeners.delete(fn) },
}
if (!globalThis.crypto) globalThis.crypto = webcrypto

// ── A software authenticator standing in for the phone's fingerprint sensor ──
const enc = new TextEncoder()
const b64u = (buf) => Buffer.from(buf).toString('base64url')
const sha = async (b) => new Uint8Array(await crypto.subtle.digest('SHA-256', b))

function rawToDer(raw) {
  const int = (b) => {
    let i = 0
    while (i < b.length - 1 && b[i] === 0) i++
    let v = b.slice(i)
    if (v[0] & 0x80) v = Uint8Array.from([0, ...v])
    return Uint8Array.from([0x02, v.length, ...v])
  }
  const r = int(raw.slice(0, 32)), s = int(raw.slice(32))
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s])
}

const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const otherKeys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey))
const credId = crypto.getRandomValues(new Uint8Array(32))

// What the next navigator.credentials.get() should do
let behave = {}
async function makeAssertion(publicKey) {
  const b = behave
  const rpId = b.rpId ?? publicKey.rpId
  const flags = b.flags ?? 0x05 // user present + user verified
  const auth = new Uint8Array(37)
  auth.set(await sha(enc.encode(rpId)), 0)
  auth[32] = flags
  const client = enc.encode(JSON.stringify({
    type: b.type ?? 'webauthn.get',
    challenge: b.challenge ?? b64u(publicKey.challenge),
    origin: b.origin ?? 'https://artha-ledger.vercel.app',
  }))
  const signed = new Uint8Array([...auth, ...(await sha(client))])
  const rawSig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, (b.signer ?? keys).privateKey, signed))
  return {
    rawId: (b.rawId ?? credId).buffer,
    response: { clientDataJSON: client.buffer, authenticatorData: auth.buffer, signature: rawToDer(rawSig).buffer },
  }
}
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    credentials: {
      create: async () => ({
        rawId: credId.buffer,
        response: { getPublicKey: () => spki.buffer, getPublicKeyAlgorithm: () => -7 },
      }),
      get: async ({ publicKey }) => (behave.cancel ? null : makeAssertion(publicKey)),
    },
  },
})

// appLock.js imports Firestore helpers; only the pure parts are used here
const lib = await import('../src/lib/appLockCore.js').catch((e) => { console.log('import failed', e.message); process.exit(1) })
const { enrollFingerprint, verifyFingerprint, hasFingerprint, removeFingerprint, lockSession, withLockPaused, pauseUntilFocus, lockFromUserDoc, startHandoff, takeHandoffPass, noteAlive, returningFromHandoff } = lib

const uid = 'u1'
ok('no fingerprint before set-up', !hasFingerprint(uid) && (await verifyFingerprint(uid)) === false)
await enrollFingerprint({ uid, email: 'a@b.c', displayName: 'A' })
ok('set up', hasFingerprint(uid))

behave = {}
ok('genuine fingerprint unlocks', await verifyFingerprint(uid))
behave = { flags: 0x01 }
ok('touch without fingerprint/face check is refused', !(await verifyFingerprint(uid)))
behave = { flags: 0x00 }
ok('no user present is refused', !(await verifyFingerprint(uid)))
behave = { challenge: b64u(crypto.getRandomValues(new Uint8Array(32))) }
ok('replayed / old challenge is refused', !(await verifyFingerprint(uid)))
behave = { origin: 'https://evil.example' }
ok('another website is refused', !(await verifyFingerprint(uid)))
behave = { rpId: 'evil.example' }
ok('a key for another site is refused', !(await verifyFingerprint(uid)))
behave = { type: 'webauthn.create' }
ok('wrong ceremony type is refused', !(await verifyFingerprint(uid)))
behave = { signer: otherKeys }
ok('signature from a different key is refused', !(await verifyFingerprint(uid)))
behave = { rawId: crypto.getRandomValues(new Uint8Array(32)) }
ok('a different credential is refused', !(await verifyFingerprint(uid)))
behave = { cancel: true }
ok('cancelled prompt is refused', !(await verifyFingerprint(uid)))
behave = {}
ok('another account on this phone has no fingerprint', !(await verifyFingerprint('someone-else')))
removeFingerprint(uid)
ok('removed', !hasFingerprint(uid) && !(await verifyFingerprint(uid)))

// ── The setting from the account record ──
ok('no setting = off', lockFromUserDoc({}) === null && lockFromUserDoc(null) === null)
ok('setting read', JSON.stringify(lockFromUserDoc({ appLock: { pinHash: 'pbkdf2$1$a$b', pinLength: 4 } })) === '{"pinHash":"pbkdf2$1$a$b","pinLength":4}')
ok('junk setting ignored', lockFromUserDoc({ appLock: { pinHash: 5 } }) === null && lockFromUserDoc({ appLock: 'x' }) === null)

// ── This visit: locked until unlocked, locks on leaving ──
// (the fingerprint prompts above leave a 1.5 s grace; let it pass)
await new Promise((r) => setTimeout(r, 1600))
ok('starts locked', !lockSession.isUnlocked())
let changes = 0
const off = lockSession.subscribe(() => changes++)
lockSession.unlock()
ok('unlocks', lockSession.isUnlocked() && changes === 1)
lockSession.lock()
ok('locks again on leaving', !lockSession.isUnlocked() && changes === 2)

lockSession.unlock()
let lockedDuring = null
await withLockPaused(async () => { lockSession.lock(); lockedDuring = !lockSession.isUnlocked() })
ok('stays open while its own system prompt is up', lockedDuring === false)
await new Promise((r) => setTimeout(r, 1600))
lockSession.lock()
ok('locks again once the pause is over', !lockSession.isUnlocked())

lockSession.unlock()
pauseUntilFocus()
lockSession.lock()
ok('stays open while choosing a file', lockSession.isUnlocked())
focusListeners.forEach((fn) => fn())
await new Promise((r) => setTimeout(r, 1600))
lockSession.lock()
ok('locks again after the file picker closed', !lockSession.isUnlocked())
off()

// ── Bank SMS hand-off: one short-lived, one-use pass ──
await new Promise((r) => setTimeout(r, 1600))
lockSession.lock()
startHandoff()
ok('no pass written while locked', localStorage.getItem('artha.lock.pass') === null)
lockSession.unlock()
startHandoff()
ok('pass opens the Bank SMS page', takeHandoffPass('/sms-import'))
ok('pass works only once', !takeHandoffPass('/sms-import'))
startHandoff()
ok('pass is not for other pages', !takeHandoffPass('/dashboard') && !takeHandoffPass('/sms-import'))
localStorage.setItem('artha.lock.pass', JSON.stringify({ id: 'x', until: Date.now() - 1 }))
ok('expired pass refused', !takeHandoffPass('/sms-import'))
localStorage.setItem('artha.lock.pass', JSON.stringify({ id: 'x', until: Date.now() + 3600e3 }))
ok('pass claiming a long life refused', !takeHandoffPass('/sms-import'))
localStorage.setItem('artha.lock.pass', 'junk')
ok('junk pass refused', !takeHandoffPass('/sms-import'))

// Coming back to the page that started it
lockSession.unlock()
startHandoff()
await new Promise((r) => setTimeout(r, 20))
noteAlive() // the unlocked Bank SMS page leaves the screen
lockSession.lock()
ok('back straight from an unlocked page: let through', returningFromHandoff())
ok('only once', !returningFromHandoff())
lockSession.unlock()
startHandoff()
await new Promise((r) => setTimeout(r, 20))
noteAlive()
lockSession.lock()
await new Promise((r) => setTimeout(r, 4200))
ok('back after a while elsewhere: locked', !returningFromHandoff())
lockSession.lock()
localStorage.setItem('artha.lock.alive', String(Date.now()))
ok('a locked page cannot mark itself alive', (noteAlive(), !returningFromHandoff()))

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
