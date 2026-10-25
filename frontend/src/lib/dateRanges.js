import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { translate, dateLocale } from '../i18n/core'

const ymd = d => format(d, 'yyyy-MM-dd')

export function datePresets() {
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  return [
    { id: 'all',       label: translate('dates.presets.all'),       from: '', to: '' },
    { id: 'today',     label: translate('dates.presets.today'),     from: ymd(now), to: ymd(now) },
    { id: 'week',      label: translate('dates.presets.week'),      from: ymd(startOfWeek(now, { weekStartsOn: 1 })), to: ymd(now) },
    { id: 'month',     label: translate('dates.presets.month'),     from: ymd(startOfMonth(now)), to: ymd(now) },
    { id: 'lastMonth', label: translate('dates.presets.lastMonth'), from: ymd(startOfMonth(lastMonth)), to: ymd(endOfMonth(lastMonth)) },
  ]
}

/** Label for the active date range, used by the page's active-filter chips. */
export function describeDateRange(from, to) {
  if (!from && !to) return ''
  const preset = datePresets().find(p => p.id !== 'all' && p.from === from && p.to === to)
  if (preset) return preset.label
  const fmt = s => format(new Date(`${s}T00:00:00`), 'd MMM yyyy', { locale: dateLocale() })
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  return from ? translate('dates.from', { date: fmt(from) }) : translate('dates.until', { date: fmt(to) })
}
