import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Delete } from 'lucide-react'

// Touch-first devices (phones/tablets) get an on-screen keypad; others type.
function useIsTouch() {
  const [touch] = useState(() => {
    try { return window.matchMedia('(pointer: coarse)').matches } catch { return false }
  })
  return touch
}

/**
 * PIN field with dot indicators.
 *  - Phones: on-screen keypad (the system keyboard stays closed).
 *  - Desktop: just type — digits go to one invisible input with autofill off.
 *
 * Props:
 *   length      number of dots / max digits
 *   value       current digits
 *   onChange    (next) => void
 *   onComplete  (pin) => void — fired when `value` reaches `length`
 *   disabled    block input (verifying / locked out)
 *   shakeKey    change this number to play the error shake
 *   tone        'default' | 'danger'
 */
export default function PinPad({ length, value, onChange, onComplete, disabled = false, shakeKey = 0, tone = 'default' }) {
  const isTouch = useIsTouch()
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)

  const focus = () => { if (!disabled && !isTouch) inputRef.current?.focus({ preventScroll: true }) }

  useEffect(() => {
    const t = setTimeout(focus, 120)
    return () => clearTimeout(t)
  }, [disabled, shakeKey, length]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (raw) => {
    if (disabled) return
    const next = raw.replace(/\D/g, '').slice(0, length)
    if (next === value) return
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  // Desktop: accept the keyboard even when the hidden field has lost focus
  useEffect(() => {
    if (isTouch) return undefined
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (document.activeElement === inputRef.current) return // the input handles it
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (disabled) return
      if (/^\d$/.test(e.key)) { e.preventDefault(); apply(value + e.key); focus() }
      else if (e.key === 'Backspace') { e.preventDefault(); onChange(value.slice(0, -1)); focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-bound each render so `apply` sees current props

  const filledCls = tone === 'danger' ? 'border-rose-500 bg-rose-500' : 'border-[var(--gold-primary)] bg-[var(--gold-primary)]'
  const showCaret = (isTouch || focused) && !disabled
  const keyCls = 'flex h-14 items-center justify-center rounded-2xl text-[22px] font-semibold tabular-nums text-[var(--text-main)] transition-colors select-none cursor-pointer active:bg-[var(--gold-light)] disabled:opacity-40'

  return (
    <div className="relative select-none">
      <motion.div
        key={shakeKey}
        initial={false}
        animate={shakeKey ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.42 }}
        onClick={focus}
        className={`relative mx-auto flex w-fit items-center justify-center gap-3 rounded-2xl border bg-[var(--bg-card)] px-5 py-4 transition-colors ${
          !isTouch && focused && !disabled ? 'border-[var(--gold-primary)]' : 'border-[var(--border-card)]'
        } ${disabled ? 'opacity-60' : ''} ${isTouch ? '' : 'cursor-text'}`}
        role="group"
        aria-label={`${value.length} of ${length} digits entered`}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length
          const isNext = showCaret && i === value.length
          return (
            <motion.span
              key={i}
              animate={{ scale: filled ? 1 : 0.85 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                filled ? filledCls : isNext ? 'border-[var(--gold-primary)]' : 'border-[var(--text-subtle)]/45'
              }`}
            />
          )
        })}

        {!isTouch && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => apply(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            type="text"
            inputMode="numeric"
            maxLength={length}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            aria-label={`Enter ${length}-digit PIN`}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
            style={{ caretColor: 'transparent', fontSize: 16 }}
          />
        )}
      </motion.div>

      {isTouch ? (
        <div className="mx-auto mt-5 grid max-w-[264px] grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" disabled={disabled} onClick={() => apply(value + d)} className={keyCls} aria-label={d}>
              {d}
            </button>
          ))}
          <span />
          <button type="button" disabled={disabled} onClick={() => apply(value + '0')} className={keyCls} aria-label="0">0</button>
          <button type="button" disabled={disabled || !value} onClick={() => onChange(value.slice(0, -1))}
            className={keyCls + ' !text-[var(--text-muted)]'} aria-label="Delete last digit">
            <Delete size={22} />
          </button>
        </div>
      ) : (
        <p className={`mt-2 text-center text-[11px] text-[var(--text-subtle)] transition-opacity ${focused || disabled ? 'opacity-0' : 'opacity-100'}`}>
          Type your PIN
        </p>
      )}
    </div>
  )
}
