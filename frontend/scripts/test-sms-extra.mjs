/*
 * Extra tests for src/lib/smsParse.js: more banks, cards, wallets, NACH/ECS,
 * interest/cashback, and a long list of messages that must be skipped.
 * Run: node scripts/test-sms-extra.mjs
 */
import { parseSms, parseAll } from '../src/lib/smsParse.js'

const T = 1761700000000
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
  if (bad.length) { failed++; console.log(`FAIL ${name}\n  ${sms.body.replace(/\n/g, '\\n')}\n  - ${bad.join('\n  - ')}`) } else passed++
}

// ── SBI ────────────────────────────────────────────────────────────────────
check('SBI UPI debit to person', { sender: 'JD-SBIUPI', body: 'Dear UPI user A/C X4521 debited by 1500.00 on date 12Oct26 trf to RAMESH KUMAR Refno 528512345678. If not u? call 1800111109. -SBI' },
  { type: 'expense', amount: 1500, payee: 'RAMESH KUMAR', account: '4521', channel: 'upi', bank: 'SBI' })
check('SBI UPI credit, no payee', { sender: 'VM-SBIUPI', body: 'Dear SBI UPI User, ur A/cX4521 credited by Rs500 on 12Oct26 by  (Ref no 528598765432)' },
  { type: 'income', amount: 500, account: '4521', channel: 'upi', payee: '' })
check('SBI debit card txn number', { sender: 'AX-SBIINB', body: 'Dear Customer, transaction number 1234 for Rs.899.00 by SBI Debit Card X4521 at AMAZON on 14Oct26 at 18:30:22. If not done by you, forward this SMS to 7400165218/ call 1800111109/9449112211 to block card. GOI helpline for cyber fraud 1930.' },
  { type: 'expense', amount: 899, payee: 'AMAZON', account: '4521', channel: 'card' })
check('SBI NEFT "has credit for"', { sender: 'AD-CBSSBI', body: 'Your A/C XXXXX4521 has credit for NEFT of Rs 25,000.00 on 15/10/26. Avl Bal Rs 40,123.00 -SBI' },
  { type: 'income', amount: 25000, account: '4521', channel: 'bank' })
check('SBI credit card spent', { sender: 'VM-SBICRD', body: 'Rs.1,299.00 spent on your SBI Credit Card ending 7788 at FLIPKART on 16/10/26. Trxn. not done by you? Report at https://sbicard.com/Dispute' },
  { type: 'expense', amount: 1299, payee: 'FLIPKART', account: '7788', channel: 'card', bank: 'SBI' })
check('SBI YONO cash at ATM', { sender: 'AX-SBIINB', body: 'Your A/c X4521 debited by Rs 2000 on 18Oct26 for YONO Cash withdrawal at ATM S1AN0123. Avl Bal Rs 6000.00 -SBI' },
  { type: 'expense', amount: 2000, account: '4521', channel: 'atm' })
check('SBI cheque clearing debit', { sender: 'AX-SBIINB', body: 'Your a/c no. XXXXXXXX4521 is debited for Rs.12,000.00 on 20-10-2026 by Cheque No. 000123 (Clearing). Avl Bal Rs.3,456.00 -SBI' },
  { type: 'expense', amount: 12000, account: '4521', payee: '' })
check('SBI IMPS received from mobile', { sender: 'AX-SBIINB', body: 'Dear Customer, your a/c no. XXXXXXXX4521 is credited by Rs.3,000.00 on 29-10-26 by a/c linked to mobile 9XXXXXX123 (IMPS Ref no 630212345678).' },
  { type: 'income', amount: 3000, account: '4521', channel: 'bank', payee: '' })
check('SBI interest credited', { sender: 'AX-SBIINB', body: 'Dear Customer, Interest of Rs 1,234.00 has been credited to your A/c XXXXX4521 on 30-09-2026. -SBI' },
  { type: 'income', amount: 1234, account: '4521' })
check('SBI NACH SIP debit', { sender: 'AX-SBIINB', body: 'Your A/C XXXXX4521 has been debited by Rs 5,000.00 on 05/10/26 towards NACH-DR- ICICI PRU MF SIP. Avl Bal Rs 10,000.00-SBI' },
  { type: 'expense', amount: 5000, account: '4521' })

// ── HDFC ───────────────────────────────────────────────────────────────────
check('HDFC CC "Thank you for using"', { sender: 'AX-HDFCBK', body: 'Thank you for using your HDFC Bank Credit Card ending 4321 for Rs 2,199.00 at MYNTRA DESIGNS PVT on 2026-10-21:20:15:33. Not you? Call 18002586161' },
  { type: 'expense', amount: 2199, payee: 'MYNTRA DESIGNS PVT', account: '4321', channel: 'card' })
check('HDFC RuPay CC on UPI "Txn Rs."', { sender: 'VM-HDFCBK', body: 'Txn Rs.649.00\nOn HDFC Bank Card 4321\nAt SWIGGY\nby UPI 528612345678\nOn 22-10\nNot You?\nCall 18002586161/SMS BLOCK CC 4321 to 7308080808' },
  { type: 'expense', amount: 649, payee: 'SWIGGY', account: '4321' })
check('HDFC debit card spent', { sender: 'JD-HDFCBK-S', body: 'Spent Rs.450.00 From HDFC Bank Card x8899 At APOLLO PHARMACY On 2026-10-22:15:22:10 Bal Rs.10,200.00 Not You? Call 18002586161/SMS BLOCK DC 8899 to 7308080808' },
  { type: 'expense', amount: 450, payee: 'APOLLO PHARMACY', account: '8899', channel: 'card' })
check('HDFC NEFT credit "deposited"', { sender: 'AX-HDFCBK', body: 'Update! INR 32,500.00 deposited in HDFC Bank A/c XX1234 on 23-OCT-26 for NEFT Cr-CITI0000002-ACME SOLUTIONS PVT LTD-RAVI KUMAR-CITIN26123456789.Avl bal INR 45,678.90. Cheque deposits in A/C are subject to clearing' },
  { type: 'income', amount: 32500, account: '1234', channel: 'bank', payee: 'ACME SOLUTIONS PVT LTD' })
check('HDFC IMPS money received', { sender: 'AX-HDFCBK', body: 'Money Received - INR 2,000.00 in your HDFC Bank A/c xx1234 on 24-10-26 by A/c linked to mobile no xx9876 (IMPS Ref No. 629712345678) Avl bal: INR 47,678.90' },
  { type: 'income', amount: 2000, account: '1234', channel: 'bank', payee: '' })
check('HDFC UPI mandate executed', { sender: 'AX-HDFCBK', body: 'UPI Mandate executed: Rs.199.00 debited from A/c XX1234 to SPOTIFY INDIA on 25-10-26. UPI Ref 529812345678. Not you? Call 18002586161' },
  { type: 'expense', amount: 199, payee: 'SPOTIFY INDIA', account: '1234', channel: 'upi' })
check('HDFC Amt Sent to person', { sender: 'VM-HDFCBK', body: 'Amt Sent Rs.500.00\nFrom HDFC Bank A/C *1234\nTo Mr KUMAR S\nOn 29-10\nRef 630912345678\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808' },
  { type: 'expense', amount: 500, payee: 'Mr KUMAR S', account: '1234' })
check('HDFC UPI received from VPA', { sender: 'AX-HDFCBK', body: 'Received Rs.400.00 in your A/c XX1234 from VPA neha.g@okaxis on 29-10-26. UPI Ref 630912349090 -HDFC Bank' },
  { type: 'income', amount: 400, payee: 'Neha G', account: '1234', channel: 'upi' })
check('HDFC EMI debit', { sender: 'AX-HDFCBK', body: 'Rs.5,432.00 debited from A/c XX1234 on 05-10-26 towards EMI for Loan A/c XXXX9876. Avl bal: Rs.20,000.00' },
  { type: 'expense', amount: 5432, account: '1234' })
check('HDFC CC bill paid from savings', { sender: 'AX-HDFCBK', body: 'Rs.12,450.00 debited from A/c XX1234 on 30-10-26 towards HDFC Bank Credit Card XX4321 payment via BillPay. Ref 630912345678' },
  { type: 'expense', amount: 12450, account: '1234' })
check('HDFC cheque deposit cleared', { sender: 'AX-HDFCBK', body: 'Update! INR 18,000.00 deposited in HDFC Bank A/c XX1234 on 28-OCT-26 for CHQ DEP - 000456 - SUNIL TRADERS. Avl bal INR 63,678.90.' },
  { type: 'income', amount: 18000, account: '1234' })
check('HDFC standing instruction', { sender: 'AX-HDFCBK', body: 'Standing Instruction executed: Rs.10,000.00 transferred from A/c XX1234 to A/c XX5678 on 01-10-26. -HDFC Bank' },
  { type: 'expense', amount: 10000, account: '1234' })
check('HDFC ECS return charges', { sender: 'AX-HDFCBK', body: 'Rs.590.00 debited from A/c XX1234 towards ECS return charges on 05-10-26. Avl bal: Rs.9,410.00' },
  { type: 'expense', amount: 590, account: '1234' })

// ── ICICI ──────────────────────────────────────────────────────────────────
check('ICICI self IMPS', { sender: 'AD-ICICIT', body: 'ICICI Bank Acct XX123 debited with Rs 1,250.00 on 26-Oct-26 & Acct XX456 credited.IMPS:629912345678. Call 18002662 for dispute or SMS BLOCK 123 to 9215676766' },
  { type: 'expense', amount: 1250, account: '123', channel: 'bank', payee: '' })
check('ICICI CC spent "on MERCHANT"', { sender: 'JM-ICICIB', body: 'INR 3,499.00 spent using ICICI Bank Card XX9001 on 27-Oct-26 on AMAZON. Avl Limit: INR 1,23,456.78. If not you, call 1800 2662/SMS BLOCK 9001 to 9215676766' },
  { type: 'expense', amount: 3499, payee: 'AMAZON', account: '9001', channel: 'card' })
check('ICICI NEFT salary Info', { sender: 'JM-ICICIB', body: 'ICICI Bank Account XX123 credited:Rs. 1,25,000.00 on 30-Oct-26. Info NEFT-HDFCN26303123456-INFOSYS LIMITED. Available Balance is Rs. 1,40,000.00.' },
  { type: 'income', amount: 125000, account: '123', channel: 'bank', payee: 'INFOSYS LIMITED' })
check('ICICI UPI credit from person', { sender: 'JM-ICICIB', body: 'Dear Customer, Acct XX123 is credited with Rs 750.00 on 27-Oct-26 from PRIYA SHARMA. UPI:630012345678-ICICI Bank.' },
  { type: 'income', amount: 750, payee: 'PRIYA SHARMA', account: '123', channel: 'upi' })
check('ICICI autopay executed', { sender: 'JM-ICICIB', body: 'Your account XX123 has been debited with INR 499.00 on 28-Oct-26 towards AutoPay for HOTSTAR. UMRN: ICIC7021234567890. -ICICI Bank' },
  { type: 'expense', amount: 499, payee: 'HOTSTAR', account: '123' })
check('ICICI loan EMI', { sender: 'JM-ICICIB', body: 'EMI of Rs 8,750.00 for Loan A/c XX5566 has been debited from your ICICI Bank Account XX123 on 05-Oct-26.' },
  { type: 'expense', amount: 8750 })
check('ICICI ATM', { sender: 'JM-ICICIB', body: 'ICICI Bank Acct XX123 debited with INR 10,000.00 on 28-Oct-26 for Cash Withdrawal at ATM ICICI0123. Avl Bal INR 5,432.10' },
  { type: 'expense', amount: 10000, account: '123', channel: 'atm' })
check('ICICI cheque cleared', { sender: 'JM-ICICIB', body: 'Chq no 000789 for Rs 7,500.00 has been cleared from your A/c XX123 on 29-Oct-26. ICICI Bank' },
  { type: 'expense', amount: 7500, account: '123' })
check('ICICI RD standing instruction', { sender: 'JM-ICICIB', body: 'Your A/c XX123 is debited with Rs 5,000.00 on 05-Oct-26 towards Standing Instruction for RD A/c XX999. -ICICI Bank' },
  { type: 'expense', amount: 5000, account: '123' })
check('ICICI CC payment received', { sender: 'JM-ICICIB', body: 'Dear Customer, Payment of INR 12,450.00 has been received on your ICICI Bank Credit Card Account 4xxx xxxx xxxx 9001 on 30-Oct-26. Thank you.' },
  null) // the card side of a bill payment: the bank's debit SMS already records it

// ── Axis ───────────────────────────────────────────────────────────────────
check('Axis CC Spent block', { sender: 'BP-AXISBK', body: 'Spent\nCard no. XX7766\nINR 899\n28-10-26 13:45:10\nZOMATO\nAvl Lmt INR 45,000\nSMS BLOCK 7766 to 919951860002, if not you - Axis Bank' },
  { type: 'expense', amount: 899, payee: 'ZOMATO', account: '7766', channel: 'card' })
check('Axis NEFT credit Info', { sender: 'BP-AXISBK', body: 'INR 15,000.00 credited to A/c no. XX4455 on 28-10-26 at 11:20:30 IST. Info- NEFT/AXISCN0123456/RAHUL VERMA. Avl Bal- INR 22,000.00 - Axis Bank' },
  { type: 'income', amount: 15000, account: '4455', channel: 'bank', payee: 'RAHUL VERMA' })
check('Axis "Debit INR" UPI/P2M', { sender: 'BP-AXISBK', body: 'Debit INR 120.00\nA/c no. XX4455\n29-10-26 08:10:11\nUPI/P2M/630112345678/BLINKIT\nNot you? SMS BLOCKUPI Cust ID to 919951860002\nAxis Bank' },
  { type: 'expense', amount: 120, payee: 'BLINKIT', account: '4455', channel: 'upi' })

// ── Kotak ──────────────────────────────────────────────────────────────────
check('Kotak received from VPA', { sender: 'VK-KOTAKB', body: 'Received Rs.1,200.00 in your Kotak Bank AC X7788 from anita.m@oksbi on 29-10-26.UPI Ref:630212349999.' },
  { type: 'income', amount: 1200, payee: 'Anita M', account: '7788', channel: 'upi' })
check('Kotak debit card used', { sender: 'VK-KOTAKB', body: 'Your Kotak Bank Debit Card XX1122 has been used for a transaction of INR 640.00 at BIGBASKET on 29/10/2026 at 19:20. Avl Bal: INR 9,876.54' },
  { type: 'expense', amount: 640, payee: 'BIGBASKET', account: '1122', channel: 'card' })
check('Kotak IMPS to person', { sender: 'VK-KOTAKB', body: 'Your Kotak Bank A/c X7788 is debited by Rs.5,000.00 on 29-10-26 towards IMPS to MEENA DEVI. IMPS Ref No 630212340000' },
  { type: 'expense', amount: 5000, payee: 'MEENA DEVI', account: '7788', channel: 'bank' })
check('Kotak UPI autopay executed', { sender: 'VK-KOTAKB', body: 'Your Kotak Bank A/c X7788 has been debited for Rs.499.00 on 10-10-26 towards UPI AutoPay mandate for NETFLIX. UPI Ref 630912345432' },
  { type: 'expense', amount: 499, payee: 'NETFLIX', account: '7788', channel: 'upi' })

// ── PNB / BoB / Canara / Union / BOI ───────────────────────────────────────
check('PNB UPI debit thru UPI', { sender: 'AD-PNBSMS', body: 'A/c XX2211 debited INR 3,000.00 Dt 29-10-26 15:32:16 thru UPI:630298761234.Bal INR 4,500.00 Not u?Fwd this SMS to 9264092640 to block UPI.Download PNB ONE-PNB' },
  { type: 'expense', amount: 3000, account: '2211', channel: 'upi', payee: '' })
check('PNB UPI credit', { sender: 'AD-PNBSMS', body: 'A/c XX2211 credited INR 1,500.00 Dt 29-10-26 16:01:00 thru UPI:630298769999. Bal INR 6,000.00 -PNB' },
  { type: 'income', amount: 1500, account: '2211', channel: 'upi' })
check('PNB ECS to LIC', { sender: 'AD-PNBSMS', body: 'Your a/c XX2211 is debited INR 1,250.00 on 07-10-2026 for ECS/ACH to LIC OF INDIA. Bal INR 3,250.00 -PNB' },
  { type: 'expense', amount: 1250, payee: 'LIC OF INDIA', account: '2211' })
check('BoB Dr./Cr. format', { sender: 'VM-BOBTXN', body: 'Rs.350.00 Dr. from A/C XXXXXX6543 and Cr. to vendor.cafe@okaxis. Ref:630312345678. AvlBal:Rs12,345.00(2026:10:29 18:01:22). Not you? Call 18005700-BOB' },
  { type: 'expense', amount: 350, payee: 'Vendor Cafe', account: '6543', channel: 'upi', bank: 'Bank of Baroda' })
check('BoB credited by VPA', { sender: 'VM-BOBTXN', body: 'Rs.2000.00 Credited to A/c ...6543 thru UPI/630312349999 by priya.s@ybl. Total Bal:Rs.14345.00CR. Avlbl Amt:Rs.14345.00(29-10-2026 19:00:00) - Bank of Baroda' },
  { type: 'income', amount: 2000, payee: 'Priya S', account: '6543', channel: 'upi' })
check('Canara DEBITED', { sender: 'AX-CANBNK', body: 'An amount of INR 1,100.00 has been DEBITED to your account XXX789 on 29-10-2026. Total Avail.bal INR 9,800.00. - Canara Bank' },
  { type: 'expense', amount: 1100, account: '789', bank: 'Canara Bank' })
check('Canara CREDITED', { sender: 'AX-CANBNK', body: 'An amount of INR 4,000.00 has been CREDITED to your account XXX789 on 29-10-2026. Total Avail.bal INR 13,800.00. - Canara Bank' },
  { type: 'income', amount: 4000, account: '789' })
check('Union "Rs:" debit', { sender: 'VM-UNIONB', body: 'A/c *4567 Debited for Rs:250.00 on 29-10-2026 11:22:33 by Mob Bk ref no 630512345678 Avl Bal Rs:5,000.00.If not you, Call 1800222243 -Union Bank of India' },
  { type: 'expense', amount: 250, account: '4567', bank: 'Union Bank' })
check('Union "Rs:" NEFT credit', { sender: 'VM-UNIONB', body: 'A/c *4567 Credited for Rs:10,000.00 on 29-10-2026 by NEFT-HDFC0001234-RAJESH. Avl Bal Rs:15,000.00 -Union Bank of India' },
  { type: 'income', amount: 10000, account: '4567', channel: 'bank' })
check('BOI debited and credited to VPA', { sender: 'VM-BOIIND', body: 'BOI -  Rs.600.00 debited A/c XX3344 and credited to raju@ybl via UPI Ref No 630612345678 on 29Oct26. Call 18001031906, if not done by you.' },
  { type: 'expense', amount: 600, payee: 'Raju', account: '3344', channel: 'upi', bank: 'Bank of India' })
check('BOI credited Ac', { sender: 'VM-BOIIND', body: 'BOI -  Rs.1500.00 Credited to your Ac XX3344 on 29-10-26 by UPI ref No.630612349999.Avl Bal 5500.00' },
  { type: 'income', amount: 1500, account: '3344', channel: 'upi' })

// ── Private / small finance banks ─────────────────────────────────────────
check('IDFC towards UPI/VPA', { sender: 'VM-IDFCFB', body: 'Your A/C XXXXXXX5678 has been debited by INR 999.00 on 29/10/2026 18:30 towards UPI/630712345678/blinkit@hdfcbank. New balance is INR 8,123.45. Not you? Call 1800 10 888' },
  { type: 'expense', amount: 999, payee: 'Blinkit', account: '5678', channel: 'upi' })
check('IDFC interest', { sender: 'VM-IDFCFB', body: 'Interest of INR 345.67 has been credited to your IDFC FIRST Bank A/C XXXXXXX5678 on 30/09/2026. New balance is INR 8,469.12' },
  { type: 'income', amount: 345.67, account: '5678' })
check('Yes Bank UPI txn to', { sender: 'AD-YESBNK', body: 'INR 799.00 debited from A/c XXXXXX9012 on 29-OCT-2026 for UPI txn to AMAZON PAY. UPI Ref 630812345678. Avl Bal INR 4,201.00. Not you? Call 18001200 - YES BANK' },
  { type: 'expense', amount: 799, payee: 'AMAZON PAY', account: '9012', channel: 'upi', bank: 'Yes Bank' })
check('Yes Bank CC @ merchant', { sender: 'AD-YESBNK', body: 'INR 1,800.00 spent on YES BANK Credit Card XX3456 @ DECATHLON SPORTS on 29-10-2026 at 06:30 PM. Avl Lmt: INR 98,200.00. SMS BLKCC 3456 to 9840909000 if not done by you.' },
  { type: 'expense', amount: 1800, payee: 'DECATHLON SPORTS', account: '3456', channel: 'card' })
check('IndusInd CC used at', { sender: 'VM-INDUSB', body: 'Your IndusInd Bank Credit Card XX4567 has been used for INR 2,750.00 at SHOPPERS STOP on 29-10-26 18:22:01. Avl Lmt INR 72,250.00. Not you? call 18602677777' },
  { type: 'expense', amount: 2750, payee: 'SHOPPERS STOP', account: '4567', channel: 'card', bank: 'IndusInd Bank' })
check('IndusInd masked full a/c', { sender: 'VM-INDUSB', body: 'Rs 450.00 debited from your A/c 2010XXXX1122 towards UPI/630912345678/ZEPTO on 29/10/26. Avl Bal Rs 3,210.00 - IndusInd Bank' },
  { type: 'expense', amount: 450, payee: 'ZEPTO', account: '1122', channel: 'upi' })
check('Federal to VPA', { sender: 'AX-FEDBNK', body: 'Rs 300.00 debited from your A/c XX8899 to VPA chaiwala@okicici on 29-10-2026 18:00:00. Ref no 630912349876. Bal Rs 2,100.00 -Federal Bank' },
  { type: 'expense', amount: 300, payee: 'Chaiwala', account: '8899', channel: 'upi', bank: 'Federal Bank' })
check('Federal IMPS from person', { sender: 'AX-FEDBNK', body: 'Your A/c XX8899 has been credited with Rs 7,500.00 on 29-10-2026 via IMPS from KIRAN JOSE. Ref 630912340001. -Federal Bank' },
  { type: 'income', amount: 7500, payee: 'KIRAN JOSE', account: '8899', channel: 'bank' })
check('IOB a/c no. ****', { sender: 'VK-IOBCHN', body: 'Your a/c no. ****5566 is debited for Rs.1,234.00 on 29-10-2026 and credited to a/c no. XXXX7788 (UPI Ref no 630912345111) -IOB' },
  { type: 'expense', amount: 1234, account: '5566', channel: 'upi', payee: '' })
check('Indian Bank UPI to merchant', { sender: 'AD-INDBNK', body: 'Your A/c XXXXX1239 is debited by Rs.420.00 on 29-10-26 by UPI to FRESH FRUITS. UPI Ref 630912341234. -Indian Bank' },
  { type: 'expense', amount: 420, payee: 'FRESH FRUITS', account: '1239', channel: 'upi', bank: 'Indian Bank' })
check('AU UPI to VPA', { sender: 'AX-AUBANK', body: 'Rs 2,000.00 debited from your AU Bank A/c XX1010 on 29-10-2026 via UPI to gopal@paytm. Ref 630912345432. Not you? Call 18001200 1200 -AU SFB' },
  { type: 'expense', amount: 2000, payee: 'Gopal', account: '1010', channel: 'upi', bank: 'AU Bank' })
check('RBL CC spent', { sender: 'VM-RBLBNK', body: 'Rs. 1,575.00 spent on your RBL Bank Credit Card ending 2020 at BOOKMYSHOW on 29-10-2026 21:00. Available limit Rs. 48,425.00' },
  { type: 'expense', amount: 1575, payee: 'BOOKMYSHOW', account: '2020', channel: 'card', bank: 'RBL Bank' })

// ── Payments banks, neo-banks, cards, apps ─────────────────────────────────
check('Paytm UPI paid', { sender: 'AX-PAYTMB', body: 'Paid Rs.180 to Sharma Dairy from Paytm UPI. UPI Ref: 630912345999. Check details in Paytm app' },
  { type: 'expense', amount: 180, payee: 'Sharma Dairy', channel: 'upi' })
check('Paytm wallet top-up', { sender: 'AX-PAYTMB', body: 'Rs.500 added to your Paytm Wallet using HDFC Bank Debit Card. Updated balance Rs 640. Order ID 12345' },
  { amount: 500 })
check('Paytm cashback to wallet', { sender: 'AX-PAYTMB', body: 'Cashback of Rs 25.00 has been credited to your Paytm Wallet for your recent transaction. Balance Rs 165.00' },
  { type: 'income', amount: 25, channel: 'wallet' })
check('Airtel PB recharge', { sender: 'AD-AIRBNK', body: 'Rs. 249.00 debited from your Airtel Payments Bank a/c for recharge of Airtel mobile 98XXXXXX10. Txn ID 1234567890. Bal: Rs. 751.00' },
  { type: 'expense', amount: 249, bank: 'Airtel Payments Bank' })
check('Airtel PB UPI credit', { sender: 'AD-AIRBNK', body: 'Rs. 1,000 credited to your Airtel Payments Bank a/c from MANOJ via UPI. Ref 630912345678. Bal: Rs. 1,751.00' },
  { type: 'income', amount: 1000, payee: 'MANOJ', channel: 'upi' })
check('Jupiter paid via UPI', { sender: 'VM-JUPITR', body: '₹ 99 paid to Spotify from your Jupiter account via UPI. Ref 630912340987' },
  { type: 'expense', amount: 99, payee: 'Spotify', channel: 'upi', bank: 'Jupiter' })
check('Fi UPI payment', { sender: 'AX-FIMONY', body: '₹450.00 was debited from your Fi Federal Bank A/c XX3030 for a UPI payment to SWIGGY on 29 Oct. UPI Ref: 630912345555' },
  { type: 'expense', amount: 450, payee: 'SWIGGY', account: '3030', channel: 'upi' })
check('slice card spent', { sender: 'JM-SLICEIT', body: '₹ 1,299 spent at MYNTRA using your slice card. Avl limit ₹ 8,701' },
  { type: 'expense', amount: 1299, payee: 'MYNTRA', channel: 'card', bank: 'slice' })
check('OneCard spent', { sender: 'VM-ONECRD', body: "You've spent ₹2,345.00 at CROMA with your OneCard ending 5050 on 29 Oct 2026. Available limit: ₹47,655.00" },
  { type: 'expense', amount: 2345, payee: 'CROMA', account: '5050', channel: 'card' })
check('Amazon Pay balance payment', { sender: 'AX-AMAZON', body: 'Payment of Rs 349.00 to Amazon.in using Amazon Pay balance is successful. Order #408-1234567-1234567' },
  { type: 'expense', amount: 349 })
check('Amazon Pay cashback', { sender: 'AX-AMAZON', body: '₹50 cashback credited to your Amazon Pay balance for order #407-1234567-7654321.' },
  { type: 'income', amount: 50 })
check('PhonePe paid', { sender: 'VM-PHONPE', body: 'Paid ₹ 75 to Ganesh Tea Stall from XXXX1234 via PhonePe. UPI Ref: 630912341111' },
  { type: 'expense', amount: 75, payee: 'Ganesh Tea Stall' })
check('PhonePe received', { sender: 'VM-PHONPE', body: 'Received ₹ 500 from Anjali Rao in your Bank Account XX5678. UPI Ref: 630912343333 - PhonePe' },
  { type: 'income', amount: 500, payee: 'Anjali Rao', account: '5678' })
check('Bajaj NACH EMI', { sender: 'VM-BAJFIN', body: 'Dear Customer, your EMI of Rs 2,999 for Loan A/c 4XXXXX123 has been successfully debited on 03-10-2026 via NACH. -Bajaj Finserv' },
  { type: 'expense', amount: 2999 })
check('UPI failed-txn refund credited', { sender: 'AX-HDFCBK', body: 'Rs.300.00 has been reversed to your A/c XX1234 on 29-10-26 against failed UPI txn Ref 630912345678.' },
  { type: 'income', amount: 300, account: '1234', kind: 'refund' })

// ── Must be skipped ────────────────────────────────────────────────────────
check('SKIP OTP SBI card', { sender: 'VM-SBICRD', body: 'Your OTP for transaction of Rs.1,999 at FLIPKART on SBI Card ending 7788 is 482910. OTP valid for 10 mins. Pls do not share with anyone' }, null)
check('SKIP One Time Password IMPS', { sender: 'VK-KOTAKB', body: 'Use 482910 as One Time Password to authorise payment of INR 5,000.00 to PRIYA via IMPS. -Kotak' }, null)
check('SKIP PhonePe code', { sender: 'VM-PHONPE', body: 'Use code 123456 to complete your UPI payment of Rs 500 to ramesh@ybl. Never share this code. -PhonePe' }, null)
check('SKIP Axis OTP', { sender: 'BP-AXISBK', body: 'OTP is 556677 for txn of INR 4,999.00 at AMAZON on Axis Bank card XX7766. Valid for 3 mins. Do not share it with anyone.' }, null)
check('SKIP ICICI loan ready to be credited', { sender: 'JM-ICICIB', body: 'Dear Customer, Personal Loan of Rs.3,00,000 is ready to be credited to your A/c XX1234 instantly. Avail now on iMobile. T&C apply -ICICI Bank' }, null)
check('SKIP instant loan', { sender: 'VM-KREDTB', body: 'Instant loan up to Rs 5,00,000 credited in 10 minutes! Click https://kb.ink/xyz' }, null)
check('SKIP CC statement', { sender: 'AX-HDFCBK', body: 'HDFC Bank Credit Card XX4321 Statement: Total Amt Due Rs 8,765.00, Min Amt Due Rs 440.00, Due Date 18-11-2026. Pay via NetBanking.' }, null)
check('SKIP CC payment is due', { sender: 'AX-HDFCBK', body: 'Payment of Rs 8,765.00 towards your HDFC Bank Credit Card XX4321 is due on 18-11-2026.' }, null)
check('SKIP EMI due', { sender: 'JM-ICICIB', body: 'Your EMI of Rs 5,432 for Loan A/c XX9876 is due on 05-11-2026. Please maintain sufficient balance in A/c XX1234.' }, null)
check('SKIP autopay will be debited', { sender: 'AX-HDFCBK', body: 'Your NETFLIX autopay of Rs.649.00 will be debited from your A/c XX1234 on 05-11-26 via UPI mandate. -HDFC Bank' }, null)
check('SKIP pre-debit auto-debited', { sender: 'JM-ICICIB', body: 'Dear Customer, Rs.199.00 for SPOTIFY will be auto-debited from your ICICI Bank Acct XX123 on 02-Nov-26 as per your UPI AutoPay mandate.' }, null)
check('SKIP Kotak reminder', { sender: 'VK-KOTAKB', body: 'Reminder: Rs.999.00 will be debited from your Kotak A/c X7788 on 01-Nov-26 for YouTube Premium mandate.' }, null)
check('SKIP declined wrong PIN', { sender: 'AX-SBIINB', body: 'Your transaction of Rs.1,500.00 using SBI Debit Card X4521 at FLIPKART was declined due to incorrect PIN.' }, null)
check('SKIP UPI failed will be reversed', { sender: 'AX-HDFCBK', body: 'UPI txn of Rs 300.00 to ramesh@ybl FAILED. Amount debited, if any, will be reversed in 3 working days. Ref 630912345678' }, null)
check('SKIP NACH bounce', { sender: 'AX-HDFCBK', body: 'Your ECS/NACH debit of Rs 2,999 towards BAJAJ FINANCE could not be processed due to insufficient balance. Charges of Rs 500 + GST will be levied.' }, null)
check('SKIP collect request', { sender: 'VM-PHONPE', body: 'ravi@okaxis has sent you a collect request of Rs 1,200 on PhonePe. Approve only if you want to pay.' }, null)
check('SKIP requested money', { sender: 'AX-PAYTMB', body: 'RAHUL has requested money. Pay Rs 750 to rahul@paytm before 31 Oct. Ignore if already paid.' }, null)
check('SKIP balance enquiry', { sender: 'AX-HDFCBK', body: 'Avl Bal in A/c XX1234 as on 29-10-26 is INR 12,345.67. Credits in last 7 days: INR 5,000.00 -HDFC' }, null)
check('SKIP SBI balance', { sender: 'AX-SBIINB', body: 'Your A/C XXXXX4521 balance is Rs.4,567.89 as on 29/10/26. -SBI' }, null)
check('SKIP KYC due', { sender: 'AX-SBIINB', body: 'Dear Customer, your KYC is due for update. Please visit branch or update via YONO to avoid restriction on A/c XX4521. -SBI' }, null)
check('SKIP PAN/TDS may be deducted', { sender: 'AX-HDFCBK', body: 'Your PAN is not updated in A/c XX1234. TDS of Rs 1,200 may be deducted at higher rate. Update PAN now via NetBanking -HDFC' }, null)
check('SKIP statement generated', { sender: 'VM-SBICRD', body: 'Your SBI Card statement for Oct-26 has been generated. Total Amount Due: Rs.15,432.10 Min Amount Due: Rs.780.00 Payment Due Date: 20-Nov-26' }, null)
check('SKIP scheduled NEFT', { sender: 'AD-PNBSMS', body: 'Your scheduled NEFT of Rs 15,000 to LANDLORD SHARMA on 01-11-26 has been set up.' }, null)
check('SKIP cashback promo offer', { sender: 'AX-AMAZON', body: 'Pay your electricity bill using Amazon Pay UPI & get cashback of up to Rs 100. Offer valid till 31 Oct.' }, null)
check('SKIP scratch card won', { sender: 'AD-GPAYIN', body: "Congrats! You've won cashback of Rs 50 on your scratch card. Claim now on Google Pay." }, null)
check('SKIP credit limit enhance offer', { sender: 'VM-SBICRD', body: 'Great news! Your SBI Card is eligible for a credit limit of up to Rs 2,50,000. SMS YES to 5676791 to apply.' }, null)
check('SKIP personal +91', { sender: '+919812345678', body: 'Rs 5000 credited to your account, check and confirm' }, null)
check('SKIP personal 10 digit', { sender: '9812345678', body: 'Bhai Rs.1,500 sent to your A/c via UPI, check' }, null)
check('SKIP personal 91 prefix', { sender: '919812345678', body: 'Paid Rs 300 to you for dinner' }, null)

// ── Bank SMS + app SMS for the same payment merge ──────────────────────────
const m = parseAll([
  { sender: 'AD-PNBSMS', date: T, body: 'A/c XX2211 debited INR 3,000.00 Dt 29-10-26 15:32:16 thru UPI:630298761234.Bal INR 4,500.00 -PNB' },
  { sender: 'VM-PHONPE', date: T + 600000, body: 'Paid ₹ 3,000 to Meena Devi. UPI Ref: 630298761234' },
])
if (m.length === 1) passed++; else { failed++; console.log('FAIL parseAll merges by UPI ref 10 min apart', JSON.stringify(m)) }

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
