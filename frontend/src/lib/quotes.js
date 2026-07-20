export const mindfulQuotes = [
  'Mindful spending creates peaceful living.',
  'Awareness in small actions builds abundance.',
  'Gratitude brings clarity to every decision.',
  'Discipline in money creates calm in mind.',
  'Simple records lead to wise choices.',
  'When intention is clear, wealth becomes purposeful.',
  'Every rupee spent with awareness is a step toward freedom.',
  'Peace begins when we know where our money flows.',
  'Clarity in accounts brings clarity in life.',
  'A grateful heart sees abundance in every transaction.',
  'Track with care, live with ease.',
  'Small consistent actions create lasting prosperity.',
]

export function getQuoteOfTheDay() {
  const now = new Date()
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const hash = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return mindfulQuotes[hash % mindfulQuotes.length]
}
