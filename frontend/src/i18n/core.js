import { createContext, useContext } from 'react'
import { enIN, te as teLocale } from 'date-fns/locale'
import en from './en.json'
import te from './te.json'

/*
 * Languages. All text lives in en.json and te.json, grouped by screen
 * ("landing.hero.title", "book.empty.title", ...).
 *
 *   const { t } = useI18n()
 *   t('common.save')                       -> "Save" / "సేవ్ చేయండి"
 *   t('book.count', { count: 3 })          -> picks "one" / "other", fills {count}
 *   <Trans k="landing.hero.title" components={{ em: <em /> }} />   (from ./Trans)
 *
 * A missing Telugu string falls back to English, so nothing is ever blank.
 * Code outside React (notifications, API errors) uses `translate()`.
 * PDF export stays in English: its fonts cannot draw Telugu.
 */

// label: full name · short: the app's header button · badge: two-letter square
export const LANGS = [
  { code: 'en', label: 'English', short: 'Eng', badge: 'EN', intl: 'en-IN' },
  { code: 'te', label: 'తెలుగు', short: 'తెలుగు', badge: 'తె', intl: 'te-IN' },
]
const DICTS = { en, te }
const STORE_KEY = 'artha.lang'

function readStored() {
  try {
    const v = localStorage.getItem(STORE_KEY)
    if (v && DICTS[v]) return v
  } catch { /* storage blocked */ }
  return 'en'
}

let current = readStored()

/** Called by the provider when the language changes. */
export function setCurrentLang(lang) { current = lang }
export const STORAGE_KEY = STORE_KEY

function lookup(dict, key) {
  let node = dict
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[part]
  }
  return node
}

function fill(text, vars) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name) => (vars[name] != null ? String(vars[name]) : m))
}

/** Translate `key` in `lang` (default: the current language). */
export function translate(key, vars, lang = current) {
  let value = lookup(DICTS[lang], key)
  if (value === undefined && lang !== 'en') value = lookup(DICTS.en, key)
  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  if (value && typeof value === 'object' && ('one' in value || 'other' in value)) {
    value = vars?.count === 1 ? (value.one ?? value.other) : (value.other ?? value.one)
  }
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? fill(v, vars) : v))
  return typeof value === 'string' ? fill(value, vars) : value
}

/** The current language code, for code outside React. */
export const currentLang = () => current
/** Intl locale for numbers and dates, e.g. "te-IN". */
export const intlLocale = (lang = current) => (LANGS.find((l) => l.code === lang) || LANGS[0]).intl
/** date-fns locale for `format(date, 'd MMM', { locale })`. */
export const dateLocale = (lang = current) => (lang === 'te' ? teLocale : enIN)

export const I18nContext = createContext(null)

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/** Shorthand when only `t` is needed. */
export const useT = () => useI18n().t

