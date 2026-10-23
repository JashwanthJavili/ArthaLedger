import { useEffect, useRef } from 'react'

const HOLD_MS = 1150
const FADE_MS = 520

/**
 * Drives the launch screen that index.html already painted (#boot-splash):
 * the same picture the Android app shows while starting. It is never
 * re-created, so there is no blink: we fill the gold line, then let the
 * screen dissolve into the app (which has been rendering underneath).
 */
export default function SplashScreen({ onDone }) {
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone })

  useEffect(() => {
    const el = document.getElementById('boot-splash')
    if (!el || !document.documentElement.classList.contains('boot-splash')) {
      doneRef.current()
      return
    }
    // Next frame, so the line's transition starts from empty
    const raf = requestAnimationFrame(() => el.classList.add('run'))
    const out = setTimeout(() => el.classList.add('out'), HOLD_MS)
    const done = setTimeout(() => {
      document.documentElement.classList.remove('boot-splash')
      el.remove()
      doneRef.current()
    }, HOLD_MS + FADE_MS + 40)
    return () => { cancelAnimationFrame(raf); clearTimeout(out); clearTimeout(done) }
  }, [])

  return null
}
