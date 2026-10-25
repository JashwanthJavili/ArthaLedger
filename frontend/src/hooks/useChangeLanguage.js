import { useCallback } from 'react'
import { setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/core'
import { userDoc } from '../lib/userData'

/**
 * Change the app language: applied at once on this device, and remembered in
 * the account (profile.language) so other devices follow. The write never
 * blocks the UI; offline it syncs later like any other change.
 */
export default function useChangeLanguage() {
  const { lang, setLang } = useI18n()
  const { user, isEmailVerified } = useAuth()
  const uid = user && isEmailVerified ? user.uid : null

  return useCallback((code) => {
    if (code === lang) return
    setLang(code)
    if (uid) {
      setDoc(userDoc(uid), { profile: { language: code } }, { merge: true })
        .catch((err) => console.warn('[language] not saved to account:', err))
    }
  }, [lang, setLang, uid])
}
