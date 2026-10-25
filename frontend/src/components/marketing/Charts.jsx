import { useEffect, useRef, useState } from 'react'
import { motion, animate, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { EASE } from './constants'
import { useI18n } from '../../i18n/core'

const inr = (n) => Math.round(n).toLocaleString('en-IN')

/** Counts up to `value` the first time it scrolls into view. */
export function Counter({ value, prefix = '₹', className = '', style }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => `${prefix}${inr(v)}`)
  useEffect(() => {
    if (!inView) return undefined
    if (reduce) { mv.set(value); return undefined }
    const c = animate(mv, value, { duration: 1.6, ease: EASE })
    return () => c.stop()
  }, [inView, reduce, value, mv])
  return <motion.span ref={ref} className={`tabular-nums ${className}`} style={style}>{text}</motion.span>
}

/**
 * Donut chart. `data` is [{ label, value, color }]. Hover or tap a slice
 * (or its legend row) to see its share in the middle.
 */
export function Donut({ data, size = 200, thickness = 26, title: titleProp, legend = true }) {
  const { t } = useI18n()
  const title = titleProp ?? t('site.charts.spent')
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [active, setActive] = useState(-1)
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  const gap = data.length > 1 ? 2.5 : 0

  const slices = data.map((d, i) => {
    const offset = data.slice(0, i).reduce((s, x) => s + (x.value / total) * C, 0)
    return { ...d, len: Math.max((d.value / total) * C - gap, 0.1), offset }
  })
  const cur = active >= 0 ? slices[active] : null

  return (
    <div ref={ref} className={legend ? 'flex flex-col items-center gap-5' : ''}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${title}: ${data.map(d => `${d.label} ₹${inr(d.value)}`).join(', ')}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={thickness} />
          {slices.map((s, i) => (
            <motion.circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeLinecap="butt" strokeDashoffset={-s.offset}
              initial={{ strokeDasharray: `0 ${C}`, strokeWidth: thickness }}
              animate={inView ? { strokeDasharray: `${s.len} ${C}`, strokeWidth: active === i ? thickness + 8 : thickness, opacity: active >= 0 && active !== i ? 0.35 : 1 } : undefined}
              transition={{ strokeDasharray: { duration: 1.1, delay: 0.15 + i * 0.12, ease: EASE }, default: { duration: 0.25 } }}
              onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(-1)} onClick={() => setActive(a => (a === i ? -1 : i))}
              style={{ cursor: 'pointer' }} />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>{cur ? cur.label : title}</span>
          <span className="font-serif-luxury mt-0.5 text-[1.35rem] font-semibold tabular-nums leading-none" style={{ color: 'var(--text-main)' }}>
            ₹{inr(cur ? cur.value : total)}
          </span>
          {cur && <span className="mt-1 text-[11.5px] font-semibold" style={{ color: cur.color }}>{Math.round((cur.value / total) * 100)}%</span>}
        </div>
      </div>

      {legend && (
        <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-0.5">
          {slices.map((s, i) => (
            <li key={s.label}>
              <button type="button" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(-1)} onFocus={() => setActive(i)} onBlur={() => setActive(-1)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors"
                style={{ background: active === i ? 'var(--border-subtle)' : 'transparent' }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>{Math.round((s.value / total) * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Paired bars of money in and out, one pair per month. */
export function InOutBars({ data, height = 180 }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [hover, setHover] = useState(data.length - 1)
  const max = Math.max(...data.flatMap(d => [d.in, d.out]))
  const cur = data[hover]
  return (
    <div ref={ref}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[12px]" style={{ color: 'var(--text-subtle)' }}>{cur.m}</p>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t('site.charts.saved')} <span className="font-semibold tabular-nums text-emerald-600">₹{inr(cur.in - cur.out)}</span>
          </p>
        </div>
        <div className="flex gap-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> {t('common.in')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> {t('common.out')}</span>
        </div>
      </div>
      <div className="relative" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <span key={f} className="absolute left-0 right-0 border-t border-dashed" style={{ bottom: `${f * 100}%`, borderColor: 'var(--border-subtle)' }} aria-hidden="true" />
        ))}
        <div className="relative flex h-full items-end gap-2 sm:gap-3" role="img" aria-label={t('site.charts.byMonth', { list: data.map(d => t('site.charts.monthItem', { month: d.m, in: inr(d.in), out: inr(d.out) })).join('; ') })}>
          {data.map((d, i) => (
            <button type="button" key={d.m} onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} aria-label={d.m}
              className="flex h-full flex-1 items-end justify-center gap-[3px] rounded-lg pt-2 transition-colors sm:gap-1"
              style={{ background: hover === i ? 'var(--border-subtle)' : 'transparent' }}>
              <motion.span className="w-full max-w-[18px] rounded-t-[5px] bg-emerald-500" initial={{ height: 0 }}
                animate={inView ? { height: `${(d.in / max) * 100}%` } : undefined} transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: EASE }} />
              <motion.span className="w-full max-w-[18px] rounded-t-[5px] bg-rose-400" initial={{ height: 0 }}
                animate={inView ? { height: `${(d.out / max) * 100}%` } : undefined} transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: EASE }} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d, i) => (
          <span key={d.m} className="flex-1 text-center text-[11px] font-medium" style={{ color: hover === i ? 'var(--text-main)' : 'var(--text-subtle)' }}>{d.s ?? d.m.slice(0, 3)}</span>
        ))}
      </div>
    </div>
  )
}

/** A budget: spent of limit, coloured by how close it is. */
export function BudgetBar({ label, spent, limit, delay = 0 }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const pct = spent / limit
  const color = pct > 1 ? '#E11D48' : pct >= 0.8 ? '#D97706' : '#059669'
  const status = pct > 1 ? t('site.charts.overBy', { amount: inr(spent - limit) }) : pct >= 0.8 ? t('site.charts.almost') : t('site.charts.onTrack')
  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{label}</span>
        <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>₹{inr(spent)} <span style={{ color: 'var(--text-subtle)' }}>/ ₹{inr(limit)}</span></span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }}
          animate={inView ? { width: `${Math.min(pct, 1) * 100}%` } : undefined} transition={{ duration: 1.2, delay, ease: EASE }} />
      </div>
      <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color }}>{status}</p>
    </div>
  )
}

/** A small rising line, used as a sparkline. */
export function Sparkline({ points, width = 120, height = 36, color = 'var(--gold-primary)' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const max = Math.max(...points), min = Math.min(...points)
  const step = width / (points.length - 1)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - 4 - ((p - min) / (max - min || 1)) * (height - 8)).toFixed(1)}`).join(' ')
  return (
    <svg ref={ref} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : undefined} transition={{ duration: 1.4, ease: EASE }} />
    </svg>
  )
}
