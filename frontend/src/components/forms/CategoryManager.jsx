import { useState } from 'react'
import { Plus, X, Tag } from 'lucide-react'

export default function CategoryManager({ categories, onSave }) {
  const [items, setItems] = useState(categories)
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed || items.includes(trimmed)) return
    const updated = [...items, trimmed]
    setItems(updated)
    setDraft('')
  }

  const remove = (name) => setItems((prev) => prev.filter((i) => i !== name))

  return (
    <div className="space-y-3 rounded-2xl border border-amber-100 bg-white/90 p-4">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-amber-600" />
        <h4 className="text-sm font-semibold text-stone-700">Manage Categories</h4>
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="New category name"
          className="flex-1 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-xl bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs text-stone-700"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              className="text-stone-400 hover:text-red-500 transition-colors ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSave(items)}
        className="w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
      >
        Save Categories
      </button>
    </div>
  )
}
