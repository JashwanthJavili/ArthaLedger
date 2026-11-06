// Security checks for "Add from bank SMS": OTPs never get through, real alerts
// with safety footers do, and the page only accepts messages from our own app.
// Run: node scripts/test-sms-security.mjs
import { parseSms, parseAll, isOtp, MAX_BODY } from '../src/lib/smsParse.js'

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) pass++
  else { fail++; console.log(`FAIL ${name} ${extra}`) }
}
const T = Date.UTC(2026, 10, 5, 10, 0)

// ── OTPs and codes are never offered ──
const OTPS = [
  '123456 is OTP for txn of INR 2,000.00 at AMAZON on HDFC Bank card ending 4321. Do not share OTP.',
  'Your OTP for transaction of Rs.1,999 at FLIPKART on SBI Card ending 7788 is 482910. Pls do not share with anyone',
  'Use code 123456 to complete your UPI payment of Rs 500 to ramesh@ybl. Never share this code. -PhonePe',
  'Enter code 9988 to approve Rs 2,000 debit from A/c XX1234',
  'Your verification code is 445566 for payment of Rs.300',
  '889900 is your one time password for Rs 1,500 txn at MYNTRA',
  'Code: 44556677 for Rs.250 transfer. Valid 5 min',
  'Authentication code 1234 for INR 500 at SWIGGY',
  'OTP 778899 for Rs 999 at Zomato. NEVER share it',
  'Use 482913 to complete your purchase of Rs 1,299 at Amazon',
  'Your one time PIN 482913 for txn of Rs.500 at FLIPKART',
  '3D Secure PIN: 829123 for Rs 750 spent at Myntra',
  'Transaction password 5521 for INR 2,000 at CROMA. Valid for 5 mins',
  '𝗢𝗧𝗣 990011 for Rs 450 at Swiggy',
]
for (const body of OTPS) {
  ok(`otp skipped: ${body.slice(0, 40)}`, parseSms({ sender: 'AX-HDFCBK', body, date: T }) === null)
  ok(`isOtp: ${body.slice(0, 40)}`, isOtp(body))
}

// ── Real alerts that end with a safety tip are still offered ──
const ALERTS = [
  ['Rs 250.00 debited via UPI on 05-11-2026 from your A/c XX1234 to ZOMATO. Ref 612345678901. Never share your OTP/PIN with anyone. -Federal Bank', 250, 'expense'],
  ['An amount of INR 1,200.00 has been DEBITED to your account XXX5678 on 05/11/2026 towards UPI/612345678902/SWIGGY. Do not share OTP, PIN or CVV with anyone. - Canara Bank', 1200, 'expense'],
  ['Rs.5,000.00 credited to A/c XX9012 on 05-11-26 by NEFT from RAHUL. Please do not share your card details or OTP with anyone -Union Bank', 5000, 'income'],
  ['Sent Rs.99.00 from Kotak Bank AC X1234 to netflix@hdfc on 05-11-26. UPI Ref 612345678903. Bank never asks for OTP. Dont share it!', 99, 'expense'],
]
for (const [body, amount, type] of ALERTS) {
  const p = parseSms({ sender: 'VM-FEDBNK', body, date: T })
  ok(`alert kept: ${body.slice(0, 40)}`, p && p.amount === amount && p.type === type, JSON.stringify(p))
  ok(`not otp: ${body.slice(0, 40)}`, !isOtp(body))
}

// ── Junk and oversize input can't break the parser ──
ok('huge body skipped', parseSms({ sender: 'AX-HDFCBK', body: 'Rs 100 debited '.repeat(400), date: T }) === null)
ok('body at limit still parsed', parseSms({ sender: 'AX-HDFCBK', body: ('Rs 100 debited from A/c XX1234 to SHOP. ' + ' '.repeat(MAX_BODY)).slice(0, MAX_BODY), date: T })?.amount === 100)
for (const bad of [null, undefined, 1, 'x', {}, { sender: 5, body: [], date: 'x' }, { sender: 'AX-HDFCBK', body: 'Rs 5 debited', date: -1 }]) {
  let r
  try { r = parseSms(bad) } catch (e) { r = e }
  ok(`bad input ${JSON.stringify(bad)}`, r === null)
}
let threw = false
try { parseAll('nope'); parseAll(null); parseAll([null, 1, 'x']) } catch { threw = true }
ok('parseAll survives junk', !threw)
// Catastrophic-backtracking guard: long adversarial text must parse fast
const start = Date.now()
for (let i = 0; i < 50; i++) {
  parseSms({ sender: 'AX-HDFCBK', date: T, body: ('Rs 1 debited to ' + 'A'.repeat(300) + ' from ' + 'b@'.repeat(200) + ' on ').slice(0, MAX_BODY) })
}
ok('adversarial text parses quickly', Date.now() - start < 2000, `${Date.now() - start}ms`)

// ── Payee text is plain text, never markup ──
const xss = parseSms({ sender: 'AX-HDFCBK', date: T, body: 'Rs 10 debited from A/c XX1234 to <img src=x onerror=alert(1)> on 05-11-26' })
ok('markup is not trusted (React renders it as text)', !xss || typeof xss.payee === 'string' || xss.payee === null)

// ── The page only accepts messages from our own app's channel ──
const listeners = []
globalThis.window = {
  location: { host: 'artha-ledger.vercel.app', search: '', origin: 'https://artha-ledger.vercel.app' },
  addEventListener: (type, fn) => { if (type === 'message') listeners.push(fn) },
}
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Android' }, configurable: true })
const native = await import('../src/lib/nativeApp.js')
native.listenForSms()

function deliver(origin, payload) {
  const acks = []
  const port = { onmessage: null, postMessage: (m) => acks.push(m) }
  listeners.forEach((fn) => fn({ origin, ports: [port], data: '' }))
  if (port.onmessage) port.onmessage({ data: typeof payload === 'string' ? payload : JSON.stringify(payload) })
  return { acks, took: native.takeSms() }
}
const good = { type: 'artha-sms', version: 1, days: 30, truncated: false, items: [{ sender: 'AX-HDFCBK', body: 'Rs 10 debited', date: T }] }

ok('own app accepted', deliver('android-app://artha-ledger.vercel.app', good).took?.items.length === 1)
ok('own app gets an ack', deliver('android-app://artha-ledger.vercel.app', good).acks.length === 1)
for (const origin of ['android-app://evil.example', 'https://evil.example', 'https://artha-ledger.vercel.app', 'android-app://artha-ledger.vercel.app.evil.com', 'null', '']) {
  const r = deliver(origin, good)
  ok(`refused origin ${origin || '(empty)'}`, r.took === null && r.acks.length === 0)
}
ok('no port, no channel', (() => {
  let set = false
  listeners.forEach((fn) => fn({ origin: 'android-app://artha-ledger.vercel.app', ports: [], data: '' }))
  return !set && native.takeSms() === null
})())
for (const [name, payload] of [
  ['not json', '{oops'],
  ['wrong type', { ...good, type: 'other' }],
  ['wrong version', { ...good, version: 2 }],
  ['items not a list', { ...good, items: 'x' }],
]) {
  const r = deliver('android-app://artha-ledger.vercel.app', payload)
  ok(`refused payload: ${name}`, r.took === null && r.acks.length === 0)
}
const mixed = deliver('android-app://artha-ledger.vercel.app', {
  ...good,
  days: 9999,
  items: [
    { sender: 'AX-HDFCBK', body: 'Rs 10 debited', date: T, extra: 'dropped' },
    { sender: 'AX-HDFCBK', body: 'x'.repeat(MAX_BODY + 1), date: T },
    { sender: 'A'.repeat(41), body: 'Rs 1', date: T },
    { sender: 'AX-HDFCBK', body: 'Rs 1', date: 'soon' },
    null, 7, 'str',
  ],
}).took
ok('only well-formed items kept', mixed?.items.length === 1)
ok('extra fields dropped', mixed && Object.keys(mixed.items[0]).sort().join() === 'body,date,sender')
ok('bad days falls back to 30', mixed?.days === 30)
ok('many items capped', deliver('android-app://artha-ledger.vercel.app', { ...good, items: Array(900).fill(good.items[0]) }).took.items.length === 500)
ok('taken once only', native.takeSms() === null)

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
