/**
 * Format a number as Indian locale currency string with commas.
 * e.g. 19837 → "19,837.00"  |  1234567 → "12,34,567.00"
 */
export function formatAmount(value, decimals = 2) {
  const num = Number(value) || 0
  return Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Get the currency symbol from localStorage.
 */
const currencyMap = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  JPY: '¥', AED: 'د.إ', SGD: 'S$',
}
export function getCurrencySymbol() {
  if (typeof window === 'undefined') return '₹'
  return currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'
}
