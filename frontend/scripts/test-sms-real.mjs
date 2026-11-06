// Real-world bank SMS formats (names, numbers and references changed).
// Each line: what Indian banks actually send, and what the entry should be.
// Run: node scripts/test-sms-real.mjs
import { parseSms, parseAll } from '../src/lib/smsParse.js'

let pass = 0, fail = 0
const T = Date.UTC(2026, 10, 5, 10, 0)
function check(name, sender, body, want) {
  const p = parseSms({ sender, body, date: T })
  const got = p ? { type: p.type, amount: p.amount } : null
  const good = want === null ? p === null
    : p && p.type === want[0] && Math.abs(p.amount - want[1]) < 0.005 && (want[2] === undefined || p.payee === want[2])
  if (good) pass++
  else { fail++; console.log(`FAIL ${name}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(p && { ...got, payee: p.payee })}`) }
}
const E = 'expense', I = 'income'

// ── Senders: headers with suffixes, long headers, business chat (RCS) names ──
check('2-letter suffix', 'AD-HDFCBK-AC', 'Rs.310.00 debited from A/c XX7781 to VPA cafe@okhdfc (UPI Ref No 611122223333)', [E, 310])
check('long header', 'SARASWATBANK', 'Your A/c no. 4411 is credited with INR 920.00 on 03-11-2026 towards Refund. Current Bal is INR 6,120.00 CR', [I, 920])
check('RCS name Kotak', 'Kotak Mahindra Bank', 'Sent Rs.180.00 from XXXXXX4410 to MEENA STORES on 02/11/2026. UPI ref no. 652233344455. Not you? Tap https://kotk.in/x to report -Kotak', [E, 180])
check('RCS name wallet', 'AMAZON PAY', 'Payment of Rs 640.00 using Apay Balance successful at Zepto. Updated Balance is Rs 1,100.00 - SMS by Juspay', [E, 640])
check('phone number never read', '+919812345678', 'Rs 500 debited from A/c XX1234 to you', null)

// ── Wordings ──
check('Canara Dr. INR', 'VK-CANBNK-S', 'Dear Customer, Acct XXX552 Dr. INR 145.00 on 04/11/26 to GREEN MART; UPI: 611223344556; Bal INR 4,210.00.Not you? SMS BLOCKUPI to 9999999999-CanaraBank', [E, 145])
check('Canara Dr. ₹', 'VK-CANBNK-S', 'Dear Customer, Acct XXX552 Dr. ₹62.00 on 04/11/26 to METRO RAIL; UPI: 611223344557; Bal INR 4,148.00.', [E, 62])
check('SIB UPI debit:', 'SIBSMS', 'UPI debit:Rs.725.00 A/c X3301, 04-11-26 18:02:11 RRN: 611255566677 Bal:Rs.8,400.10 Block A/c? Call 18004251809-South Indian Bank', [E, 725])
check('SIB DEBIT:', 'VM-SIBSMS-S', 'A/c X3301 DEBIT:Rs.410.25 HOTEL SAGAR Bal:Rs.7,989.85 Block A/c? call 18004251809-South Indian Bank', [E, 410.25])
check('SIB UPI Credit:', 'SIBSMS', 'UPI Credit:INR Rs.2000.00 in A/c X3301. Info: UPI/SBIN/611266677788/ Ravi on 04-11-26 19:10:01.Final balance is Rs.9,989.85 -South Indian Bank', [I, 2000])
check('StanChart NEFT credit', 'JK-SCBANK-S', 'Dear Customer, there is an NEFT credit of INR 31,250.00 in your account 551xxxx2201 on 1/11/2026.Available Balance:INR 60,300.00 -StanChart', [I, 31250])
check('Post Office CREDIT with amount', 'VM-DOPBNK-G', 'Account No. XXXXXXXX7710 CREDIT with amount Rs. 4200.00 on 02-11-2026. Balance: Rs.21000.00. [S12345678]', [I, 4200])
check('DEBIT transaction of RS.', 'GREATERBNK', 'Your Account XXXX9921 had a DEBIT transaction of RS. 250.00 on 03/11/2026 at 21:10:05.Available balance is Rs. 990.00: GREATER BANK', [E, 250])
check('BoB Cr. to', 'VM-BOBSMS', 'Rs.750.00 Cr. to someone@ybl A/c XX558812 on 03-11-2026. AvlBal:Rs3400.00. Ref:611277788899 -Bank of Baroda', [I, 750])
check('no space before credited', 'AX-FEDBNK-S', 'Hi,Rs.1500credited in your A/c XX7712 on 03NOV2026 13:03:07 using cash deposit machine at FBL-KOCHI. Current Bal: Rs.2100.00 - Federal Bank', [I, 1500])
check('HSBC thank you for using', 'VM-HSBCIN', 'HSBC: Thank you for using HSBC Debit Card XXXXX88xx for INR 1,240.00 on 02-Nov-26 at DECATHLON .', [E, 1240])
check('e-mandate processed', 'AD-FEDBNK', 'Hi, payment of INR 149.00 for Netflix via e-mandate ID: NF12AB34 on Federal Bank Debit Card 5521 is processed successfully. To manage, visit the SI hub - Federal Bank', [E, 149])
check('NetBanking payment successful', 'VM-HDFCBK-S', 'Payment Successful! Rs. 3,200.00 from A/c ****7781 to ELECTRICITYBOARD via HDFC Bank NetBanking. Not you?Call 18002586161', [E, 3200])
check('decorative letters (SBI Card)', 'SBI CARDS AND PAYMENT SERVICES', 'Rs.240.00 𝗌𝗉𝖾𝗇𝗍 𝗈𝗇 𝗒𝗈𝗎𝗋 𝖲𝖡𝖨 𝖢𝗋𝖾𝖽𝗂𝗍 𝖢𝖺𝗋𝖽 𝖾𝗇𝖽𝗂𝗇𝗀 7711 at BLUE TOKAI on 03/11/26.', [E, 240])
check('BOI debit that mentions credited', 'JM-BOIIND-S', 'Rs.320.00 debited A/cXX7711 and credited to ANIL KUMAR via UPI Ref No 611288899900 on 03Nov26. Call 18001031906, if not done by you. -BOI', [E, 320])
check('lakh commas', 'VA-CANBNK-S', 'An amount of INR 2,40,500.00 has been credited to XXXX6611 on 02/11/2026 towards RTGS by Sender ACME FUND, UTR UTIBR000111, Total Avail. Bal INR 3,01,000.00- Canara Bank', [I, 240500])
check('amount with /-', 'VM-PNBSMS-S', 'A/c XX1188 debited with Rs.799/- on 03-11-2026 thru UPI to SHOPKART. UPI Ref 611299900011 -PNB', [E, 799])
check('Union Rs: prefix', 'XX-UNIONB-S', 'A/c *7781 Debited for Rs:640.00 on 03-11-2026 18:28:02 by Mob Bk ref no 611200011122 Avl Bal Rs:5,120.00. Never Share OTP/PIN/CVV -Union Bank of India', [E, 640])

// ── Money going out that reads like money coming in ──
check('beneficiary has received', 'CP-FEDBNK-S', 'Arun Paul has received Rs 4000.000 from your A/c XX4410 via NEFT on 03-11-2026 22:04:04. Ref no. FDRLM9900112233 - Federal Bank', [E, 4000, 'Arun Paul'])
check('credited to the beneficiary', 'JD-ICICIT-S', 'ICICI BANK NEFT Transaction with reference number IN99001122334455 for Rs. 8000.00 has been credited to the beneficiary account on 03-11-2026 at 10:32:51', [E, 8000])

// ── Not payments ──
check('card bill paid (issuer)', 'VA-PNBCCD-S', 'Thank you Rs.2,100.00/- has been received as payment towards your PNB credit card XX7711 via Online Payment. Your available credit limit is Rs.48000. - PNB', null)
check('card bill paid (BOBCARD)', 'VM-BOBCRD-S', 'Payment of Rs 950.00 received for your BOBCARD ending 4411 on 2026-11-03. Visit the bobcard app for details.', null)
check('card bill paid (SBI Card)', 'SBICRD', 'Your payment of Rs.3,000.00 has been credited to your SBI Credit Card ending with 7711. Your available limit is Rs.47,000.00.', null)
check('card bill paid (CRED)', 'JK-CREDIN-S', 'Payment of Rs.12000 has been successfully credited towards your ICICI Bank Credit Card. Your payment was settled in 3 seconds - CRED', null)
check('NACH mandate set up', 'VM-HDFCBK-S', 'Auto Pay HDFC Bank NACH Mandate : Rs. 50000.00 UMRN:HDFC0000111122 To:SomeFundHouse Freq ADHO received today for processing.', null)
check('FD interest notice', 'AD-INDUSIND-S', 'Net interest INR 310.40 paid on your IndusInd Deposit No 300***111222 on 30/10/26. Call 18602677777 for assistance - IndusInd Bank', null)
check('payment request', 'CP-YESBNK-S', 'Payment request of INR 700.00 from shop@upi. Ignore if already paid.', null)
check('balance enquiry', 'VM-FEDBNK-S', 'Your available balance for a/c no(s) SBA7711 is INR 12000.50 .For detailed statement download FedMobile - Federal Bank', null)
check('pre-debit notice', 'AX-ICICIT-S', 'Your account will be debited with Rs 199.00 on 05-11-26 towards Spotify for AutoPay MERCHANTMANDATE, RRN 611233344455-ICICI Bank.', null)
check('refund initiated (not yet credited)', 'VM-HDFCBK-S', 'Refund initiated: Amt: Rs.1,200.00 on HDFC Bank Credit Card 7711. To receive your Refund, please update your bank details.', null)
check('declined', 'AD-SLCEIT-S', 'Your slice credit card transaction of RS. 5000 on amazon.in was declined.', null)
check('foreign currency is not taken as rupees', 'JM-ICICIT-S', 'USD 12.00 spent using ICICI Bank Card XX7711 on 03-Nov-26 on JetBrains. Avl Limit: INR 1,95,000.00. If not you, call 1800 2662.', null)

// ── Duplicates ──
const T0 = Date.UTC(2026, 10, 3, 16, 35)
const neft = parseAll([
  { sender: 'CP-FEDBNK-S', date: T0 + 29 * 60000, body: 'Arun Paul has received Rs 4000.000 from your A/c XX4410 via NEFT on 03-11-2026 22:04:04. Ref no. FDRLM9900112233 - Federal Bank' },
  { sender: 'AD-FEDBNK-T', date: T0, body: 'Debited Rs 4000 from a/c XX4410 on 03NOV2026 21:35 via NEFT to Arun.Ref FDRLM9900112233.Bal Rs 76.82.Not you?Call 18004251199 -Federal Bank' },
])
if (neft.length === 1 && neft[0].type === E && neft[0].payee === 'Arun Paul' && neft[0].timestamp === T0) pass++; else { fail++; console.log('FAIL NEFT confirmation (listed first) + earlier debit merge into one, keeping the name and the earlier time', neft) }

const teas = parseAll([
  { sender: 'VM-SBIUPI', date: T0, body: 'Dear UPI user A/C X3344 debited by 10.0 on date 03Nov26 trf to TEA STALL Refno 611200000001. If not u? call 1800111109. -SBI' },
  { sender: 'VM-SBIUPI', date: T0 + 60000, body: 'Dear UPI user A/C X3344 debited by 10.0 on date 03Nov26 trf to TEA STALL Refno 611200000002. If not u? call 1800111109. -SBI' },
])
if (teas.length === 2) pass++; else { fail++; console.log('FAIL two real ₹10 payments a minute apart stay two', teas) }

const copies = parseAll([
  { sender: 'AX-HDFCBK', date: T0, body: 'Rs.250.00 debited from A/c XX1234 to VPA swiggy@icici (UPI Ref No 611200000003)' },
  { sender: 'VM-PHONPE', date: T0 + 20000, body: 'Paid Rs.250 to Swiggy. UPI Ref No 611200000003' },
  { sender: 'AX-HDFCBK', date: T0 + 40000, body: 'Rs.250.00 debited from A/c XX1234 to VPA swiggy@icici (UPI Ref No 611200000003)' },
])
if (copies.length === 1 && copies[0].account === '1234') pass++; else { fail++; console.log('FAIL bank + app + repeated copy merge into one (bank kept)', copies) }

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
