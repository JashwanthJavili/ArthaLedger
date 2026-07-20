import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Tag, Layers, Check, X } from 'lucide-react'
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

export default function CategoryManager({ categories, onSave }) {
  const [items, setItems] = useState(() => normalizeCategoryList(categories))
  const [newCatInput, setNewCatInput] = useState('')
  const [addingSubcatFor, setAddingSubcatFor] = useState(null) // categoryName
  const [subcatInput, setSubcatInput] = useState('')

  // Edit target state: { type: 'category'|'subcategory', categoryName, subcategoryName }
  const [editTarget, setEditTarget] = useState(null)
  const [editValue, setEditValue] = useState('')

  // Delete target state for ConfirmDialog: { type: 'category'|'subcategory', categoryName, subcategoryName }
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setItems(normalizeCategoryList(categories))
  }, [categories])

  const handleAddCategory = () => {
    const name = newCatInput.trim()
    if (!name) return
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) return
    setItems((prev) => [...prev, { name, subcategories: [] }])
    setNewCatInput('')
  }

  const handleAddSubcategory = (categoryName) => {
    const subName = subcatInput.trim()
    if (!subName) return
    setItems((prev) =>
      prev.map((cat) => {
        if (cat.name === categoryName) {
          if (cat.subcategories.some((s) => s.toLowerCase() === subName.toLowerCase())) {
            return cat
          }
          return { ...cat, subcategories: [...cat.subcategories, subName] }
        }
        return cat
      })
    )
    setSubcatInput('')
    setAddingSubcatFor(null)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'category') {
      setItems((prev) => prev.filter((i) => i.name !== deleteTarget.categoryName))
    } else if (deleteTarget.type === 'subcategory') {
      setItems((prev) =>
        prev.map((cat) => {
          if (cat.name === deleteTarget.categoryName) {
            return {
              ...cat,
              subcategories: cat.subcategories.filter((s) => s !== deleteTarget.subcategoryName),
            }
          }
          return cat
        })
      )
    }
    setDeleteTarget(null)
  }

  const handleSaveEdit = () => {
    if (!editTarget) return
    const val = editValue.trim()
    if (!val) return

    if (editTarget.type === 'category') {
      setItems((prev) =>
        prev.map((cat) => (cat.name === editTarget.categoryName ? { ...cat, name: val } : cat))
      )
    } else if (editTarget.type === 'subcategory') {
      setItems((prev) =>
        prev.map((cat) => {
          if (cat.name === editTarget.categoryName) {
            return {
              ...cat,
              subcategories: cat.subcategories.map((s) =>
                s === editTarget.subcategoryName ? val : s
              ),
            }
          }
          return cat
        })
      )
    }
    setEditTarget(null)
    setEditValue('')
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-3.5 border border-stone-200 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag size={15} className="text-amber-600" />
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Categories & Subcategories
          </h4>
        </div>
        <span className="text-[10px] text-stone-400 font-semibold">{items.length} main categories</span>
      </div>

      {/* Add New Category Input */}
      <div className="flex gap-2">
        <input
          value={newCatInput}
          onChange={(e) => setNewCatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
          placeholder="New Category (e.g. Food, Travel)"
          className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-400 outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleAddCategory}
          disabled={!newCatInput.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Categories List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
        {items.map((cat) => {
          const isEditingCat = editTarget?.type === 'category' && editTarget?.categoryName === cat.name
          const isAddingSub = addingSubcatFor === cat.name

          return (
            <div
              key={cat.name}
              className="rounded-xl border border-amber-100 bg-amber-50/20 p-2.5 space-y-2"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between gap-2">
                {isEditingCat ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveEdit())}
                      className="flex-1 rounded-lg border border-amber-400 bg-white px-2 py-1 text-xs text-stone-800 outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTarget(null)}
                      className="rounded-lg bg-stone-200 p-1 text-stone-600 hover:bg-stone-300"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-stone-800 truncate">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTarget({ type: 'category', categoryName: cat.name })
                        setEditValue(cat.name)
                      }}
                      className="p-1 text-stone-400 hover:text-amber-700 transition-colors"
                      title="Rename Category"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'category', categoryName: cat.name })}
                      className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAddingSubcatFor(isAddingSub ? null : cat.name)
                    setSubcatInput('')
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-amber-200/80 px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <Plus size={10} /> Subcategory
                </button>
              </div>

              {/* Add Subcategory input */}
              {isAddingSub && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    value={subcatInput}
                    onChange={(e) => setSubcatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubcategory(cat.name))}
                    placeholder={`New subcategory for ${cat.name}...`}
                    className="flex-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs text-stone-800 placeholder-stone-400 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubcategory(cat.name)}
                    disabled={!subcatInput.trim()}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingSubcatFor(null)}
                    className="rounded-lg bg-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-300"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Subcategories list as chips */}
              {cat.subcategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cat.subcategories.map((sub) => {
                    const isEditingSub =
                      editTarget?.type === 'subcategory' &&
                      editTarget?.categoryName === cat.name &&
                      editTarget?.subcategoryName === sub

                    if (isEditingSub) {
                      return (
                        <div key={sub} className="flex items-center gap-1">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveEdit())}
                            className="rounded-lg border border-amber-400 bg-white px-2 py-0.5 text-xs text-stone-800 outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="rounded bg-emerald-600 p-0.5 text-white"
                          >
                            <Check size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditTarget(null)}
                            className="rounded bg-stone-200 p-0.5 text-stone-600"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )
                    }

                    return (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-700"
                      >
                        <Layers size={9} className="text-amber-600" />
                        <span>{sub}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTarget({
                              type: 'subcategory',
                              categoryName: cat.name,
                              subcategoryName: sub,
                            })
                            setEditValue(sub)
                          }}
                          className="text-stone-300 hover:text-amber-700 ml-0.5"
                          title="Rename Subcategory"
                        >
                          <Pencil size={9} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'subcategory',
                              categoryName: cat.name,
                              subcategoryName: sub,
                            })
                          }
                          className="text-stone-300 hover:text-red-500 ml-0.5"
                          title="Delete Subcategory"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={() => onSave(items)}
        className="w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Check size={14} /> Save Categories & Subcategories
      </button>

      {/* Confirm Delete Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.type === 'category'
            ? `Delete "${deleteTarget?.categoryName}"?`
            : `Delete Subcategory "${deleteTarget?.subcategoryName}"?`
        }
        message={
          deleteTarget?.type === 'category'
            ? `Are you sure you want to delete category "${deleteTarget?.categoryName}" and all its subcategories?`
            : `Delete "${deleteTarget?.subcategoryName}" under "${deleteTarget?.categoryName}"?`
        }
        danger
      />
    </div>
  )
}
