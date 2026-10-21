// One ordering rule for transactions everywhere in the app:
//   1. by date & time
//   2. same time → the one added later counts as later (createdAt, then the
//      Firebase push id, which is itself in creation order)
// Lists show newest first; running balances are computed oldest first.

export function compareOldestFirst(a, b) {
  const t = Number(a?.timestamp || 0) - Number(b?.timestamp || 0)
  if (t) return t
  const ca = Number(a?.createdAt || 0)
  const cb = Number(b?.createdAt || 0)
  if (ca && cb && ca !== cb) return ca - cb
  // Plain code-unit comparison: push ids sort chronologically this way
  // (localeCompare would not, it ignores case and symbols).
  const ia = String(a?.id || '')
  const ib = String(b?.id || '')
  return ia < ib ? -1 : ia > ib ? 1 : 0
}

export function compareNewestFirst(a, b) {
  return compareOldestFirst(b, a)
}
