import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileSpreadsheet, FileText, ChevronDown, ChevronUp, Calendar, CheckSquare, Square, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { buildReportRows, exportReportPdf, exportReportCsv } from '../../lib/pdf'

// ── Small checkbox row ─────────────────────────────────────────────────────
function CheckRow({ checked, onChange, label, sub }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-start gap-2.5 w-full text-left py-1.5"
    >
      {checked
        ? <CheckSquare size={15} className="flex-shrink-0 mt-0.5 text-amber-600" />
        : <Square size={15} className="flex-shrink-0 mt-0.5 text-stone-300" />
      }
      <div className="min-w-0">
        <p className="text-xs font-medium text-stone-700 leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </button>
  )
}

// ── Date input ─────────────────────────────────────────────────────────────
function DateInput({ label, value, onChange, max }) {
  return (
    <div className="flex-1">
      <label className="block text-[10px] font-medium text-stone-500 mb-1">{label}</label>
      <div className="relative">
        <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          max={max}
          className="w-full rounded-xl border border-amber-100 bg-amber-50/40 pl-7 pr-2 py-2 text-xs focus:border-amber-300 focus:bg-white transition-colors"
        />
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function DownloadModal({ open, onClose, user, projects, booksByProject, entriesByBook, currencySymbol = '₹' }) {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Scope: 'all' | 'custom'
  const [scope, setScope] = useState('all')

  // Project selection
  const [selectedProjectIds, setSelectedProjectIds] = useState([])
  const [expandedProjects, setExpandedProjects] = useState({})
  // Book selection per project
  const [selectedBookIds, setSelectedBookIds] = useState([])

  // Date range
  const [useDateRange, setUseDateRange] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState(today)

  // Format
  const [fileFormat, setFileFormat] = useState('pdf') // 'pdf' | 'csv'

  // Loading state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setScope('all')
      setSelectedProjectIds([])
      setSelectedBookIds([])
      setExpandedProjects({})
      setUseDateRange(false)
      setFromDate('')
      setToDate(today)
      setFileFormat('pdf')
      setError('')
    }
  }, [open, today])

  // ── Computed quick stats ───────────────────────────────────────────────
  const { rows, summary } = useMemo(() => {
    if (!open) return { rows: [], summary: { totalIn: 0, totalOut: 0, net: 0, entryCount: 0 } }
    const activeProjIds = scope === 'all' ? [] : selectedProjectIds
    const activeBookIds = scope === 'all' ? [] : selectedBookIds
    return buildReportRows({
      projects,
      booksByProject,
      entriesByBook,
      selectedProjectIds: activeProjIds,
      selectedBookIds: activeBookIds,
      fromDate: useDateRange && fromDate ? new Date(fromDate) : null,
      toDate: useDateRange && toDate ? new Date(toDate) : null,
    })
  }, [open, scope, selectedProjectIds, selectedBookIds, useDateRange, fromDate, toDate, projects, booksByProject, entriesByBook])

  // ── Helpers ────────────────────────────────────────────────────────────
  const toggleProject = (pid) => {
    setSelectedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    )
    // When deselecting project, also deselect its books
    if (selectedProjectIds.includes(pid)) {
      const books = booksByProject[pid] || []
      setSelectedBookIds((prev) => prev.filter((bid) => !books.find((b) => b.id === bid)))
    }
  }

  const toggleBook = (bid) => {
    setSelectedBookIds((prev) =>
      prev.includes(bid) ? prev.filter((x) => x !== bid) : [...prev, bid]
    )
  }

  const toggleExpandProject = (pid) => {
    setExpandedProjects((prev) => ({ ...prev, [pid]: !prev[pid] }))
  }

  // Select/deselect all books in a project
  const toggleAllBooksInProject = (pid) => {
    const books = booksByProject[pid] || []
    const allSelected = books.every((b) => selectedBookIds.includes(b.id))
    if (allSelected) {
      setSelectedBookIds((prev) => prev.filter((bid) => !books.find((b) => b.id === bid)))
    } else {
      const newIds = books.map((b) => b.id).filter((bid) => !selectedBookIds.includes(bid))
      setSelectedBookIds((prev) => [...prev, ...newIds])
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────
  const canExport = useMemo(() => {
    if (scope === 'custom' && selectedProjectIds.length === 0) return false
    if (useDateRange && fromDate && toDate && fromDate > toDate) return false
    if (summary.entryCount === 0) return false
    return true
  }, [scope, selectedProjectIds, useDateRange, fromDate, toDate, summary.entryCount])

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!canExport) return
    setError('')
    setLoading(true)

    try {
      await new Promise((r) => setTimeout(r, 50)) // let UI update

      const dateStr = useDateRange && fromDate
        ? `${format(new Date(fromDate), 'dd MMM yyyy')} – ${format(new Date(toDate), 'dd MMM yyyy')}`
        : 'All time'

      const filename = `arthaledger_report_${format(new Date(), 'yyyy-MM-dd')}`

      const activeProjIds = scope === 'all' ? [] : selectedProjectIds
      const filteredProjects = activeProjIds.length
        ? projects.filter((p) => activeProjIds.includes(p.id))
        : projects

      if (fileFormat === 'pdf') {
        exportReportPdf({
          user,
          projects: filteredProjects,
          booksByProject,
          rows,
          summary,
          dateRange: dateStr,
          filename,
          currencySymbol,
        })
      } else {
        exportReportCsv({ rows, filename })
      }

      onClose()
    } catch (err) {
      setError('Export failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="w-full max-w-sm rounded-3xl border border-amber-100 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-amber-50">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-100 p-2">
                  <Download size={15} className="text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-stone-800">Download Report</h3>
                  <p className="text-[10px] text-stone-400">Customise and export your data</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ── Scope ── */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">Scope</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'all', label: 'Entire App', sub: 'All projects & books' },
                    { val: 'custom', label: 'Custom', sub: 'Pick projects / books' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setScope(opt.val)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        scope === opt.val
                          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/30'
                          : 'border-stone-200 bg-white hover:border-amber-200'
                      }`}
                    >
                      <p className="text-xs font-semibold text-stone-700">{opt.label}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Custom project / book picker ── */}
              <AnimatePresence>
                {scope === 'custom' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-amber-100 overflow-hidden">
                      <div className="px-3 py-2 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Projects & Books</p>
                        <button
                          type="button"
                          onClick={() => {
                            const all = projects.map((p) => p.id)
                            const allBooks = projects.flatMap((p) => (booksByProject[p.id] || []).map((b) => b.id))
                            const allSelected = all.every((id) => selectedProjectIds.includes(id))
                            if (allSelected) {
                              setSelectedProjectIds([])
                              setSelectedBookIds([])
                            } else {
                              setSelectedProjectIds(all)
                              setSelectedBookIds(allBooks)
                            }
                          }}
                          className="text-[10px] text-amber-600 font-medium hover:text-amber-700"
                        >
                          {projects.every((p) => selectedProjectIds.includes(p.id)) ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>

                      <div className="divide-y divide-amber-50/80 max-h-52 overflow-y-auto">
                        {projects.map((project) => {
                          const books = booksByProject[project.id] || []
                          const projSelected = selectedProjectIds.includes(project.id)
                          const expanded = expandedProjects[project.id]
                          const allBooksSelected = books.length > 0 && books.every((b) => selectedBookIds.includes(b.id))

                          return (
                            <div key={project.id}>
                              {/* Project row */}
                              <div className="flex items-center px-3 py-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleProject(project.id)}
                                  className="flex-1 flex items-start gap-2 text-left"
                                >
                                  {projSelected
                                    ? <CheckSquare size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                                    : <Square size={14} className="flex-shrink-0 mt-0.5 text-stone-300" />
                                  }
                                  <span className="text-xs font-medium text-stone-700 leading-tight">{project.name}</span>
                                  <span className="ml-auto text-[10px] text-stone-400 flex-shrink-0">{books.length} book{books.length !== 1 ? 's' : ''}</span>
                                </button>
                                {books.length > 0 && projSelected && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandProject(project.id)}
                                    className="rounded-lg p-1 text-stone-400 hover:bg-amber-50 transition-colors"
                                  >
                                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                )}
                              </div>

                              {/* Book rows (only when project is selected and expanded) */}
                              <AnimatePresence>
                                {projSelected && expanded && books.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden bg-amber-50/30"
                                  >
                                    {/* Select all books in project */}
                                    <button
                                      type="button"
                                      onClick={() => toggleAllBooksInProject(project.id)}
                                      className="w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left hover:bg-amber-50 transition-colors border-b border-amber-100/60"
                                    >
                                      {allBooksSelected
                                        ? <CheckSquare size={12} className="flex-shrink-0 text-amber-600" />
                                        : <Square size={12} className="flex-shrink-0 text-stone-300" />
                                      }
                                      <span className="text-[10px] text-stone-500 font-medium">All books in {project.name}</span>
                                    </button>
                                    {books.map((book) => (
                                      <button
                                        key={book.id}
                                        type="button"
                                        onClick={() => toggleBook(book.id)}
                                        className="w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-left hover:bg-amber-50 transition-colors"
                                      >
                                        {selectedBookIds.includes(book.id)
                                          ? <CheckSquare size={12} className="flex-shrink-0 text-amber-500" />
                                          : <Square size={12} className="flex-shrink-0 text-stone-200" />
                                        }
                                        <span className="text-[10px] text-stone-600">{book.name}</span>
                                        <span className="ml-auto text-[9px] text-stone-300">
                                          {(entriesByBook[book.id] || []).length} entries
                                        </span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {scope === 'custom' && selectedProjectIds.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1.5 ml-1">Select at least one project to continue.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Date range ── */}
              <div>
                <CheckRow
                  checked={useDateRange}
                  onChange={() => setUseDateRange((v) => !v)}
                  label="Filter by date range"
                  sub={useDateRange ? undefined : 'Export all entries (no date filter)'}
                />
                <AnimatePresence>
                  {useDateRange && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 mt-2">
                        <DateInput label="From" value={fromDate} onChange={setFromDate} max={toDate || today} />
                        <DateInput label="To" value={toDate} onChange={setToDate} max={today} />
                      </div>
                      {fromDate && toDate && fromDate > toDate && (
                        <p className="text-[10px] text-red-500 mt-1 ml-1">Start date must be before end date.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Format ── */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">Format</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'pdf', label: 'PDF Report', sub: 'Branded, printable', icon: FileText },
                    { val: 'csv', label: 'Spreadsheet', sub: 'Excel / Google Sheets', icon: FileSpreadsheet },
                  ].map((fmt) => {
                    const Icon = fmt.icon
                    return (
                      <button
                        key={fmt.val}
                        type="button"
                        onClick={() => setFileFormat(fmt.val)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-all flex items-start gap-2 ${
                          fileFormat === fmt.val
                            ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/30'
                            : 'border-stone-200 bg-white hover:border-amber-200'
                        }`}
                      >
                        <Icon size={14} className={`mt-0.5 flex-shrink-0 ${fileFormat === fmt.val ? 'text-amber-600' : 'text-stone-400'}`} />
                        <div>
                          <p className="text-xs font-semibold text-stone-700">{fmt.label}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{fmt.sub}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Preview summary ── */}
              <div className="rounded-2xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">Preview</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-emerald-600">
                      {currencySymbol}{summary.totalIn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-stone-400 mt-0.5">Total In</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-500">
                      {currencySymbol}{summary.totalOut.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-stone-400 mt-0.5">Total Out</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${summary.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {summary.net < 0 ? '-' : ''}{currencySymbol}{Math.abs(summary.net).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-stone-400 mt-0.5">Net</p>
                  </div>
                </div>
                <p className="text-center text-[10px] text-stone-400 mt-2">
                  {summary.entryCount === 0
                    ? 'No entries match the selected filters.'
                    : `${summary.entryCount} entr${summary.entryCount !== 1 ? 'ies' : 'y'} will be exported`}
                </p>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{error}</p>
              )}
            </div>

            {/* Footer CTA */}
            <div className="px-5 pb-5 pt-3 border-t border-amber-50 space-y-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={!canExport || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                  : <><Download size={15} /> Download {fileFormat.toUpperCase()}</>
                }
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-stone-200 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
