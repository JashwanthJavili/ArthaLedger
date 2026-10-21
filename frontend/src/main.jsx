import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { startUpdateWatcher } from './lib/appUpdate'

// ── Native-app behaviour on touch devices ──────────────────────────────────
// No long-press menu / text selection (which brings up Copy, Translate and
// Google "Touch to search") except inside fields where you type.
const isEditable = (el) => Boolean(el?.closest?.('input, textarea, select, [contenteditable="true"], .selectable'))
if (window.matchMedia('(pointer: coarse)').matches) {
  document.addEventListener('contextmenu', (e) => { if (!isEditable(e.target)) e.preventDefault() })
  document.addEventListener('selectstart', (e) => { if (!isEditable(e.target)) e.preventDefault() })
}
// Installed app: no manual reload (it updates itself — see lib/appUpdate.js)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) e.preventDefault()
  })
}

// Register Service Workers for PWA & Background Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // One worker handles offline caching and push (see public/sw.js).
      // Registering a second worker on the same scope used to replace it.
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    } catch (err) {
      console.warn('Service Worker Registration:', err)
    }
  })
}

startUpdateWatcher()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
