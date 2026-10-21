import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'

const ymd = d => format(d, 'yyyy-MM-dd')

export function datePresets() {
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  return [
    { id: 'all',       label: 'All time',   from: '', to: '' },
    { id: 'today',     label: 'Today',      from: ymd(now), to: ymd(now) },
    { id: 'week',      label: 'This week',  from: ymd(startOfWeek(now, { weekStartsOn: 1 })), to: ymd(now) },
    { id: 'month',     label: 'This month', from: ymd(startOfMonth(now)), to: ymd(now) },
    { id: 'lastMonth', label: 'Last month', from: ymd(startOfMonth(lastMonth)), to: ymd(endOfMonth(lastMonth)) },
  ]
}

/** Label for the active date range, used by the page's active-filter chips. */
export function describeDateRange(from, to) {
  if (!from && !to) return ''
  const preset = datePresets().find(p => p.id !== 'all' && p.from === from && p.to === to)
  if (preset) return preset.label
  const fmt = s => format(new Date(`${s}T00:00:00`), 'd MMM yyyy')
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  return from ? `From ${fmt(from)}` : `Until ${fmt(to)}`
}
