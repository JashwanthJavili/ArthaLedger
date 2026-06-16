import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const CURRENT_VERSION = '4'
const storedVersion = localStorage.getItem('al_sw_version')

if (storedVersion !== CURRENT_VERSION) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister()
      }
    }).then(() => {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          return Promise.all(keys.map((key) => caches.delete(key)))
        }).then(() => {
          localStorage.setItem('al_sw_version', CURRENT_VERSION)
          window.location.reload()
        })
      } else {
        localStorage.setItem('al_sw_version', CURRENT_VERSION)
        window.location.reload()
      }
    })
  } else {
    localStorage.setItem('al_sw_version', CURRENT_VERSION)
  }
} else {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
    })
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
