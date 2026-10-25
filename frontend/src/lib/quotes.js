import { translate } from '../i18n/core'

// The 12 mindful quotes live in i18n (quotes.items), same order in every language.
export const mindfulQuotes = () => translate('quotes.items')

/** Today's quote in the current language (the same pick for the whole day). */
export function getQuoteOfTheDay() {
  const quotes = mindfulQuotes()
  const now = new Date()
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const hash = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return quotes[hash % quotes.length]
}
