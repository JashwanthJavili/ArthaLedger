// Checks the translation files against each other and against the code.
//   node scripts/check-i18n.mjs                 every language, all namespaces
//   node scripts/check-i18n.mjs book entry      only these namespaces
//   LANGS=ta node scripts/check-i18n.mjs        only these languages
// Every <lang>.json in src/i18n is compared with en.json. While a language is
// being written, src/i18n/<lang>-parts/<namespace>.json files are read too.
// Fails (exit 1) on: a key used in code but missing in English, a key in one
// language but not the other, different {placeholders} or <tags>, empty text.
// Warns when a translation is identical to English (fine for names like "UPI").
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const i18nDir = join(root, 'src', 'i18n')
const only = process.argv.slice(2)

function load(lang) {
  const dict = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf8'))
  const partsDir = join(i18nDir, `${lang}-parts`)
  if (existsSync(partsDir)) {
    for (const f of readdirSync(partsDir)) {
      if (f.endsWith('.json')) dict[f.slice(0, -5)] = JSON.parse(readFileSync(join(partsDir, f), 'utf8'))
    }
  }
  return dict
}
const langs = (process.env.LANGS ? process.env.LANGS.split(',') : readdirSync(i18nDir)
  .filter((f) => /^[a-z]{2}\.json$/.test(f) && f !== 'en.json').map((f) => f.slice(0, 2)))

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
const inScope = (k) => !only.length || only.includes(k.split(/[.#[]/)[0])
const errors = []
const warnings = []

const tokens = (s) => ({
  vars: [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(','),
  tags: [...String(s).matchAll(/<\/?(\w+)\s*\/?>/g)].map((m) => m[0]).sort().join(','),
})

for (const lang of langs) {
  const tr = flatten(load(lang))
  for (const k of Object.keys(en).filter(inScope)) {
    if (!(k in tr)) { errors.push(`missing in ${lang}: ${k}`); continue }
    if (typeof en[k] !== 'string') continue
    if (!en[k].trim()) errors.push(`empty in en: ${k}`)
    if (typeof tr[k] !== 'string' || !tr[k].trim()) { errors.push(`empty in ${lang}: ${k}`); continue }
    const a = tokens(en[k]); const b = tokens(tr[k])
    if (a.vars !== b.vars) errors.push(`placeholders differ: ${lang} ${k}  en{${a.vars}} ${lang}{${b.vars}}`)
    if (a.tags !== b.tags) errors.push(`tags differ: ${lang} ${k}  en[${a.tags}] ${lang}[${b.tags}]`)
    if (en[k] === tr[k] && /[a-z]{4,}/i.test(en[k])) warnings.push(`${lang} same as en: ${k} = "${en[k]}"`)
  }
  for (const k of Object.keys(tr).filter(inScope)) if (!(k in en)) errors.push(`only in ${lang} (not in en): ${k}`)
}

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
console.log(`\n${Object.keys(en).filter(inScope).length} strings × ${langs.length} language(s) [${langs.join(', ')}] checked, ${used.size} keys used in code, ${errors.length} errors, ${warnings.length} warnings`)
process.exit(errors.length ? 1 : 0)
