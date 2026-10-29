import { Fragment, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n/core'

/*
 * The hero heading types itself out. It steps through whole letters
 * (grapheme clusters), so Telugu, Tamil and Hindi syllables never show half
 * drawn. Letters not yet typed are already in place but transparent, so the
 * lines never jump while it types. Each new letter inks in; a gold caret
 * leads the way and blinks away at the end.
 *
 * The text may hold <br/> and one <em>…</em>, like the other hero strings.
 */

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
const graphemes = (s) => (segmenter ? [...segmenter.segment(s)].map(x => x.segment) : Array.from(s))

function parse(text) {
  const parts = []
  const re = /<br\s*\/>|<em>(.*?)<\/em>/gs
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ em: false, chars: graphemes(text.slice(last, m.index)) })
    parts.push(m[1] === undefined ? { br: true } : { em: true, chars: graphemes(m[1]) })
    last = re.lastIndex
  }
  if (last < text.length) parts.push({ em: false, chars: graphemes(text.slice(last)) })
  return parts
}

// a little uneven, like a person typing; a beat longer after a space
function delayFor(ch, i, step) {
  const jitter = ((i * 37) % 11) / 10 - 0.5
  return step * (1 + jitter * 0.5) + (ch === ' ' ? step * 0.8 : 0)
}

export default function TypedHeading({ k, start = 350, brClassName, emClassName, emStyle }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const text = t(k)
  const parts = useMemo(() => parse(text), [text])
  const total = parts.reduce((n, p) => n + (p.chars?.length || 0), 0)
  const plain = text.replace(/<br\s*\/>/g, ' ').replace(/<\/?em>/g, '')
  // about 1.6 s for the whole line, whatever the language
  const step = Math.min(75, Math.max(38, 1600 / Math.max(total, 1)))

  const [typed, setTyped] = useState(reduce ? total : 0)
  useEffect(() => {
    if (reduce) { setTyped(total); return undefined }
    setTyped(0)
    const all = parts.flatMap(p => p.chars || [])
    let i = 0
    let timer = setTimeout(function tick() {
      i += 1
      setTyped(i)
      if (i < all.length) timer = setTimeout(tick, delayFor(all[i], i, step))
    }, start)
    return () => clearTimeout(timer)
  }, [parts, total, step, start, reduce])

  const done = typed >= total
  let count = 0
  const caret = <span key="caret" className={`hero-caret ${done ? 'hero-caret-done' : ''}`} aria-hidden="true" />

  const nodes = parts.map((p, pi) => {
    if (p.br) return <br key={pi} className={brClassName} />
    const from = count
    count += p.chars.length
    const shown = Math.max(0, Math.min(p.chars.length, typed - from))
    const body = (
      <>
        {p.chars.slice(0, shown).map((c, ci) => <span key={ci} className={reduce ? undefined : 'hero-ink'}>{c}</span>)}
        {typed > from && typed <= from + p.chars.length && caret}
        <span style={{ color: 'transparent' }}>{p.chars.slice(shown).join('')}</span>
      </>
    )
    return p.em
      ? <em key={pi} className={`${emClassName || ''} ${done && !reduce ? 'hero-shine' : ''}`} style={emStyle}>{body}</em>
      : <Fragment key={pi}>{body}</Fragment>
  })

  return (
    <>
      <span className="sr-only">{plain}</span>
      <span aria-hidden="true">{typed === 0 && !reduce ? caret : null}{nodes}</span>
    </>
  )
}
