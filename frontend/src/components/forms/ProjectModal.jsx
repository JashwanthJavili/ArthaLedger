import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FolderOpen } from 'lucide-react'
import { PROJECT_ICONS, suggestIcon, tintStyle, projectIcon } from '../../lib/projectIcons'

const TAGLINE_MAX = 80
const SUGGESTIONS = ['Personal', 'Family', 'Business', 'Home', 'Travel', 'Savings']

/** Create / edit a project. Same props as before: open, onClose, onSubmit, initial. */
export default function ProjectModal(props) {
  return createPortal(
    <AnimatePresence>{props.open && <ProjectForm key={props.initial?.id || 'new'} {...props} />}</AnimatePresence>,
    document.body,
  )
}

function ProjectForm({ onClose, onSubmit, initial }) {
  // Fresh mount per open, so the fields always start from `initial`
  const [name, setName] = useState(initial?.name || '')
  // Stored as `description`; shown as the project's tagline
  const [description, setDescription] = useState(initial?.description || '')
  // Picked icon; until the user picks one we suggest it from the name
  const [pickedIcon, setPickedIcon] = useState(initial?.icon || null)
  const icon = pickedIcon || suggestIcon(name)
  const preview = projectIcon(icon)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim(), icon: icon || null })
    onClose()
  }

  const fieldCls = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-3 text-[14px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--gold-primary)] transition-colors'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.form
        initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="relative max-h-[92dvh] overflow-y-auto w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gold-light)] text-[var(--gold-primary)] transition-colors"
            style={preview ? tintStyle(preview.tint) : undefined}>
            {preview ? <preview.Icon size={18} /> : <FolderOpen size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[var(--text-main)]">{initial ? 'Edit project' : 'New project'}</h2>
            <p className="text-[11px] text-[var(--text-subtle)]">{initial ? 'Rename, change the icon or tagline' : 'A project holds related books'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="project-name" className="mb-1.5 block text-[11px] font-semibold text-[var(--text-muted)]">Project name</label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family Expenses"
              className={fieldCls}
              enterKeyHint="next"
              required
              autoFocus
            />
            {!initial && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setName(s)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1 text-[12px] transition-colors cursor-pointer ${
                      name === s
                        ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] font-semibold text-[var(--text-main)]'
                        : 'border-[var(--border-card)] bg-[var(--bg-card)] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Icon</span>
              <span className="text-[10.5px] text-[var(--text-subtle)]">{preview ? preview.label : 'Pick one'}</span>
            </div>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Project icon">
              {PROJECT_ICONS.map(opt => {
                const on = icon === opt.key
                return (
                  <button key={opt.key} type="button" role="radio" aria-checked={on} aria-label={opt.label} title={opt.label}
                    onClick={() => setPickedIcon(on ? null : opt.key)}
                    className={`flex aspect-square items-center justify-center rounded-xl border-2 transition-all active:scale-95 cursor-pointer ${
                      on ? 'border-[var(--gold-primary)] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]' : 'border-transparent'
                    }`}
                    style={tintStyle(opt.tint)}>
                    <opt.Icon size={18} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="project-tagline" className="text-[11px] font-semibold text-[var(--text-muted)]">
                Tagline <span className="font-normal text-[var(--text-subtle)]">(optional)</span>
              </label>
              <span className="text-[10px] tabular-nums text-[var(--text-subtle)]">{description.length}/{TAGLINE_MAX}</span>
            </div>
            <input
              id="project-tagline"
              value={description}
              maxLength={TAGLINE_MAX}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short line about this project"
              className={fieldCls}
              enterKeyHint="done"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-[var(--border-subtle)] px-5 pt-3 pb-5">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--border-card)] py-3 text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={!name.trim()}
            className="flex-[2] rounded-xl bg-[var(--gold-primary)] py-3 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer">
            {initial ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}
