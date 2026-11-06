/*
 * Turns bank and UPI SMS into ready-made entries.
 *
 * Runs entirely on the phone: the Android app hands the messages to the page
 * over Chrome's local channel and nothing here talks to a server.
 *
 * Only messages from business senders (headers like "AX-HDFCBK") are read;
 * anything from a personal number, OTPs, offers, reminders of payments still
 * to come, and failed or declined payments are left out.
 */

// Indian SMS headers: a 2-letter operator/circle prefix, a dash, 3–12 letters,
// sometimes a "-S"/"-T"/"-P"/"-G" suffix (TRAI's tags; a few use two letters).
// Business chat (RCS) messages carry a plain name instead, e.g. "Kotak
// Mahindra Bank" — letters and spaces only. A person's message always has a
// phone number here (never a contact name), so neither form lets one through.
const SENDER = /^(?:[A-Z]{2}-)?[A-Z0-9]{3,12}(?:-[A-Z]{1,2})?$|^(?=.{3,40}$)[A-Z][A-Z&.']*(?: [A-Z&.']+){1,6}$/i
const isBusinessSender = (s) => SENDER.test(String(s || '').trim()) && !/^\+?\d+$/.test(String(s || '').trim())

const BANKS = [
  [/HDFC/, 'HDFC Bank'], [/SBI|SBMSMS|CBSSBI|ATMSBI/, 'SBI'], [/ICICI/, 'ICICI Bank'], [/AXIS/, 'Axis Bank'],
  [/KOTAK|KMBL/, 'Kotak Bank'], [/PNB/, 'PNB'], [/BOB|BARODA/, 'Bank of Baroda'], [/CANBNK|CANARA/, 'Canara Bank'],
  [/UNION|UBOI/, 'Union Bank'], [/BOI/, 'Bank of India'], [/IDFC/, 'IDFC First'], [/YES/, 'Yes Bank'],
  [/INDUS/, 'IndusInd Bank'], [/IDBI/, 'IDBI Bank'], [/JUPITER|JUPITR|FEDJUP/, 'Jupiter'], [/FEDBNK|FEDERAL|FEDFIB/, 'Federal Bank'],
  [/CENT/, 'Central Bank'], [/IOB/, 'Indian Overseas Bank'], [/INDBNK|INDIAN/, 'Indian Bank'], [/UCO/, 'UCO Bank'],
  [/AUBANK|AUSFB/, 'AU Bank'], [/PAYTM/, 'Paytm'], [/AIRBNK|AIRTEL/, 'Airtel Payments Bank'], [/RBL/, 'RBL Bank'],
  [/BANDHAN/, 'Bandhan Bank'], [/SCBANK|STANC/, 'Standard Chartered'], [/CITI/, 'Citi'], [/HSBC/, 'HSBC'],
  [/DBS/, 'DBS Bank'], [/AMEX/, 'Amex'], [/SLICE/, 'slice'], [/ONECRD|ONECARD/, 'OneCard'], [/PHONEPE|PHONPE/, 'PhonePe'],
  [/GPAY|GOOGLEPAY/, 'Google Pay'], [/AMAZON|APAY/, 'Amazon Pay'], [/MOBIKWIK/, 'MobiKwik'],
]
function bankOf(sender) {
  const code = String(sender || '').toUpperCase().replace(/^[A-Z]{2}-/, '').replace(/-[A-Z]$/, '')
  for (const [re, name] of BANKS) if (re.test(code)) return name
  return code
}

// A failed payment whose money has since come back is a real refund
const CAME_BACK = /\b(?:has been|have been|is|was) (?:reversed|refunded|credited)\b/i

// Not a completed payment: OTPs, offers, things still to happen, failures,
// and a credit card's "payment received" (the bank's debit SMS already has it)
// Safety footers ("Never share your OTP/PIN with anyone") sit at the end of
// many real debit alerts, so they are ignored when looking for an OTP.
const SAFETY_TIP = /\b(?:pls |please )?(?:do not|don't|dont|never|not to)\s+(?:ever\s+)?(?:share|disclose|tell)\b[^.!\n]*|\b(?:never|nor|won't|will not|does not|doesn't) (?:ever )?asks? (?:you )?for\b[^.!\n]*/gi
// A message that carries a one-time password or code (never handed on)
const OTP = /\bOTP\b|one[\s-]?time[\s-]?(?:pin|pass(?:word|code))|verification code|security code|\b(?:3d ?secure|secure|txn|transaction) (?:pin|password|code)\b|\bpin\b\s*(?:is\s*)?:?\s*\d{4,8}\b|\buse \d{4,8}\b|\bvalid (?:for|till) (?:\d+ ?min|the next)|\bauth(?:entication|orisation|orization)? code\b|\b(?:use|enter)\s+(?:the\s+)?code\b|\bcode\s*(?:is\s*)?:?\s*\d{4,8}\b|\b\d{4,8}\s+is\s+(?:your|the)\b/i
/** True when the SMS carries a one-time password or login code. */
export const isOtp = (body) => OTP.test(String(body || '').normalize('NFKC').replace(SAFETY_TIP, ' '))

const SKIP = [
  /pre-?approved|\bloan of\b|loan (?:offer|up ?to)|\bapply now\b|\bcredit limit (?:of|up)|\boffer\b.*\b(?:valid|click|apply)\b|limited period|\bvoucher\b|\bcoupon\b|\bw[io]n\b|scratch ?card|claim now/i,
  /\b(?:will|to|shall|may|would|might|could) be (?:debited|deducted|charged|auto-?debited|credited)|\bis due\b|\bdue (?:on|date|by)\b|\bpayment (?:is )?due\b|minimum (?:amount )?due|\bbill (?:is )?generated\b|statement (?:is )?generated|\bremind(?:er)?\b|\bscheduled\b|\bupcoming\b|mandate (?:created|registered|set up)|\bautopay (?:set|registered|is active)/i,
  /\brequest(?:ed|s)? (?:money|rs|inr|₹)|has requested|collect request|\bwants to collect\b|\bpayment request\b/i,
  /(?:payment|amount) of (?:rs|inr|₹)[.:]*\s*[\d,.]+ (?:has been |is |was )?received (?:on|towards|for|against|in) (?:your )?.{0,40}?(?:credit ?card|\w*card ending)|thank you for (?:your |the )?payment of .{0,40}?(?:towards|on|for) (?:your )?.{0,30}?credit card|received as payment towards (?:your )?.{0,30}?credit card|payment of .{0,40}?(?:has been |successfully )*credited (?:to|towards) your .{0,30}?credit card/i,
  // Mandates being set up (the amount is a cap, not a payment), interest
  // notices for fixed deposits, and balance enquiries
  /received (?:today )?for processing|\brefund (?:has been |is |was )?initiated\b|auto ?pay facility has been .{0,25}activated|\binterest .{0,30}paid on your .{0,20}deposit|your available balance (?:for|in|is)\b/i,
]
const FAILED = /\b(?:declined|failed|unsuccessful|could not be|not been processed|rejected|insufficient (?:funds|balance))\b/i

// "Rs", "INR" or "₹", not inside a word ("hours 500" is not an amount)
const AMOUNT_RE = /(?<![A-Za-z])(?:rs|inr|₹)[.:]*\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi
// Amounts that are balances or limits, not the money that moved
const NOT_THE_AMOUNT = /(?:bal(?:ance)?|avl|avail(?:able)?|limit|lmt|outstanding|total due|min(?:imum)?(?: amt| amount)? due|ledger)[\s.:]*(?:is|of)?[\s.:-]*$/i

const OUT = /(?<![a-z])debited|\b(?:debit(?:ed)? (?:for|by|with)|debit (?:rs|inr|₹)|debit\s*:|debit transaction|dr\.?\s*(?:rs|inr|₹)|thank you for using|payment successful|processed successfully|credited to the beneficiary|has received (?:rs|inr|₹)[.:]*\s*[\d,.]+ from your|spent|paid|sent|withdrawn|withdrawal|purchase|deducted|txn of|txn (?:rs|inr|₹)|transaction of|transaction (?:number|no\.?|#)\s*\w+ for|for using your|used (?:at|for)|charged|transferred (?:to|from)|trf to|tranf to|dr\.?\s+from|cleared from|si executed|standing instruction executed|payment of .{0,60}? (?:made|done|successful))/i
const IN = /(?<![a-z])credited|\b(?:received|credit\s*:|(?:neft|rtgs|imps|upi) credit\b|credit with amount|cr\.\s+to\b|deposited|refund(?:ed)?|reversed|reversal|cashback (?:of|credited)|credit (?:rs|inr|₹)|has credit for|credit for (?:neft|imps|rtgs)|added to (?:your )?(?:\w+ )?(?:a\/c|account|wallet))/i

function pickAmount(body) {
  AMOUNT_RE.lastIndex = 0
  let m
  while ((m = AMOUNT_RE.exec(body))) {
    const before = body.slice(Math.max(0, m.index - 24), m.index)
    if (NOT_THE_AMOUNT.test(before)) continue
    const n = Number(m[1].replace(/,/g, ''))
    if (n > 0 && Number.isFinite(n)) return n
  }
  // SBI style: "debited by 250.0" / "credited by 5000" with no currency word
  const bare = body.match(/\b(?:debited|credited)\s+(?:by|for|with)\s+([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i)
  if (bare) {
    const n = Number(bare[1].replace(/,/g, ''))
    if (n > 0 && Number.isFinite(n)) return n
  }
  return null
}

function directionOf(body) {
  const o = body.search(OUT)
  const i = body.search(IN)
  if (o < 0 && i < 0) return null
  if (o < 0) return 'income'
  if (i < 0) return 'expense'
  return o <= i ? 'expense' : 'income'
}

const tidy = (s) => String(s || '')
  .replace(/\s+/g, ' ')
  .replace(/^[\s:.,;-]+|[\s:.,;-]+$/g, '')
  .trim()

// "swiggy@icici" -> "Swiggy"; "paytmqr2810050501011ooxzf0atfwk@paytm" -> null (unreadable)
function nameFromVpa(vpa) {
  const local = String(vpa).split('@')[0].replace(/[._-]+/g, ' ').replace(/\d{4,}.*$/, '').trim()
  if (!local || local.length < 3 || /^(?:paytmqr|bharatpe|q\d|upi|pay)\b/i.test(local)) return null
  return local.replace(/\b\w/g, (c) => c.toUpperCase())
}

const STOP = String.raw`(?=\s+(?:on|via|ref|refno|ref no|upi|using|from|at|by|for|in|into|with|towards|thru|through|dated|avl|avail|bal|is|has|was|info|not you|if not|txn|transaction)\b|[.;,(]|\s*$|\s+-)`
const NAME = String.raw`([A-Za-z][A-Za-z0-9 .&'*/-]{1,40}?)`
const VPA = String.raw`([\w.-]+@[\w.-]+)`

// "UPI/P2M/430255556666/CHAI POINT Not you?" (Axis), "UPI/630712345678/blinkit@hdfcbank" (IDFC)
const UPI_SLASH = /UPI\/(?:(?:P2[AM]|DR|CR)\/)?\d{9,14}\/([\w.-]+@[\w.-]+|[A-Za-z0-9][A-Za-z0-9 .&'*-]{1,40}?)(?=\s+(?:not you|on|ref|call|sms|if)\b|[/;,]|\.(?:\s|$)|\s*$)/i
// "NEFT Cr-CITI0000002-ACME SOLUTIONS PVT LTD-..." / "NEFT/AXISCN0123456/RAHUL VERMA"
const NEFT_FROM = /\bNEFT(?: Cr)?[-/][A-Z0-9]+[-/]([A-Za-z][A-Za-z0-9 .&']+?)(?=[-/.]|\s*$)/i
// Axis card block: the merchant is the line after the date/time line
const AXIS_BLOCK = /\n\d{2}-\d{2}-\d{2,4},? \d{2}:\d{2}(?::\d{2})?(?: IST)?\n([^\n]{2,40})\n/

// Text that isn't a payee: our own account words, amounts, help-line text
const NOT_A_PAYEE = /^(?:your|ur|a\/?c|acct|account|card|bank|the|self|xx|x+\d+|\*+\d+|\d+|beneficiary|merchant|upi|vpa|imps|neft|rtgs|atm|pos|block|report|call|help|customer|mobile|mob|avl|avail|not|mandate)\b|^(?:rs|inr|₹)[\s.:]*[\d,.]*$/i

function payeeOf(body, rawBody, type) {
  // Drop the "Not you? Call…/SMS BLOCK…" help text before looking
  const text = body.split(/\b(?:not (?:you|u)\b|if not (?:done|made|initiated|you)|sms block|to block|fwd this sms|call \d|report (?:it|fraud))/i)[0]
  const tries = type === 'income'
    ? [
        UPI_SLASH,
        NEFT_FROM,
        new RegExp(String.raw`\bfrom\s+(?:vpa\s+)?${VPA}`, 'i'),
        new RegExp(String.raw`\bby\s+(?:a\/c linked to\s+)?(?:vpa\s+)?${VPA}`, 'i'),
        new RegExp(String.raw`\bfrom\s+${NAME}${STOP}`, 'i'),
        new RegExp(String.raw`\bby\s+${NAME}${STOP}`, 'i'),
      ]
    : [
        UPI_SLASH,
        // "Arun Paul has received Rs 4000 from your A/c" (a transfer confirmation)
        new RegExp(String.raw`^${NAME}\s+has received\b`, 'i'),
        new RegExp(String.raw`\bto\s+(?:vpa\s+)?${VPA}`, 'i'),
        new RegExp(String.raw`;\s*${NAME}\s+credited`, 'i'),
        new RegExp(String.raw`\b(?:autopay|mandate|standing instruction|nach(?:-dr)?|ecs)(?:\s+mandate)?\s*(?:for|to|-)?\s+${NAME}${STOP}`, 'i'),
        new RegExp(String.raw`\b(?:trf|tranf|transferred|paid|sent)\s+to\s+${NAME}${STOP}`, 'i'),
        new RegExp(String.raw`\bon \d{1,2}-[A-Za-z]{3}-\d{2,4} on ${NAME}${STOP}`, 'i'),
        new RegExp(String.raw`(?:\bat|\s@)\s+([A-Za-z0-9][A-Za-z0-9 .&'*/-]{1,40}?)${STOP}`, 'i'),
        new RegExp(String.raw`\bto\s+${NAME}${STOP}`, 'i'),
        new RegExp(String.raw`\binfo[:\s-]+${NAME}${STOP}`, 'i'),
        AXIS_BLOCK,
      ]
  for (const re of tries) {
    const m = (re === AXIS_BLOCK ? rawBody : text).match(re)
    if (!m) continue
    const raw = tidy(m[1])
    if (!raw) continue
    if (raw.includes('@')) {
      const n = nameFromVpa(raw)
      if (n) return n
      continue
    }
    if (NOT_A_PAYEE.test(raw)) continue
    return raw.length > 40 ? raw.slice(0, 40).trim() : raw
  }
  return ''
}

function channelOf(body) {
  if (/\bATM\b|\bwithdrawn\b|cash withdrawal/i.test(body)) return 'atm'
  // a UPI handle (name@bank) has no dot after the @, unlike an email address
  if (/\bUPI\b|\bVPA\b|[\w.-]@[a-z]{2,20}\b(?!\.[a-z])/i.test(body)) return 'upi'
  if (/card\b|\bPOS\b|\bswipe/i.test(body)) return 'card'
  if (/\bNEFT\b|\bIMPS\b|\bRTGS\b|net ?banking|\bnetbank/i.test(body)) return 'bank'
  if (/\bwallet\b|amazon pay balance|paytm balance/i.test(body)) return 'wallet'
  return 'other'
}

function accountOf(body) {
  const m = body.match(/(?:\b(?:a\/c|acct|account|ac)|card)(?:\s*(?:no\.?|number|ending(?: with| in)?))?[\s:.-]*(?:\d*[x*X]+)?\s*(\d{3,6})\b/i)
  return m ? m[1].slice(-4) : ''
}

function refOf(body) {
  const m = body.match(/\b(?:upi\s*ref(?:erence)?(?:\s*no\.?)?|ref(?:erence)?\s*(?:no\.?|number|id)?|refno|rrn|utr(?:\s*no\.?)?|txn\s*(?:id|no\.?)|transaction\s*id)[\s:.#-]*([A-Za-z0-9]{6,22})\b/i)
  if (m) return m[1]
  const upi = body.match(/\bUPI[:\s/]+(?:P2[AM]\/)?(\d{9,14})\b/i)
  return upi ? upi[1] : ''
}

// Money moving between your own accounts or into a wallet, not spending
function isTransfer(body) {
  if (/\bEMI\b|\bloan\b/i.test(body)) return false
  if (/\badded to (?:your )?(?:\w+ )?wallet|wallet (?:top-?up|loaded|recharged)/i.test(body)) return true
  const masked = new Set((body.match(/[x*X]{2,}\s*\d{3,4}\b/g) || []).map((s) => s.replace(/\D/g, '')))
  return masked.size >= 2
}

/** Longest message body looked at (a long multi-part SMS is ~1,000). */
export const MAX_BODY = 2000

/** A stable id for a message, so the same SMS is never offered twice. */
export function smsKey({ sender, date, body }) {
  const s = `${String(sender || '').toUpperCase()}|${Number(date) || 0}|${String(body || '')}`
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `s${(h >>> 0).toString(36)}${(Number(date) || 0).toString(36)}`
}

/**
 * One SMS -> a ready-made entry, or null when it isn't a completed payment.
 * sms: { sender, body, date (ms) }
 *
 * kind: 'atm' (cash taken out), 'transfer' (between your own accounts or into
 * a wallet), 'refund', 'salary', or null. ATM and transfers start unticked in
 * the review list, so the same money isn't counted twice.
 */
export function parseSms(sms) {
  const sender = String(sms?.sender || '').trim()
  // NFKC turns decorative letters (SBI Card writes "𝗌𝗉𝖾𝗇𝗍") into plain ones
  const rawBody = String(sms?.body || '').normalize('NFKC').replace(/\r\n?/g, '\n')
  const body = rawBody.replace(/\s+/g, ' ').trim()
  const date = Number(sms?.date)
  // Real bank SMS are a few hundred characters; anything far longer isn't one
  if (!body || body.length > MAX_BODY || !isBusinessSender(sender) || !Number.isFinite(date) || date <= 0) return null
  if (isOtp(body) || SKIP.some((re) => re.test(body))) return null
  if (FAILED.test(body) && !CAME_BACK.test(body)) return null

  const type = directionOf(body)
  if (!type) return null
  const amount = pickAmount(body)
  if (!amount) return null

  const channel = channelOf(body)
  const kind = channel === 'atm' && type === 'expense' ? 'atm'
    : isTransfer(body) ? 'transfer'
    : type === 'income' && /\brefund|\breversed|\breversal/i.test(body) ? 'refund'
    : type === 'income' && /\bsalary\b/i.test(body) ? 'salary'
    : null

  return {
    key: smsKey({ sender, date, body }),
    amount: Math.round(amount * 100) / 100,
    type,
    timestamp: date,
    payee: payeeOf(body, rawBody, type),
    account: accountOf(body),
    bank: bankOf(sender),
    channel,
    ref: refOf(body),
    kind,
  }
}

/**
 * Many SMS -> entries, newest first. The same payment often arrives twice
 * (bank + UPI app, or a repeat); those are merged by UPI reference, or by
 * amount and direction within two minutes.
 */
export function parseAll(list) {
  const out = []
  for (const sms of Array.isArray(list) ? list : []) {
    const p = parseSms(sms)
    if (!p) continue
    // Same reference = same payment, however far apart the messages came.
    // Without both references, the same amount within two minutes is taken
    // as a second copy; two different references are two real payments.
    const i = out.findIndex((o) => o.amount === p.amount && o.type === p.type && (
      p.ref && o.ref ? p.ref === o.ref : Math.abs(o.timestamp - p.timestamp) < 2 * 60 * 1000))
    if (i < 0) out.push(p)
    else {
      // keep the bank's own message (it names the account) over a UPI app's
      // copy, and fill in whatever the kept one is missing from the other
      const [keep, other] = p.account && !out[i].account ? [p, out[i]] : [out[i], p]
      // (the earlier time is when the money moved; a confirmation can come later)
      out[i] = { ...keep, payee: keep.payee || other.payee, ref: keep.ref || other.ref, timestamp: Math.min(keep.timestamp, other.timestamp) }
    }
  }
  return out.sort((a, b) => b.timestamp - a.timestamp)
}

// A first guess at the category from the payee; the user can change it
const GUESSES = [
  [/swiggy|zomato|domino|pizza|kfc|mcdonald|burger|cafe|coffee|starbucks|restaurant|hotel|biryani|food|eats|bakery|chai|tea|juice|dhaba|kitchen|blinkit|zepto|instamart|bigbasket|grocer|kirana|supermarket|dmart|mart\b|ratnadeep|reliance fresh|more retail|vegetable|fruits|milk|dairy/i, ['Food', 'Groceries']],
  [/uber|ola\b|olacabs|rapido|metro|irctc|railway|redbus|bus\b|makemytrip|goibibo|indigo|air ?india|vistara|spicejet|akasa|cab|taxi|auto\b|fastag|toll|parking/i, ['Travel', 'Transport']],
  [/petrol|diesel|fuel|hpcl|bpcl|iocl|indian ?oil|bharat ?petroleum|hindustan ?petroleum|shell\b|nayara/i, ['Fuel', 'Travel', 'Transport']],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|tata ?cliq|croma|reliance digital|decathlon|lifestyle|westside|trends|shopping|mall/i, ['Shopping']],
  [/airtel|jio|vodafone|\bvi\b|bsnl|recharge|electricity|bescom|tneb|tangedco|tsspdcl|apspdcl|msedcl|bses|tata power|adani ?electricity|water|gas|indane|hp ?gas|bharat ?gas|broadband|act ?fibernet|hathway|dth|tata ?play|dish ?tv|bill/i, ['Bills', 'Utilities']],
  [/netflix|hotstar|prime ?video|spotify|youtube|sonyliv|zee5|bookmyshow|pvr|inox|movie|cinema/i, ['Entertainment', 'Subscriptions']],
  [/pharma|medical|medplus|apollo|1mg|netmeds|pharmeasy|hospital|clinic|diagnostic|lab\b|doctor|health/i, ['Health', 'Medical']],
  [/school|college|tuition|fees|udemy|coursera|byju|unacademy|education|exam/i, ['Education']],
  [/rent\b|landlord|nobroker|society|maintenance/i, ['Rent', 'Housing']],
  [/lic\b|insurance|policybazaar|hdfc ?life|icici ?pru|star ?health|acko|digit/i, ['Insurance']],
  [/zerodha|groww|upstox|mutual ?fund|\bsip\b|nps\b|ppf|investment|angel ?one|kuvera|coin\b/i, ['Investment', 'Savings']],
]

/** First guess at a category that already exists in the book, or ''. */
export function guessCategory(entry, available) {
  const names = (available || []).map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
  const find = (want) => names.find((n) => n.toLowerCase() === want.toLowerCase())
  if (entry?.type === 'income') {
    if (entry.kind === 'salary') return find('Salary') || find('Income') || ''
    if (entry.kind === 'refund') return find('Refund') || find('Refunds') || ''
    return ''
  }
  const text = `${entry?.payee || ''}`
  for (const [re, wants] of GUESSES) {
    if (re.test(text)) for (const w of wants) { const hit = find(w); if (hit) return hit }
  }
  return ''
}
