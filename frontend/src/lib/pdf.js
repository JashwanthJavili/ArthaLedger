import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtAmt(n, sym = '₹') {
  return `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function entryTypeLabel(type) {
  if (type === 'income') return 'IN'
  if (type === 'expense') return 'OUT'
  if (type === 'transfer_in') return 'TXN IN'
  if (type === 'transfer_out') return 'TXN OUT'
  return type?.toUpperCase() || '-'
}

// ── CSV / Sheet export ─────────────────────────────────────────────────────

/**
 * exportReportCsv — exports filtered data as a .csv file (opens in Excel / Google Sheets).
 *
 * @param {object} opts
 * @param {object[]} opts.rows  - flat array of rows built by buildReportRows()
 * @param {string}   opts.filename
 */
export function exportReportCsv({ rows, filename }) {
  const headers = ['Date', 'Project', 'Book', 'Type', 'Amount', 'Description', 'Category', 'Mode', 'Entered By', 'Balance After', 'Notes']

  const escape = (val) => {
    const str = String(val ?? '')
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.date, r.project, r.book, r.typeLabel,
        r.amount, r.description, r.category,
        r.mode, r.enteredBy, r.balanceAfter, r.notes,
      ].map(escape).join(',')
    ),
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Full Report PDF ────────────────────────────────────────────────────────

/**
 * exportReportPdf — builds a multi-section branded PDF from a filtered data set.
 *
 * @param {object} opts
 * @param {object}   opts.user        - { displayName, email }
 * @param {object[]} opts.projects    - full projects list (for names)
 * @param {object}   opts.booksByProject
 * @param {object[]} opts.rows        - flat array built by buildReportRows()
 * @param {object}   opts.summary     - { totalIn, totalOut, net, entryCount }
 * @param {string}   opts.dateRange   - human-readable range string shown in header
 * @param {string}   opts.filename
 * @param {string}   [opts.currencySymbol]
 */
export function exportReportPdf({ user, projects, booksByProject, rows, summary, dateRange, filename, currencySymbol = '₹' }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = 595

  // ── Cover / header band ────────────────────────────────────────────────
  doc.setFillColor(214, 167, 94)
  doc.rect(0, 0, pageW, 80, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('ArthaLedger', 40, 38)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Where every rupee has meaning', 40, 56)
  doc.text('Financial Report', 40, 70)

  doc.setFontSize(9)
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageW - 40, 38, { align: 'right' })
  doc.text(`${user?.displayName || 'User'} · ${user?.email || ''}`, pageW - 40, 54, { align: 'right' })
  if (dateRange) doc.text(`Period: ${dateRange}`, pageW - 40, 70, { align: 'right' })

  // ── Summary cards ──────────────────────────────────────────────────────
  const sy = 100
  const cardW = (pageW - 80 - 20) / 3

  const cards = [
    { label: 'Total In', value: fmtAmt(summary.totalIn, currencySymbol), color: [59, 159, 116] },
    { label: 'Total Out', value: fmtAmt(summary.totalOut, currencySymbol), color: [210, 111, 95] },
    { label: 'Net Balance', value: fmtAmt(summary.net, currencySymbol), color: summary.net >= 0 ? [59, 159, 116] : [210, 111, 95] },
  ]

  cards.forEach((card, i) => {
    const x = 40 + i * (cardW + 10)
    doc.setFillColor(255, 250, 240)
    doc.setDrawColor(214, 167, 94)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, sy, cardW, 52, 6, 6, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 100, 70)
    doc.text(card.label, x + 10, sy + 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...card.color)
    doc.text(card.value, x + 10, sy + 36)
  })

  // entry count
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 140, 110)
  doc.text(`${summary.entryCount} entries across ${projects.length} project(s)`, 40, sy + 68)

  // ── Per-project summaries ──────────────────────────────────────────────
  let y = sy + 84

  const byProject = {}
  rows.forEach((r) => {
    if (!byProject[r.project]) byProject[r.project] = { in: 0, out: 0, count: 0 }
    if (r.typeRaw === 'income' || r.typeRaw === 'transfer_in') byProject[r.project].in += r.amountRaw
    else byProject[r.project].out += r.amountRaw
    byProject[r.project].count++
  })

  const projectNames = Object.keys(byProject)
  if (projectNames.length > 1) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(78, 58, 36)
    doc.text('Project Breakdown', 40, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Project', 'Total In', 'Total Out', 'Net', 'Entries']],
      body: projectNames.map((pn) => {
        const p = byProject[pn]
        const net = p.in - p.out
        return [pn, fmtAmt(p.in, currencySymbol), fmtAmt(p.out, currencySymbol), fmtAmt(net, currencySymbol), p.count]
      }),
      styles: { fontSize: 8, textColor: [55, 40, 24], cellPadding: 4 },
      headStyles: { fillColor: [214, 167, 94], textColor: [43, 30, 17], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 249, 236] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'center' } },
      margin: { left: 40, right: 40 },
    })
    y = doc.lastAutoTable.finalY + 16
  }

  // ── Transactions table ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(78, 58, 36)
  doc.text('All Transactions', 40, y)
  y += 4

  const tableRows = rows.map((r) => [
    r.date,
    r.project,
    r.book,
    r.typeLabel,
    r.description || '-',
    r.category || '-',
    r.mode || '-',
    fmtAmt(r.amountRaw, currencySymbol),
    fmtAmt(r.balanceAfterRaw, currencySymbol),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Project', 'Book', 'Type', 'Description', 'Category', 'Mode', 'Amount', 'Balance']],
    body: tableRows,
    styles: { fontSize: 7, textColor: [55, 40, 24], cellPadding: 4 },
    headStyles: { fillColor: [214, 167, 94], textColor: [43, 30, 17], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [255, 249, 236] },
    columnStyles: {
      3: { halign: 'center', fontStyle: 'bold' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = data.cell.raw
        if (raw === 'IN' || raw === 'TXN IN') data.cell.styles.textColor = [59, 159, 116]
        else if (raw === 'OUT' || raw === 'TXN OUT') data.cell.styles.textColor = [210, 111, 95]
      }
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      // Running footer on every page
      const ph = doc.internal.pageSize.height
      doc.setFontSize(7)
      doc.setTextColor(160, 140, 110)
      doc.text('Generated by ArthaLedger — Where every rupee has meaning', 40, ph - 18)
      doc.text(`Page ${data.pageNumber}`, pageW - 40, ph - 18, { align: 'right' })
    },
  })

  doc.save(`${filename}.pdf`)
}

// ── Build flat rows from context data ─────────────────────────────────────

/**
 * buildReportRows — flattens project/book/entry data into uniform row objects.
 * Applies optional filters (project IDs, book IDs, date range).
 *
 * @param {object} opts
 * @param {object[]} opts.projects
 * @param {object}   opts.booksByProject
 * @param {object}   opts.entriesByBook
 * @param {string[]} [opts.selectedProjectIds]  - empty = all
 * @param {string[]} [opts.selectedBookIds]      - empty = all
 * @param {Date|null} [opts.fromDate]
 * @param {Date|null} [opts.toDate]
 * @returns {{ rows: object[], summary: object, filteredProjects: object[] }}
 */
export function buildReportRows({ projects, booksByProject, entriesByBook, selectedProjectIds = [], selectedBookIds = [], fromDate = null, toDate = null }) {
  const activeProjects = selectedProjectIds.length
    ? projects.filter((p) => selectedProjectIds.includes(p.id))
    : projects

  const rows = []
  let totalIn = 0
  let totalOut = 0

  // normalise date range to midnight boundaries
  const from = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime() : null
  const to = toDate ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).getTime() : null

  for (const project of activeProjects) {
    const books = (booksByProject[project.id] || [])
    const activeBooks = selectedBookIds.length
      ? books.filter((b) => selectedBookIds.includes(b.id))
      : books

    for (const book of activeBooks) {
      const entries = (entriesByBook[book.id] || [])
        .filter((e) => {
          if (from && e.timestamp < from) return false
          if (to && e.timestamp > to) return false
          return true
        })
        .sort((a, b) => a.timestamp - b.timestamp)

      for (const entry of entries) {
        const amt = Number(entry.amount || 0)
        const isIn = entry.type === 'income' || entry.type === 'transfer_in'
        if (isIn) totalIn += amt
        else totalOut += amt

        rows.push({
          date: format(new Date(entry.timestamp), 'dd MMM yyyy'),
          project: project.name,
          book: book.name,
          typeLabel: entryTypeLabel(entry.type),
          typeRaw: entry.type,
          amount: fmtAmt(amt),
          amountRaw: amt,
          description: entry.description || '',
          category: entry.category || 'General',
          mode: entry.mode || 'Cash',
          enteredBy: entry.enteredBy || '',
          balanceAfter: fmtAmt(entry.balanceAfter),
          balanceAfterRaw: Number(entry.balanceAfter || 0),
          notes: entry.notes || '',
        })
      }
    }
  }

  return {
    rows,
    summary: {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      entryCount: rows.length,
    },
    filteredProjects: activeProjects,
  }
}

// ── Original single-book PDF (unchanged) ──────────────────────────────────

export function exportBookPdf({ projectName, bookName, summary, entries }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = 595
  const pageH = 842

  // Background
  doc.setFillColor(253, 246, 231)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Header band
  doc.setFillColor(214, 167, 94)
  doc.rect(0, 0, pageW, 72, 'F')

  // App name
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('ArthaLedger', 40, 38)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Where every rupee has meaning', 40, 56)

  // Date on right
  doc.setFontSize(9)
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageW - 40, 38, { align: 'right' })

  // Project & Book info
  doc.setTextColor(78, 58, 36)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(bookName, 40, 104)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120, 100, 70)
  doc.text(`Project: ${projectName}`, 40, 122)

  // Summary box
  doc.setFillColor(255, 250, 240)
  doc.setDrawColor(214, 167, 94)
  doc.setLineWidth(0.5)
  doc.roundedRect(40, 140, pageW - 80, 72, 8, 8, 'FD')

  const boxY = 168
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(78, 58, 36)

  // Total In
  doc.setTextColor(59, 159, 116)
  doc.text('Total In', 70, boxY - 10)
  doc.setFontSize(14)
  doc.text(`₹${summary.totalIn.toFixed(2)}`, 70, boxY + 8)

  // Total Out
  doc.setFontSize(11)
  doc.setTextColor(210, 111, 95)
  doc.text('Total Out', 240, boxY - 10)
  doc.setFontSize(14)
  doc.text(`₹${summary.totalOut.toFixed(2)}`, 240, boxY + 8)

  // Net Balance
  doc.setFontSize(11)
  const netColor = summary.net >= 0 ? [59, 159, 116] : [210, 111, 95]
  doc.setTextColor(...netColor)
  doc.text('Net Balance', 420, boxY - 10)
  doc.setFontSize(14)
  doc.text(`₹${summary.net.toFixed(2)}`, 420, boxY + 8)

  // Entries table
  const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp)
  const rows = sortedEntries.map((entry) => [
    format(new Date(entry.timestamp), 'dd MMM yy'),
    entry.type === 'income' ? 'IN' : 'OUT',
    entry.description || '-',
    entry.category || '-',
    entry.mode || '-',
    entry.enteredBy || '-',
    `₹${Number(entry.amount).toFixed(2)}`,
    `₹${Number(entry.balanceAfter || 0).toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: 232,
    head: [['Date', 'Type', 'Description', 'Category', 'Mode', 'By', 'Amount', 'Balance']],
    body: rows,
    styles: {
      fontSize: 8,
      textColor: [55, 40, 24],
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [214, 167, 94],
      textColor: [43, 30, 17],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [255, 249, 236],
    },
    columnStyles: {
      1: {
        halign: 'center',
        fontStyle: 'bold',
      },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        data.cell.styles.textColor = data.cell.raw === 'IN' ? [59, 159, 116] : [210, 111, 95]
      }
    },
  })

  // Footer
  const finalY = doc.internal.pageSize.height - 24
  doc.setFontSize(8)
  doc.setTextColor(160, 140, 110)
  doc.text('Generated by ArthaLedger — Where every rupee has meaning', 40, finalY)
  doc.text(`${entries.length} entries`, pageW - 40, finalY, { align: 'right' })

  doc.save(`${bookName.replace(/\s+/g, '_').toLowerCase()}_santham_ledger.pdf`)
}
