import { Fragment, cloneElement, isValidElement } from 'react'
import { useI18n } from './core'

/**
 * Text with simple markup. The string may hold <br/> and non-nested tags like
 * <em>…</em> or <b>…</b>; each tag name maps to an element in `components`.
 */
export function Trans({ k, vars, components = {} }) {
  const { t } = useI18n()
  const text = t(k, vars)
  const parts = []
  const re = /<(\w+)\s*\/>|<(\w+)>(.*?)<\/\2>/gs
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const name = m[1] || m[2]
    const el = components[name]
    if (m[1]) parts.push(isValidElement(el) ? cloneElement(el, { key: i++ }) : <br key={i++} />)
    else parts.push(isValidElement(el) ? cloneElement(el, { key: i++ }, m[3]) : <Fragment key={i++}>{m[3]}</Fragment>)
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
