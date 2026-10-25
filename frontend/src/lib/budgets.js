// Shared monthly-budget math used by BudgetSection and the Analytics insights.
// A budget key is either a category ("Food") or "Category · Subcategory".
import { intlLocale } from '../i18n/core'

export const SUB_SEP = ' · '
const DAY_MS = 24 * 60 * 60 * 1000

// Firebase keys cannot contain these characters.
export const INVALID_KEY_RE = /[.#$/[\]]/

export function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function offsetMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  return toMonthKey(new Date(y, m - 1 + delta, 1))
}

export function monthLabel(key, opts = { month: 'long', year: 'numeric' }) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(intlLocale(), opts)
}

export function monthBounds(key) {
  const [y, m] = key.split('-').map(Number)
  return {
    start: new Date(y, m - 1, 1).getTime(),
    end: new Date(y, m, 1).getTime() - 1,
    daysInMonth: new Date(y, m, 0).getDate(),
  }
}

/** Days elapsed / left for a month key relative to `now` (whole days, today counted as elapsed). */
export function monthProgress(key, now = new Date()) {
  const { daysInMonth } = monthBounds(key)
  const curKey = toMonthKey(now)
  if (key < curKey) return { daysInMonth, daysElapsed: daysInMonth, daysLeft: 0, isCurrent: false }
  if (key > curKey) return { daysInMonth, daysElapsed: 0, daysLeft: daysInMonth, isCurrent: false }
  const day = now.getDate()
  return { daysInMonth, daysElapsed: day, daysLeft: daysInMonth - day, isCurrent: true }
}

export function splitBudgetKey(key) {
  const i = key.indexOf(SUB_SEP)
  return i === -1 ? { category: key, sub: null } : { category: key.slice(0, i), sub: key.slice(i + SUB_SEP.length) }
}

export function entryMatchesBudget(entry, key) {
  const { category, sub } = splitBudgetKey(key)
  if ((entry.category || 'General') !== category) return false
  return sub === null || (entry.subcategory || '') === sub
}

/** Expenses inside a month, for a budget key. */
export function spentInMonth(expenses, key, monthKey) {
  const { start, end } = monthBounds(monthKey)
  let total = 0
  for (const e of expenses) {
    if (!e.timestamp || e.timestamp < start || e.timestamp > end) continue
    if (entryMatchesBudget(e, key)) total += Number(e.amount || 0)
  }
  return Math.round(total * 100) / 100
}

/**
 * Average monthly spend for a budget key over the last `months` complete months
 * (only months with any spending are counted). Used to suggest a budget amount.
 */
export function averageMonthlySpend(expenses, key, now = new Date(), months = 3) {
  const cur = toMonthKey(now)
  const totals = []
  for (let i = 1; i <= months; i++) {
    const v = spentInMonth(expenses, key, offsetMonth(cur, -i))
    if (v > 0) totals.push(v)
  }
  if (!totals.length) return 0
  return totals.reduce((s, v) => s + v, 0) / totals.length
}

/** Projected month-end spend at the current daily pace; null when it would be noise. */
export function projectSpend(spent, progress) {
  if (!progress.isCurrent || progress.daysElapsed < 5 || spent <= 0) return null
  return (spent / progress.daysElapsed) * progress.daysInMonth
}

/**
 * Status of one budget.
 *  hard    – above the hard limit
 *  over    – above the monthly budget
 *  warning – reached the alert threshold
 *  pace    – still under, but trending past the budget by month end
 *  safe    – on track
 */
export function budgetZone({ spent, soft, hard = 0, warnAt = 80, projected = null }) {
  if (hard > 0 && spent > hard) return 'hard'
  if (spent > soft) return 'over'
  if (soft > 0 && (spent / soft) * 100 >= warnAt) return 'warning'
  if (projected !== null && projected > soft * 1.05) return 'pace'
  return 'safe'
}

// Labels live in budget.zone.* (looked up at render).
export const ZONE_META = {
  safe:    { color: '#10B981', pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  pace:    { color: '#E0A23B', pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  warning: { color: '#F59E0B', pill: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  over:    { color: '#F43F5E', pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  hard:    { color: '#E11D48', pill: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
}

export const ZONE_RANK = { hard: 0, over: 1, warning: 2, pace: 3, safe: 4 }

/**
 * Budget keys that should count toward the overall total: a subcategory budget
 * is skipped when its parent category also has a budget (it is already included).
 */
export function topLevelBudgetKeys(keys) {
  const set = new Set(keys)
  return keys.filter(k => {
    const { category, sub } = splitBudgetKey(k)
    return sub === null || !set.has(category)
  })
}

export { DAY_MS }
