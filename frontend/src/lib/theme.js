// Single source of truth for light/dark mode. index.html reads the same key on load.
const KEY = 'sl_dark'

export function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

export function setDarkMode(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1B1C20' : '#FAF8F5')
  try { localStorage.setItem(KEY, String(dark)) } catch { /* storage unavailable */ }
}
