import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  reload,
} from 'firebase/auth'
import { getDatabase, ref, set } from 'firebase/database'
import { getMessaging, getToken, onMessage, isSupported as isMessagingSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'YOUR_DATABASE_URL',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getDatabase(app)
let analytics = null

if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app)
    })
    .catch(() => { analytics = null })
}

const messagingPromise = (async () => {
  if (typeof window === 'undefined') return null
  const supported = await isMessagingSupported().catch(() => false)
  if (!supported) return null
  return getMessaging(app)
})()

export async function requestFCMToken(vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BHOMcvcUDNC3w_QJT7KC3LyERkOzAeybfxKtb8wrjhnhuzI-nZWkYLQnGw6mr8Eg1dPflGnZIuiDqFFB0sTpkjQ') {
  try {
    const messaging = await messagingPromise
    if (!messaging) return null
    const reg = await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      serviceWorkerRegistration: reg,
      vapidKey: vapidKey || 'BHOMcvcUDNC3w_QJT7KC3LyERkOzAeybfxKtb8wrjhnhuzI-nZWkYLQnGw6mr8Eg1dPflGnZIuiDqFFB0sTpkjQ',
    })
    if (token) {
      localStorage.setItem('al_fcm_token', token)
      if (auth.currentUser?.uid) {
        const safeTokenKey = token.replace(/[.#$[\]]/g, '_')
        await set(ref(db, `users/${auth.currentUser.uid}/pushTokens/${safeTokenKey}`), {
          token,
          updatedAt: Date.now(),
          platform: navigator.userAgent,
        }).catch(e => console.warn('Push token DB save error:', e))
      }
    }
    return token
  } catch (err) {
    console.error('Failed to get FCM token:', err)
    return null
  }
}

export async function onForegroundMessage(callback) {
  const messaging = await messagingPromise
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}

export {
  app,
  analytics,
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  db,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  reload,
}
