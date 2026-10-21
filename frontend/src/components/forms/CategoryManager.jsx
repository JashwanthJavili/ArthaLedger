import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Pencil, Check, X, ChevronDown } from 'lucide-react'
import ConfirmDialog from '../common/ConfirmDialog'

function normalizeCategoryList(cats) {
  if (!Array.isArray(cats)) return []
  return cats.map((c) => {
    if (typeof c === 'string') {
      return { name: c, subcategories: [] }
    }
    return {
      name: String(c.name || '').trim(),
      subcategories: Array.isArray(c.subcategories)
        ? c.subcategories.map((s) => String(s || '').trim()).filter(Boolean)
        : [],
    }
  }).filter((c) => c.name)
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Category & subcategory editor, shown as a popup dialog.
 * Changes are kept locally until the user taps "Save changes".
 */
export default function CategoryManager({ open, ...props }) {
  return createPortal(
    <AnimatePresence>
      {open && <CategoryManagerDialog key="category-manager" {...props} />}
    </AnimatePresence>,
    document.body,
  )
}

// Mounted fresh on every open, so local state starts from the saved list.
function CategoryManagerDialog({ categories, onSave, onClose }) {
  const [items, setItems] = useState(() => normalizeCategoryList(categories))
  const [newCat, setNewCat] = useState('')
  const [expanded, setExpanded] = useState(null)       // category name
  const [subInput, setSubInput] = useState('')
  const [renaming, setRenaming] = useState(null)       // category name
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // category name
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const original = useMemo(() => JSON.stringify(normalizeCategoryList(categories)), [categories])
  const dirty = JSON.stringify(items) !== original
  const subCount = items.reduce((n, c) => n + c.subcategories.length, 0)

  const addCategory = () => {
    const name = newCat.trim()
    if (!name) return
    if (items.some((i) => sameName(i.name, name))) {
      setError(`"${name}" already exists`)
      return
    }
    setItems((prev) => [...prev, { name, subcategories: [] }])
    setNewCat('')
    setError('')
    setExpanded(name)
  }

  const addSubcategory = (catName) => {
    const name = subInput.trim()
    if (!name) return
    const cat = items.find((c) => c.name === catName)
    if (cat?.subcategories.some((s) => sameName(s, name))) {
      setError(`"${name}" already exists in ${catName}`)
      return
    }
    setItems((prev) => prev.map((c) => (c.name === catName ? { ...c, subcategories: [...c.subcategories, name] } : c)))
    setSubInput('')
    setError('')
  }

  const removeSubcategory = (catName, sub) => {
    setItems((prev) => prev.map((c) => (c.name === catName ? { ...c, subcategories: c.subcategories.filter((s) => s !== sub) } : c)))
  }

  const startRename = (catName) => {
    setRenaming(catName)
    setRenameValue(catName)
    setError('')
  }

  const commitRename = () => {
    const val = renameValue.trim()
    if (!val || val === renaming) {
      setRenaming(null)
      return
    }
    if (items.some((c) => c.name !== renaming && sameName(c.name, val))) {
      setError(`"${val}" already exists`)
      return
    }
    setItems((prev) => prev.map((c) => (c.name === renaming ? { ...c, name: val } : c)))
    if (expanded === renaming) setExpanded(val)
    setRenaming(null)
    setError('')
  }

  const confirmDelete = () => {
    setItems((prev) => prev.filter((c) => c.name !== deleteTarget))
    if (expanded === deleteTarget) setExpanded(null)
    setDeleteTarget(null)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave(items)
    } finally {
      setSaving(false)
    }
  }

  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-subtle)] transition-colors cursor-pointer'

  return (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !deleteTarget) {
              e.preventDefault()
              e.stopPropagation()
              if (renaming) setRenaming(null)
              else onClose()
            }
          }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Manage categories"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full sm:max-w-[440px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
            style={{ maxHeight: '88vh' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-main)]">Categories</h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                  {items.length} {items.length === 1 ? 'category' : 'categories'} · {subCount} {subCount === 1 ? 'subcategory' : 'subcategories'}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                <X size={15} />
              </button>
            </div>

            {/* Add category */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] pl-3.5 pr-1.5 py-1.5 focus-within:border-[var(--gold-primary)] transition-colors">
                <input
                  value={newCat}
                  onChange={(e) => { setNewCat(e.target.value); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                  placeholder="Add a category, e.g. Travel"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none"
                />
                <button type="button" onClick={addCategory} disabled={!newCat.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--text-main)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-page)] disabled:opacity-30 transition-opacity cursor-pointer">
                  <Plus size={13} /> Add
                </button>
              </div>
              {error && <p className="mt-1.5 text-[11px] text-rose-500">{error}</p>}
            </div>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="py-10 text-center text-xs text-[var(--text-subtle)]">No categories yet. Add your first one above.</p>
              ) : (
                <ul className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                  {items.map((cat) => {
                    const isOpen = expanded === cat.name
                    const isRenaming = renaming === cat.name
                    return (
                      <li key={cat.name}>
                        <div className="flex items-center gap-2 px-3.5 py-2.5">
                          {isRenaming ? (
                            <>
                              <input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRename() } }}
                                autoFocus
                                className="min-w-0 flex-1 rounded-lg border border-[var(--gold-primary)] bg-[var(--bg-page)] px-2.5 py-1.5 text-[13px] text-[var(--text-main)] outline-none"
                              />
                              <button type="button" onClick={commitRename} aria-label="Save name"
                                className={`${iconBtn} bg-[var(--gold-primary)] !text-white`}>
                                <Check size={14} />
                              </button>
                              <button type="button" onClick={() => setRenaming(null)} aria-label="Cancel rename"
                                className={`${iconBtn} hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)]`}>
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => { setExpanded(isOpen ? null : cat.name); setSubInput(''); setError('') }}
                                aria-expanded={isOpen}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                              >
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gold-light)] text-xs font-bold uppercase text-[var(--gold-primary)]">
                                  {cat.name.charAt(0)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px] font-semibold text-[var(--text-main)]">{cat.name}</span>
                                  <span className="block text-[11px] text-[var(--text-subtle)]">
                                    {cat.subcategories.length === 0 ? 'No subcategories' : `${cat.subcategories.length} subcategor${cat.subcategories.length === 1 ? 'y' : 'ies'}`}
                                  </span>
                                </span>
                              </button>
                              <button type="button" onClick={() => startRename(cat.name)} aria-label={`Rename ${cat.name}`}
                                className={`${iconBtn} hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)]`}>
                                <Pencil size={13} />
                              </button>
                              <button type="button" onClick={() => setDeleteTarget(cat.name)} aria-label={`Delete ${cat.name}`}
                                className={`${iconBtn} hover:bg-rose-500/10 hover:text-rose-500`}>
                                <Trash2 size={13} />
                              </button>
                              <button type="button" onClick={() => { setExpanded(isOpen ? null : cat.name); setSubInput(''); setError('') }}
                                aria-label={isOpen ? 'Collapse' : 'Expand'}
                                className={`${iconBtn} hover:bg-[var(--border-subtle)]`}>
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </>
                          )}
                        </div>

                        <AnimatePresence initial={false}>
                          {isOpen && !isRenaming && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3.5 pb-3.5 pl-[3.6rem]">
                                {cat.subcategories.length > 0 && (
                                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                                    {cat.subcategories.map((sub) => (
                                      <span key={sub}
                                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border-card)] bg-[var(--bg-page)] py-1 pl-3 pr-1 text-xs text-[var(--text-main)]">
                                        {sub}
                                        <button type="button" onClick={() => removeSubcategory(cat.name, sub)} aria-label={`Remove ${sub}`}
                                          className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-subtle)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer">
                                          <X size={11} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <input
                                    value={subInput}
                                    onChange={(e) => { setSubInput(e.target.value); setError('') }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubcategory(cat.name) } }}
                                    placeholder="Add subcategory"
                                    autoFocus
                                    className="min-w-0 flex-1 rounded-lg border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--gold-primary)] transition-colors"
                                  />
                                  <button type="button" onClick={() => addSubcategory(cat.name)} disabled={!subInput.trim()}
                                    aria-label="Add subcategory"
                                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-card)] text-[var(--gold-primary)] hover:bg-[var(--gold-light)] disabled:opacity-30 transition-colors cursor-pointer">
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-5 pt-3 pb-5">
              <p className="mr-auto text-[11px] text-[var(--text-subtle)]">{dirty ? 'Unsaved changes' : 'No changes'}</p>
              <button type="button" onClick={onClose}
                className="rounded-xl border border-[var(--border-card)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={!dirty || saving}
                className="rounded-xl bg-[var(--gold-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </motion.div>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            title={`Delete "${deleteTarget}"?`}
            message="This removes the category and its subcategories from this list. Existing transactions keep their category."
            danger
          />
        </motion.div>
  )
}
