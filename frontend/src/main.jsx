import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Register Service Workers for PWA & Background Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // One worker handles offline caching and push (see public/sw.js).
      // Registering a second worker on the same scope used to replace it.
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    } catch (err) {
      console.warn('Service Worker Registration:', err)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
