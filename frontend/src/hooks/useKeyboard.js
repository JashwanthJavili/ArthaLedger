import { useSyncExternalStore } from 'react'

/*
 * The on-screen keyboard. Phones shrink only the "visual" viewport when it
 * opens (the page keeps its size), so anything fixed to the bottom of the
 * screen ends up behind the keyboard unless it's moved or hidden.
 */

const OPEN_AT = 120 // smaller differences are browser toolbars, not a keyboard
const CLOSED = { open: false, top: 0, height: 0 }
let last = CLOSED

function read() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (!vv) return CLOSED
  // clientHeight is the page's own viewport, which the keyboard doesn't shrink
  const open = document.documentElement.clientHeight - vv.height > OPEN_AT
  const top = Math.round(vv.offsetTop)
  const height = Math.round(vv.height)
  // Same object while nothing changed, as useSyncExternalStore needs
  if (last.open !== open || last.top !== top || last.height !== height) last = { open, top, height }
  return last
}

function subscribe(onChange) {
  const vv = window.visualViewport
  if (!vv) return () => {}
  vv.addEventListener('resize', onChange)
  vv.addEventListener('scroll', onChange)
  return () => {
    vv.removeEventListener('resize', onChange)
    vv.removeEventListener('scroll', onChange)
  }
}

/** { open, top, height }: whether the keyboard is up, and the visible area above it. */
export function useKeyboard() {
  return useSyncExternalStore(subscribe, read, () => CLOSED)
}

/** Brings a just-focused field to the middle once the keyboard has opened. */
export function keepInView(el) {
  if (!el) return
  setTimeout(() => {
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch { /* old browsers */ }
  }, 320)
}
