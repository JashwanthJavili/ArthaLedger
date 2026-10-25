import { useCallback, useEffect, useMemo, useState } from 'react'
import { I18nContext, STORAGE_KEY, currentLang, dateLocale, intlLocale, setCurrentLang, translate, LANGS } from './core'

const known = (code) => LANGS.some((l) => l.code === code)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(currentLang)

  useEffect(() => {
    setCurrentLang(lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (!known(next)) return
    setCurrentLang(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage blocked */ }
    setLangState(next)
    window.dispatchEvent(new CustomEvent('artha:lang', { detail: next }))
  }, [])

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(key, vars, lang),
    locale: dateLocale(lang),
    intl: intlLocale(lang),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

