// Checks the translation files against each other and against the code.
//   node scripts/check-i18n.mjs            all namespaces
//   node scripts/check-i18n.mjs book entry only these namespaces
// Fails (exit 1) on: a key used in code but missing in English, a key in one
// language but not the other, different {placeholders} or <tags>, empty text.
// Warns when Telugu is identical to English (fine for names like "UPI").
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const i18nDir = join(root, 'src', 'i18n')
const only = process.argv.slice(2)

const load = (lang) => JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf8'))

const isPlural = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => k === 'one' || k === 'other')

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (isPlural(v)) {
      for (const [pk, pv] of Object.entries(v)) out[`${key}#${pk}`] = pv
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === 'object') flatten(item, `${key}[${i}]`, out)
        else out[`${key}[${i}]`] = item
      })
    } else if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}

const en = flatten(load('en'))
const te = flatten(load('te'))
const inScope = (k) => !only.length || only.includes(k.split(/[.#[]/)[0])
const errors = []
const warnings = []

const tokens = (s) => ({
  vars: [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(','),
  tags: [...String(s).matchAll(/<\/?(\w+)\s*\/?>/g)].map((m) => m[0]).sort().join(','),
})

for (const k of Object.keys(en).filter(inScope)) {
  if (!(k in te)) { errors.push(`missing in te: ${k}`); continue }
  if (typeof en[k] !== 'string') continue
  if (!en[k].trim()) errors.push(`empty in en: ${k}`)
  if (typeof te[k] !== 'string' || !te[k].trim()) { errors.push(`empty in te: ${k}`); continue }
  const a = tokens(en[k]); const b = tokens(te[k])
  if (a.vars !== b.vars) errors.push(`placeholders differ: ${k}  en{${a.vars}} te{${b.vars}}`)
  if (a.tags !== b.tags) errors.push(`tags differ: ${k}  en[${a.tags}] te[${b.tags}]`)
  if (en[k] === te[k] && /[a-z]{4,}/i.test(en[k])) warnings.push(`te same as en: ${k} = "${en[k]}"`)
}
for (const k of Object.keys(te).filter(inScope)) if (!(k in en)) errors.push(`only in te (not in en): ${k}`)

// keys used in code
const used = new Set()
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { if (f !== 'i18n' && f !== 'assets') walk(p); continue }
    if (!/\.(jsx?|mjs)$/.test(f)) continue
    const src = readFileSync(p, 'utf8')
    for (const m of src.matchAll(/(?:\bt|translate)\(\s*['"`]([\w.-]+)['"`]/g)) used.add(m[1])
    for (const m of src.matchAll(/\bk=["']([\w.-]+)["']/g)) used.add(m[1])
    for (const m of src.matchAll(/\bk=\{\s*['"`]([\w.-]+)['"`]\s*\}/g)) used.add(m[1])
  }
}
walk(join(root, 'src'))
const enRaw = load('en')
const exists = (key) => key.split('.').reduce((n, part) => (n && typeof n === 'object' ? n[part] : undefined), enRaw) !== undefined
for (const k of used) if (inScope(k) && !exists(k)) errors.push(`used in code but not in en: ${k}`)

for (const w of warnings) console.log('warn ', w)
for (const e of errors) console.log('ERROR', e)
console.log(`\n${Object.keys(en).filter(inScope).length} strings checked, ${used.size} keys used in code, ${errors.length} errors, ${warnings.length} warnings`)
process.exit(errors.length ? 1 : 0)
