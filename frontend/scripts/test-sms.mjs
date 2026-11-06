/*
 * Tests for src/lib/smsParse.js against real-world Indian bank / UPI SMS
 * formats. Run: node scripts/test-sms.mjs
 */
import { parseSms, parseAll, guessCategory, smsKey } from '../src/lib/smsParse.js'

const T = 1761700000000 // a fixed SMS time
let failed = 0
let passed = 0

function check(name, sms, want) {
  const got = parseSms({ date: T, ...sms })
  const bad = []
  if (want === null) {
    if (got !== null) bad.push(`expected to be skipped, got ${JSON.stringify(got)}`)
  } else if (!got) {
    bad.push('expected an entry, got null')
  } else {
    for (const [k, v] of Object.entries(want)) {
      if (got[k] !== v) bad.push(`${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got[k])}`)
    }
  }
  if (bad.length) { failed++; console.log(`FAIL ${name}\n  ${sms.body}\n  - ${bad.join('\n  - ')}`) } else passed++
}

// ── Money out ──────────────────────────────────────────────────────────────
check('HDFC UPI to VPA', { sender: 'AX-HDFCBK', body: 'Rs.250.00 debited from A/c XX1234 on 29-10-26 to VPA swiggy@icici (UPI Ref No 430212345678). Not you? Call 18002586161' },
  { type: 'expense', amount: 250, payee: 'Swiggy', account: '1234', bank: 'HDFC Bank', channel: 'upi', ref: '430212345678' })
check('HDFC Sent', { sender: 'VM-HDFCBK', body: 'Sent Rs.120.00\nFrom HDFC Bank A/C *5678\nTo RAJU KIRANA STORE\nOn 29/10/26\nRef 430298765432\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808' },
  { type: 'expense', amount: 120, payee: 'RAJU KIRANA STORE', account: '5678', ref: '430298765432' })
check('HDFC card spend', { sender: 'JD-HDFCBK-S', body: 'Spent Rs.1,499.00 On HDFC Bank Card 4321 At AMAZON PAY INDIA On 2026-10-29:18:22:10.Not You? To Block+Reissue Call 18002586161' },
  { type: 'expense', amount: 1499, payee: 'AMAZON PAY INDIA', account: '4321', channel: 'card' })
check('SBI UPI debit', { sender: 'VM-SBIUPI', body: 'Dear UPI user A/C X9876 debited by 250.0 on date 29Oct26 trf to SWIGGY Refno 430211112222. If not u? call 1800111109. -SBI' },
  { type: 'expense', amount: 250, payee: 'SWIGGY', account: '9876', bank: 'SBI', ref: '430211112222' })
check('ICICI debit ; credited', { sender: 'AD-ICICIT', body: 'ICICI Bank Acct XX123 debited for Rs 349.00 on 29-Oct-26; ZOMATO LTD credited. UPI:430233334444. Call 18002662 for dispute. SMS BLOCK 123 to 9215676766.' },
  { type: 'expense', amount: 349, payee: 'ZOMATO LTD', account: '123', bank: 'ICICI Bank' })
check('Axis UPI/P2M', { sender: 'BP-AXISBK', body: 'INR 85.00 debited\nA/c no. XX4455\n29-10-26, 09:12:41\nUPI/P2M/430255556666/CHAI POINT\nNot you? SMS BLOCKUPI Cust ID to 919951860002\nAxis Bank' },
  { type: 'expense', amount: 85, payee: 'CHAI POINT', account: '4455', bank: 'Axis Bank' })
check('Kotak sent to VPA', { sender: 'VK-KOTAKB', body: 'Sent Rs.40.00 from Kotak Bank AC X7788 to ramesh.k@okaxis on 29-10-26.UPI Ref 430277778888. Not you, https://kotak.com/KBANKT/Fraud' },
  { type: 'expense', amount: 40, payee: 'Ramesh K', account: '7788', bank: 'Kotak Bank' })
check('ATM withdrawal', { sender: 'AX-SBIINB', body: 'Dear Customer, Rs.2000 withdrawn at SBI ATM S1NW000123 from A/c X1234 on 29Oct26 Txn# 1234. Avl Bal Rs.15,320.50. If not withdrawn by you, call 1800111109-SBI' },
  { type: 'expense', amount: 2000, channel: 'atm', kind: 'atm', account: '1234' })
check('Balance before amount is skipped', { sender: 'AX-HDFCBK', body: 'Avl Bal Rs 12,000.00. Rs 500.00 debited from a/c **1234 to VPA paytm-12345@paytm on 29-10-26.' },
  { type: 'expense', amount: 500 })
check('Card POS', { sender: 'VM-IDFCFB', body: 'Your IDFC FIRST Bank Credit Card ending 9900 was used for INR 2,340.50 at RELIANCE DIGITAL on 29/10/2026 18:30. Avl limit: INR 60,000' },
  { type: 'expense', amount: 2340.5, payee: 'RELIANCE DIGITAL', bank: 'IDFC First', channel: 'card' })
check('NEFT payment', { sender: 'AD-PNBSMS', body: 'Your A/c XX2211 is debited INR 15,000.00 on 29-10-2026 for NEFT to LANDLORD SHARMA Ref UTR N302261234. Bal INR 4,500.00 -PNB' },
  { type: 'expense', amount: 15000, payee: 'LANDLORD SHARMA', channel: 'bank' })
check('Paytm wallet paid', { sender: 'AX-PAYTMB', body: 'Paid Rs.60 to Ravi Tea Stall from Paytm Wallet. Txn ID 430299990000. Balance Rs 140' },
  { type: 'expense', amount: 60, payee: 'Ravi Tea Stall', bank: 'Paytm' })
check('Unreadable VPA falls back', { sender: 'AX-HDFCBK', body: 'Rs.30.00 debited from A/c XX1234 to VPA paytmqr2810050501011ooxzf0atfwk@paytm on 29-10-26 (UPI Ref No 430212340000)' },
  { type: 'expense', amount: 30, payee: '' })
check('Rupee symbol', { sender: 'VM-JUPITR', body: '₹1,250 spent at Uber India via Jupiter card ending 1111' },
  { type: 'expense', amount: 1250, payee: 'Uber India', channel: 'card' })

// ── Money in ───────────────────────────────────────────────────────────────
check('SBI credit by VPA', { sender: 'VM-SBIINB', body: 'Dear SBI User, your A/c X1234-credited by Rs.5000 on 29Oct26 transfer from ASHA SINGH Ref No 430200001111 -SBI' },
  { type: 'income', amount: 5000, payee: 'ASHA SINGH', account: '1234' })
check('HDFC received from VPA', { sender: 'AX-HDFCBK', body: 'Money Received - INR 1,000.00 in your HDFC Bank A/c xx1234 on 29-10-26 by A/c linked to VPA asha.r@okicici (UPI Ref No 430212121212).' },
  { type: 'income', amount: 1000, payee: 'Asha R', account: '1234' })
check('Salary credit', { sender: 'JM-ICICIB', body: 'Dear Customer, Acct XX123 is credited with INR 45,000.00 on 01-Oct-26 from ACME TECH PVT LTD. Info: SALARY OCT. Avl Bal INR 52,300.00.' },
  { type: 'income', amount: 45000, kind: 'salary', payee: 'ACME TECH PVT LTD' })
check('Refund', { sender: 'AX-HDFCBK', body: 'Refund of Rs.499.00 from AMAZON has been credited to your HDFC Bank Card 4321 on 29-10-26.' },
  { type: 'income', amount: 499, kind: 'refund', payee: 'AMAZON' })
check('Axis credited UPI/P2A', { sender: 'BP-AXISBK', body: 'INR 300.00 credited\nA/c no. XX4455\n29-10-26, 10:01:02 IST\nUPI/P2A/430233330000/RAVI KUMAR\nNot you? Call 18604195555' },
  { type: 'income', amount: 300, payee: 'RAVI KUMAR' })

// ── Must be skipped ────────────────────────────────────────────────────────
check('OTP', { sender: 'AX-HDFCBK', body: '123456 is OTP for txn of INR 2,000.00 at AMAZON on HDFC Bank card ending 4321. Valid till 10:20. Do not share OTP for security reasons.' }, null)
check('Loan offer', { sender: 'VM-HDFCBK', body: 'Congrats! You are pre-approved for a Personal Loan of Rs 5,00,000. Apply now: hdfc.bank/pl' }, null)
check('Bill due reminder', { sender: 'AX-ICICIB', body: 'Your ICICI Bank Credit Card XX9001 statement is generated. Total due Rs 12,450.00, Minimum due Rs 620.00, payment due on 15-Nov-26.' }, null)
check('Will be debited', { sender: 'VM-SBIINB', body: 'Your A/c X1234 will be debited with Rs 999 on 05-Nov-26 towards NETFLIX mandate.' }, null)
check('Failed payment', { sender: 'AX-HDFCBK', body: 'Your UPI transaction of Rs 250.00 to swiggy@icici has failed. Money, if debited, will be refunded.' }, null)
check('Declined', { sender: 'AX-AXISBK', body: 'Transaction of INR 1,200 at FLIPKART declined due to insufficient balance on card XX4455.' }, null)
check('Collect request', { sender: 'AX-PAYTMB', body: 'RAVI KUMAR has requested Rs 500 from you on Paytm. Pay now: paytm.me/abc' }, null)
check('Personal number', { sender: '+919876543210', body: 'I sent you Rs 500, did you get it? Debited from my account.' }, null)
check('Plain phone number', { sender: '9876543210', body: 'Rs 200 debited for chai lol' }, null)
check('Balance only', { sender: 'AX-SBIINB', body: 'Your A/c X1234 has Avl Bal of Rs 10,000.00 as on 29-10-26.' }, null)
check('No amount', { sender: 'AX-HDFCBK', body: 'Your HDFC Bank account has been debited. Check app for details.' }, null)
check('Promo with Rs', { sender: 'AD-AMAZON', body: 'Get Rs 200 cashback offer on your first UPI payment! Limited period. T&C apply.' }, null)

// ── Many at once: duplicates merge, newest first ───────────────────────────
const many = parseAll([
  { sender: 'AX-HDFCBK', date: T, body: 'Rs.250.00 debited from A/c XX1234 to VPA swiggy@icici (UPI Ref No 430212345678)' },
  { sender: 'VM-PHONPE', date: T + 30000, body: 'Paid Rs.250 to Swiggy. UPI Ref No 430212345678' },
  { sender: 'AX-HDFCBK', date: T + 3600000, body: 'Rs.80.00 debited from A/c XX1234 to VPA chai@ybl (UPI Ref No 430200000001)' },
  { sender: 'AX-HDFCBK', date: T + 7200000, body: '654321 is your OTP. Do not share.' },
])
const okMany = many.length === 2 && many[0].amount === 80 && many[1].amount === 250
if (okMany) passed++; else { failed++; console.log('FAIL parseAll merge/order', JSON.stringify(many)) }

// The bank's own copy wins over a UPI app's copy of the same payment
const merged = parseAll([
  { sender: 'VM-PHONPE', date: T + 1000, body: 'Paid Rs.250 to Swiggy. UPI Ref No 530212345678' },
  { sender: 'AX-HDFCBK', date: T, body: 'Rs.250.00 debited from A/c XX1234 to VPA swiggy@icici (UPI Ref No 530212345678)' },
])
if (merged.length === 1 && merged[0].bank === 'HDFC Bank' && merged[0].account === '1234' && merged[0].payee === 'Swiggy') passed++
else { failed++; console.log('FAIL bank copy wins', JSON.stringify(merged)) }

// ── Keys are stable and distinct ───────────────────────────────────────────
const a = smsKey({ sender: 'AX-HDFCBK', date: T, body: 'x' })
const b = smsKey({ sender: 'AX-HDFCBK', date: T, body: 'x' })
const c = smsKey({ sender: 'AX-HDFCBK', date: T + 1, body: 'x' })
if (a === b && a !== c) passed++; else { failed++; console.log('FAIL smsKey', a, b, c) }

// ── Category guesses only pick categories the book has ─────────────────────
const cats = ['Food', 'Travel', { name: 'Bills' }, 'Salary']
const g = [
  [guessCategory({ type: 'expense', payee: 'SWIGGY' }, cats), 'Food'],
  [guessCategory({ type: 'expense', payee: 'Uber India' }, cats), 'Travel'],
  [guessCategory({ type: 'expense', payee: 'Airtel recharge' }, cats), 'Bills'],
  [guessCategory({ type: 'expense', payee: 'Myntra' }, cats), ''],
  [guessCategory({ type: 'income', kind: 'salary' }, cats), 'Salary'],
  [guessCategory({ type: 'expense', payee: 'Zepto' }, ['Groceries']), 'Groceries'],
]
for (const [got, want] of g) { if (got === want) passed++; else { failed++; console.log(`FAIL guessCategory: expected "${want}", got "${got}"`) } }

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
