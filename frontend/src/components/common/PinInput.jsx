import { useRef, useEffect } from 'react'

/**
 * OTP-style PIN input component.
 * Renders `length` individual digit boxes side by side.
 *
 * Props:
 *   length   — 4 or 6
 *   value    — full PIN string (e.g. "1234")
 *   onChange — called with full PIN string on any change
 *   autoFocus — focus first box on mount
 */
export default function PinInput({ length = 4, value = '', onChange, autoFocus = false }) {
  const inputsRef = useRef([])

  // Focus first box on mount if autoFocus
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputsRef.current[0]?.focus(), 60)
    }
  }, [autoFocus])

  // When length changes, trim or keep value
  useEffect(() => {
    if (value.length > length) {
      onChange?.(value.slice(0, length))
    }
  }, [length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (index, e) => {
    const raw = e.target.value

    // Allow only digits
    const digit = raw.replace(/\D/g, '').slice(-1)

    const chars = value.split('')
    // Pad to length
    while (chars.length < length) chars.push('')

    chars[index] = digit

    const newValue = chars.join('').slice(0, length)
    onChange?.(newValue)

    // Move focus forward if digit entered
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const chars = value.split('')
      while (chars.length < length) chars.push('')

      if (chars[index]) {
        // Clear current box
        chars[index] = ''
        onChange?.(chars.join('').slice(0, length))
      } else if (index > 0) {
        // Move to previous box and clear it
        chars[index - 1] = ''
        onChange?.(chars.join('').slice(0, length))
        inputsRef.current[index - 1]?.focus()
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange?.(pasted.padEnd(0, ''))
    // Focus the box after the last pasted digit
    const nextIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[nextIndex]?.focus()
  }

  const handleFocus = (e) => {
    // Select content on focus so typing replaces it
    e.target.select()
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length }).map((_, i) => {
        const digit = value[i] || ''
        const isFilled = digit !== ''
        const isActive = isFilled

        return (
          <div key={i} className="relative">
            <input
              ref={el => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={e => handleChange(i, e)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={handleFocus}
              maxLength={1}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              data-form-type="other"
              aria-label={`PIN digit ${i + 1}`}
              className={[
                'w-11 h-13 rounded-xl border-2 text-center text-xl font-semibold',
                'transition-all duration-150 outline-none',
                'caret-transparent select-none',
                // Color: amber when active/filled, stone when empty
                isActive
                  ? 'border-amber-400 bg-amber-50/60 text-transparent focus:border-amber-500 focus:ring-2 focus:ring-amber-300/50'
                  : 'border-stone-300 bg-white text-transparent focus:border-amber-400 focus:ring-2 focus:ring-amber-300/50',
              ].join(' ')}
              style={{ width: '2.75rem', height: '3.25rem' }}
            />
            {/* Visual masking: show dot when filled, nothing when empty */}
            {isFilled && (
              <span
                className="absolute inset-0 flex items-center justify-center text-2xl text-stone-700 pointer-events-none select-none"
                aria-hidden="true"
              >
                ●
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
