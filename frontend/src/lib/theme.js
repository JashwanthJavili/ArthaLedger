// Single source of truth for light/dark mode. index.html reads the same key on load.
// Light is the default; dark mode is opt-in from Settings.
const KEY = 'sl_dark'
const META = { light: '#FAF8F5', dark: '#26282E' }

function apply(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? META.dark : META.light)
}

function savedDark() {
  try { return localStorage.getItem(KEY) === 'true' } catch { return false }
}

export function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

export function setDarkMode(dark) {
  apply(dark)
  try { localStorage.setItem(KEY, String(dark)) } catch { /* storage unavailable */ }
}

/** Show light mode without changing the saved choice (landing page) */
export function forceLightTheme() {
  apply(false)
}

/** Back to the user's saved choice */
export function restoreTheme() {
  apply(savedDark())
}
